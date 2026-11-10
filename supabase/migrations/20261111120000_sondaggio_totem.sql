-- SONDAGGIO TOTEM (CLAUDE.md, punto 9ter)
-- Due parametri fissi (impegno, esigenza), 4 risposte con punti fissi (+2 +1 −1 −2), 5 profili fissi.
-- I punti non arrivano mai al browser dei partecipanti: il totem si calcola qui, lato server.

alter table public.groups add column quiz_salvato_at timestamptz;
alter table public.group_members add column quiz_rifiutato_at timestamptz;

create table public.quiz_questions (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  parametro  text not null check (parametro in ('impegno', 'esigenza')),
  ordine     integer not null,
  testo      text not null check (char_length(testo) between 1 and 300)
);
create index on public.quiz_questions (group_id);

create table public.quiz_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  testo       text not null check (char_length(testo) between 1 and 200),
  punti       integer not null check (punti in (2, 1, -1, -2)),
  unique (question_id, punti)
);
create index on public.quiz_answers (question_id);

create table public.quiz_totems (
  group_id    uuid not null references public.groups (id) on delete cascade,
  profilo     text not null check (profilo in ('IMPEGNO_ALTO_RICEVE_TUTTO', 'IMPEGNO_ALTO_ESIGENTE', 'IMPEGNO_BASSO_RICEVE_TUTTO', 'IMPEGNO_BASSO_ESIGENTE', 'BONUS')),
  nome        text not null check (char_length(nome) between 1 and 60),
  descrizione text check (descrizione is null or char_length(descrizione) <= 400), -- vuota = quella predefinita
  primary key (group_id, profilo)
);

