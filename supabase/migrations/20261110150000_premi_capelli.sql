-- Premi speciali per i capelli: "olografico" (tutti e 4 gli accessori) e taglio "super" (10 cose su una bacheca).
create or replace function private.unlocked_accessories(p_uid uuid)
returns text[]
language sql stable security definer set search_path = ''
as $$
  with base as (
    select array_remove(array[
      case when (
        select count(distinct mi.content->>'tipo') from public.moodboard_items mi
        join public.group_members gm on gm.id = mi.member_id
        where gm.user_id = p_uid and mi.kind = 'toppa' and mi.content->>'tipo' in ('simbolo', 'parola', 'palette')
      ) = 3 then 'sciarpa' end,
      case when exists (
        select 1 from public.moodboard_items mi join public.group_members gm on gm.id = mi.member_id
        where gm.user_id = p_uid and mi.kind = 'ricamo' and mi.content->>'celle' ~ '[0-9]'
      ) then 'gomitolo' end,
      case when exists (
        select 1 from public.moodboard_items mi join public.group_members gm on gm.id = mi.member_id
        where gm.user_id = p_uid and mi.kind in ('foto', 'immagine_link')
      ) then 'fiocco' end,
      case when exists (
        select 1 from public.group_members gm where gm.user_id = p_uid and gm.envelope_opened_at is not null
      ) then 'stellina' end,
      case when exists (
        select 1 from public.group_members gm
        where gm.user_id = p_uid
          and (select count(*) from public.moodboard_items mi where mi.member_id = gm.id) >= 10
      ) then 'super' end
    ], null) as a
  )
  select case when a @> array['sciarpa', 'gomitolo', 'fiocco', 'stellina']::text[] then array_append(a, 'olografico') else a end from base;
$$;

create or replace function public.save_avatar(p_look jsonb)
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
  if p_look->>'capelli' = '12' and not 'super' = any(v_ok) then
    raise exception 'Questo taglio non è ancora sbloccato.';
  end if;
  if p_look->>'coloreCapelli' = '7' and not 'olografico' = any(v_ok) then
    raise exception 'Questo colore non è ancora sbloccato.';
  end if;
  insert into public.profiles (user_id, look, updated_at) values (v_uid, p_look, now())
  on conflict (user_id) do update set look = excluded.look, updated_at = now();
end;
$$;
