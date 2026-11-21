-- Protezione (21/11): cancellare un accesso cancella a cascata i gruppi che organizza (groups.organizer_id).
-- notte_cancella_gruppo cancella quindi solo gli accessi che non sono in nessun altro gruppo
-- E che non organizzano nessun altro gruppo. Il resto è identico a 20261122130000_fine_santa.
create or replace function public.notte_cancella_gruppo(p_group uuid)
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
    and not exists (select 1 from public.group_members gm where gm.user_id = u.id)
    and not exists (select 1 from public.groups g where g.organizer_id = u.id);
  get diagnostics v_accessi = row_count;
  return json_build_object('gruppo', p_group, 'accessi_cancellati', v_accessi);
end;
$$;
revoke execute on function public.notte_cancella_gruppo(uuid) from public, anon, authenticated;
grant execute on function public.notte_cancella_gruppo(uuid) to service_role;
