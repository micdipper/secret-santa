-- Foto personalizzata del totem (al posto dell'illustrazione), già ritagliata a francobollo e compressa dal telefono.
alter table public.quiz_totems add column immagine text check (immagine is null or (immagine like 'data:image/jpeg;base64,%' and octet_length(immagine) <= 200000));

-- save_quiz salva anche la foto (se c'è); il resto è uguale a prima
create or replace function public.save_quiz(p_group_id uuid, p_domande jsonb, p_totem jsonb)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_d jsonb;
  v_t jsonb;
  v_q uuid;
  v_i integer := 0;
  v_imp integer;
  v_esi integer;
  v_p text;
begin
  if not exists (select 1 from public.groups where id = p_group_id and organizer_id = v_uid) then
    raise exception 'Solo l''organizzatore può preparare il sondaggio.';
  end if;
  if jsonb_array_length(coalesce(p_totem, '[]'::jsonb)) <> 5 then
    raise exception 'Servono tutti e 5 i totem.';
  end if;
  for v_t in select * from jsonb_array_elements(p_totem) loop
    insert into public.quiz_totems (group_id, profilo, nome, descrizione, immagine)
    values (p_group_id, v_t->>'profilo', trim(v_t->>'nome'), nullif(trim(coalesce(v_t->>'descrizione', '')), ''), nullif(v_t->>'immagine', ''))
    on conflict (group_id, profilo) do update set nome = excluded.nome, descrizione = excluded.descrizione, immagine = excluded.immagine;
  end loop;
  if exists (select 1 from public.quiz_results where group_id = p_group_id) then
    update public.groups set quiz_salvato_at = coalesce(quiz_salvato_at, now()) where id = p_group_id;
    return;
  end if;
  select count(*) filter (where d->>'parametro' = 'impegno'), count(*) filter (where d->>'parametro' = 'esigenza')
    into v_imp, v_esi from jsonb_array_elements(p_domande) d;
  if v_imp <> v_esi or v_imp < 2 or v_imp > 5 then
    raise exception 'Servono lo stesso numero di domande per i due parametri, da 2 a 5 ciascuno.';
  end if;
  delete from public.quiz_questions where group_id = p_group_id;
  for v_d in select * from jsonb_array_elements(p_domande) loop
    v_i := v_i + 1;
    if coalesce(trim(v_d->>'testo'), '') = '' then
      raise exception 'La domanda % è vuota.', v_i;
    end if;
    insert into public.quiz_questions (group_id, parametro, ordine, testo)
    values (p_group_id, v_d->>'parametro', v_i, trim(v_d->>'testo')) returning id into v_q;
    foreach v_p in array array['2', '1', '-1', '-2'] loop
      if coalesce(trim(v_d->'risposte'->>v_p), '') = '' then
        raise exception 'Nella domanda % manca una risposta.', v_i;
      end if;
      insert into public.quiz_answers (question_id, testo, punti) values (v_q, trim(v_d->'risposte'->>v_p), v_p::integer);
    end loop;
  end loop;
  update public.groups set quiz_salvato_at = now() where id = p_group_id;
end;
$$;

-- il giudice ora si chiama "L'avvocato" (anche nei gruppi già creati, se non l'avevano rinominato)
update public.quiz_totems set nome = 'L''avvocato' where profilo = 'IMPEGNO_ALTO_ESIGENTE' and nome = 'Giudice di MasterChef';
