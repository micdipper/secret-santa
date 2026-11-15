-- Premi: unione delle due versioni del 13/11 (la migrazione toppe_gruppo, applicata dopo santa_chat,
-- aveva rimesso il Taglio Super come "mai"). Lupetto = toppe "per tutti" + toppe del proprio totem;
-- Taglio Super = almeno un messaggio nella Santa Chat.
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
               and mie.content->>'toppa' = any(array['tazza','fuoco','luna','stella','neve','gomitolo','regalo','oreo','cappello',
                                                     'fatto-a-mano','sorpresa','chronically','crazy','no-way','nerdy','bello','brutto','perche-no',
                                                     'pois','zucchero','vichy','tartan','maglia','velluto'])) = 24
          and (select count(distinct mie.content->>'toppa') from mie where mie.member_id = b.id and mie.kind = 'toppa'
               and mie.content->>'toppa' = any(case b.profilo
                 when 'IMPEGNO_ALTO_RICEVE_TUTTO' then array['aa-portatile','aa-sudato','aa-capra','aa-lupo','aa-hot','aa-at-work','aa-goat','aa-overthinker']
                 when 'IMPEGNO_ALTO_ESIGENTE' then array['ae-martelletto','ae-gioielli','ae-unghie','ae-imprenditore','ae-legge','ae-diva','ae-grindset','ae-no-pain']
                 when 'IMPEGNO_BASSO_RICEVE_TUTTO' then array['ba-pugno','ba-shaka','ba-bradipo','ba-cartello','ba-non-mi-va','ba-amo-noi','ba-zero-effort','ba-chills']
                 when 'IMPEGNO_BASSO_ESIGENTE' then array['be-lupetto','be-scontrino','be-lupo','be-iphone','be-tenuto','be-spero','be-bella-merda','be-baddie']
                 else array['bo-caricamento','bo-zuppa','bo-lupi','bo-uovo','bo-boh','bo-buffering','bo-nonhocapito','bo-boiled']
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
