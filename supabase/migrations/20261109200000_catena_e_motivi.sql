-- Esclusioni con un motivo (coppia / regalo dell'anno scorso) e
-- estrazione "a catena": un unico giro, così nessuno si scambia il regalo a vicenda.

alter table public.exclusions
  add column reason text not null default 'coppia' check (reason in ('coppia', 'anno_scorso'));

grant insert (group_id, member_a, member_b, reason) on public.exclusions to authenticated;

create or replace function public.run_draw(p_group_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_group public.groups;
  v_order uuid[];
  v_n integer;
  v_attempt integer;
  v_ok boolean;
  i integer;
  v_giver uuid;
  v_receiver uuid;
begin
  select * into v_group from public.groups where id = p_group_id for update;
  if not found or v_group.organizer_id is distinct from v_uid then
    raise exception 'Solo l''organizzatore può avviare l''estrazione.';
  end if;
  if v_group.status <> 'aperto' then
    raise exception 'L''estrazione è già stata fatta.';
  end if;
  if exists (select 1 from public.group_members where group_id = p_group_id and user_id is null) then
    raise exception 'Non sono ancora entrati tutti: aspetta che ognuno tocchi il proprio nome.';
  end if;

  select count(*) into v_n from public.group_members where group_id = p_group_id;
  if v_n < 3 then
    raise exception 'Servono almeno 3 persone per l''estrazione.';
  end if;

  -- Catena: mescolo i membri in cerchio e ognuno regala al successivo.
  -- Con almeno 3 persone nessuno pesca se stesso e nessuna coppia si scambia il regalo.
  for v_attempt in 1..5000 loop
    select array_agg(id order by random()) into v_order from public.group_members where group_id = p_group_id;
    v_ok := true;
    for i in 1..v_n loop
      v_giver := v_order[i];
      v_receiver := v_order[(i % v_n) + 1];
      if exists (
        select 1 from public.exclusions e
        where e.group_id = p_group_id
          and e.member_a = least(v_giver, v_receiver)
          and e.member_b = greatest(v_giver, v_receiver)
      ) then
        v_ok := false;
        exit;
      end if;
    end loop;

    if v_ok then
      insert into public.assignments (group_id, giver_member_id, receiver_member_id)
      select p_group_id, v_order[k], v_order[(k % v_n) + 1] from generate_series(1, v_n) k;
      update public.groups set status = 'estratto' where id = p_group_id;
      return;
    end if;
  end loop;

  raise exception 'Con queste esclusioni non si trova una catena valida. Prova a toglierne qualcuna.';
end;
$$;

revoke execute on function public.run_draw(uuid) from public, anon;
grant execute on function public.run_draw(uuid) to authenticated;
