-- Rifare l'estrazione (Marzia, 22/11): per un errore o per chi si aggiunge all'ultimo minuto.
-- L'organizzatore, fino al giorno dello scambio compreso:
--   - gli abbinamenti si cancellano (anche le scelte nei gruppi "l'abbiamo già fatta noi");
--   - le buste si richiudono per tutti (envelope_opened_at vuoto);
--   - la Santa Chat si svuota (i messaggi sono legati a chi riceve: col Babbo nuovo sembrerebbero suoi);
--   - i doni già vinti restano (private.regali_vinti);
--   - il gruppo torna "aperto": l'invito torna a valere, si aggiungono nomi ed esclusioni e si rifà "Estrai".
-- Nelle Novità compare la voce "rifatta" (trigger feed_da_gruppo); alla nuova estrazione torna "estrazione".

alter table public.feed_events drop constraint feed_events_tipo_check;
alter table public.feed_events add constraint feed_events_tipo_check
  check (tipo in ('creato', 'entrato', 'estrazione', 'busta', 'bacheca', 'totem', 'post', 'toppe', 'rifatta'));

create or replace function private.feed_da_gruppo()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.status = 'aperto' and new.status <> 'aperto' then
    insert into public.feed_events (group_id, tipo) values (new.id, 'estrazione');
  elsif old.status <> 'aperto' and new.status = 'aperto' then
    insert into public.feed_events (group_id, tipo) values (new.id, 'rifatta');
  end if;
  return null;
end;
$$;

create or replace function public.rifai_estrazione(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_group public.groups;
begin
  select * into v_group from public.groups where id = p_group_id for update;
  if not found or v_group.organizer_id is distinct from (select auth.uid()) then
    raise exception 'Solo l''organizzatore può rifare l''estrazione.';
  end if;
  if v_group.status = 'aperto' then
    raise exception 'L''estrazione non è ancora stata fatta.';
  end if;
  if v_group.exchange_date is not null and private.oggi_roma() > v_group.exchange_date then
    raise exception 'Lo scambio è già passato: l''estrazione non si può più rifare.';
  end if;

  delete from public.santa_messages where group_id = p_group_id;
  delete from public.assignments where group_id = p_group_id;
  update public.group_members set envelope_opened_at = null where group_id = p_group_id and envelope_opened_at is not null;
  update public.groups set status = 'aperto' where id = p_group_id;
end;
$$;

revoke execute on function public.rifai_estrazione(uuid) from public, anon;
grant execute on function public.rifai_estrazione(uuid) to authenticated;
