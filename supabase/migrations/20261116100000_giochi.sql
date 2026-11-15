-- Calendario dei giochi (PIANO-GIOCHI.md, blocco 1).
-- 5 giochi, uno al giorno da T−4 al giorno dello scambio (T), mezzanotte–mezzanotte ora di Roma.
-- 3 tentativi a testa, conta il migliore, vincitore annunciato alla chiusura.

-- ---------------------------------------------------------------------
-- Orologio (con ora finta SOLO per i test fatti da postgres, mai dal sito)
-- ---------------------------------------------------------------------
create function private.adesso()
returns timestamptz
language sql stable set search_path = ''
as $$
  select case when session_user = 'postgres'
    then coalesce(nullif(current_setting('giochi.ora_finta', true), '')::timestamptz, now())
    else now() end;
$$;

create function private.oggi_roma()
returns date
language sql stable set search_path = ''
as $$
  select (private.adesso() at time zone 'Europe/Rome')::date;
$$;

-- ---------------------------------------------------------------------
-- Gruppi: giochi attivi e data bloccata
-- ---------------------------------------------------------------------
alter table public.groups add column giochi_attivi boolean not null default false;

update public.groups
set giochi_attivi = (exchange_date is not null and exchange_date - private.oggi_roma() >= 6);

-- La data si blocca da T−5 (solo se i giochi sono attivi: è per loro che si blocca).
-- A ogni cambio di data si ricalcola se i giochi partono (servono almeno 6 giorni).
create function private.groups_data_e_giochi()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.exchange_date is not distinct from old.exchange_date then
      return new;
    end if;
    if old.giochi_attivi and private.oggi_roma() >= old.exchange_date - 5 then
      raise exception 'La data è bloccata: i giochi stanno per iniziare.';
    end if;
  end if;
  new.giochi_attivi := new.exchange_date is not null and new.exchange_date - private.oggi_roma() >= 6;
  return new;
end;
$$;

create trigger groups_data_e_giochi
before insert or update of exchange_date on public.groups
for each row execute function private.groups_data_e_giochi();

-- ---------------------------------------------------------------------
-- Partite
-- ---------------------------------------------------------------------
create table public.game_runs (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  member_id   uuid not null references public.group_members (id) on delete cascade,
  game        smallint not null check (game between 1 and 5),
  tentativo   smallint not null check (tentativo between 1 and 3),
  seme        integer not null,
  started_at  timestamptz not null,
  finished_at timestamptz,
  score       integer check (score is null or score >= 0), -- null = in corso o abbandonata (vale 0)
  stats       jsonb,
  unique (member_id, game, tentativo)
);
create index game_runs_classifica_idx on public.game_runs (group_id, game, score desc, finished_at);

alter table public.game_runs enable row level security;

-- Tutto il gruppo vede le partite (classifica in diretta). Si scrive solo dalle funzioni qui sotto.
create policy game_runs_select on public.game_runs
  for select to authenticated
  using (group_id in (select private.my_group_ids()));

revoke all on public.game_runs from anon, authenticated;
grant select on public.game_runs to authenticated;

alter publication supabase_realtime add table public.game_runs;

-- ---------------------------------------------------------------------
-- Regole dei giochi (limiti larghi, da ricontrollare dopo la taratura: PIANO-GIOCHI.md sezione 6)
-- ---------------------------------------------------------------------
create function private.regole_gioco(p_game integer)
returns table (durata_min integer, durata_max integer, score_max integer, punti_al_secondo integer)
language sql immutable set search_path = ''
as $$
  select r.durata_min, r.durata_max, r.score_max, r.punti_al_secondo from (values
    (1, 3,  50,  8000, 260),
    (2, 5, 600, 12000,  60),
    (3, 2, 600,  6000,  25),
    (4, 3, 300, 20000, 120),
    (5, 5,  65,  6000, 160)
  ) as r (game, durata_min, durata_max, score_max, punti_al_secondo)
  where r.game = p_game
$$;

-- Quando apre e chiude il gioco k (null se il gruppo non ha i giochi)
create function private.finestra_gioco(p_group uuid, p_game integer)
returns table (apre timestamptz, chiude timestamptz)
language sql stable security definer set search_path = ''
as $$
  select ((g.exchange_date - (5 - p_game))::timestamp at time zone 'Europe/Rome'),
         ((g.exchange_date - (5 - p_game) + 1)::timestamp at time zone 'Europe/Rome')
  from public.groups g
  where g.id = p_group and g.giochi_attivi and g.exchange_date is not null and p_game between 1 and 5
$$;

