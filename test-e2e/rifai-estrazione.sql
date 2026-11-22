-- Collaudo di "Rifai l'estrazione" (blocco B, 22/11), DOPO aver applicato 20261123110000_rifai_estrazione.sql.
-- Tutto dentro un blocco che alla fine si annulla da solo: non resta niente nel database.
-- Si lancia così com'è con execute_sql (come postgres); "come" = la persona che chiama le funzioni.
create temp table if not exists esito_rifai (riga text);
do $$
declare
  r text := '';
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid(); u4 uuid := gen_random_uuid(); u5 uuid := gen_random_uuid();
  g1 uuid; g2 uuid; m2 uuid; m3 uuid; m4 uuid; n int; ok boolean;
begin
  begin
    insert into auth.users (id, email, aud, role, created_at)
    select u, u || '@users.secretsanta.local', 'authenticated', 'authenticated', now() from unnest(array[u1, u2, u3, u4, u5]) u;
    perform set_config('giochi.ora_finta', '2026-12-01 12:00+01', true);
    insert into public.groups (name, organizer_id, exchange_date) values ('Test E2E Natale', u1, '2026-12-20') returning id into g1;
    insert into public.group_members (group_id, display_name, user_id) values (g1, 'Anna Prova', u1);
    insert into public.group_members (group_id, display_name, user_id) values (g1, 'Bruno Prova', u2) returning id into m2;
    insert into public.group_members (group_id, display_name, user_id) values (g1, 'Carla Prova', u3) returning id into m3;

    -- prima estrazione, buste aperte, un messaggio in chat, il dono "occhiali" segnato
    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    perform public.run_draw(g1);
    update public.group_members set envelope_opened_at = now() where group_id = g1;
    insert into public.santa_messages (group_id, receiver_member_id, dal_babbo, testo) values (g1, m2, true, 'ciao');
    r := r || case when 'occhiali' = any(private.unlocked_accessories(u2)) then 'OK  ' else 'FAIL' end || ' prima: Bruno ha il dono della busta aperta' || chr(10);

    -- chi non organizza non può
    perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
    ok := false;
    begin perform public.rifai_estrazione(g1); exception when others then ok := sqlerrm like 'Solo l''organizzatore%'; end;
    r := r || case when ok and (select status from public.groups where id = g1) = 'estratto' then 'OK  ' else 'FAIL' end || ' chi non organizza non rifà l''estrazione' || chr(10);

    -- l'organizzatore rifà
    perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
    perform public.rifai_estrazione(g1);
    r := r || case when (select status from public.groups where id = g1) = 'aperto' then 'OK  ' else 'FAIL' end || ' il gruppo torna "aperto" (l''invito torna a valere)' || chr(10);
    r := r || case when not exists (select 1 from public.assignments where group_id = g1) then 'OK  ' else 'FAIL' end || ' abbinamenti cancellati' || chr(10);
    r := r || case when not exists (select 1 from public.group_members where group_id = g1 and envelope_opened_at is not null) then 'OK  ' else 'FAIL' end || ' buste richiuse per tutti' || chr(10);
    r := r || case when not exists (select 1 from public.santa_messages where group_id = g1) then 'OK  ' else 'FAIL' end || ' Santa Chat svuotata' || chr(10);
    r := r || case when exists (select 1 from public.feed_events where group_id = g1 and tipo = 'rifatta') then 'OK  ' else 'FAIL' end || ' voce "Estrazione rifatta" nelle Novità' || chr(10);
    r := r || case when 'occhiali' = any(private.unlocked_accessories(u2)) then 'OK  ' else 'FAIL' end || ' Bruno tiene il dono della busta' || chr(10);
    ok := false;
    begin perform public.rifai_estrazione(g1); exception when others then ok := sqlerrm like '%non è ancora stata fatta%'; end;
    r := r || case when ok then 'OK  ' else 'FAIL' end || ' non si rifà un''estrazione che non c''è' || chr(10);

    -- si aggiunge Dario all'ultimo minuto e si rifà
    insert into public.group_members (group_id, display_name, user_id) values (g1, 'Dario Prova', u4) returning id into m4;
    perform public.run_draw(g1);
    select count(*) into n from public.assignments where group_id = g1;
    r := r || case when n = 4 and (select status from public.groups where id = g1) = 'estratto'
                    and exists (select 1 from public.assignments where group_id = g1 and receiver_member_id = m4) then 'OK  ' else 'FAIL' end || ' nuova estrazione con chi si è aggiunto (4 abbinamenti)' || chr(10);
    select count(*) into n from public.feed_events where group_id = g1 and tipo = 'estrazione';
    r := r || case when n = 2 then 'OK  ' else 'FAIL' end || ' di nuovo "Estrazione fatta" nelle Novità' || chr(10);

    -- il giorno dello scambio si può ancora, il giorno dopo no
    perform set_config('giochi.ora_finta', '2026-12-21 09:00+01', true);
    ok := false;
    begin perform public.rifai_estrazione(g1); exception when others then ok := sqlerrm like 'Lo scambio è già passato%'; end;
    r := r || case when ok and (select status from public.groups where id = g1) = 'estratto' then 'OK  ' else 'FAIL' end || ' dopo lo scambio non si rifà' || chr(10);
    perform set_config('giochi.ora_finta', '2026-12-20 22:00+01', true);
    perform public.rifai_estrazione(g1);
    r := r || case when (select status from public.groups where id = g1) = 'aperto' then 'OK  ' else 'FAIL' end || ' il giorno dello scambio si rifà ancora' || chr(10);

    -- gruppo "l'abbiamo già fatta noi": rifare azzera le scelte e si sceglie di nuovo
    insert into public.groups (name, organizer_id, estrazione_fatta) values ('Test E2E Natale', u5, true) returning id into g2;
    insert into public.group_members (group_id, display_name, user_id) values (g2, 'Elena Prova', u5);
    insert into public.group_members (group_id, display_name, user_id) values (g2, 'Bruno Bis', u2) returning id into m2;
    insert into public.group_members (group_id, display_name, user_id) values (g2, 'Carla Bis', u3) returning id into m3;
    perform set_config('estrazione.scelta', '1', true);
    insert into public.assignments (group_id, giver_member_id, receiver_member_id)
    select g2, gm.id, lead(gm.id, 1, (select min(id::text)::uuid from public.group_members where group_id = g2)) over (order by gm.id::text)
    from public.group_members gm where gm.group_id = g2;
    perform set_config('estrazione.scelta', '', true);
    update public.groups set status = 'estratto' where id = g2;
    perform set_config('request.jwt.claims', json_build_object('sub', u5, 'role', 'authenticated')::text, true);
    perform public.rifai_estrazione(g2);
    perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
    perform public.scegli_destinatario(g2, m3);
    r := r || case when (select count(*) from public.assignments where group_id = g2) = 1 then 'OK  ' else 'FAIL' end || ' "già fatta noi": scelte azzerate e si sceglie di nuovo' || chr(10);
    raise exception 'FINE-COLLAUDO';
  exception when others then
    if sqlerrm <> 'FINE-COLLAUDO' then r := r || 'ERRORE ' || sqlerrm || chr(10); end if;
  end;
  insert into esito_rifai values (r);
end $$;
select riga from esito_rifai;
