-- Reimposta password: l'organizzatore crea un link usa-e-getta (24 ore) per un membro;
-- il membro lo apre e sceglie lui la nuova password. L'organizzatore non la conosce mai.
-- Nel database salviamo solo l'impronta (sha256) del link, non il link stesso.

create table private.password_resets (
  token_hash  text primary key,
  member_id   uuid not null references public.group_members (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_by  uuid not null references auth.users (id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '24 hours',
  used_at     timestamptz
);
create index password_resets_member_idx on private.password_resets (member_id);
create index password_resets_user_idx on private.password_resets (user_id);
alter table private.password_resets enable row level security; -- nessuna regola: accesso solo dalle funzioni
revoke all on private.password_resets from public, anon, authenticated;

-- Crea il link (restituisce il codice segreto da mettere nell'indirizzo).
create function public.create_password_reset(p_member_id uuid)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_member public.group_members;
  v_organizer uuid;
  v_token text;
begin
  select * into v_member from public.group_members where id = p_member_id;
  select organizer_id into v_organizer from public.groups where id = v_member.group_id;
  if v_member.id is null or v_organizer is distinct from v_uid then
    raise exception 'Solo l''organizzatore può reimpostare la password.';
  end if;
  if v_member.user_id is null then
    raise exception 'Questa persona non è ancora entrata: non ha una password da reimpostare.';
  end if;
  if v_member.user_id = v_uid then
    raise exception 'Non puoi reimpostare la tua password da qui.';
  end if;

  -- un solo link valido per volta per persona
  delete from private.password_resets where member_id = p_member_id and used_at is null;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.password_resets (token_hash, member_id, user_id, created_by)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_member_id, v_member.user_id, v_uid);
  return v_token;
end;
$$;

-- Usa il link: imposta la nuova password, chiude le sessioni aperte altrove,
-- e restituisce l'email finta (per entrare subito) e il gruppo.
create function public.use_password_reset(p_token text, p_password text)
returns table (login_email text, group_id uuid)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_reset private.password_resets;
  v_group uuid;
begin
  if char_length(coalesce(p_password, '')) < 8 then
    raise exception 'La password deve avere almeno 8 caratteri.';
  end if;

  select * into v_reset from private.password_resets
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
  for update;

  if not found or v_reset.used_at is not null or v_reset.expires_at < now() then
    raise exception 'Questo link non è più valido. Chiedi all''organizzatore di crearne uno nuovo.';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
  where id = v_reset.user_id;

  -- chi era collegato con la vecchia password viene scollegato
  delete from auth.sessions where user_id = v_reset.user_id;

  update private.password_resets set used_at = now() where token_hash = v_reset.token_hash;
  select gm.group_id into v_group from public.group_members gm where gm.id = v_reset.member_id;

  return query select u.email::text, v_group from auth.users u where u.id = v_reset.user_id;
end;
$$;

revoke execute on function public.create_password_reset(uuid) from public, anon;
revoke execute on function public.use_password_reset(text, text) from public;
grant execute on function public.create_password_reset(uuid) to authenticated;
grant execute on function public.use_password_reset(text, text) to anon, authenticated;
