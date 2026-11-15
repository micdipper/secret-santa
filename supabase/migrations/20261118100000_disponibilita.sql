-- =====================================================================
-- Disponibilità per lo scambio (richiesta di Marzia, 15/11)
-- L'organizzatore propone alcuni giorni (groups.giorni_proposti); ognuno del gruppo dice in quali c'è
-- e può cambiarli finché il sondaggio è aperto. Tutti vedono le risposte di tutti.
-- Il sondaggio lo chiude SOLO l'organizzatore fissando la data (exchange_date) e svuotando giorni_proposti.
-- Sondaggio aperto  <=>  giorni_proposti non è null.
-- =====================================================================

alter table public.groups add column giorni_proposti date[];
alter table public.groups add constraint giorni_proposti_max check (giorni_proposti is null or cardinality(giorni_proposti) between 1 and 14);
-- l'organizzatore li scrive con la sua regola "organizzatore modifica il gruppo"
grant update (giorni_proposti) on public.groups to authenticated;

-- Una riga per persona: i giorni in cui c'è (vuoto = "in nessuno di questi giorni"). Riga presente = ha risposto.
create table public.disponibilita (
  member_id     uuid primary key references public.group_members (id) on delete cascade,
  group_id      uuid not null references public.groups (id) on delete cascade,
  giorni        date[] not null default '{}',
  aggiornata_at timestamptz not null default now(),
  constraint disponibilita_giorni_max check (cardinality(giorni) <= 14)
);
create index disponibilita_group_idx on public.disponibilita (group_id);

alter table public.disponibilita enable row level security;
-- tutti i membri del gruppo vedono le risposte di tutti; si scrive solo con imposta_disponibilita
create policy "membri leggono le disponibilita" on public.disponibilita
  for select to authenticated
  using (group_id in (select private.my_group_ids()));
revoke insert, update, delete on public.disponibilita from anon, authenticated;
grant select on public.disponibilita to authenticated;

alter publication supabase_realtime add table public.disponibilita;

-- La mia disponibilità: solo con il sondaggio aperto e solo tra i giorni proposti.
create function public.imposta_disponibilita(p_group_id uuid, p_giorni date[])
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_member uuid;
  v_proposti date[];
begin
  select gm.id into v_member from public.group_members gm
  where gm.group_id = p_group_id and gm.user_id = (select auth.uid());
  if v_member is null then
    raise exception 'Non fai parte di questo gruppo.';
  end if;
  select g.giorni_proposti into v_proposti from public.groups g where g.id = p_group_id;
  if v_proposti is null then
    raise exception 'La data è già stata fissata: il sondaggio è chiuso.';
  end if;
  if exists (select 1 from unnest(coalesce(p_giorni, '{}')) d where d <> all (v_proposti)) then
    raise exception 'Puoi scegliere solo tra i giorni proposti.';
  end if;
  insert into public.disponibilita (member_id, group_id, giorni, aggiornata_at)
  values (v_member, p_group_id, coalesce((select array_agg(distinct d order by d) from unnest(p_giorni) d), '{}'), now())
  on conflict (member_id) do update set giorni = excluded.giorni, aggiornata_at = now();
end;
$$;
revoke execute on function public.imposta_disponibilita(uuid, date[]) from public, anon;
grant execute on function public.imposta_disponibilita(uuid, date[]) to authenticated;

-- Un sondaggio nuovo riparte da zero: quando giorni_proposti passa da vuoto (null) a pieno,
-- le risposte del sondaggio precedente si cancellano.
create function private.disponibilita_nuovo_sondaggio()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.giorni_proposti is null and new.giorni_proposti is not null then
    delete from public.disponibilita where group_id = new.id;
  end if;
  return new;
end;
$$;
revoke execute on function private.disponibilita_nuovo_sondaggio() from public, anon, authenticated;
create trigger groups_nuovo_sondaggio_disponibilita
  after update of giorni_proposti on public.groups
  for each row execute function private.disponibilita_nuovo_sondaggio();
