-- Avatar: un personaggio a mezzobusto per ogni persona (vale in tutti i suoi gruppi).
-- look = { pelle, capelli, coloreCapelli, maglione, accessori: [...] }
create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  look       jsonb not null default '{}'::jsonb check (octet_length(look::text) <= 2000),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- Utenti che condividono almeno un gruppo con me (me compreso)
create function private.my_group_mates()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select distinct gm.user_id from public.group_members gm
  where gm.user_id is not null and gm.group_id in (select private.my_group_ids());
$$;
revoke execute on function private.my_group_mates() from public, anon;
grant execute on function private.my_group_mates() to authenticated;

create policy "vedo i personaggi di chi è nei miei gruppi" on public.profiles
  for select to authenticated
  using (user_id in (select private.my_group_mates()));

-- Accessori sbloccati, calcolati da ciò che la persona ha fatto davvero
create function private.unlocked_accessories(p_uid uuid)
returns text[]
language sql stable security definer set search_path = ''
as $$
  select array_remove(array[
    -- almeno una toppa di ogni tipo (simbolo, parola, palette) in una sua bacheca
    case when (
      select count(distinct mi.content->>'tipo') from public.moodboard_items mi
      join public.group_members gm on gm.id = mi.member_id
      where gm.user_id = p_uid and mi.kind = 'toppa' and mi.content->>'tipo' in ('simbolo', 'parola', 'palette')
    ) = 3 then 'sciarpa' end,
    -- almeno un punto croce
    case when exists (
      select 1 from public.moodboard_items mi join public.group_members gm on gm.id = mi.member_id
      where gm.user_id = p_uid and mi.kind = 'ricamo' and mi.content->>'celle' ~ '[0-9]'
    ) then 'gomitolo' end,
    -- almeno una foto o immagine
    case when exists (
      select 1 from public.moodboard_items mi join public.group_members gm on gm.id = mi.member_id
      where gm.user_id = p_uid and mi.kind in ('foto', 'immagine_link')
    ) then 'fiocco' end,
    -- busta aperta almeno una volta
    case when exists (
      select 1 from public.group_members gm where gm.user_id = p_uid and gm.envelope_opened_at is not null
    ) then 'stellina' end
  ], null);
$$;
revoke execute on function private.unlocked_accessories(uuid) from public, anon;
grant execute on function private.unlocked_accessories(uuid) to authenticated;

-- I miei accessori sbloccati (per la pagina del profilo)
create function public.my_unlocked_accessories()
returns text[]
language sql stable security definer set search_path = ''
as $$
  select private.unlocked_accessories((select auth.uid()));
$$;

-- Salva il mio personaggio: gli accessori indossati devono essere sbloccati
create function public.save_avatar(p_look jsonb)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_ok text[];
  v_acc text;
begin
  if v_uid is null then
    raise exception 'Devi aver fatto l''accesso.';
  end if;
  v_ok := private.unlocked_accessories(v_uid);
  for v_acc in select jsonb_array_elements_text(coalesce(p_look->'accessori', '[]'::jsonb)) loop
    if not v_acc = any(v_ok) then
      raise exception 'Questo accessorio non è ancora sbloccato.';
    end if;
  end loop;
  insert into public.profiles (user_id, look, updated_at) values (v_uid, p_look, now())
  on conflict (user_id) do update set look = excluded.look, updated_at = now();
end;
$$;

revoke execute on function public.my_unlocked_accessories() from public, anon;
revoke execute on function public.save_avatar(jsonb) from public, anon;
grant execute on function public.my_unlocked_accessories() to authenticated;
grant execute on function public.save_avatar(jsonb) to authenticated;

-- La lista dell'invito mostra anche i personaggi (non è un dato sensibile)
drop function public.get_lobby(text);
create function public.get_lobby(p_invite_code text)
returns table (
  group_id uuid, group_name text, group_status text, exchange_date date,
  member_id uuid, display_name text, look jsonb, claimed boolean, login_email text
)
language sql stable security definer set search_path = ''
as $$
  select g.id, g.name, g.status, g.exchange_date,
         gm.id, gm.display_name, p.look, gm.user_id is not null, u.email::text
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  left join auth.users u on u.id = gm.user_id
  left join public.profiles p on p.user_id = gm.user_id
  where g.invite_code = p_invite_code
  order by lower(gm.display_name);
$$;
revoke execute on function public.get_lobby(text) from public;
grant execute on function public.get_lobby(text) to anon, authenticated;
