-- Regali per sempre (Marzia, 22/11): un regalo sbloccato resta tuo anche se poi non rispetti più
-- la condizione (es. togli le cose dalla bacheca dopo aver vinto il fiocco).
--
-- Come: la vecchia funzione che calcola i regali di adesso diventa private.regali_calcolati (stesso corpo,
-- solo rinominata) e private.unlocked_accessories ora 1) calcola quelli di adesso, 2) li segna in
-- private.regali_vinti, 3) restituisce tutti quelli mai vinti. Chi la chiama (save_avatar,
-- my_unlocked_accessories) non cambia: la cerca per nome a ogni chiamata.
-- ⚠ Per cambiare le CONDIZIONI dei regali da qui in poi si riscrive private.regali_calcolati
--   (ultima versione del corpo: 20261120100000_secret_secret_santa.sql).

create table private.regali_vinti (
  user_id uuid not null references auth.users (id) on delete cascade,
  regalo text not null,
  quando timestamptz not null default now(),
  primary key (user_id, regalo)
);
alter table private.regali_vinti enable row level security; -- nessuna regola: si tocca solo dalle funzioni

alter function private.unlocked_accessories(uuid) rename to regali_calcolati;

create function private.unlocked_accessories(p_uid uuid)
returns text[]
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_tutti text[];
begin
  if p_uid is null then
    return array[]::text[];
  end if;
  insert into private.regali_vinti (user_id, regalo)
  select p_uid, r from unnest(private.regali_calcolati(p_uid)) as r
  on conflict do nothing;

  v_tutti := array(select regalo from private.regali_vinti where user_id = p_uid order by quando, regalo);
  -- i due olografici: per chi ha vinto (anche in momenti diversi) tutti e 6 i regali "del sito"
  if v_tutti @> array['stellina', 'fiocco', 'sciarpa', 'occhiali', 'super', 'cuciture']::text[]
     and not v_tutti @> array['olografico', 'occhiali_olo']::text[] then
    insert into private.regali_vinti (user_id, regalo)
    values (p_uid, 'olografico'), (p_uid, 'occhiali_olo')
    on conflict do nothing;
    v_tutti := array(select regalo from private.regali_vinti where user_id = p_uid order by quando, regalo);
  end if;
  return v_tutti;
end;
$$;

revoke execute on function private.unlocked_accessories(uuid) from public, anon;
grant execute on function private.unlocked_accessories(uuid) to authenticated;
revoke execute on function private.regali_calcolati(uuid) from public, anon, authenticated;

-- scrive: non può più essere "stable"
create or replace function public.my_unlocked_accessories()
returns text[]
language sql volatile security definer set search_path = ''
as $$
  select private.unlocked_accessories((select auth.uid()));
$$;

-- chi ha già vinto qualcosa: lo segniamo subito
insert into private.regali_vinti (user_id, regalo)
select u.user_id, r
from (select distinct user_id from public.group_members where user_id is not null) u
cross join lateral unnest(private.regali_calcolati(u.user_id)) as r
on conflict do nothing;
