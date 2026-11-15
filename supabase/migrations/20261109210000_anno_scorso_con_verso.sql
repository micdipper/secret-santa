-- "Anno scorso" ha un verso: member_a ha fatto il regalo a member_b,
-- quindi quest'anno member_a non può ripescare member_b (il contrario sì).
-- Le coppie restano reciproche e salvate in ordine (member_a < member_b).

alter table public.exclusions drop constraint exclusions_check;
alter table public.exclusions add constraint exclusions_check
  check (member_a <> member_b and (reason = 'anno_scorso' or member_a < member_b));

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

  -- Catena: ognuno regala al successivo nel cerchio.
  for v_attempt in 1..5000 loop
    select array_agg(id order by random()) into v_order from public.group_members where group_id = p_group_id;
    v_ok := true;
    for i in 1..v_n loop
      v_giver := v_order[i];
      v_receiver := v_order[(i % v_n) + 1];
      if exists (
        select 1 from public.exclusions e
        where e.group_id = p_group_id
          and (
            -- coppia: vale in entrambi i versi
            (e.reason = 'coppia' and e.member_a = least(v_giver, v_receiver) and e.member_b = greatest(v_giver, v_receiver))
            -- anno scorso: vale solo nello stesso verso
            or (e.reason = 'anno_scorso' and e.member_a = v_giver and e.member_b = v_receiver)
          )
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

-- La stessa coppia di persone può avere sia "coppia" sia "anno scorso".
alter table public.exclusions drop constraint exclusions_pkey;
alter table public.exclusions add primary key (group_id, member_a, member_b, reason);
