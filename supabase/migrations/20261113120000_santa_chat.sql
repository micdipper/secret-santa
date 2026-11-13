-- Santa Chat: chi regala scrive alla persona pescata senza rivelarsi; il destinatario risponde.
--
-- Segretezza: l'id di chi regala NON viene mai salvato nei messaggi.
-- Ogni persona ha un solo Babbo Natale (assignments è unico per receiver_member_id),
-- quindi la conversazione si riconosce dal solo destinatario.
-- Chi può leggere: il destinatario stesso e chi lo ha pescato (controllato su assignments).
-- Si scrive solo con la funzione invia_santa_message (mai direttamente nella tabella).

create table public.santa_messages (
  id                 uuid primary key default gen_random_uuid(),
  group_id           uuid not null references public.groups (id) on delete cascade,
  receiver_member_id uuid not null references public.group_members (id) on delete cascade,
  dal_babbo          boolean not null,          -- true = scritto dal Babbo Natale, false = dal destinatario
  testo              text not null check (char_length(testo) between 1 and 500),
  created_at         timestamptz not null default now()
);
create index santa_messages_receiver_idx on public.santa_messages (receiver_member_id, created_at);
create index santa_messages_group_idx on public.santa_messages (group_id);

-- Le persone a cui faccio il regalo (una per gruppo)
create function private.my_receiver_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select a.receiver_member_id from public.assignments a
  join public.group_members gm on gm.id = a.giver_member_id
  where gm.user_id = (select auth.uid());
$$;
revoke execute on function private.my_receiver_ids() from public, anon;
grant execute on function private.my_receiver_ids() to authenticated;

alter table public.santa_messages enable row level security;
revoke all on public.santa_messages from anon, authenticated;
grant select on public.santa_messages to authenticated;

create policy "santa chat: solo i due della conversazione"
  on public.santa_messages for select to authenticated
  using (
    receiver_member_id in (select private.my_member_ids())
    or receiver_member_id in (select private.my_receiver_ids())
  );

-- Invia un messaggio. p_dal_babbo = true: scrivo alla persona che ho pescato;
-- false: scrivo al mio Babbo Natale (che non conosco).
create function public.invia_santa_message(p_group uuid, p_dal_babbo boolean, p_testo text)
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
  if char_length(v_t) > 500 then
    raise exception 'Il messaggio è troppo lungo (massimo 500 caratteri)';
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

  insert into public.santa_messages (group_id, receiver_member_id, dal_babbo, testo)
  values (p_group, v_dest, p_dal_babbo, v_t)
  returning * into v_riga;
  return v_riga;
end;
$$;
revoke execute on function public.invia_santa_message(uuid, boolean, text) from public, anon;
grant execute on function public.invia_santa_message(uuid, boolean, text) to authenticated;

-- Messaggi in tempo reale (Realtime rispetta le regole di lettura qui sopra)
alter publication supabase_realtime add table public.santa_messages;

-- Premio "Taglio Super": almeno un messaggio scritto nella Santa Chat (da Babbo o da destinatario)
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
