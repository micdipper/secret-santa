-- =====================================================================
-- Secret Santa – Fase 1: tabelle, regole di sicurezza (RLS), funzioni
-- =====================================================================
-- Principi:
-- * RLS attiva su tutte le tabelle; grant espliciti e minimi.
-- * Le persone sono "posti" in group_members (nome scritto dall'organizzatore);
--   user_id resta vuoto finché l'amico non tocca il proprio nome.
-- * Gli abbinamenti (assignments) non si scrivono mai dal browser:
--   solo la funzione run_draw. Ognuno legge solo la riga in cui regala.
-- * La spunta "già preso" sta in wishlist_claims: la vede solo chi l'ha messa.
-- * Le funzioni con privilegi (security definer) controllano sempre auth.uid().

-- ---------------------------------------------------------------------
-- Schema privato per le funzioni di supporto (non esposto alla Data API)
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------
-- Tabelle
-- ---------------------------------------------------------------------
create table public.groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 80),
  budget_eur    integer check (budget_eur is null or budget_eur between 0 and 10000),
  exchange_date date,
  theme         text check (theme is null or char_length(theme) <= 200),
  invite_code   text not null unique
                default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  organizer_id  uuid not null references auth.users (id) on delete cascade,
  status        text not null default 'aperto'
                check (status in ('aperto', 'estratto', 'rivelato')),
  created_at    timestamptz not null default now()
);
create index groups_organizer_id_idx on public.groups (organizer_id);

create table public.group_members (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar       text check (avatar is null or char_length(avatar) <= 16),
  user_id      uuid references auth.users (id) on delete set null,
  joined_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (group_id, user_id)
);
create unique index group_members_group_name_uidx
  on public.group_members (group_id, lower(display_name));
create index group_members_user_id_idx on public.group_members (user_id);

create table public.exclusions (
  group_id uuid not null references public.groups (id) on delete cascade,
  member_a uuid not null references public.group_members (id) on delete cascade,
  member_b uuid not null references public.group_members (id) on delete cascade,
  primary key (group_id, member_a, member_b),
  check (member_a < member_b) -- coppia non ordinata, salvata una volta sola
);
create index exclusions_member_a_idx on public.exclusions (member_a);
create index exclusions_member_b_idx on public.exclusions (member_b);

create table public.assignments (
  group_id           uuid not null references public.groups (id) on delete cascade,
  giver_member_id    uuid not null references public.group_members (id) on delete cascade,
  receiver_member_id uuid not null references public.group_members (id) on delete cascade,
  created_at         timestamptz not null default now(),
  primary key (group_id, giver_member_id),
  unique (group_id, receiver_member_id),
  check (giver_member_id <> receiver_member_id)
);
create index assignments_giver_idx on public.assignments (giver_member_id);
create index assignments_receiver_idx on public.assignments (receiver_member_id);

create table public.moodboard_items (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.group_members (id) on delete cascade,
  kind       text not null check (kind in ('foto', 'immagine_link', 'postit', 'palette', 'taglia')),
  content    jsonb not null default '{}'::jsonb,
  x          real not null default 0,
  y          real not null default 0,
  width      real not null default 160 check (width > 0),
  height     real not null default 160 check (height > 0),
  rotation   real not null default 0,
  z          integer not null default 0,
  updated_at timestamptz not null default now()
);
create index moodboard_items_member_id_idx on public.moodboard_items (member_id);

create table public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.group_members (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  link       text check (link is null or (char_length(link) <= 2000 and link ~* '^https?://')),
  created_at timestamptz not null default now()
);
create index wishlist_items_member_id_idx on public.wishlist_items (member_id);

create table public.wishlist_claims (
  item_id           uuid primary key references public.wishlist_items (id) on delete cascade,
  claimed_by_member uuid not null references public.group_members (id) on delete cascade,
  created_at        timestamptz not null default now()
);
create index wishlist_claims_claimed_by_idx on public.wishlist_claims (claimed_by_member);

-- ---------------------------------------------------------------------
-- Funzioni di supporto per le regole (schema privato)
-- ---------------------------------------------------------------------
-- Gruppi di cui l'utente collegato fa parte
create function private.my_group_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select gm.group_id from public.group_members gm
  where gm.user_id = (select auth.uid());
$$;

-- "Posti" (member id) dell'utente collegato, uno per gruppo
create function private.my_member_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select gm.id from public.group_members gm
  where gm.user_id = (select auth.uid());
$$;

