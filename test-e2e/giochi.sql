-- Collaudo del database dei giochi (PIANO-GIOCHI.md, sezione 8.1).
-- Si esegue come postgres (execute_sql). NON lascia dati: finisce SEMPRE con un errore voluto
-- ("RISULTATI: ...") che annulla tutto. Usa l'ora finta `giochi.ora_finta`.
do $$
declare
  r text := '';
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid(); u4 uuid := gen_random_uuid();
  g uuid; g2 uuid; m1 uuid; m2 uuid; m3 uuid;
  j jsonb; run uuid; altro uuid; n integer; msg text; b boolean;
begin
  -- ora(t): imposta l'ora finta · io(u): divento l'utente u
  perform set_config('giochi.ora_finta', '2026-12-01 12:00:00+01', true);
  insert into auth.users (id, instance_id, aud, role, email)
  select x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', x || '@test.giochi.local'
  from unnest(array[u1, u2, u3, u4]) x;

  insert into public.groups (name, exchange_date, organizer_id) values ('Test giochi SQL', '2026-12-20', u1) returning id into g;
  insert into public.group_members (group_id, display_name, user_id, joined_at) values (g, 'Uno', u1, now()) returning id into m1;
  insert into public.group_members (group_id, display_name, user_id, joined_at) values (g, 'Due', u2, now()) returning id into m2;
  insert into public.group_members (group_id, display_name, user_id, joined_at) values (g, 'Tre', u3, now()) returning id into m3;

  -- 1) giochi attivi solo con almeno 6 giorni
  r := r || E'\n1a attivi con 19 giorni: ' || (select giochi_attivi from public.groups where id = g);
  insert into public.groups (name, exchange_date, organizer_id) values ('Test giochi SQL 2', '2026-12-04', u1) returning id into g2;
  r := r || E'\n1b NON attivi con 3 giorni: ' || (select not giochi_attivi from public.groups where id = g2);
  update public.groups set exchange_date = '2026-12-20' where id = g2;
  r := r || E'\n1c senza giochi la data si sposta e i giochi partono: ' || (select giochi_attivi from public.groups where id = g2);
  update public.groups set exchange_date = null where id = g2;
  r := r || E'\n1d data vuota = niente giochi: ' || (select not giochi_attivi from public.groups where id = g2);

  -- 2) blocco della data da T−5
  perform set_config('giochi.ora_finta', '2026-12-14 23:59:00+01', true);
  update public.groups set exchange_date = '2026-12-21' where id = g;
  update public.groups set exchange_date = '2026-12-20' where id = g;
  r := r || E'\n2a a T−6 la data si cambia ancora: ' || (select giochi_attivi and exchange_date = '2026-12-20' from public.groups where id = g);
  perform set_config('giochi.ora_finta', '2026-12-15 00:00:01+01', true);
  begin
    update public.groups set exchange_date = '2026-12-25' where id = g;
    r := r || E'\n2b a T−5 bloccata: false';
  exception when others then
    r := r || E'\n2b a T−5 bloccata: ' || (sqlerrm like '%bloccata%');
  end;
  update public.groups set name = 'Test giochi SQL (rinominato)' where id = g;
  r := r || E'\n2c il resto si modifica ancora: true';

  -- 3) apertura a mezzanotte di Roma
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u1)::text, true);
  perform set_config('giochi.ora_finta', '2026-12-15 23:59:59+01', true);
  begin
    perform public.start_game_run(g, 1);
    r := r || E'\n3a prima di mezzanotte chiuso: false';
  exception when others then
    r := r || E'\n3a prima di mezzanotte chiuso: ' || (sqlerrm like '%non è ancora aperto%');
  end;
  perform set_config('giochi.ora_finta', '2026-12-16 00:00:01+01', true);
  j := public.get_giochi(g);
  r := r || E'\n3b stati 1 aperto, 2 bloccato: ' || (j->'giochi'->0->>'stato' = 'aperto' and j->'giochi'->1->>'stato' = 'bloccato' and jsonb_array_length(j->'giochi') = 5);
  r := r || E'\n3c gioco 5 chiude alla mezzanotte dopo lo scambio: ' || ((j->'giochi'->4->>'chiude_alle')::timestamptz = '2026-12-21 00:00:00+01');

  -- 4) tre tentativi: valido, troppo veloce (vale 0), abbandonato; il quarto è rifiutato
  run := (public.start_game_run(g, 1)->>'id')::uuid;
  perform set_config('giochi.ora_finta', '2026-12-16 00:00:21+01', true);
  j := public.finish_game_run(run, 500, '{"colpi": 50}');
  r := r || E'\n4a partita valida, record, prima: ' || ((j->>'valida')::boolean and (j->>'record')::boolean and j->>'posizione' = '1' and j->>'score' = '500');
  begin
    perform public.finish_game_run(run, 600);
    r := r || E'\n4b non si finisce due volte: false';
  exception when others then
    r := r || E'\n4b non si finisce due volte: ' || (sqlerrm like '%già finita%');
  end;
  run := (public.start_game_run(g, 1)->>'id')::uuid;
  j := public.finish_game_run(run, 100);
  r := r || E'\n4c finita in 0 secondi = non valida, vale 0: ' || (not (j->>'valida')::boolean and j->>'score' = '0' and j->>'migliore' = '500');
  altro := (public.start_game_run(g, 1)->>'id')::uuid; -- abbandonata
  begin
    perform public.start_game_run(g, 1);
    r := r || E'\n4d quarto tentativo rifiutato: false';
  exception when others then
    r := r || E'\n4d quarto tentativo rifiutato: ' || (sqlerrm like '%finito i tentativi%');
  end;

  -- 5) anti-trucco e pareggio (u2)
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u2)::text, true);
  begin
    perform public.finish_game_run(altro, 10);
    r := r || E'\n5a non finisco la partita di un altro: false';
  exception when others then
    r := r || E'\n5a non finisco la partita di un altro: ' || (sqlerrm like '%non trovata%');
  end;
  perform set_config('giochi.ora_finta', '2026-12-16 10:00:00+01', true);
  run := (public.start_game_run(g, 1)->>'id')::uuid;
  perform set_config('giochi.ora_finta', '2026-12-16 10:00:10+01', true);
  j := public.finish_game_run(run, 7000);
  r := r || E'\n5b troppi punti per il tempo = 0: ' || (not (j->>'valida')::boolean);
  run := (public.start_game_run(g, 1)->>'id')::uuid;
  perform set_config('giochi.ora_finta', '2026-12-16 10:00:50+01', true);
  j := public.finish_game_run(run, 9000);
  r := r || E'\n5c oltre il punteggio massimo = 0: ' || (not (j->>'valida')::boolean);
  run := (public.start_game_run(g, 1)->>'id')::uuid;
  perform set_config('giochi.ora_finta', '2026-12-16 10:01:30+01', true);
  j := public.finish_game_run(run, 500);
  r := r || E'\n5d pareggio a 500, valido, posizione 1 a pari: ' || ((j->>'valida')::boolean and j->>'posizione' = '1');
  r := r || E'\n5e premio non ancora assegnato a gioco aperto: ' || (not 'neon' = any(private.unlocked_accessories(u1)));

  -- 6) partita a cavallo della chiusura (u3)
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u3)::text, true);
  perform set_config('giochi.ora_finta', '2026-12-16 23:59:50+01', true);
  run := (public.start_game_run(g, 1)->>'id')::uuid;
  perform set_config('giochi.ora_finta', '2026-12-17 00:00:05+01', true);
  j := public.get_giochi(g);
  r := r || E'\n6a chiuso ma non deciso finché u3 gioca: ' || (j->'giochi'->0->>'stato' = 'chiuso' and not (j->'giochi'->0->>'deciso')::boolean and j->'giochi'->0->>'vincitore_member_id' is null and j->'giochi'->1->>'stato' = 'aperto');
  begin
    perform public.start_game_run(g, 1);
    r := r || E'\n6b non si inizia a gioco chiuso: false';
  exception when others then
    r := r || E'\n6b non si inizia a gioco chiuso: ' || (sqlerrm like '%chiuso%');
  end;
  perform set_config('giochi.ora_finta', '2026-12-17 00:00:20+01', true);
  j := public.finish_game_run(run, 300);
  r := r || E'\n6c finita dopo la chiusura entro il margine: valida, terza: ' || ((j->>'valida')::boolean and j->>'posizione' = '3');
  j := public.get_giochi(g);
  r := r || E'\n6d deciso, vince Uno (500 fatto per primo): ' || ((j->'giochi'->0->>'deciso')::boolean and (j->'giochi'->0->>'vincitore_member_id')::uuid = m1);

  -- 7) premi solo al vincitore, controllati da save_avatar
  r := r || E'\n7a neon a Uno e non a Due: ' || ('neon' = any(private.unlocked_accessories(u1)) and not 'neon' = any(private.unlocked_accessories(u2)));
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u2)::text, true);
  begin
    perform public.save_avatar('{"pelle":1,"capelli":0,"coloreCapelli":8,"barba":0,"occhiali":0,"maglione":0,"accessori":[]}');
    r := r || E'\n7b Due non può mettere il neon: false';
  exception when others then
    r := r || E'\n7b Due non può mettere il neon: ' || (sqlerrm like '%non è ancora sbloccato%');
  end;
  begin
    perform public.save_avatar('{"pelle":1,"capelli":13,"coloreCapelli":0,"barba":0,"occhiali":0,"maglione":6,"accessori":["cowboy"]}');
    r := r || E'\n7c né taglio pazzo, maglione godo, cowboy: false';
  exception when others then
    r := r || E'\n7c né taglio pazzo, maglione godo, cowboy: true';
  end;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u1)::text, true);
  perform public.save_avatar('{"pelle":1,"capelli":0,"coloreCapelli":8,"barba":0,"occhiali":0,"maglione":0,"accessori":[]}');
  r := r || E'\n7d Uno mette il neon: true';

  -- 8) gioco senza giocatori, o tutti a 0: nessun vincitore
  perform set_config('giochi.ora_finta', '2026-12-17 12:00:00+01', true);
  run := (public.start_game_run(g, 2)->>'id')::uuid; -- abbandonata
  perform set_config('giochi.ora_finta', '2026-12-18 00:12:00+01', true);
  j := public.get_giochi(g);
  r := r || E'\n8a gioco 2 deciso senza vincitore: ' || ((j->'giochi'->1->>'deciso')::boolean and j->'giochi'->1->>'vincitore_member_id' is null and not 'pazzo' = any(private.unlocked_accessories(u1)));
  perform set_config('giochi.ora_finta', '2026-12-30 12:00:00+01', true);
  j := public.get_giochi(g);
  r := r || E'\n8b a fine calendario tutti chiusi e decisi: ' || (not exists (select 1 from jsonb_array_elements(j->'giochi') x where x->>'stato' <> 'chiuso' or not (x->>'deciso')::boolean));

  -- 9) chi non è nel gruppo non vede né gioca; nessuno scrive direttamente
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u4)::text, true);
  begin
    perform public.get_giochi(g);
    r := r || E'\n9a estraneo fuori da get_giochi: false';
  exception when others then
    r := r || E'\n9a estraneo fuori da get_giochi: ' || (sqlerrm like '%Non fai parte%');
  end;
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.game_runs;
  r := r || E'\n9b estraneo non legge le partite (RLS): ' || (n = 0);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u1)::text, true);
  select count(*) into n from public.game_runs where group_id = g;
  r := r || E'\n9c chi è nel gruppo le legge tutte (8): ' || (n = 8);
  begin
    update public.game_runs set score = 99999 where group_id = g;
    r := r || E'\n9d niente modifiche dirette: false';
  exception when others then
    r := r || E'\n9d niente modifiche dirette: ' || (sqlerrm like '%permission denied%');
  end;
  begin
    select private.adesso() is not null into b;
    r := r || E'\n9e orologio non chiamabile dal sito: false';
  exception when others then
    r := r || E'\n9e orologio non chiamabile dal sito: true';
  end;
  perform set_config('role', 'postgres', true);

  raise exception 'RISULTATI (tutto annullato): %', r;
end $$;
