-- Chi entra in un gruppo riceve subito un personaggio a caso (poi lo cambia nel profilo).
create function private.look_casuale()
returns jsonb
language sql volatile set search_path = ''
as $$
  select jsonb_build_object(
    'pelle', floor(random() * 6)::int,
    'capelli', floor(random() * 6)::int,
    'coloreCapelli', floor(random() * 7)::int,
    'maglione', floor(random() * 6)::int,
    'accessori', '[]'::jsonb
  );
$$;

create function private.crea_profilo_se_manca()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.user_id is not null then
    insert into public.profiles (user_id, look) values (new.user_id, private.look_casuale())
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function private.crea_profilo_se_manca() from public, anon, authenticated;

create trigger profilo_all_ingresso
  after insert or update of user_id on public.group_members
  for each row execute function private.crea_profilo_se_manca();

-- Chi era già entrato prima di oggi
insert into public.profiles (user_id, look)
select distinct gm.user_id, private.look_casuale() from public.group_members gm
where gm.user_id is not null
on conflict (user_id) do nothing;
