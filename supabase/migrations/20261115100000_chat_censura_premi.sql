-- 15/11 (approvato da Marzia)
-- 1) Santa Chat: al massimo 5 messaggi a testa al giorno (ora italiana), da 50 caratteri ciascuno (spazi compresi).
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

-- 2) Censura: oltre a lettere vicine, scambi, jolly e leet, ora per i nomi da 5 lettere in su si copre anche
--    UNA lettera qualsiasi cambiata (mai la prima). Le parole comuni (elenco qui sotto) non si coprono mai,
--    a meno che siano scritte identiche al nome. Nomi fino a 4 lettere: come prima (solo lettere vicine).
create or replace function private.nome_simile(w text, n text)
returns boolean
language plpgsql immutable set search_path = ''
as $$
declare
  x text := private.comprimi(w);
  len int := char_length(n);
  diverse int := 0;
  qualsiasi int := 0;
  jolly int := 0;
  i int := 1;
begin
  if char_length(x) <> len then return false; end if;
  -- parole comuni: mai coperte (se non sono proprio il nome)
  if x <> n and x = any(array['amare','amica','amici','amico','amore','ana','anche','ancora','ani','anima','animo','ano','ansia','ante','bela','bele','beli','belo','bene','brava','bravo','buona','buoni','buono','cala','calo','cane','cani','capi','capo','cara','care','cari','caro','casa','case','caso','cena','cene','come','conta','conte','conto','cosa','cose','cosi','cuore','cura','daria','dario','data','dati','dato','dolce','dolci','doni','dono','dopo','dove','elena','fame','fare','fata','fato','festa','feste','fine','fiore','fiori','forte','foto','gala','gati','gato','gioca','giochi','gioco','gioia','giri','giro','gita','gite','giulare','giuli','giulia','giulio','giuria','giuro','giusto','guida','ide','idea','isola','laghi','lago','lama','lame','lana','lane','lati','lato','lea','leo','lima','lime','lino','lira','lire','luca','luce','luci','lucia','luigi','luna','lune','lunga','lungo','lupi','lupo','mama','mani','mano','marca','marcia','marco','mare','mari','maria','mario','marta','marte','mela','mele','meno','mese','mesi','meta','mirco','moda','modo','molta','molto','mora','more','moro','mura','muro','nata','nato','nera','nero','neve','nome','nomi','nota','note','nuova','nuovo','ogi','ogni','ora','ore','oro','orso','pace','paio','pala','pane','paola','paolo','pari','parla','parlo','parte','parti','pasa','pasta','pausa','pena','piano','piena','pieno','piero','pieta','pieto','pietra','pietre','pietro','pina','pino','rara','rare','rari','raro','regala','regalare','regali','regalo','resta','resto','rete','ride','rido','risa','riso','rosa','rose','rosi','roso','sabato','sala','sale','sali','salta','salto','sana','sano','santa','santo','sapere','sapore','sara','sarai','saro','sera','serata','sere','sola','sole','soli','solo','sono','sopra','soto','sua','suo','suoi','tanta','tante','tanto','tema','temo','tempo','torta','torte','treno','tuta','tuti','tuto','vera','verde','vero','vini','vino','viola','vista','visto','vita','vite','voce','voci','volta','volte','vuoi','vuole']) then return false; end if;
  while i <= len loop
    if substr(x, i, 1) = '#' then
      jolly := jolly + 1;
    elsif substr(x, i, 1) <> substr(n, i, 1) then
      if i < len and substr(x, i, 1) = substr(n, i + 1, 1) and substr(x, i + 1, 1) = substr(n, i, 1) then
        i := i + 1; -- scambio di due lettere vicine
      elsif private.lettere_vicine(substr(x, i, 1), substr(n, i, 1)) then
        null; -- lettera vicina sulla tastiera o nell'alfabeto
      elsif len >= 5 and i > 1 then
        qualsiasi := qualsiasi + 1; -- una lettera qualsiasi: solo nomi lunghi, mai la prima
      else
        return false;
      end if;
      diverse := diverse + 1;
    end if;
    i := i + 1;
  end loop;
  return jolly * 2 <= len and qualsiasi <= 1 and diverse <= case when len <= 3 then 0 when len <= 5 then 1 else 2 end;
end;
$$;

-- 3) Premi ridistribuiti:
--    stellina = sondaggio · fiocco = 10 cose sulla bacheca (foto, ricamo, simbolo, parola, texture)
--    sciarpa (lupetto) = tutte le 8 toppe del proprio totem sulla bacheca + la propria toppa creata
--    occhiali = busta aperta · super = Santa Chat · cuciture (nuovo) = un post nelle Novità + 5 reazioni
--    olografico + occhiali_olo = tutti e 6
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
  select case when a @> array['stellina', 'fiocco', 'sciarpa', 'occhiali', 'super', 'cuciture']::text[]
              then a || array['olografico', 'occhiali_olo'] else a end
  from base;
$$;

-- 4) Il personaggio: le cuciture speciali intorno alla toppa solo se sbloccate
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
  if p_look->>'coloreCapelli' = '7' and not 'olografico' = any(v_ok) then
    raise exception 'Questo colore non è ancora sbloccato.';
  end if;
  if coalesce(p_look->>'cucitura', '0') <> '0' and not 'cuciture' = any(v_ok) then
    raise exception 'Queste cuciture non sono ancora sbloccate.';
  end if;
  insert into public.profiles (user_id, look, updated_at) values (v_uid, p_look, now())
  on conflict (user_id) do update set look = excluded.look, updated_at = now();
end;
$$;
