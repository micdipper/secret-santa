-- Feed del gruppo ("Novità") + post + reazioni + censura dei nomi (anche nella Santa Chat).
--
-- * Le voci del feed le scrive SOLO il database (trigger e funzioni): mai dal browser.
-- * Post: max 100 caratteri e/o una foto; agli altri si può solo reagire.
-- * Reazioni: una a testa per voce (🎄 ❤️ 😂 🔥 👀 🇮🇱); si cambia o si toglie.
-- * Regola ferrea anti-spoiler: i nomi dei partecipanti nei post e nella Santa Chat
--   diventano asterischi, anche scritti con trucchi (leet, lettere vicine, puntini, spazi, doppie, accenti).
--   Il testo originale non viene mai salvato.

-- =====================================================================
-- Censura dei nomi
-- =====================================================================

-- Una lettera "normalizzata": minuscola, senza accenti, leet → lettera (4→a, 3→e, 1→i, 0→o, 5→s, 7→t, 8→b, 9→g, 2→z, @ ! | $ + €…)
create function private.normalizza(p text)
returns text
language sql immutable set search_path = ''
as $$
  select translate(lower(p),
    'àáâäãåèéêëìíîïòóôöõùúûüçñ' || '4@31!|05$7+8296€',
    'aaaaaaeeeeiiiiooooouuuucn' || 'aaeiiiossttbzgge');
$$;

-- Toglie le lettere ripetute di fila ("giuuulia" → "giulia", "anna" → "ana")
create function private.comprimi(p text)
returns text
language sql immutable set search_path = ''
as $$
  select regexp_replace(p, '(.)\1+', '\1', 'g');
$$;

