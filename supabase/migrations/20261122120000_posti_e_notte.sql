-- Fase 3 dei limiti (21/11): posti del sito e dei gruppi, tetto degli accessi, lavoro notturno.
--
-- POSTI (decisione di Marzia: i posti prenotati sono esattamente i nomi scritti dall'organizzatore).
-- Ogni riga di group_members è un posto: preso (user_id pieno) o prenotato (user_id vuoto).
-- Posti occupati del sito = tutte le righe di group_members. Così:
--   - creare un gruppo con N nomi (organizzatore compreso) occupa N posti: si può solo se ci stanno;
--   - chi entra da un invito prende un posto GIÀ prenotato: entra sempre ("tetto fluido");
--   - "Libera il nome" non aggiunge righe: non consuma un posto in più;
--   - un accesso rimasto senza gruppo (invito fallito a metà, nome liberato) non occupa posti:
--     lo cancella il lavoro notturno dopo 24 ore.
-- Tetto duro sugli ACCESSI (righe di auth.users, anche quelli senza gruppo): oltre non se ne creano di nuovi;
-- chi ha già un accesso rientra sempre (il login non crea accessi).

-- ---------------------------------------------------------------------
-- Impostazioni modificabili senza deploy (dashboard di Supabase → Table editor → schema private)
-- ---------------------------------------------------------------------
create table private.impostazioni (
  chiave text primary key,
  valore integer not null,
  nota   text
);
alter table private.impostazioni enable row level security;
insert into private.impostazioni (chiave, valore, nota) values
  ('persone_per_gruppo', 50, 'massimo di persone in un gruppo, organizzatore compreso'),
  ('posti_sito', 1000, 'posti in tutto il sito (nomi scritti nei gruppi, presi o prenotati): oltre non si creano gruppi né si aggiungono nomi'),
  ('accessi_sito', 1200, 'tetto duro degli accessi (auth.users): oltre non se ne creano di nuovi'),
  ('notte_cancella', 0, '1 = il lavoro notturno cancella davvero; 0 = prova: scrive solo nel registro cosa cancellerebbe');

create function private.impostazione(p_chiave text)
returns integer
language sql stable security definer set search_path = ''
as $$
  select valore from private.impostazioni where chiave = p_chiave;
$$;
revoke execute on function private.impostazione(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Ogni nome nuovo (in "Crea un gruppo" o in Organizza) occupa un posto
-- ---------------------------------------------------------------------
create function private.controlla_posti()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- un solo controllo alla volta in tutto il sito: due gruppi creati insieme non superano i posti
  perform pg_advisory_xact_lock(hashtext('posti-sito'));
  if (select count(*) from public.group_members where group_id = new.group_id) >= private.impostazione('persone_per_gruppo') then
    raise exception 'Il gruppo è al completo (massimo % persone)', private.impostazione('persone_per_gruppo');
  end if;
  if (select count(*) from public.group_members) >= private.impostazione('posti_sito') then
    raise exception 'Il sito è al completo: non c''è posto per un''altra persona';
  end if;
  return new;
end;
$$;
revoke execute on function private.controlla_posti() from public, anon, authenticated;

create trigger controlla_posti
before insert on public.group_members
for each row execute function private.controlla_posti();

-- ---------------------------------------------------------------------
-- Tetto duro degli accessi nuovi
-- ---------------------------------------------------------------------
create function private.tetto_accessi()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from auth.users) >= private.impostazione('accessi_sito') then
    raise exception 'Siamo al completo, riprova più tardi';
  end if;
  return new;
end;
$$;
revoke execute on function private.tetto_accessi() from public, anon, authenticated;
-- chi crea gli accessi (Supabase Auth) deve poter chiamare la funzione: senza, nessuno si iscriverebbe più
grant usage on schema private to supabase_auth_admin;
grant execute on function private.tetto_accessi() to supabase_auth_admin;

create trigger tetto_accessi
before insert on auth.users
for each row execute function private.tetto_accessi();

-- ---------------------------------------------------------------------
-- Quanti posti restano (per "Crea un gruppo", Organizza e l'invito: si controlla PRIMA di creare
-- l'accesso, così non restano accessi orfani). Solo numeri, nessun dato personale.
-- ---------------------------------------------------------------------
create function public.posti_sito()
returns json
language sql stable security definer set search_path = ''
as $$
  select json_build_object(
    'posti_liberi', greatest(0, private.impostazione('posti_sito') - (select count(*) from public.group_members)),
    'persone_per_gruppo', private.impostazione('persone_per_gruppo'),
    'accessi_pieni', (select count(*) from auth.users) >= private.impostazione('accessi_sito')
  );
$$;
revoke execute on function public.posti_sito() from public;
grant execute on function public.posti_sito() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Lavoro notturno (app/api/notte, cron di Vercel, chiave segreta): solo service_role
-- ---------------------------------------------------------------------
-- File dello Storage che nessuno usa più (né bacheca, né Novità, né totem), caricati da più di 1 ora
create function public.notte_file_orfani()
returns setof text
language sql stable security definer set search_path = ''
as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'moodboard'
    and o.created_at < now() - interval '1 hour'
    and not exists (select 1 from public.moodboard_items m where m.content->>'path' = o.name)
    and not exists (select 1 from public.feed_events e where e.dati->>'foto' = o.name)
    and not exists (select 1 from public.quiz_totems t where t.immagine = o.name);
$$;

-- Accessi che non sono in nessun gruppo (invito fallito a metà, nome liberato), creati da più di 24 ore
create function public.notte_accessi_orfani()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select u.id
  from auth.users u
  where u.created_at < now() - interval '24 hours'
    and not exists (select 1 from public.group_members gm where gm.user_id = u.id);
$$;

-- Registro di ogni notte (si legge dalla dashboard o da SQL)
create table private.registro_notte (
  id       bigint generated always as identity primary key,
  quando   timestamptz not null default now(),
  rapporto jsonb not null
);
alter table private.registro_notte enable row level security;

create function public.notte_registra(p_rapporto jsonb)
returns void
language sql security definer set search_path = ''
as $$
  insert into private.registro_notte (rapporto) values (p_rapporto);
$$;

-- 1 = cancella davvero, 0 = solo prova (impostazione "notte_cancella")
create function public.notte_cancella()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.impostazione('notte_cancella'), 0) = 1;
$$;

revoke execute on function public.notte_file_orfani(), public.notte_accessi_orfani(), public.notte_registra(jsonb), public.notte_cancella() from public, anon, authenticated;
grant execute on function public.notte_file_orfani(), public.notte_accessi_orfani(), public.notte_registra(jsonb), public.notte_cancella() to service_role;
