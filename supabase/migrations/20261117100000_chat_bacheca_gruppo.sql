-- Richieste di Marzia del 15/11 (sera):
-- 1) La Santa Chat si apre solo quando TUTTI hanno aperto la busta.
-- 2) Bacheca: ogni toppa una sola volta; al massimo 5 tra foto e immagini da link.
-- 3) L'organizzatore può cambiare data, budget e tema anche dopo l'estrazione
--    (la data resta bloccata da T−5 se il gruppo ha i giochi: lo fa già il trigger groups_data_e_giochi).

-- ---------------------------------------------------------------------
-- 1) Santa Chat
-- ---------------------------------------------------------------------
create function private.tutte_le_buste_aperte(p_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group and gm.envelope_opened_at is null
  );
$$;
revoke execute on function private.tutte_le_buste_aperte(uuid) from public, anon;

-- Ultima versione: 20261115100000_chat_censura_premi, con in più il controllo delle buste.
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
  if not private.tutte_le_buste_aperte(p_group) then
    raise exception 'La Santa Chat si apre quando tutti avranno aperto la busta';
  end if;
  if char_length(v_t) = 0 then
    raise exception 'Il messaggio è vuoto';
  end if;
  if char_length(v_t) > 50 then
    raise exception 'Il messaggio è troppo lungo (massimo 50 caratteri)';
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

  -- 5 messaggi a testa al giorno in questa conversazione (ognuno ha un solo ruolo per conversazione)
  if (select count(*) from public.santa_messages s
      where s.receiver_member_id = v_dest and s.dal_babbo = p_dal_babbo
        and (s.created_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date) >= 5 then
    raise exception 'Per oggi hai finito i tuoi 5 messaggi: domani ne avrai altri 5';
  end if;

  insert into public.santa_messages (group_id, receiver_member_id, dal_babbo, testo)
  values (p_group, v_dest, p_dal_babbo, private.censura_nomi(p_group, v_t))
  returning * into v_riga;
  return v_riga;
end;
$$;

-- ---------------------------------------------------------------------
-- 2) Bacheca: una toppa per tipo, massimo 5 foto/immagini
-- ---------------------------------------------------------------------
-- Le copie doppie già attaccate si tolgono (resta quella più in basso, cioè la prima messa).
delete from public.moodboard_items m
using (
  select id, row_number() over (partition by member_id, content->>'toppa' order by z, id) as n
  from public.moodboard_items
  where kind = 'toppa'
) d
where m.id = d.id and d.n > 1;

create unique index moodboard_items_una_toppa
  on public.moodboard_items (member_id, (content->>'toppa'))
  where kind = 'toppa';

create function private.bacheca_max_foto()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  -- lucchetto per persona: due inserimenti insieme non superano il limite
  perform pg_advisory_xact_lock(hashtext('bacheca-foto:' || new.member_id::text));
  if (select count(*) from public.moodboard_items m
      where m.member_id = new.member_id and m.kind in ('foto', 'immagine_link')) >= 5 then
    raise exception 'Sulla bacheca ci stanno al massimo 5 foto';
  end if;
  return new;
end;
$$;
revoke execute on function private.bacheca_max_foto() from public, anon, authenticated;

create trigger bacheca_max_foto
before insert on public.moodboard_items
for each row when (new.kind in ('foto', 'immagine_link'))
execute function private.bacheca_max_foto();

-- ---------------------------------------------------------------------
-- 3) Gruppo modificabile dall'organizzatore anche dopo l'estrazione
--    (solo name, budget_eur, exchange_date, theme: sono le uniche colonne con il permesso di update)
-- ---------------------------------------------------------------------
drop policy "organizzatore modifica il gruppo aperto" on public.groups;
create policy "organizzatore modifica il gruppo" on public.groups
  for update to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));
