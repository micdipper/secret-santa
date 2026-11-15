-- 15/11 (Marzia): il premio "cuciture" (post + 5 reazioni) sblocca SOLO la catenella (look.cucitura = 1).
-- Tulipano, felce e punto croce (look.cucitura = 2, 3, 4) sono le "cornici" premio del gioco 4 (PIANO-GIOCHI.md, id `cornici`).
create or replace function public.save_avatar(p_look jsonb)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_ok text[];
  v_acc text;
begin
  if v_uid is null then
    raise exception 'Devi aver fatto l''accesso.';
  end if;
  v_ok := private.unlocked_accessories(v_uid);
  for v_acc in select jsonb_array_elements_text(coalesce(p_look->'accessori', '[]'::jsonb)) loop
    if not v_acc = any(v_ok) then
      raise exception 'Questo accessorio non è ancora sbloccato.';
    end if;
  end loop;
  if p_look->>'capelli' = '12' and not 'super' = any(v_ok) then
    raise exception 'Questo taglio non è ancora sbloccato.';
  end if;
  if p_look->>'coloreCapelli' = '7' and not 'olografico' = any(v_ok) then
    raise exception 'Questo colore non è ancora sbloccato.';
  end if;
  if p_look->>'cucitura' = '1' and not 'cuciture' = any(v_ok) then
    raise exception 'Questa cucitura non è ancora sbloccata.';
  end if;
  if p_look->>'cucitura' in ('2', '3', '4') and not 'cornici' = any(v_ok) then
    raise exception 'Questa cornice non è ancora sbloccata.';
  end if;
  insert into public.profiles (user_id, look, updated_at) values (v_uid, p_look, now())
  on conflict (user_id) do update set look = excluded.look, updated_at = now();
end;
$$;
