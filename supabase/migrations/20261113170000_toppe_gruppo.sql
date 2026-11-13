-- Toppe personalizzate del gruppo (13/11): l'organizzatore aggiunge fino a 4 simboli e 4 parole
-- che compaiono nel cassetto di tutti i membri.
--   simbolo: {"foto": "data:image/jpeg;base64,..."} oppure {"celle": "...."} (ricamo 28×28)
--   parola:  {"testo": "riga uno\nriga due", "stoffa": "vermiglio"}
create table public.group_toppe (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  tipo       text not null check (tipo in ('simbolo', 'parola')),
  ordine     integer not null default 0,
  contenuto  jsonb not null check (octet_length(contenuto::text) <= 150000),
  created_at timestamptz not null default now()
);
create index on public.group_toppe (group_id);

alter table public.group_toppe enable row level security;
revoke all on public.group_toppe from anon, authenticated;
grant select, insert, update, delete on public.group_toppe to authenticated;

create policy "membri vedono le toppe del gruppo" on public.group_toppe for select to authenticated
  using (group_id in (select private.my_group_ids()));
create policy "l'organizzatore aggiunge toppe" on public.group_toppe for insert to authenticated
  with check (group_id in (select private.my_organized_group_ids()));
create policy "l'organizzatore cambia toppe" on public.group_toppe for update to authenticated
  using (group_id in (select private.my_organized_group_ids()))
  with check (group_id in (select private.my_organized_group_ids()));
create policy "l'organizzatore toglie toppe" on public.group_toppe for delete to authenticated
  using (group_id in (select private.my_organized_group_ids()));

-- massimo 4 per tipo e per gruppo
create function private.max_toppe_gruppo()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.group_toppe where group_id = new.group_id and tipo = new.tipo and id <> new.id) >= 4 then
    raise exception 'Al massimo 4 toppe personalizzate per tipo.';
  end if;
  return new;
end;
$$;
create trigger max_toppe_gruppo before insert or update on public.group_toppe
  for each row execute function private.max_toppe_gruppo();

-- Premi: come prima, ma il lupetto (sciarpa) ora chiede una copia di ogni toppa del cassetto "per tutti"
-- (24: 9 simboli, 9 parole, 6 texture) + le 8 toppe del PROPRIO totem in quel gruppo.
-- NB: se si aggiungono toppe al cassetto, aggiornare gli elenchi qui sotto (components/toppe.tsx).
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
      null::text -- 'super': arriverà con la chat
    ], null) as a
  )
  select case when a @> array['stellina', 'fiocco', 'sciarpa', 'occhiali', 'super']::text[]
              then a || array['olografico', 'occhiali_olo'] else a end
  from base;
$$;
