-- Limiti delle foto (richiesta di Marzia del 21/11, fase 1):
-- 1) bacheca: massimo 2 foto/immagini da link a persona (prima 5)
-- 2) Novità: massimo 1 post con foto al giorno a persona (ora italiana)
-- 3) foto dei totem: massimo 50 KB, controllato solo quando la foto CAMBIA
--    (save_quiz riscrive tutte le righe a ogni salvataggio: un CHECK, anche NOT VALID, bloccherebbe
--    chi ha già una foto vecchia più pesante anche solo per cambiare il nome di un totem)
-- 4) simboli (del gruppo e personali): niente foto nuove, si ricamano soltanto (quelle già messe restano)

-- ---------------------------------------------------------------------
-- 1) Bacheca: massimo 2 foto. Scatta solo quando si AGGIUNGE una foto (inserimento o cambio di kind
--    verso foto/link): spostare, ridimensionare, ruotare o togliere resta sempre possibile, anche a chi
--    ne ha già più di 2. L'indice moodboard_items_una_toppa non si tocca.
-- ---------------------------------------------------------------------
drop trigger bacheca_max_foto on public.moodboard_items;

create or replace function private.bacheca_max_foto()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.kind in ('foto', 'immagine_link') then
    return new; -- era già una foto: non se ne aggiunge nessuna
  end if;
  -- lucchetto per persona: due inserimenti insieme non superano il limite
  perform pg_advisory_xact_lock(hashtext('bacheca-foto:' || new.member_id::text));
  if (select count(*) from public.moodboard_items m
      where m.member_id = new.member_id and m.kind in ('foto', 'immagine_link') and m.id <> new.id) >= 2 then
    raise exception 'Sulla bacheca ci stanno al massimo 2 foto';
  end if;
  return new;
end;
$$;
revoke execute on function private.bacheca_max_foto() from public, anon, authenticated;

create trigger bacheca_max_foto
before insert or update of kind on public.moodboard_items
for each row when (new.kind in ('foto', 'immagine_link'))
execute function private.bacheca_max_foto();

-- ---------------------------------------------------------------------
-- 2) Novità: un post con foto al giorno (Europe/Rome). I post di solo testo non contano.
--    Resto identico a 20261113180000_feed_e_censura (100 caratteri, censura dei nomi, foto nella propria cartella).
-- ---------------------------------------------------------------------
create or replace function public.pubblica_post(p_group uuid, p_testo text, p_foto text)
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
  if p_foto is not null then
    if p_foto !~ ('^' || p_group || '/' || v_me || '/[0-9a-f-]+\.jpg$')
       or not exists (select 1 from storage.objects o where o.bucket_id = 'moodboard' and o.name = p_foto) then
      raise exception 'Foto non valida';
    end if;
    -- lucchetto per persona: due post con foto inviati insieme non passano tutti e due
    perform pg_advisory_xact_lock(hashtext('feed-foto:' || v_me::text));
    if exists (select 1 from public.feed_events e
               where e.group_id = p_group and e.member_id = v_me and e.tipo = 'post' and e.dati ? 'foto'
                 and (e.quando at time zone 'Europe/Rome')::date = private.oggi_roma()) then
      raise exception 'Hai già postato una foto oggi, riprova domani';
    end if;
  end if;
  insert into public.feed_events (group_id, member_id, tipo, dati)
  values (p_group, v_me, 'post', jsonb_strip_nulls(jsonb_build_object('testo', private.censura_nomi(p_group, v_t), 'foto', p_foto)))
  returning * into v_riga;
  return v_riga;
end;
$$;
revoke execute on function public.pubblica_post(uuid, text, text) from public, anon;
grant execute on function public.pubblica_post(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3) Foto dei totem: massimo 50 KB (= 68.268 caratteri base64 + 23 di "data:image/jpeg;base64,").
--    Si confronta con la riga già salvata (anche nell'upsert di save_quiz, dove il trigger BEFORE INSERT
--    vede la riga proposta): una foto rimasta uguale passa sempre.
-- ---------------------------------------------------------------------
create function private.totem_foto_leggera()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.immagine is null or octet_length(new.immagine) <= 68300 then
    return new;
  end if;
  if exists (select 1 from public.quiz_totems t
             where t.group_id = new.group_id and t.profilo = new.profilo and t.immagine = new.immagine) then
    return new; -- foto già salvata prima del limite: resta com'era
  end if;
  raise exception 'La foto del totem è troppo pesante (massimo 50 KB)';
end;
$$;
revoke execute on function private.totem_foto_leggera() from public, anon, authenticated;

create trigger totem_foto_leggera
before insert or update of immagine on public.quiz_totems
for each row execute function private.totem_foto_leggera();

-- ---------------------------------------------------------------------
-- 4) Simboli del gruppo e personali (group_toppe): nessuna foto nuova.
--    Una foto rimasta uguale (stessa riga, stessa foto) passa sempre: l'editor riscrive tutte le righe.
-- ---------------------------------------------------------------------
create function private.toppe_foto()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not (new.contenuto ? 'foto') then
    return new;
  end if;
  if exists (select 1 from public.group_toppe t
             where t.id = new.id and t.contenuto->>'foto' = new.contenuto->>'foto') then
    return new; -- foto già salvata: resta com'era
  end if;
  raise exception 'I simboli si ricamano: le foto non si possono più usare';
end;
$$;
revoke execute on function private.toppe_foto() from public, anon, authenticated;

create trigger toppe_foto
before insert or update of contenuto on public.group_toppe
for each row execute function private.toppe_foto();
