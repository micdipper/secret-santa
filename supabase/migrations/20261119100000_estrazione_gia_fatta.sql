-- "Abbiamo già fatto l'estrazione" (richiesta di Marzia, 19/11).
-- Il gruppo ha già estratto per conto suo: niente estrazione del sito; ognuno, entrando,
-- indica a chi fa il regalo. Gli abbinamenti finiscono nella stessa tabella `assignments`,
-- con la stessa segretezza (RLS: ognuno vede solo il proprio). Quando hanno scelto tutti,
-- il gruppo passa a "estratto" da solo e il resto del sito funziona come sempre.

alter table public.groups add column estrazione_fatta boolean not null default false;

-- L'organizzatore attiva/disattiva l'opzione finché il gruppo è aperto e nessuno ha ancora scelto.
create or replace function public.imposta_estrazione_fatta(p_group_id uuid, p_attiva boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_group public.groups;
begin
  select * into v_group from public.groups where id = p_group_id for update;
  if not found or v_group.organizer_id is distinct from (select auth.uid()) then
    raise exception 'Solo l''organizzatore può cambiare questa opzione.';
  end if;
  if v_group.status <> 'aperto' or exists (select 1 from public.assignments where group_id = p_group_id) then
    raise exception 'Non si può più cambiare: qualcuno ha già indicato la sua persona.';
  end if;
  update public.groups set estrazione_fatta = p_attiva where id = p_group_id;
end;
$$;

-- Chi è entrato indica a chi fa il regalo (e può cambiarlo finché il gruppo è aperto).
-- Se quella persona l'ha già indicata qualcun altro, errore (senza dire chi).
create or replace function public.scegli_destinatario(p_group_id uuid, p_receiver uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_group public.groups;
  v_io uuid;
begin
  select * into v_group from public.groups where id = p_group_id for update;
  if not found or not v_group.estrazione_fatta then
    raise exception 'In questo gruppo l''estrazione la fa il sito.';
  end if;
  if v_group.status <> 'aperto' then
    raise exception 'Hanno già scelto tutti: non si può più cambiare.';
  end if;
  select id into v_io from public.group_members where group_id = p_group_id and user_id = (select auth.uid());
  if v_io is null then
    raise exception 'Non fai parte di questo gruppo.';
  end if;
  if p_receiver = v_io then
    raise exception 'Non puoi fare il regalo a te stess*.';
  end if;
  if not exists (select 1 from public.group_members where id = p_receiver and group_id = p_group_id) then
    raise exception 'Questa persona non è nel gruppo.';
  end if;
  if exists (select 1 from public.assignments where group_id = p_group_id and receiver_member_id = p_receiver and giver_member_id <> v_io) then
    raise exception 'GIA_SCELTA';
  end if;

  perform set_config('estrazione.scelta', '1', true);
  insert into public.assignments (group_id, giver_member_id, receiver_member_id)
  values (p_group_id, v_io, p_receiver)
  on conflict (group_id, giver_member_id) do update set receiver_member_id = excluded.receiver_member_id, created_at = now();

  -- tutti entrati e tutti hanno scelto: come dopo un'estrazione (busta, chat, feed "estrazione fatta")
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id is null)
     and (select count(*) from public.assignments where group_id = p_group_id)
       = (select count(*) from public.group_members where group_id = p_group_id) then
    update public.groups set status = 'estratto' where id = p_group_id;
  end if;
end;
$$;

-- Quanti hanno già scelto (solo il numero: chi ha scelto chi resta segreto). Per i membri del gruppo.
create or replace function public.quanti_hanno_scelto(p_group_id uuid)
returns integer
language sql
stable
security definer
set search_path to ''
as $$
  select case when p_group_id in (select private.my_group_ids())
    then (select count(*)::integer from public.assignments where group_id = p_group_id)
  end;
$$;

-- Se l'organizzatore libera un nome ("reimposta"), si toglie anche la scelta fatta da quel nome.
create or replace function private.togli_scelta_nome_liberato()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if old.user_id is not null and new.user_id is null
     and (select status from public.groups where id = new.group_id) = 'aperto' then
    delete from public.assignments where giver_member_id = new.id;
  end if;
  return new;
end;
$$;
create trigger togli_scelta_nome_liberato after update of user_id on public.group_members
  for each row execute function private.togli_scelta_nome_liberato();

-- L'estrazione del sito non serve in questi gruppi: gli abbinamenti arrivano solo da scegli_destinatario.
create or replace function private.blocca_run_draw_se_gia_fatta()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if (select estrazione_fatta from public.groups where id = new.group_id)
     and coalesce(current_setting('estrazione.scelta', true), '') <> '1' then
    raise exception 'In questo gruppo l''estrazione è già stata fatta: ognuno indica la sua persona.';
  end if;
  return new;
end;
$$;
create trigger blocca_run_draw_se_gia_fatta before insert on public.assignments
  for each row execute function private.blocca_run_draw_se_gia_fatta();

revoke execute on function public.imposta_estrazione_fatta(uuid, boolean) from public, anon;
revoke execute on function public.scegli_destinatario(uuid, uuid) from public, anon;
revoke execute on function public.quanti_hanno_scelto(uuid) from public, anon;
grant execute on function public.imposta_estrazione_fatta(uuid, boolean) to authenticated;
grant execute on function public.scegli_destinatario(uuid, uuid) to authenticated;
grant execute on function public.quanti_hanno_scelto(uuid) to authenticated;
