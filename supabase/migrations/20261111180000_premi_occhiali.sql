-- Premi (gerarchia di Marzia, 11/11 sera):
--   stellina    Così ti ricordi i compleanni = sondaggio completato
--   fiocco      È un bracciale o una collana? = almeno 10 cose sulla bacheca, tra cui foto/immagine, punto croce, simbolo, parola, texture
--   sciarpa     Lupetto grigio               = almeno una copia di OGNI toppa del cassetto + una foto/immagine + un punto croce
--   occhiali    Occhiali veloci              = busta aperta
--   super       Taglio Super                 = chattare col proprio Babbo Natale (chat: Fase 2, per ora mai)
--   olografico + occhiali_olo (Occhiali veloci olografici) = tutti e 5 i premi sopra
-- NB: se si aggiungono toppe al cassetto, aggiornare l'elenco qui sotto (components/toppe.tsx).
create or replace function private.unlocked_accessories(p_uid uuid)
returns text[]
language sql stable security definer set search_path = ''
as $$
  with mie as (
    select mi.* from public.moodboard_items mi join public.group_members gm on gm.id = mi.member_id where gm.user_id = p_uid
  ),
  bacheche as (
    select gm.id from public.group_members gm where gm.user_id = p_uid
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
        where exists (select 1 from mie where mie.member_id = b.id and mie.kind in ('foto', 'immagine_link'))
          and exists (select 1 from mie where mie.member_id = b.id and mie.kind = 'ricamo' and mie.content->>'celle' ~ '[0-9]')
          and (select count(distinct mie.content->>'toppa') from mie where mie.member_id = b.id and mie.kind = 'toppa'
               and mie.content->>'toppa' = any(array['tazza','fuoco','luna','stella','neve','foglia','gomitolo','cuore','uccellino','regalo',
                                                     'comodo','brilla','fatto-a-mano','bosco','caos','sorpresa',
                                                     'pois','zucchero','vichy','tartan','maglia','velluto'])) = 22
      ) then 'sciarpa' end,
      case when exists (select 1 from public.group_members gm where gm.user_id = p_uid and gm.envelope_opened_at is not null) then 'occhiali' end,
      null::text -- 'super': arriverà con la chat
    ], null) as a
  )
  select case when a @> array['stellina', 'fiocco', 'sciarpa', 'occhiali', 'super']::text[]
              then a || array['olografico', 'occhiali_olo'] else a end
  from base;
$$;
