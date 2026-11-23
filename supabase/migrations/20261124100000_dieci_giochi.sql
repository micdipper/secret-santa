-- Blocco E (PIANO-GIOCHI.md sezione 10): 10 mini giochi invece di 5.
-- Numerazione nel database: i giochi di prima restano 1-5 (partite e doni già vinti non si toccano), i nuovi sono 6-10.
-- Giorno del gioco k: k = 1..5 → T−(5−k); k = 6..10 → T−(15−k). In calendario: 6,7,8,9,10,1,2,3,4,5 (T−9 … T).
-- Data vicina: si perdono solo i giochi dei giorni passati. groups.giochi_dal = oggi + 2 quando si fissa la data;
-- il gioco k vale se il suo giorno è ≥ giochi_dal. La data si blocca dal giorno prima del primo gioco valido.

alter table public.groups add column giochi_dal date;

-- I gruppi che esistono già: chi aveva i giochi li tiene tutti e 5 (anche se sono già iniziati) e riceve i nuovi
-- dei giorni che devono ancora arrivare; chi non li aveva (data troppo vicina) riceve quelli da dopodomani.
update public.groups
set giochi_dal = case when giochi_attivi then least(private.oggi_roma() + 1, exchange_date - 4) else private.oggi_roma() + 2 end
where exchange_date is not null;
update public.groups set giochi_attivi = exchange_date >= giochi_dal where exchange_date is not null;

-- Il giorno del gioco k, contando dallo scambio (0 = giorno dello scambio)
create function private.giorno_gioco(p_game integer)
returns integer
language sql immutable set search_path = ''
as $$
  select case when p_game between 1 and 5 then p_game - 5 when p_game between 6 and 10 then p_game - 15 end
$$;

-- Il primo giorno in cui si gioca (null se il gruppo non ha giochi)
create function private.primo_giorno_giochi(p_exchange date, p_dal date)
returns date
language sql immutable set search_path = ''
as $$
  select case when p_exchange is not null and p_dal is not null and p_exchange >= p_dal then greatest(p_exchange - 9, p_dal) end
$$;

create or replace function private.groups_data_e_giochi()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.exchange_date is not distinct from old.exchange_date then
      return new;
    end if;
    if old.giochi_attivi and private.oggi_roma() >= private.primo_giorno_giochi(old.exchange_date, old.giochi_dal) - 1 then
      raise exception 'La data è bloccata: i giochi stanno per iniziare.';
    end if;
  end if;
  new.giochi_dal := case when new.exchange_date is not null then private.oggi_roma() + 2 end;
  new.giochi_attivi := new.exchange_date is not null and new.exchange_date >= new.giochi_dal;
  return new;
end;
$$;

alter table public.game_runs drop constraint game_runs_game_check;
alter table public.game_runs add constraint game_runs_game_check check (game between 1 and 10);

create or replace function private.regole_gioco(p_game integer)
returns table (durata_min integer, durata_max integer, score_max integer, punti_al_secondo integer)
language sql immutable set search_path = ''
as $$
  select r.durata_min, r.durata_max, r.score_max, r.punti_al_secondo from (values
    (1,  1,  50,    8000,   260),
    (2,  2, 600,   12000,    60),
    (3,  2, 600,    6000,    25),
    (4,  3, 300, 3000000, 15000),
    (5,  5,  65,    6000,   160),
    (6,  1,  50,    4000,    80),
    (7,  2, 600,   15000,    30),
    (8,  2, 300,   15000,   150),
    (9,  1,  65,    5000,   100),
    (10, 8, 120,    2000,   200)
  ) as r (game, durata_min, durata_max, score_max, punti_al_secondo)
  where r.game = p_game
$$;

create or replace function private.finestra_gioco(p_group uuid, p_game integer)
returns table (apre timestamptz, chiude timestamptz)
language sql stable security definer set search_path = ''
as $$
  select ((g.exchange_date + private.giorno_gioco(p_game))::timestamp at time zone 'Europe/Rome'),
         ((g.exchange_date + private.giorno_gioco(p_game) + 1)::timestamp at time zone 'Europe/Rome')
  from public.groups g
  where g.id = p_group and g.giochi_attivi and g.exchange_date is not null and p_game between 1 and 10
    and g.exchange_date + private.giorno_gioco(p_game) >= g.giochi_dal
$$;

-- Il calendario: come prima, con i 10 giochi in ordine di giorno (solo quelli validi)
create or replace function public.get_giochi(p_group_id uuid)
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
      ) order by f.apre)
      from generate_series(1, 10) k, private.finestra_gioco(p_group_id, k) f
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function private.premi_giochi(p_uid uuid)
returns text[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(p.premio order by p.k), '{}')
  from (values (1, 'neon'), (2, 'pazzo'), (3, 'godo'), (4, 'cornici'), (5, 'cowboy'),
               (6, 'paraorecchie'), (7, 'corna'), (8, 'lucine'), (9, 'brina'), (10, 'cornice_lucine')) as p (k, premio)
  where exists (
    select 1 from public.group_members gm join public.groups g on g.id = gm.group_id
    where gm.user_id = p_uid and g.giochi_attivi and private.vincitore_gioco(gm.group_id, p.k) = gm.id
  )
$$;

-- Il personaggio: anche i doni dei giochi nuovi solo se ricevuti (il resto è identico a 20261116100000_giochi)
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
  if p_look->>'coloreCapelli' = '9' and not 'brina' = any(v_ok) then
    raise exception 'Questo colore non è ancora sbloccato.';
  end if;
  if p_look->>'maglione' = '6' and not 'godo' = any(v_ok) then
    raise exception 'Questo maglione non è ancora sbloccato.';
  end if;
  if p_look->>'maglione' = '7' and not 'lucine' = any(v_ok) then
    raise exception 'Questo maglione non è ancora sbloccato.';
  end if;
  if p_look->>'cucitura' = '1' and not 'cuciture' = any(v_ok) then
    raise exception 'Questa cucitura non è ancora sbloccata.';
  end if;
  if p_look->>'cucitura' in ('2', '3', '4') and not 'cornici' = any(v_ok) then
    raise exception 'Questa cornice non è ancora sbloccata.';
  end if;
  if p_look->>'cucitura' = '5' and not 'cornice_lucine' = any(v_ok) then
    raise exception 'Questa cornice non è ancora sbloccata.';
  end if;
  insert into public.profiles (user_id, look, updated_at) values (v_uid, p_look, now())
  on conflict (user_id) do update set look = excluded.look, updated_at = now();
end;
$$;

revoke execute on function private.giorno_gioco(integer) from public, anon, authenticated;
revoke execute on function private.primo_giorno_giochi(date, date) from public, anon, authenticated;
