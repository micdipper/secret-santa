-- Bacheca: toppe, ricamo, foto e immagini da link. Niente più lista dei desideri.

drop table if exists public.wishlist_claims;
drop table if exists public.wishlist_items;

-- Tipi di elemento della bacheca
alter table public.moodboard_items drop constraint moodboard_items_kind_check;
alter table public.moodboard_items add constraint moodboard_items_kind_check
  check (kind in ('toppa', 'ricamo', 'foto', 'immagine_link'));

-- Un solo ricamo per persona (è uno strato che copre tutta la tela)
create unique index moodboard_items_un_ricamo_per_persona
  on public.moodboard_items (member_id) where kind = 'ricamo';

-- Il contenuto non deve diventare enorme (il ricamo è la cosa più pesante)
alter table public.moodboard_items add constraint moodboard_items_content_size
  check (octet_length(content::text) <= 200000);
