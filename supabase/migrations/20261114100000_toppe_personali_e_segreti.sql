-- 14/11 (richieste di Marzia)
-- 1) Segretezza: le impostazioni dell'organizzatore non si leggono nemmeno dall'ispeziona del browser.
--    Le esclusioni erano già leggibili solo dall'organizzatore. Le DOMANDE del sondaggio invece le leggeva tutto il gruppo,
--    compresa la colonna "parametro" (cosa misura ogni domanda): ora solo l'organizzatore.
--    Chi risponde le riceve da get_quiz (security definer), senza parametro né punti.
drop policy "membri vedono le domande" on public.quiz_questions;
create policy "solo l'organizzatore vede le domande" on public.quiz_questions for select to authenticated
  using (group_id in (select private.my_organized_group_ids()));

-- 2) Toppe personali: ogni persona può creare UN suo simbolo e UNA sua parola (stessa tabella delle toppe del gruppo).
--    member_id vuoto = toppa del gruppo (dell'organizzatore, max 4 per tipo); pieno = toppa personale (max 1 per tipo).
alter table public.group_toppe add column member_id uuid references public.group_members (id) on delete cascade;
create index on public.group_toppe (member_id);

drop policy "l'organizzatore aggiunge toppe" on public.group_toppe;
drop policy "l'organizzatore cambia toppe" on public.group_toppe;
drop policy "l'organizzatore toglie toppe" on public.group_toppe;
create policy "aggiunge toppe chi può" on public.group_toppe for insert to authenticated
  with check (
    (member_id is null and group_id in (select private.my_organized_group_ids()))
    or (member_id in (select private.my_member_ids()) and group_id = private.group_of_member(member_id))
  );
create policy "cambia toppe chi può" on public.group_toppe for update to authenticated
  using (
    (member_id is null and group_id in (select private.my_organized_group_ids()))
    or member_id in (select private.my_member_ids())
  )
  with check (
    (member_id is null and group_id in (select private.my_organized_group_ids()))
    or (member_id in (select private.my_member_ids()) and group_id = private.group_of_member(member_id))
  );
create policy "toglie toppe chi può" on public.group_toppe for delete to authenticated
  using (
    (member_id is null and group_id in (select private.my_organized_group_ids()))
    or member_id in (select private.my_member_ids())
  );

create or replace function private.max_toppe_gruppo()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.member_id is null then
    if (select count(*) from public.group_toppe where group_id = new.group_id and member_id is null and tipo = new.tipo and id <> new.id) >= 4 then
      raise exception 'Al massimo 4 toppe del gruppo per tipo.';
    end if;
  elsif (select count(*) from public.group_toppe where member_id = new.member_id and tipo = new.tipo and id <> new.id) >= 1 then
    raise exception 'Puoi creare un solo simbolo e una sola parola tuoi.';
  end if;
  return new;
end;
$$;

-- 3) Novità: quando l'organizzatore aggiunge toppe al gruppo, il gruppo lo sa (entro 1 ora la stessa voce torna in cima).
alter table public.feed_events drop constraint feed_events_tipo_check;
alter table public.feed_events add constraint feed_events_tipo_check
  check (tipo in ('creato', 'entrato', 'estrazione', 'busta', 'bacheca', 'totem', 'post', 'toppe'));

create function private.feed_da_toppe()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_member uuid;
begin
  if new.member_id is not null then return null; end if; -- le toppe personali non fanno notizia
  select gm.id into v_member from public.group_members gm join public.groups g on g.id = gm.group_id
  where g.id = new.group_id and gm.user_id = g.organizer_id;
  update public.feed_events set quando = now()
  where group_id = new.group_id and tipo = 'toppe' and quando > now() - interval '1 hour';
  if not found then
    insert into public.feed_events (group_id, member_id, tipo) values (new.group_id, v_member, 'toppe');
  end if;
  return null;
end;
$$;
create trigger feed_toppe after insert on public.group_toppe
  for each row execute function private.feed_da_toppe();

-- 4) Premi: il lupetto chiede una copia di ogni toppa "per tutti" (22) + le 8 del proprio totem (elenchi del 14/11).
--    NB: se cambiano le toppe, aggiornare gli elenchi qui sotto (components/toppe.tsx). Taglio Super come prima.
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
          and exists (select 1 from mie where mie.member_id = b.id and mie.kind in ('foto', 'immagine_link'))
          and exists (select 1 from mie where mie.member_id = b.id and mie.kind = 'ricamo' and mie.content->>'celle' ~ '[0-9]')
          and (select count(distinct mie.content->>'toppa') from mie where mie.member_id = b.id and mie.kind = 'toppa'
               and mie.content->>'toppa' = any(array['tazza','fuoco','luna','stella','neve','gomitolo','regalo','cappello',
                                                     'fatto-a-mano','sorpresa','crazy','no-way','nerdy','bello','brutto','perche-no',
                                                     'pois','zucchero','vichy','tartan','maglia','velluto'])) = 22
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
      ) then 'super' end
    ], null) as a
  )
  select case when a @> array['stellina', 'fiocco', 'sciarpa', 'occhiali', 'super']::text[]
              then a || array['olografico', 'occhiali_olo'] else a end
  from base;
$$;
