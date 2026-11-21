-- Collaudo delle date di fine Secret Santa e della cancellazione (fase 4, 21/11) con l'ora finta.
-- Tutto dentro un blocco che alla fine si annulla da solo: non resta niente nel database.
-- Si lancia così com'è con execute_sql (come postgres: l'ora finta vale solo per postgres).
-- Restituisce una riga di testo con OK/FAIL per ogni controllo.
create temp table if not exists esito_fine (riga text);
do $$
declare
  r text := '';
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid();
  g1 uuid; g2 uuid; g3 uuid; g4 uuid; g5 uuid; m1 uuid;
  d date; n int;
  procedure_ok boolean;
begin
  begin
    insert into auth.users (id, email, aud, role, created_at) values
      (u1, u1 || '@users.secretsanta.local', 'authenticated', 'authenticated', now()),
      (u2, u2 || '@users.secretsanta.local', 'authenticated', 'authenticated', now()),
      (u3, u3 || '@users.secretsanta.local', 'authenticated', 'authenticated', now());
    -- g1 con data, g2 senza data, g3 sondaggio aperto, g4 data che cambia dopo l'avviso, g5 data fissata tardi
    insert into public.groups (name, organizer_id, exchange_date, created_at) values ('Test E2E Natale', u1, '2026-12-10', '2026-11-21') returning id into g1;
    insert into public.groups (name, organizer_id, created_at) values ('Test E2E Natale', u1, '2026-11-21') returning id into g2;
    insert into public.groups (name, organizer_id, giorni_proposti, created_at) values ('Test E2E Natale', u1, array['2026-12-20'::date, '2026-12-21'::date], '2026-11-21') returning id into g3;
    insert into public.groups (name, organizer_id, exchange_date, created_at) values ('Test E2E Natale', u1, '2026-12-05', '2026-11-21') returning id into g4;
    insert into public.groups (name, organizer_id, created_at) values ('Test E2E Natale', u1, '2026-11-21') returning id into g5;
    insert into public.group_members (group_id, display_name, user_id) values (g1, 'Uno Fine', u1) returning id into m1;
    insert into public.group_members (group_id, display_name, user_id) values (g1, 'Tre Fine', u3);
    insert into public.group_members (group_id, display_name, user_id) values (g2, 'Due Fine', u2);

    perform set_config('giochi.ora_finta', '2026-12-01 12:00+01', true);
    d := private.aggiorna_fine(g1);
    r := r || case when d = '2026-12-20' and (select avviso_fine_dal from public.groups where id = g1) is null then 'OK  ' else 'FAIL' end || ' con data 10/12: cancellazione il 20/12, a dicembre 1 ancora niente avviso' || chr(10);
    r := r || case when private.aggiorna_fine(g2) = '2027-01-08' then 'OK  ' else 'FAIL' end || ' senza data: 8 gennaio' || chr(10);
    r := r || case when private.aggiorna_fine(g3) = '2027-01-08' then 'OK  ' else 'FAIL' end || ' sondaggio della disponibilità aperto: 8 gennaio' || chr(10);

    perform set_config('giochi.ora_finta', '2026-12-13 08:00+01', true);
    d := private.aggiorna_fine(g1);
    r := r || case when d = '2026-12-20' and (select avviso_fine_dal from public.groups where id = g1) = '2026-12-13' then 'OK  ' else 'FAIL' end || ' 13/12: avviso dal 13/12 (mancano 7 giorni), data sempre 20/12' || chr(10);

    -- g4: avviso dal 08/12 (scambio 05/12 → 15/12), poi la data viene anticipata al 03/12: non prima del 15/12
    perform set_config('giochi.ora_finta', '2026-12-08 08:00+01', true);
    perform private.aggiorna_fine(g4);
    -- un gruppo senza mini giochi (con i giochi la data è bloccata da 5 giorni prima, regola del sito)
    update public.groups set giochi_attivi = false where id = g4;
    update public.groups set exchange_date = '2026-12-03' where id = g4;
    perform set_config('giochi.ora_finta', '2026-12-09 08:00+01', true);
    r := r || case when private.aggiorna_fine(g4) = '2026-12-15' then 'OK  ' else 'FAIL' end || ' data anticipata dopo l''avviso: mai prima di 7 giorni dal primo avviso (15/12, non 13/12)' || chr(10);
    update public.groups set exchange_date = '2026-12-30' where id = g4;
    d := private.aggiorna_fine(g4);
    r := r || case when d = '2027-01-09' and (select avviso_fine_dal from public.groups where id = g4) is null then 'OK  ' else 'FAIL' end || ' data spostata in là: avviso azzerato, cancellazione il 9/1' || chr(10);

    -- g5: data fissata tardi (scambio 01/12 deciso il 09/12): 7 giorni da oggi, non l'11/12
    update public.groups set exchange_date = '2026-12-01' where id = g5;
    r := r || case when private.aggiorna_fine(g5) = '2026-12-16' then 'OK  ' else 'FAIL' end || ' data fissata tardi: cancellazione 7 giorni dopo il primo avviso (16/12)' || chr(10);

    -- elenco dei gruppi finiti e cancellazione vera
    perform set_config('giochi.ora_finta', '2026-12-20 12:00+01', true);
    r := r || case when not exists (select 1 from public.notte_gruppi_finiti() f where f.id = g1) then 'OK  ' else 'FAIL' end || ' il giorno stesso (20/12, "Oggi") il gruppo non è ancora da cancellare' || chr(10);
    procedure_ok := false;
    begin
      perform public.notte_cancella_gruppo(g1);
    exception when others then procedure_ok := sqlerrm like '%non è ancora finito%';
    end;
    r := r || case when procedure_ok then 'OK  ' else 'FAIL' end || ' un gruppo non finito non si cancella' || chr(10);
    perform set_config('giochi.ora_finta', '2026-12-21 04:00+01', true);
    r := r || case when exists (select 1 from public.notte_gruppi_finiti() f where f.id = g1 and f.persone = 2 and f.accessi = 2)
                   and not exists (select 1 from public.notte_gruppi_finiti() f where f.id in (g2, g3)) then 'OK  ' else 'FAIL' end
      || ' la notte dopo (21/12) il gruppo con data è nell''elenco, quelli senza data no' || chr(10);
    perform public.notte_cancella_gruppo(g1);
    r := r || case when not exists (select 1 from public.groups where id = g1)
                   and not exists (select 1 from public.group_members where id = m1) then 'OK  ' else 'FAIL' end
      || ' cancellazione vera: via il gruppo e le sue persone' || chr(10);
    r := r || case when not exists (select 1 from auth.users where id = u3) then 'OK  ' else 'FAIL' end
      || ' l''accesso che era solo in quel gruppo è cancellato' || chr(10);
    r := r || case when exists (select 1 from auth.users where id = u1) then 'OK  ' else 'FAIL' end
      || ' l''accesso che organizza altri gruppi NON è cancellato (si porterebbe via i suoi gruppi)' || chr(10);
    select count(*) into n from public.groups where id in (g2, g3, g4, g5);
    r := r || case when n = 4 then 'OK  ' else 'FAIL' end || ' nessun altro gruppo toccato' || chr(10);
    raise exception 'FINE-COLLAUDO';
  exception when others then
    if sqlerrm <> 'FINE-COLLAUDO' then r := r || 'ERRORE ' || sqlerrm || chr(10); end if;
  end;
  insert into esito_fine values (r);
end $$;
