-- Risposte ai post delle Novità (richiesta del 17/11):
-- ognuno può rispondere a un post con UN solo messaggio da massimo 15 caratteri.
-- Può cancellarlo e scriverne un altro, ma mai averne due sullo stesso post.
-- Come i post, i nomi dei partecipanti diventano asterischi (private.censura_nomi) e il testo originale non si salva.
-- Si scrive solo con rispondi_post / elimina_risposta; si legge solo dentro il gruppo.

create table public.feed_replies (
  event_id   uuid not null references public.feed_events (id) on delete cascade,
  member_id  uuid not null references public.group_members (id) on delete cascade,
  group_id   uuid not null references public.groups (id) on delete cascade,
  testo      text not null check (char_length(testo) between 1 and 15),
  created_at timestamptz not null default now(),
  primary key (event_id, member_id) -- una risposta a testa per post
);
create index feed_replies_member_idx on public.feed_replies (member_id);
create index feed_replies_group_idx on public.feed_replies (group_id);

alter table public.feed_replies enable row level security;
revoke all on public.feed_replies from anon, authenticated;
grant select on public.feed_replies to authenticated;
create policy "il gruppo legge le risposte" on public.feed_replies
  for select to authenticated using (group_id in (select private.my_group_ids()));

create function public.rispondi_post(p_event uuid, p_testo text)
returns public.feed_replies
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
  v_me uuid;
  v_t text := nullif(btrim(coalesce(p_testo, '')), '');
  v_riga public.feed_replies;
begin
  select e.group_id into v_group from public.feed_events e where e.id = p_event and e.tipo = 'post';
  select gm.id into v_me from public.group_members gm where gm.group_id = v_group and gm.user_id = (select auth.uid());
  if v_me is null then
    raise exception 'Non fai parte di questo gruppo';
  end if;
  if v_t is null then
    raise exception 'Scrivi qualcosa';
  end if;
  if char_length(v_t) > 15 then -- come il check della tabella (e MAX_RISPOSTA nel sito), ma con un messaggio chiaro
    raise exception 'Massimo 15 caratteri';
  end if;
  insert into public.feed_replies (event_id, member_id, group_id, testo)
  values (p_event, v_me, v_group, private.censura_nomi(v_group, v_t))
  returning * into v_riga;
  return v_riga;
exception
  when unique_violation then
    raise exception 'Hai già risposto: cancella la tua risposta per scriverne un''altra';
end;
$$;

-- Si cancella solo la propria risposta
create function public.elimina_risposta(p_event uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.feed_replies
  where event_id = p_event and member_id in (select private.my_member_ids());
$$;

revoke execute on function public.rispondi_post(uuid, text), public.elimina_risposta(uuid) from public, anon;
grant execute on function public.rispondi_post(uuid, text), public.elimina_risposta(uuid) to authenticated;