-- Due lettere "vicine": accanto sulla tastiera (qwerty, anche in diagonale) o nell'alfabeto
create function private.lettere_vicine(a text, b text)
returns boolean
language plpgsql immutable set search_path = ''
as $$
declare
  righe text[] := array['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  sposta real[] := array[0, 0.25, 0.75];
  ra int; rb int; xa real; xb real; r int;
begin
  if a = b then return true; end if;
  if abs(ascii(a) - ascii(b)) = 1 then return true; end if;
  for r in 1..3 loop
    if strpos(righe[r], a) > 0 then ra := r; xa := strpos(righe[r], a) + sposta[r]; end if;
    if strpos(righe[r], b) > 0 then rb := r; xb := strpos(righe[r], b) + sposta[r]; end if;
  end loop;
  if ra is null or rb is null then return false; end if;
  return (ra = rb and abs(xa - xb) = 1) or (abs(ra - rb) = 1 and abs(xa - xb) <= 0.75);
end;
$$;

-- La parola w (già normalizzata) è il nome n (normalizzato e compresso)?
-- Lettere sostituite con una vicina: 0 per nomi di 3 lettere, 1 fino a 5, 2 da 6 in su.
create function private.nome_simile(w text, n text)
returns boolean
language plpgsql immutable set search_path = ''
as $$
declare
  x text := private.comprimi(w);
  len int := char_length(n);
  diverse int := 0;
  i int;
begin
  if char_length(x) <> len then return false; end if;
  for i in 1..len loop
    if substr(x, i, 1) <> substr(n, i, 1) then
      if not private.lettere_vicine(substr(x, i, 1), substr(n, i, 1)) then return false; end if;
      diverse := diverse + 1;
    end if;
  end loop;
  return diverse <= case when len <= 3 then 0 when len <= 5 then 1 else 2 end;
end;
$$;

-- Sostituisce con asterischi i nomi dei partecipanti del gruppo (nome e cognome, parti di almeno 3 lettere).
create function private.censura_nomi(p_group uuid, p_testo text)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  nomi text[];
  n int := char_length(p_testo);
  car text[];          -- caratteri originali
  norm text[];         -- caratteri normalizzati
  t_ini int[] := '{}'; -- parole: inizio, fine (nel testo originale)
  t_fin int[] := '{}';
  ini int := 0;
  i int; j int; k int; a int; b int;
  w text; nome text; ok boolean;
begin
  if p_testo is null or n = 0 then return p_testo; end if;

  select array_agg(distinct x) into nomi
  from (
    select private.comprimi(regexp_replace(private.normalizza(tok), '[^a-z]', '', 'g')) as x
    from public.group_members gm, regexp_split_to_table(gm.display_name, '[^[:alpha:]]+') as tok
    where gm.group_id = p_group
  ) s
  where char_length(x) >= 3;
  if nomi is null then return p_testo; end if;

  car := regexp_split_to_array(p_testo, '');
  for i in 1..n loop
    norm[i] := private.normalizza(car[i]);
  end loop;

  -- parole = sequenze di lettere (anche leet)
  for i in 1..n + 1 loop
    if i <= n and norm[i] ~ '^[a-z]$' then
      if ini = 0 then ini := i; end if;
    elsif ini > 0 then
      t_ini := t_ini || ini; t_fin := t_fin || (i - 1); ini := 0;
    end if;
  end loop;

  -- finestre di 1..15 parole vicine: una parola intera, oppure un nome spezzato
  -- ("giu lia", "g.i.u.l.i.a", "g i u l i a")
  for i in 1..coalesce(array_length(t_ini, 1), 0) loop
    for j in i..least(i + 14, array_length(t_ini, 1)) loop
      -- più parole: o 2 pezzi da almeno 2 lettere, o tanti pezzi da 1-2 lettere (lettere spaziate)
      if j > i then
        ok := true;
        for k in i..j loop
          if (j - i = 1 and t_fin[k] - t_ini[k] + 1 < 2) or (j - i >= 2 and t_fin[k] - t_ini[k] + 1 > 2) then ok := false; end if;
        end loop;
        if not ok then continue; end if;
      end if;
      -- con e senza i simboli leet ai bordi ("giulia!" → "giulia", "@nna" resta "anna")
      for a in 0..1 loop
        for b in 0..1 loop
          w := '';
          for k in i..j loop
            w := w || array_to_string(norm[t_ini[k]:t_fin[k]], '');
          end loop;
          if a = 1 then
            if car[t_ini[i]] ~ '[[:alnum:]]' then continue; end if;
            w := substr(w, 2);
          end if;
          if b = 1 then
            if car[t_fin[j]] ~ '[[:alnum:]]' then continue; end if;
            w := substr(w, 1, char_length(w) - 1);
          end if;
          foreach nome in array nomi loop
            if (j = i or char_length(nome) >= 4) and private.nome_simile(w, nome) then
              for k in t_ini[i] + a..t_fin[j] - b loop
                if norm[k] ~ '^[a-z]$' then car[k] := '*'; end if;
              end loop;
            end if;
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;

  return array_to_string(car, '');
end;
$$;

-- Santa Chat: stessa funzione di prima, ma il testo passa dalla censura dei nomi
create or replace function public.invia_santa_message(p_group uuid, p_dal_babbo boolean, p_testo text)
returns public.santa_messages
language plpgsql security definer set search_path = ''
as $$
declare
  v_me   uuid;
  v_dest uuid;
  v_t    text := btrim(coalesce(p_testo, ''));
  v_riga public.santa_messages;
begin
  select gm.id into v_me from public.group_members gm
  where gm.group_id = p_group and gm.user_id = (select auth.uid());
  if v_me is null then
    raise exception 'Non fai parte di questo gruppo';
  end if;
  if private.group_status(p_group) = 'aperto' then
    raise exception 'La Santa Chat si apre dopo l''estrazione';
  end if;
  if char_length(v_t) = 0 then
    raise exception 'Il messaggio è vuoto';
  end if;
  if char_length(v_t) > 500 then
    raise exception 'Il messaggio è troppo lungo (massimo 500 caratteri)';
  end if;

  if p_dal_babbo then
    select a.receiver_member_id into v_dest from public.assignments a
    where a.group_id = p_group and a.giver_member_id = v_me;
    if v_dest is null then
      raise exception 'Non hai ancora una persona a cui scrivere';
    end if;
  else
    v_dest := v_me;
  end if;

  insert into public.santa_messages (group_id, receiver_member_id, dal_babbo, testo)
  values (p_group, v_dest, p_dal_babbo, private.censura_nomi(p_group, v_t))
  returning * into v_riga;
  return v_riga;
end;
$$;

-- =====================================================================
-- Feed
-- =====================================================================
create table public.feed_events (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references public.groups (id) on delete cascade,
  member_id uuid references public.group_members (id) on delete cascade, -- vuoto per l'estrazione
  tipo      text not null check (tipo in ('creato', 'entrato', 'estrazione', 'busta', 'bacheca', 'totem', 'post')),
  dati      jsonb not null default '{}'::jsonb, -- post: {testo, foto}; totem: {profilo}
  quando    timestamptz not null default now()
);
create index feed_events_group_idx on public.feed_events (group_id, quando desc);
create index feed_events_member_idx on public.feed_events (member_id);

create table public.feed_reactions (
  event_id  uuid not null references public.feed_events (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  group_id  uuid not null references public.groups (id) on delete cascade,
  emoji     text not null check (emoji in ('🎄', '❤️', '😂', '🔥', '👀', '🇮🇱')),
  created_at timestamptz not null default now(),
  primary key (event_id, member_id)
);
create index feed_reactions_member_idx on public.feed_reactions (member_id);
create index feed_reactions_group_idx on public.feed_reactions (group_id);

alter table public.feed_events enable row level security;
alter table public.feed_reactions enable row level security;
revoke all on public.feed_events, public.feed_reactions from anon, authenticated;
grant select on public.feed_events, public.feed_reactions to authenticated;

create policy "il gruppo legge il suo feed" on public.feed_events
  for select to authenticated using (group_id in (select private.my_group_ids()));
create policy "il gruppo legge le reazioni" on public.feed_reactions
  for select to authenticated using (group_id in (select private.my_group_ids()));

-- ---------- voci automatiche (trigger) ----------
create function private.feed_da_membri()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.user_id is not null then
      insert into public.feed_events (group_id, member_id, tipo) values (new.group_id, new.id, 'creato');
    end if;
    return null;
  end if;
  -- entra dall'invito / viene liberato dall'organizzatore
  if old.user_id is null and new.user_id is not null then
    insert into public.feed_events (group_id, member_id, tipo) values (new.group_id, new.id, 'entrato');
  elsif old.user_id is not null and new.user_id is null then
    delete from public.feed_events where member_id = new.id and tipo = 'entrato';
  end if;
  -- apre la busta
  if old.envelope_opened_at is null and new.envelope_opened_at is not null then
    insert into public.feed_events (group_id, member_id, tipo) values (new.group_id, new.id, 'busta');
  end if;
  return null;
end;
$$;
create trigger feed_membri after insert or update of user_id, envelope_opened_at on public.group_members
  for each row execute function private.feed_da_membri();

create function private.feed_da_gruppo()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.status = 'aperto' and new.status <> 'aperto' then
    insert into public.feed_events (group_id, tipo) values (new.id, 'estrazione');
  end if;
  return null;
end;
$$;
create trigger feed_gruppo after update of status on public.groups
  for each row execute function private.feed_da_gruppo();

-- Bacheca: si salva da sola a ogni gesto, quindi entro 1 ora la stessa voce torna in cima invece di moltiplicarsi.
create function private.feed_da_bacheca()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_member uuid := coalesce(new.member_id, old.member_id);
  v_group uuid := private.group_of_member(v_member);
begin
  if v_group is null then return null; end if;
  update public.feed_events set quando = now()
  where member_id = v_member and tipo = 'bacheca' and quando > now() - interval '1 hour';
  if not found then
    insert into public.feed_events (group_id, member_id, tipo) values (v_group, v_member, 'bacheca');
  end if;
  return null;
end;
$$;
create trigger feed_bacheca after insert or update or delete on public.moodboard_items
  for each row execute function private.feed_da_bacheca();

create function private.feed_da_totem()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.feed_events (group_id, member_id, tipo, dati)
  select new.group_id, gm.id, 'totem', jsonb_build_object('profilo', new.profilo)
  from public.group_members gm where gm.group_id = new.group_id and gm.user_id = new.user_id;
  return null;
end;
$$;
create trigger feed_totem after insert on public.quiz_results
  for each row execute function private.feed_da_totem();

-- ---------- post, reazioni ----------
-- Post: testo (max 100 caratteri, nomi censurati) e/o una foto già caricata in moodboard/<gruppo>/<me>/…jpg
create function public.pubblica_post(p_group uuid, p_testo text, p_foto text)
returns public.feed_events
language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid;
  v_t text := nullif(btrim(coalesce(p_testo, '')), '');
  v_riga public.feed_events;
begin
  select gm.id into v_me from public.group_members gm
  where gm.group_id = p_group and gm.user_id = (select auth.uid());
  if v_me is null then
    raise exception 'Non fai parte di questo gruppo';
  end if;
  if v_t is null and p_foto is null then
    raise exception 'Scrivi qualcosa o scegli una foto';
  end if;
  if char_length(v_t) > 100 then
    raise exception 'Massimo 100 caratteri';
  end if;
  if p_foto is not null and (
       p_foto !~ ('^' || p_group || '/' || v_me || '/[0-9a-f-]+\.jpg$')
       or not exists (select 1 from storage.objects o where o.bucket_id = 'moodboard' and o.name = p_foto)) then
    raise exception 'Foto non valida';
  end if;
  insert into public.feed_events (group_id, member_id, tipo, dati)
  values (p_group, v_me, 'post', jsonb_strip_nulls(jsonb_build_object('testo', private.censura_nomi(p_group, v_t), 'foto', p_foto)))
  returning * into v_riga;
  return v_riga;
end;
$$;

-- Si può cancellare solo il proprio post (la foto la toglie il sito dall'archivio)
create function public.elimina_post(p_event uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.feed_events
  where id = p_event and tipo = 'post' and member_id in (select private.my_member_ids());
$$;

-- Reazione: una a testa. Stessa emoji = la togli; altra emoji = la cambi; null = la togli.
create function public.reagisci(p_event uuid, p_emoji text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
  v_me uuid;
begin
  select e.group_id into v_group from public.feed_events e where e.id = p_event;
  select gm.id into v_me from public.group_members gm where gm.group_id = v_group and gm.user_id = (select auth.uid());
  if v_me is null then
    raise exception 'Non fai parte di questo gruppo';
  end if;
  if p_emoji is null or exists (select 1 from public.feed_reactions r where r.event_id = p_event and r.member_id = v_me and r.emoji = p_emoji) then
    delete from public.feed_reactions where event_id = p_event and member_id = v_me;
  else
    insert into public.feed_reactions (event_id, member_id, group_id, emoji) values (p_event, v_me, v_group, p_emoji)
    on conflict (event_id, member_id) do update set emoji = excluded.emoji, created_at = now();
  end if;
end;
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
revoke execute on function public.pubblica_post(uuid, text, text), public.elimina_post(uuid), public.reagisci(uuid, text) from public, anon;
grant execute on function public.pubblica_post(uuid, text, text), public.elimina_post(uuid), public.reagisci(uuid, text) to authenticated;

-- =====================================================================
-- Feed iniziale: quello che è già successo
-- =====================================================================
insert into public.feed_events (group_id, member_id, tipo, quando)
select gm.group_id, gm.id, case when g.organizer_id = gm.user_id then 'creato' else 'entrato' end, coalesce(gm.joined_at, gm.created_at)
from public.group_members gm join public.groups g on g.id = gm.group_id
where gm.user_id is not null;

insert into public.feed_events (group_id, tipo, quando)
select g.id, 'estrazione', coalesce((select min(a.created_at) from public.assignments a where a.group_id = g.id), now())
from public.groups g where g.status <> 'aperto';

insert into public.feed_events (group_id, member_id, tipo, quando)
select gm.group_id, gm.id, 'busta', gm.envelope_opened_at
from public.group_members gm where gm.envelope_opened_at is not null;

insert into public.feed_events (group_id, member_id, tipo, quando)
select gm.group_id, mi.member_id, 'bacheca', max(mi.updated_at)
from public.moodboard_items mi join public.group_members gm on gm.id = mi.member_id
group by gm.group_id, mi.member_id;

insert into public.feed_events (group_id, member_id, tipo, dati, quando)
select r.group_id, gm.id, 'totem', jsonb_build_object('profilo', r.profilo), r.created_at
from public.quiz_results r join public.group_members gm on gm.group_id = r.group_id and gm.user_id = r.user_id;