create table public.quiz_results (
  group_id           uuid not null references public.groups (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,
  punteggio_impegno  integer not null,
  punteggio_esigenza integer not null,
  profilo            text not null,
  created_at         timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_totems enable row level security;
alter table public.quiz_results enable row level security;
revoke all on public.quiz_questions, public.quiz_answers, public.quiz_totems, public.quiz_results from anon, authenticated;

-- le domande e i totem li vedono i membri del gruppo
grant select on public.quiz_questions, public.quiz_totems to authenticated;
create policy "membri vedono le domande" on public.quiz_questions for select to authenticated
  using (group_id in (select private.my_group_ids()));
create policy "membri vedono i totem" on public.quiz_totems for select to authenticated
  using (group_id in (select private.my_group_ids()));
-- risposte con i punti: solo l'organizzatore (chi risponde le riceve da get_quiz, senza punti)
grant select on public.quiz_answers to authenticated;
create policy "solo l'organizzatore vede i punti" on public.quiz_answers for select to authenticated
  using (question_id in (select q.id from public.quiz_questions q where q.group_id in (select private.my_organized_group_ids())));
-- risultati: il gruppo vede solo il profilo (i punteggi no)
grant select (group_id, user_id, profilo, created_at) on public.quiz_results to authenticated;
create policy "membri vedono i totem del gruppo" on public.quiz_results for select to authenticated
  using (group_id in (select private.my_group_ids()));

-- Salva il sondaggio (solo l'organizzatore).
-- p_domande: [{parametro, testo, risposte: {"2": "...", "1": "...", "-1": "...", "-2": "..."}}, ...]
-- p_totem:   [{profilo, nome, descrizione}, ...]  (tutti e 5)
-- Dopo la prima risposta le domande non si toccano più: si aggiornano solo i totem.
create function public.save_quiz(p_group_id uuid, p_domande jsonb, p_totem jsonb)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_d jsonb;
  v_t jsonb;
  v_q uuid;
  v_i integer := 0;
  v_imp integer;
  v_esi integer;
  v_p text;
begin
  if not exists (select 1 from public.groups where id = p_group_id and organizer_id = v_uid) then
    raise exception 'Solo l''organizzatore può preparare il sondaggio.';
  end if;

  -- i totem: sempre modificabili
  if jsonb_array_length(coalesce(p_totem, '[]'::jsonb)) <> 5 then
    raise exception 'Servono tutti e 5 i totem.';
  end if;
  for v_t in select * from jsonb_array_elements(p_totem) loop
    insert into public.quiz_totems (group_id, profilo, nome, descrizione)
    values (p_group_id, v_t->>'profilo', trim(v_t->>'nome'), nullif(trim(coalesce(v_t->>'descrizione', '')), ''))
    on conflict (group_id, profilo) do update set nome = excluded.nome, descrizione = excluded.descrizione;
  end loop;

  -- le domande: solo finché nessuno ha risposto
  if exists (select 1 from public.quiz_results where group_id = p_group_id) then
    update public.groups set quiz_salvato_at = coalesce(quiz_salvato_at, now()) where id = p_group_id;
    return;
  end if;
  select count(*) filter (where d->>'parametro' = 'impegno'), count(*) filter (where d->>'parametro' = 'esigenza')
    into v_imp, v_esi from jsonb_array_elements(p_domande) d;
  if v_imp <> v_esi or v_imp < 2 or v_imp > 5 then
    raise exception 'Servono lo stesso numero di domande per i due parametri, da 2 a 5 ciascuno.';
  end if;

  delete from public.quiz_questions where group_id = p_group_id;
  for v_d in select * from jsonb_array_elements(p_domande) loop
    v_i := v_i + 1;
    if coalesce(trim(v_d->>'testo'), '') = '' then
      raise exception 'La domanda % è vuota.', v_i;
    end if;
    insert into public.quiz_questions (group_id, parametro, ordine, testo)
    values (p_group_id, v_d->>'parametro', v_i, trim(v_d->>'testo')) returning id into v_q;
    foreach v_p in array array['2', '1', '-1', '-2'] loop
      if coalesce(trim(v_d->'risposte'->>v_p), '') = '' then
        raise exception 'Nella domanda % manca una risposta.', v_i;
      end if;
      insert into public.quiz_answers (question_id, testo, punti) values (v_q, trim(v_d->'risposte'->>v_p), v_p::integer);
    end loop;
  end loop;
  update public.groups set quiz_salvato_at = now() where id = p_group_id;
end;
$$;

-- Il sondaggio per chi risponde: domande in ordine, risposte mescolate, SENZA punti.
create function public.get_quiz(p_group_id uuid)
returns table (question_id uuid, ordine integer, domanda text, answer_id uuid, risposta text)
language sql volatile security definer set search_path = ''
as $$
  select q.id, q.ordine, q.testo, a.id, a.testo
  from public.quiz_questions q
  join public.quiz_answers a on a.question_id = q.id
  where q.group_id = p_group_id and p_group_id in (select private.my_group_ids())
  order by q.ordine, random();
$$;

-- Consegna le risposte: calcolo dei punti e del profilo qui, una volta sola per persona.
create function public.submit_quiz(p_group_id uuid, p_answer_ids uuid[])
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_imp integer;
  v_esi integer;
  v_prof text;
begin
  if v_uid is null or p_group_id not in (select private.my_group_ids()) then
    raise exception 'Non fai parte di questo gruppo.';
  end if;
  if exists (select 1 from public.quiz_results where group_id = p_group_id and user_id = v_uid) then
    raise exception 'Hai già fatto il sondaggio: il verdetto è definitivo.';
  end if;
  -- esattamente una risposta per ogni domanda del gruppo
  if (select count(distinct a.question_id) from public.quiz_answers a join public.quiz_questions q on q.id = a.question_id
      where a.id = any(p_answer_ids) and q.group_id = p_group_id) <> (select count(*) from public.quiz_questions where group_id = p_group_id)
     or cardinality(p_answer_ids) <> (select count(*) from public.quiz_questions where group_id = p_group_id) then
    raise exception 'Rispondi a tutte le domande.';
  end if;
  select coalesce(sum(a.punti) filter (where q.parametro = 'impegno'), 0), coalesce(sum(a.punti) filter (where q.parametro = 'esigenza'), 0)
    into v_imp, v_esi
  from public.quiz_answers a join public.quiz_questions q on q.id = a.question_id
  where a.id = any(p_answer_ids) and q.group_id = p_group_id;
  v_prof := case
    when v_imp = 0 or v_esi = 0 then 'BONUS'
    when v_imp > 0 and v_esi < 0 then 'IMPEGNO_ALTO_RICEVE_TUTTO'
    when v_imp > 0 and v_esi > 0 then 'IMPEGNO_ALTO_ESIGENTE'
    when v_imp < 0 and v_esi < 0 then 'IMPEGNO_BASSO_RICEVE_TUTTO'
    else 'IMPEGNO_BASSO_ESIGENTE'
  end;
  insert into public.quiz_results (group_id, user_id, punteggio_impegno, punteggio_esigenza, profilo)
  values (p_group_id, v_uid, v_imp, v_esi, v_prof);
  return v_prof;
end;
$$;

-- "Adesso no": me lo ricordo (gli altri vedranno che non vuole essere profilat*). Si può sempre fare dopo.
create function public.rifiuta_quiz(p_group_id uuid)
returns void
language sql volatile security definer set search_path = ''
as $$
  update public.group_members set quiz_rifiutato_at = coalesce(quiz_rifiutato_at, now())
  where group_id = p_group_id and user_id = (select auth.uid());
$$;

revoke execute on function public.save_quiz(uuid, jsonb, jsonb), public.get_quiz(uuid), public.submit_quiz(uuid, uuid[]), public.rifiuta_quiz(uuid) from public, anon;
grant execute on function public.save_quiz(uuid, jsonb, jsonb), public.get_quiz(uuid), public.submit_quiz(uuid, uuid[]), public.rifiuta_quiz(uuid) to authenticated;

-- Il link d'invito funziona solo quando il sondaggio è salvato
create or replace function public.get_lobby(p_invite_code text)
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
  where g.invite_code = p_invite_code and g.quiz_salvato_at is not null
  order by lower(gm.display_name);
$$;

-- Premi (gerarchia di Marzia, 11/11):
--   stellina (Così ti ricordi i compleanni) = sondaggio completato
--   sciarpa  (Lupetto grigio)               = almeno 10 cose sulla bacheca, tra cui foto/immagine, punto croce, simbolo, parola e texture
--   fiocco   (È un bracciale o una collana?) = busta aperta
--   super    (Taglio Super)                  = chattare col proprio Babbo Natale (chat: Fase 2, per ora mai)
--   olografico                               = tutti e quattro i premi qui sopra
create or replace function private.unlocked_accessories(p_uid uuid)
returns text[]
language sql stable security definer set search_path = ''
as $$
  with base as (
    select array_remove(array[
      case when exists (select 1 from public.quiz_results r where r.user_id = p_uid) then 'stellina' end,
      case when exists (
        select 1 from public.group_members gm
        where gm.user_id = p_uid
          and (select count(*) from public.moodboard_items mi where mi.member_id = gm.id) >= 10
          and exists (select 1 from public.moodboard_items mi where mi.member_id = gm.id and mi.kind in ('foto', 'immagine_link'))
          and exists (select 1 from public.moodboard_items mi where mi.member_id = gm.id and mi.kind = 'ricamo' and mi.content->>'celle' ~ '[0-9]')
          and exists (select 1 from public.moodboard_items mi where mi.member_id = gm.id and mi.kind = 'toppa' and mi.content->>'tipo' = 'simbolo')
          and exists (select 1 from public.moodboard_items mi where mi.member_id = gm.id and mi.kind = 'toppa' and mi.content->>'tipo' = 'parola')
          and exists (select 1 from public.moodboard_items mi where mi.member_id = gm.id and mi.kind = 'toppa' and mi.content->>'tipo' = 'palette')
      ) then 'sciarpa' end,
      case when exists (select 1 from public.group_members gm where gm.user_id = p_uid and gm.envelope_opened_at is not null) then 'fiocco' end,
      null::text -- 'super': arriverà con la chat
    ], null) as a
  )
  select case when a @> array['stellina', 'sciarpa', 'fiocco', 'super']::text[] then array_append(a, 'olografico') else a end from base;
$$;