-- Il gioco è deciso quando è chiuso e nessuna partita iniziata prima della chiusura può ancora finire.
create function private.gioco_deciso(p_group uuid, p_game integer)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select private.adesso() >= f.chiude
       and not exists (
         select 1 from public.game_runs r, private.regole_gioco(p_game) reg
         where r.group_id = p_group and r.game = p_game and r.score is null
           and r.started_at + make_interval(secs => reg.durata_max + 60) > private.adesso())
    from private.finestra_gioco(p_group, p_game) f
  ), false)
$$;

-- Vincitore: punteggio più alto (> 0); a parità chi l'ha fatto prima. Null finché il gioco non è deciso.
create function private.vincitore_gioco(p_group uuid, p_game integer)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select case when private.gioco_deciso(p_group, p_game) then (
    select r.member_id from public.game_runs r
    where r.group_id = p_group and r.game = p_game and r.score > 0
    order by r.score desc, r.finished_at asc
    limit 1
  ) end
$$;

-- ---------------------------------------------------------------------
-- Funzioni per il sito
-- ---------------------------------------------------------------------
-- Il calendario: stato dei 5 giochi, i miei tentativi, i vincitori, l'ora del server (per i countdown)
create function public.get_giochi(p_group_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_member uuid;
  v_ora timestamptz := private.adesso();
begin
  select gm.id into v_member from public.group_members gm where gm.group_id = p_group_id and gm.user_id = v_uid;
  if v_uid is null or v_member is null then
    raise exception 'Non fai parte di questo gruppo.';
  end if;
  return jsonb_build_object(
    'attivi', (select g.giochi_attivi from public.groups g where g.id = p_group_id),
    'ora_server', v_ora,
    'mio_member_id', v_member,
    'giochi', coalesce((
      select jsonb_agg(jsonb_build_object(
        'n', k,
        'stato', case when v_ora < f.apre then 'bloccato' when v_ora < f.chiude then 'aperto' else 'chiuso' end,
        'apre_alle', f.apre,
        'chiude_alle', f.chiude,
        'miei_tentativi', (select count(*) from public.game_runs r where r.member_id = v_member and r.game = k),
        'deciso', private.gioco_deciso(p_group_id, k),
        'vincitore_member_id', private.vincitore_gioco(p_group_id, k)
      ) order by k)
      from generate_series(1, 5) k, private.finestra_gioco(p_group_id, k) f
    ), '[]'::jsonb)
  );
end;
$$;

-- "Gioca": crea la partita (conta subito come tentativo) e dà il seme
create function public.start_game_run(p_group_id uuid, p_game integer)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_member uuid;
  v_ora timestamptz := private.adesso();
  v_apre timestamptz;
  v_chiude timestamptz;
  v_fatti integer;
  v_run public.game_runs;
begin
  select gm.id into v_member from public.group_members gm where gm.group_id = p_group_id and gm.user_id = v_uid;
  if v_uid is null or v_member is null then
    raise exception 'Non fai parte di questo gruppo.';
  end if;
  select f.apre, f.chiude into v_apre, v_chiude from private.finestra_gioco(p_group_id, p_game) f;
  if v_apre is null then
    raise exception 'Questo gruppo non ha i giochi.';
  end if;
  if v_ora < v_apre then
    raise exception 'Questo gioco non è ancora aperto.';
  end if;
  if v_ora >= v_chiude then
    raise exception 'Questo gioco è chiuso.';
  end if;
  -- una partita alla volta per persona e gioco (evita doppi tocchi e due telefoni insieme)
  perform pg_advisory_xact_lock(hashtextextended(v_member::text || ':' || p_game, 0));
  select count(*) into v_fatti from public.game_runs r where r.member_id = v_member and r.game = p_game;
  if v_fatti >= 3 then
    raise exception 'Hai finito i tentativi per questo gioco.';
  end if;
  insert into public.game_runs (group_id, member_id, game, tentativo, seme, started_at)
  values (p_group_id, v_member, p_game, v_fatti + 1, (random() * 2147483646)::integer, v_ora)
  returning * into v_run;
  return jsonb_build_object('id', v_run.id, 'seme', v_run.seme, 'tentativo', v_run.tentativo, 'rimasti', 3 - v_run.tentativo);
end;
$$;

-- Fine partita: il punteggio arriva dal telefono, qui si controlla che sia plausibile.
-- Se non lo è la partita vale 0 ("valida": false), senza dire perché.
create function public.finish_game_run(p_run_id uuid, p_score integer, p_stats jsonb default null)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_ora timestamptz := private.adesso();
  v_run public.game_runs;
  v_reg record;
  v_secondi numeric;
  v_valida boolean;
  v_score integer;
  v_prima integer;
  v_posizione integer;
begin
  select r.* into v_run
  from public.game_runs r join public.group_members gm on gm.id = r.member_id
  where r.id = p_run_id and gm.user_id = v_uid
  for update of r;
  if v_uid is null or v_run.id is null then
    raise exception 'Partita non trovata.';
  end if;
  if v_run.finished_at is not null then
    raise exception 'Questa partita è già finita.';
  end if;
  select * into v_reg from private.regole_gioco(v_run.game);
  v_secondi := extract(epoch from v_ora - v_run.started_at);
  v_valida := p_score is not null
    and p_score between 0 and v_reg.score_max
    and v_secondi >= v_reg.durata_min
    and v_secondi <= v_reg.durata_max + 60
    and p_score <= v_reg.punti_al_secondo * v_secondi + 100;
  v_score := case when v_valida then p_score else 0 end;

  select coalesce(max(r.score), 0) into v_prima
  from public.game_runs r where r.member_id = v_run.member_id and r.game = v_run.game and r.id <> v_run.id;

  update public.game_runs
  set score = v_score, finished_at = v_ora,
      stats = case when p_stats is not null and pg_column_size(p_stats) <= 2000 then p_stats end
  where id = v_run.id;

  -- posizione in classifica (col mio punteggio migliore)
  select count(*) + 1 into v_posizione
  from (
    select r.member_id, max(r.score) as migliore from public.game_runs r
    where r.group_id = v_run.group_id and r.game = v_run.game and r.member_id <> v_run.member_id
    group by r.member_id
  ) altri
  where altri.migliore > greatest(v_score, v_prima);

  return jsonb_build_object(
    'valida', v_valida,
    'score', v_score,
    'record', v_score > v_prima,
    'migliore', greatest(v_score, v_prima),
    'posizione', v_posizione,
    'rimasti', 3 - v_run.tentativo
  );
end;
$$;

revoke execute on function private.adesso() from public, anon, authenticated;
revoke execute on function private.oggi_roma() from public, anon, authenticated;
revoke execute on function private.groups_data_e_giochi() from public, anon, authenticated;
revoke execute on function private.regole_gioco(integer) from public, anon, authenticated;
revoke execute on function private.finestra_gioco(uuid, integer) from public, anon, authenticated;
revoke execute on function private.gioco_deciso(uuid, integer) from public, anon, authenticated;
revoke execute on function private.vincitore_gioco(uuid, integer) from public, anon, authenticated;
revoke execute on function public.get_giochi(uuid) from public, anon;
revoke execute on function public.start_game_run(uuid, integer) from public, anon;
revoke execute on function public.finish_game_run(uuid, integer, jsonb) from public, anon;
grant execute on function public.get_giochi(uuid) to authenticated;
grant execute on function public.start_game_run(uuid, integer) to authenticated;
grant execute on function public.finish_game_run(uuid, integer, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Premi dei giochi (solo il vincitore): neon, pazzo, godo, cornici, cowboy.
-- NON contano per i premi olografici. Il resto è identico a 20261115100000_chat_censura_premi.
-- ---------------------------------------------------------------------
create function private.premi_giochi(p_uid uuid)
returns text[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(p.premio order by p.k), '{}')
  from (values (1, 'neon'), (2, 'pazzo'), (3, 'godo'), (4, 'cornici'), (5, 'cowboy')) as p (k, premio)
  where exists (
    select 1 from public.group_members gm join public.groups g on g.id = gm.group_id
    where gm.user_id = p_uid and g.giochi_attivi and private.vincitore_gioco(gm.group_id, p.k) = gm.id
  )
$$;
revoke execute on function private.premi_giochi(uuid) from public, anon, authenticated;

create or replace function private.unlocked_accessories(p_uid uuid)
returns text[]
language sql stable security definer set search_path = ''
as $$
  with mie as (
    select mi.* from public.moodboard_items mi join public.group_members gm on gm.id = mi.member_id where gm.user_id = p_uid
  ),
  bacheche as (
    select gm.id, (select r.profilo from public.quiz_results r where r.group_id = gm.group_id and r.user_id = p_uid) as profilo
    from public.group_members gm where gm.user_id = p_uid
  ),
  base as (
    select array_remove(array[
      case when exists (select 1 from public.quiz_results r where r.user_id = p_uid) then 'stellina' end,
      case when exists (
        select 1 from bacheche b
        where (select count(*) from mie where mie.member_id = b.id) >= 10
          and exists (select 1 from mie where mie.member_id = b.id and mie.kind in ('foto', 'immagine_link'))
          and exists (select 1 from mie where mie.member_id = b.id and mie.kind = 'ricamo' and mie.content->>'celle' ~ '[0-9]')
          and exists (select 1 from mie where mie.member_id = b.id and mie.kind = 'toppa' and mie.content->>'tipo' = 'simbolo')
          and exists (select 1 from mie where mie.member_id = b.id and mie.kind = 'toppa' and mie.content->>'tipo' = 'parola')
          and exists (select 1 from mie where mie.member_id = b.id and mie.kind = 'toppa' and mie.content->>'tipo' = 'palette')
      ) then 'fiocco' end,
      case when exists (
        select 1 from bacheche b
        where b.profilo is not null
          and exists (select 1 from public.group_toppe t where t.member_id = b.id)
          and (select count(distinct mie.content->>'toppa') from mie where mie.member_id = b.id and mie.kind = 'toppa'
               and mie.content->>'toppa' = any(case b.profilo
                 when 'IMPEGNO_ALTO_RICEVE_TUTTO' then array['aa-pc','aa-carry','aa-lupo','aa-sisifo','aa-hot','aa-at-work','aa-carry-p','aa-overthinker']
                 when 'IMPEGNO_ALTO_ESIGENTE' then array['ae-martelletto','ae-gioielli','ae-unghie','ae-imprenditore','ae-legge','ae-diva','ae-grindset','ae-obbligandoti']
                 when 'IMPEGNO_BASSO_RICEVE_TUTTO' then array['ba-pugno','ba-shaka','oreo','ba-tiger','ba-tiger-p','ba-amo-noi','ba-zero-effort','ba-chills']
                 when 'IMPEGNO_BASSO_ESIGENTE' then array['be-lupetto','be-scontrino','be-lupo','be-iphone','be-tenuto','be-spero','be-bella-merda','be-baddie']
                 else array['bo-caricamento','bo-zuppa','bo-lupi','bo-pandoro','bo-boh','bo-buffering','bo-nonhocapito','bo-boiled']
               end)) = 8
      ) then 'sciarpa' end,
      case when exists (select 1 from public.group_members gm where gm.user_id = p_uid and gm.envelope_opened_at is not null) then 'occhiali' end,
      case when exists (
        select 1 from public.santa_messages s
        join public.group_members gm on gm.user_id = p_uid
        where (not s.dal_babbo and s.receiver_member_id = gm.id)
           or (s.dal_babbo and exists (
                 select 1 from public.assignments a
                 where a.giver_member_id = gm.id and a.receiver_member_id = s.receiver_member_id))
      ) then 'super' end,
      case when exists (
        select 1 from public.feed_events e join public.group_members gm on gm.id = e.member_id
        where gm.user_id = p_uid and e.tipo = 'post'
      ) and (
        select count(*) from public.feed_reactions r join public.group_members gm on gm.id = r.member_id where gm.user_id = p_uid
      ) >= 5 then 'cuciture' end
    ], null) as a
  )
  select (case when a @> array['stellina', 'fiocco', 'sciarpa', 'occhiali', 'super', 'cuciture']::text[]
               then a || array['olografico', 'occhiali_olo'] else a end)
         || private.premi_giochi(p_uid)
  from base;
$$;

-- Il personaggio: anche i premi dei giochi solo se vinti (il resto è identico a 20261115200000_cuciture_e_cornici)
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
  if p_look->>'capelli' = '13' and not 'pazzo' = any(v_ok) then
    raise exception 'Questo taglio non è ancora sbloccato.';
  end if;
  if p_look->>'coloreCapelli' = '7' and not 'olografico' = any(v_ok) then
    raise exception 'Questo colore non è ancora sbloccato.';
  end if;
  if p_look->>'coloreCapelli' = '8' and not 'neon' = any(v_ok) then
    raise exception 'Questo colore non è ancora sbloccato.';
  end if;
  if p_look->>'maglione' = '6' and not 'godo' = any(v_ok) then
    raise exception 'Questo maglione non è ancora sbloccato.';
  end if;
  if p_look->>'cucitura' = '1' and not 'cuciture' = any(v_ok) then
    raise exception 'Questa cucitura non è ancora sbloccata.';
  end if;
  if p_look->>'cucitura' in ('2', '3', '4') and not 'cornici' = any(v_ok) then
    raise exception 'Questa cornice non è ancora sbloccata.';
  end if;
  insert into public.profiles (user_id, look, updated_at) values (v_uid, p_look, now())
  on conflict (user_id) do update set look = excluded.look, updated_at = now();
end;
$$;
