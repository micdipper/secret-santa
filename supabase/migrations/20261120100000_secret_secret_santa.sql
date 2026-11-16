-- Easter egg "Secret secret Santa" (richiesta di Marzia, 20/11): 7 tocchi sulla pallina aprono
-- una pagina segreta con un minigioco; vincendolo si sblocca il "cappello di Natale" (id `natale`).
-- È un gioco per scherzo: basta vincere una volta, il premio vale per quell'accesso (come gli altri).

alter table public.group_members add column cappello_natale_at timestamptz;

create or replace function public.vinci_secret_secret_santa(p_group_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  update public.group_members set cappello_natale_at = coalesce(cappello_natale_at, now())
  where group_id = p_group_id and user_id = (select auth.uid());
  if not found then
    raise exception 'Non fai parte di questo gruppo.';
  end if;
end;
$$;
revoke execute on function public.vinci_secret_secret_santa(uuid) from public, anon;
grant execute on function public.vinci_secret_secret_santa(uuid) to authenticated;

-- Stessa funzione dei premi di prima (20261116100000_giochi.sql), con in fondo il cappello di Natale.
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
         || (case when exists (select 1 from public.group_members gm where gm.user_id = p_uid and gm.cappello_natale_at is not null)
                  then array['natale'] else array[]::text[] end)
  from base;
$$;
