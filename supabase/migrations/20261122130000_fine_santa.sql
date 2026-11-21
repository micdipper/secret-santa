-- Fase 4 (regole di Marzia, 21/11): fine del Secret Santa, avviso e cancellazione dei gruppi finiti.
--
-- Giorno della cancellazione di un gruppo, calcolato OGNI VOLTA dal database (una sola regola per avviso e pulizia):
--   - con la data dello scambio: data + 10 giorni (impostazione "fine_dopo_giorni");
--   - senza data (sondaggio della disponibilità aperto, data mai fissata): l'8 gennaio
--     (impostazione "fine_senza_data" = AAAAMMGG; se cade a meno di 7 giorni dalla nascita del gruppo, l'anno dopo);
--   - mai prima di 7 giorni dal primo avviso: groups.avviso_fine_dal ricorda il primo giorno in cui l'avviso è
--     comparso; se una data appena fissata o cambiata porterebbe la cancellazione più vicina, vale il più tardo.
--     Se la data si sposta in là (avviso non più dovuto), il ricordo si azzera e l'avviso ripartirà da capo.
-- L'avviso compare da 7 giorni prima (impostazione "fine_avviso_giorni") fino al giorno stesso ("Oggi");
-- la pulizia notturna cancella i gruppi il cui giorno è passato (nella notte dopo).

alter table public.groups add column avviso_fine_dal date;

insert into private.impostazioni (chiave, valore, nota) values
  ('fine_dopo_giorni', 10, 'giorni dopo lo scambio in cui il gruppo viene cancellato'),
  ('fine_senza_data', 20270108, 'giorno (AAAAMMGG) in cui si cancellano i gruppi senza data dello scambio'),
  ('fine_avviso_giorni', 7, 'da quanti giorni prima della cancellazione compare l''avviso (e minimo tra primo avviso e cancellazione)'),
  ('fine_cancella', 0, '1 = il lavoro notturno cancella davvero i gruppi finiti; 0 = prova: scrive solo nel registro quali cancellerebbe');

-- giorno "di base" (senza la regola dei 7 giorni dal primo avviso)
create function private.fine_base(p_exchange date, p_creato timestamptz)
returns date
language sql stable security definer set search_path = ''
as $$
  select case
    when p_exchange is not null then p_exchange + private.impostazione('fine_dopo_giorni')
    else (
      select case when d >= (p_creato at time zone 'Europe/Rome')::date + 7 then d else (d + interval '1 year')::date end
      from (select to_date(private.impostazione('fine_senza_data')::text, 'YYYYMMDD') as d) x
    )
  end;
$$;

-- giorno della cancellazione (base, ma mai prima di N giorni dal primo avviso)
create function private.fine_gruppo_data(p_group uuid)
returns date
language sql stable security definer set search_path = ''
as $$
  select greatest(private.fine_base(g.exchange_date, g.created_at), g.avviso_fine_dal + private.impostazione('fine_avviso_giorni'))
  from public.groups g where g.id = p_group;
$$;

-- aggiorna il ricordo del primo avviso e restituisce il giorno della cancellazione
create function private.aggiorna_fine(p_group uuid)
returns date
language plpgsql security definer set search_path = ''
as $$
declare
  v_base date;
  v_oggi date := private.oggi_roma();
  v_giorni integer := private.impostazione('fine_avviso_giorni');
  v_dal date;
begin
  select private.fine_base(g.exchange_date, g.created_at), g.avviso_fine_dal into v_base, v_dal
  from public.groups g where g.id = p_group;
  if v_base is null then
    return null;
  end if;
  if v_base - v_giorni > v_oggi then
    -- l'avviso non è (più) dovuto: se c'era un ricordo vecchio si azzera
    if v_dal is not null and greatest(v_base, v_dal + v_giorni) - v_giorni > v_oggi then
      update public.groups set avviso_fine_dal = null where id = p_group;
    end if;
  elsif v_dal is null then
    update public.groups set avviso_fine_dal = v_oggi where id = p_group;
  end if;
  return private.fine_gruppo_data(p_group);
end;
$$;

revoke execute on function private.fine_base(date, timestamptz), private.fine_gruppo_data(uuid), private.aggiorna_fine(uuid) from public, anon, authenticated;

-- Per le pagine del gruppo (solo chi è nel gruppo): giorno della cancellazione, giorni che mancano, se avvisare
create function public.fine_gruppo(p_group uuid)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  v_fine date;
  v_mancano integer;
begin
  if p_group not in (select private.my_group_ids()) then
    return null;
  end if;
  v_fine := private.aggiorna_fine(p_group);
  v_mancano := v_fine - private.oggi_roma();
  return json_build_object('data', v_fine, 'giorni', v_mancano, 'avviso', v_mancano between 0 and private.impostazione('fine_avviso_giorni'));
end;
$$;
revoke execute on function public.fine_gruppo(uuid) from public, anon;
grant execute on function public.fine_gruppo(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Lavoro notturno (solo chiave segreta)
-- ---------------------------------------------------------------------
-- Aggiorna gli avvisi di tutti i gruppi e restituisce quelli da cancellare (giorno passato), con cosa contengono
create function public.notte_gruppi_finiti()
returns table (id uuid, nome text, fine date, persone bigint, accessi bigint, file bigint)
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  for v_id in select g.id from public.groups g loop
    perform private.aggiorna_fine(v_id);
  end loop;
  return query
  select g.id, g.name, private.fine_gruppo_data(g.id),
    (select count(*) from public.group_members gm where gm.group_id = g.id),
    (select count(*) from public.group_members gm where gm.group_id = g.id and gm.user_id is not null),
    (select count(*) from storage.objects o where o.bucket_id = 'moodboard' and o.name like g.id::text || '/%')
  from public.groups g
  where private.fine_gruppo_data(g.id) < private.oggi_roma()
  order by 3;
end;
$$;

-- Cancella un gruppo finito: i suoi accessi (solo quelli che non sono in nessun altro gruppo) e tutte le sue
-- righe (a cascata: persone, bacheca, post, reazioni, risposte, messaggi, partite, disponibilità, totem, toppe…).
-- I file dello Storage restano senza padrone: li toglie subito dopo lo spazzino dei file orfani.
create function public.notte_cancella_gruppo(p_group uuid)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  v_utenti uuid[];
  v_accessi integer;
begin
  if private.fine_gruppo_data(p_group) >= private.oggi_roma() then
    raise exception 'Il gruppo non è ancora finito';
  end if;
  select array_agg(gm.user_id) into v_utenti
  from public.group_members gm where gm.group_id = p_group and gm.user_id is not null;
  delete from public.groups where id = p_group;
  delete from auth.users u
  where u.id = any(coalesce(v_utenti, '{}'))
    and not exists (select 1 from public.group_members gm where gm.user_id = u.id);
  get diagnostics v_accessi = row_count;
  return json_build_object('gruppo', p_group, 'accessi_cancellati', v_accessi);
end;
$$;

create function public.notte_fine_cancella()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.impostazione('fine_cancella'), 0) = 1;
$$;

revoke execute on function public.notte_gruppi_finiti(), public.notte_cancella_gruppo(uuid), public.notte_fine_cancella() from public, anon, authenticated;
grant execute on function public.notte_gruppi_finiti(), public.notte_cancella_gruppo(uuid), public.notte_fine_cancella() to service_role;