-- Gruppi in cui l'utente collegato è organizzatore
create function private.my_organized_group_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select g.id from public.groups g
  where g.organizer_id = (select auth.uid());
$$;

-- Gruppo a cui appartiene un posto
create function private.group_of_member(p_member uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select gm.group_id from public.group_members gm where gm.id = p_member;
$$;

-- Stato di un gruppo
create function private.group_status(p_group uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select g.status from public.groups g where g.id = p_group;
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.groups          enable row level security;
alter table public.group_members   enable row level security;
alter table public.exclusions      enable row level security;
alter table public.assignments     enable row level security;
alter table public.moodboard_items enable row level security;
alter table public.wishlist_items  enable row level security;
alter table public.wishlist_claims enable row level security;

-- Grant: nessun accesso per anon; authenticated solo ciò che serve.
revoke all on public.groups, public.group_members, public.exclusions, public.assignments,
  public.moodboard_items, public.wishlist_items, public.wishlist_claims from anon, authenticated;

grant select on public.groups to authenticated;
grant update (name, budget_eur, exchange_date, theme) on public.groups to authenticated;

grant select on public.group_members to authenticated;
grant insert (group_id, display_name) on public.group_members to authenticated;
grant update (avatar) on public.group_members to authenticated;
grant delete on public.group_members to authenticated;

grant select, insert, delete on public.exclusions to authenticated;
grant select on public.assignments to authenticated;
grant select, insert, update, delete on public.moodboard_items to authenticated;
grant select, insert, update, delete on public.wishlist_items to authenticated;
grant select, insert, delete on public.wishlist_claims to authenticated;

-- groups ---------------------------------------------------------------
create policy "membri vedono il gruppo" on public.groups
  for select to authenticated
  using (id in (select private.my_group_ids()));

create policy "organizzatore modifica il gruppo aperto" on public.groups
  for update to authenticated
  using (organizer_id = (select auth.uid()) and status = 'aperto')
  with check (organizer_id = (select auth.uid()) and status = 'aperto');

-- group_members --------------------------------------------------------
create policy "membri vedono i membri del gruppo" on public.group_members
  for select to authenticated
  using (group_id in (select private.my_group_ids()));

create policy "organizzatore aggiunge nomi al gruppo aperto" on public.group_members
  for insert to authenticated
  with check (
    group_id in (select private.my_organized_group_ids())
    and private.group_status(group_id) = 'aperto'
  );

create policy "organizzatore toglie nomi non ancora presi" on public.group_members
  for delete to authenticated
  using (
    group_id in (select private.my_organized_group_ids())
    and private.group_status(group_id) = 'aperto'
    and user_id is null
  );

create policy "ognuno cambia il proprio avatar" on public.group_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- exclusions -----------------------------------------------------------
create policy "organizzatore vede le esclusioni" on public.exclusions
  for select to authenticated
  using (group_id in (select private.my_organized_group_ids()));

create policy "organizzatore aggiunge esclusioni prima dell'estrazione" on public.exclusions
  for insert to authenticated
  with check (
    group_id in (select private.my_organized_group_ids())
    and private.group_status(group_id) = 'aperto'
    and private.group_of_member(member_a) = group_id
    and private.group_of_member(member_b) = group_id
  );

create policy "organizzatore toglie esclusioni prima dell'estrazione" on public.exclusions
  for delete to authenticated
  using (
    group_id in (select private.my_organized_group_ids())
    and private.group_status(group_id) = 'aperto'
  );

-- assignments: SOLO il proprio abbinamento (o tutti dopo la rivelazione) --
create policy "chi regala vede solo il proprio abbinamento" on public.assignments
  for select to authenticated
  using (
    giver_member_id in (select private.my_member_ids())
    or (group_id in (select private.my_group_ids())
        and private.group_status(group_id) = 'rivelato')
  );

-- moodboard_items ------------------------------------------------------
create policy "il gruppo vede le moodboard" on public.moodboard_items
  for select to authenticated
  using (private.group_of_member(member_id) in (select private.my_group_ids()));

create policy "ognuno aggiunge alla propria moodboard" on public.moodboard_items
  for insert to authenticated
  with check (member_id in (select private.my_member_ids()));

create policy "ognuno modifica la propria moodboard" on public.moodboard_items
  for update to authenticated
  using (member_id in (select private.my_member_ids()))
  with check (member_id in (select private.my_member_ids()));

create policy "ognuno cancella dalla propria moodboard" on public.moodboard_items
  for delete to authenticated
  using (member_id in (select private.my_member_ids()));

-- wishlist_items -------------------------------------------------------
create policy "il gruppo vede le wishlist" on public.wishlist_items
  for select to authenticated
  using (private.group_of_member(member_id) in (select private.my_group_ids()));

create policy "ognuno aggiunge alla propria wishlist" on public.wishlist_items
  for insert to authenticated
  with check (member_id in (select private.my_member_ids()));

create policy "ognuno modifica la propria wishlist" on public.wishlist_items
  for update to authenticated
  using (member_id in (select private.my_member_ids()))
  with check (member_id in (select private.my_member_ids()));

create policy "ognuno cancella dalla propria wishlist" on public.wishlist_items
  for delete to authenticated
  using (member_id in (select private.my_member_ids()));

-- wishlist_claims: la spunta la vede solo chi l'ha messa ----------------
create policy "chi regala vede le proprie spunte" on public.wishlist_claims
  for select to authenticated
  using (claimed_by_member in (select private.my_member_ids()));

create policy "solo chi regala a quella persona mette la spunta" on public.wishlist_claims
  for insert to authenticated
  with check (
    claimed_by_member in (select private.my_member_ids())
    and exists (
      select 1
      from public.wishlist_items wi
      join public.assignments a on a.receiver_member_id = wi.member_id
      where wi.id = item_id and a.giver_member_id = claimed_by_member
    )
  );

create policy "chi regala toglie la propria spunta" on public.wishlist_claims
  for delete to authenticated
  using (claimed_by_member in (select private.my_member_ids()));

-- ---------------------------------------------------------------------
-- Funzioni chiamabili dal sito (RPC)
-- ---------------------------------------------------------------------

-- Lista dei nomi dal link d'invito (serve anche prima di aver fatto l'accesso).
-- Restituisce solo dati non sensibili; login_email è l'email finta generata dal sito.
create function public.get_lobby(p_invite_code text)
returns table (
  group_id uuid, group_name text, group_status text, exchange_date date,
  member_id uuid, display_name text, avatar text, claimed boolean, login_email text
)
language sql stable security definer set search_path = ''
as $$
  select g.id, g.name, g.status, g.exchange_date,
         gm.id, gm.display_name, gm.avatar, gm.user_id is not null, u.email::text
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  left join auth.users u on u.id = gm.user_id
  where g.invite_code = p_invite_code
  order by lower(gm.display_name);
$$;

-- Crea un gruppo con la lista dei nomi; l'organizzatore occupa subito il proprio posto.
create function public.create_group(
  p_name text, p_budget_eur integer, p_exchange_date date, p_theme text,
  p_my_name text, p_my_avatar text, p_other_names text[]
)
returns table (group_id uuid, invite_code text)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_group public.groups;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Devi aver fatto l''accesso per creare un gruppo.';
  end if;

  insert into public.groups (name, budget_eur, exchange_date, theme, organizer_id)
  values (trim(p_name), p_budget_eur, p_exchange_date, nullif(trim(p_theme), ''), v_uid)
  returning * into v_group;

  insert into public.group_members (group_id, display_name, avatar, user_id, joined_at)
  values (v_group.id, trim(p_my_name), p_my_avatar, v_uid, now());

  foreach v_name in array coalesce(p_other_names, '{}') loop
    if nullif(trim(v_name), '') is not null then
      insert into public.group_members (group_id, display_name)
      values (v_group.id, trim(v_name));
    end if;
  end loop;

  return query select v_group.id, v_group.invite_code;
end;
$$;

-- L'amico tocca il proprio nome: il posto diventa suo (solo se libero e gruppo aperto).
create function public.claim_member(p_invite_code text, p_member_id uuid, p_avatar text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_group public.groups;
  v_updated integer;
begin
  if v_uid is null then
    raise exception 'Devi aver fatto l''accesso.';
  end if;

  select * into v_group from public.groups where invite_code = p_invite_code;
  if not found then
    raise exception 'Link d''invito non valido.';
  end if;
  if v_group.status <> 'aperto' then
    raise exception 'L''estrazione è già stata fatta: non si può più entrare nel gruppo.';
  end if;
  if exists (select 1 from public.group_members
             where group_id = v_group.id and user_id = v_uid) then
    raise exception 'Sei già dentro questo gruppo.';
  end if;

  update public.group_members
  set user_id = v_uid, avatar = p_avatar, joined_at = now()
  where id = p_member_id and group_id = v_group.id and user_id is null;
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'Questo nome è già stato preso. Se è il tuo, chiedi all''organizzatore di liberarlo.';
  end if;
end;
$$;

-- L'organizzatore libera un nome preso per errore (solo prima dell'estrazione).
create function public.release_member(p_member_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_group public.groups;
begin
  select g.* into v_group
  from public.groups g join public.group_members gm on gm.group_id = g.id
  where gm.id = p_member_id;

  if not found or v_group.organizer_id is distinct from v_uid then
    raise exception 'Solo l''organizzatore può liberare un nome.';
  end if;
  if v_group.status <> 'aperto' then
    raise exception 'Dopo l''estrazione i nomi non si possono più liberare.';
  end if;
  if exists (select 1 from public.group_members where id = p_member_id and user_id = v_uid) then
    raise exception 'Non puoi liberare il tuo stesso nome.';
  end if;

  update public.group_members
  set user_id = null, avatar = null, joined_at = null
  where id = p_member_id;
end;
$$;

-- Estrazione: solo l'organizzatore, una volta sola, tutti entrati, almeno 3 persone.
-- Permutazione casuale senza auto-abbinamenti e nel rispetto delle esclusioni.
create function public.run_draw(p_group_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_group public.groups;
  v_members uuid[];
  v_shuffled uuid[];
  v_n integer;
  v_attempt integer;
  v_ok boolean;
  i integer;
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

  select array_agg(id) into v_members from public.group_members where group_id = p_group_id;
  v_n := coalesce(array_length(v_members, 1), 0);
  if v_n < 3 then
    raise exception 'Servono almeno 3 persone per l''estrazione.';
  end if;

  for v_attempt in 1..5000 loop
    select array_agg(m order by random()) into v_shuffled from unnest(v_members) m;
    v_ok := true;
    for i in 1..v_n loop
      if v_members[i] = v_shuffled[i] or exists (
        select 1 from public.exclusions e
        where e.group_id = p_group_id
          and e.member_a = least(v_members[i], v_shuffled[i])
          and e.member_b = greatest(v_members[i], v_shuffled[i])
      ) then
        v_ok := false;
        exit;
      end if;
    end loop;

    if v_ok then
      insert into public.assignments (group_id, giver_member_id, receiver_member_id)
      select p_group_id, v_members[k], v_shuffled[k] from generate_series(1, v_n) k;
      update public.groups set status = 'estratto' where id = p_group_id;
      return;
    end if;
  end loop;

  raise exception 'Con queste esclusioni non si trova un abbinamento valido. Prova a toglierne qualcuna.';
end;
$$;

-- Permessi sulle funzioni: di default nessuno, poi solo chi serve.
revoke execute on function public.get_lobby(text) from public;
revoke execute on function public.create_group(text, integer, date, text, text, text, text[]) from public, anon;
revoke execute on function public.claim_member(text, uuid, text) from public, anon;
revoke execute on function public.release_member(uuid) from public, anon;
revoke execute on function public.run_draw(uuid) from public, anon;

grant execute on function public.get_lobby(text) to anon, authenticated;
grant execute on function public.create_group(text, integer, date, text, text, text, text[]) to authenticated;
grant execute on function public.claim_member(text, uuid, text) to authenticated;
grant execute on function public.release_member(uuid) to authenticated;
grant execute on function public.run_draw(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Archivio foto della moodboard (privato)
-- Percorso dei file: <group_id>/<member_id>/<nome-file>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('moodboard', 'moodboard', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
on conflict (id) do nothing;

create policy "il gruppo vede le foto delle moodboard" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'moodboard'
    and (storage.foldername(name))[1]::uuid in (select private.my_group_ids())
  );

create policy "ognuno carica nella propria cartella" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'moodboard'
    and (storage.foldername(name))[2]::uuid in (select private.my_member_ids())
    and private.group_of_member((storage.foldername(name))[2]::uuid)
        = (storage.foldername(name))[1]::uuid
  );

create policy "ognuno sostituisce nella propria cartella" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'moodboard'
    and (storage.foldername(name))[2]::uuid in (select private.my_member_ids())
  )
  with check (
    bucket_id = 'moodboard'
    and (storage.foldername(name))[2]::uuid in (select private.my_member_ids())
  );

create policy "ognuno cancella dalla propria cartella" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'moodboard'
    and (storage.foldername(name))[2]::uuid in (select private.my_member_ids())
  );
