-- Sala prove: la STESSA regola dell'estrazione vera (run_draw), ma su persone inventate
-- e senza salvare niente. Le persone sono numerate 1..n.
-- p_coppie: coppie piatte [a1,b1,a2,b2,...] (non si pescano a vicenda)
-- p_anno:   coppie piatte [chi,a_chi,...] (chi ha regalato l'anno scorso non ripesca lo stesso)
-- Restituisce l'ordine del cerchio (ognuno regala al successivo) oppure null se impossibile.
create function public.prova_estrazione(p_n integer, p_coppie integer[], p_anno integer[])
returns integer[]
language plpgsql volatile set search_path = ''
as $$
declare
  v_order integer[];
  v_ok boolean;
  i integer;
  j integer;
  v_giver integer;
  v_receiver integer;
begin
  if p_n < 3 or p_n > 60 then
    raise exception 'Servono da 3 a 60 persone.';
  end if;
  for v_attempt in 1..5000 loop
    select array_agg(k order by random()) into v_order from generate_series(1, p_n) k;
    v_ok := true;
    for i in 1..p_n loop
      v_giver := v_order[i];
      v_receiver := v_order[(i % p_n) + 1];
      for j in 1..coalesce(array_length(p_coppie, 1), 0) / 2 loop
        if least(v_giver, v_receiver) = least(p_coppie[2 * j - 1], p_coppie[2 * j])
           and greatest(v_giver, v_receiver) = greatest(p_coppie[2 * j - 1], p_coppie[2 * j]) then
          v_ok := false;
        end if;
      end loop;
      for j in 1..coalesce(array_length(p_anno, 1), 0) / 2 loop
        if v_giver = p_anno[2 * j - 1] and v_receiver = p_anno[2 * j] then
          v_ok := false;
        end if;
      end loop;
      exit when not v_ok;
    end loop;
    if v_ok then
      return v_order;
    end if;
  end loop;
  return null;
end;
$$;
revoke execute on function public.prova_estrazione(integer, integer[], integer[]) from public;
grant execute on function public.prova_estrazione(integer, integer[], integer[]) to anon, authenticated;
