-- La censura dei nomi lavora su una lista di nomi: così si può provare anche nella sala prove
-- (prova_censura, senza accesso e senza salvare niente). I gruppi veri usano censura_nomi come prima.
-- Il cuore della censura: copre con asterischi i nomi dati (nome e cognome, parti di almeno 3 lettere).
create function private.censura_testo(p_nomi text[], p_testo text)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  nomi text[];
  n int := char_length(p_testo);
  car text[];          -- caratteri originali
  norm text[];         -- caratteri normalizzati
  t_ini int[] := '{}'; -- parole: inizio, fine (nel testo originale)
  t_fin int[] := '{}';
  ini int := 0;
  i int; j int; k int; a int; b int;
  w text; nome text; ok boolean; la int; lb int;
begin
  if p_testo is null or n = 0 then return p_testo; end if;

  select array_agg(distinct x) into nomi
  from (
    select private.comprimi(regexp_replace(private.normalizza(tok), '[^a-z]', '', 'g')) as x
    from unnest(p_nomi) as nome_intero, regexp_split_to_table(nome_intero, '[^[:alpha:]]+') as tok
  ) s
  where char_length(x) >= 3;
  if nomi is null then return p_testo; end if;

  car := regexp_split_to_array(p_testo, '');
  for i in 1..n loop
    norm[i] := private.normalizza(car[i]);
  end loop;

  -- parole = sequenze di lettere (anche leet)
  for i in 1..n + 1 loop
    if i <= n and norm[i] ~ '^[a-z#]$' then
      if ini = 0 then ini := i; end if;
    elsif ini > 0 then
      t_ini := t_ini || ini; t_fin := t_fin || (i - 1); ini := 0;
    end if;
  end loop;

  -- finestre di 1..15 parole vicine: una parola intera, oppure un nome spezzato
  -- ("giu lia", "g.i.u.l.i.a", "g i u l i a")
  for i in 1..coalesce(array_length(t_ini, 1), 0) loop
    for j in i..least(i + 14, array_length(t_ini, 1)) loop
      -- più parole: o 2 pezzi da almeno 2 lettere, o tanti pezzi da 1-2 lettere (lettere spaziate)
      if j > i then
        ok := true;
        for k in i..j loop
          if (j - i = 1 and t_fin[k] - t_ini[k] + 1 < 2) or (j - i >= 2 and t_fin[k] - t_ini[k] + 1 > 2) then ok := false; end if;
        end loop;
        if not ok then continue; end if;
      end if;
      -- con e senza i simboli ai bordi ("carla!!!" → "carla", "#bruno" → "bruno"; "@nna" e "c4rl4" restano lettere)
      for a in 0..1 loop
        for b in 0..1 loop
          w := '';
          for k in i..j loop
            w := w || array_to_string(norm[t_ini[k]:t_fin[k]], '');
          end loop;
          la := 0; lb := 0;
          if a = 1 then
            while t_ini[i] + la <= t_fin[i] and car[t_ini[i] + la] !~ '[[:alnum:]]' loop la := la + 1; end loop;
            if la = 0 then continue; end if;
          end if;
          if b = 1 then
            while t_fin[j] - lb >= greatest(t_ini[j], t_ini[i] + la) and car[t_fin[j] - lb] !~ '[[:alnum:]]' loop lb := lb + 1; end loop;
            if lb = 0 then continue; end if;
          end if;
          w := substr(w, la + 1, char_length(w) - la - lb);
          foreach nome in array nomi loop
            if (j = i or char_length(nome) >= 4) and private.nome_simile(w, nome) then
              for k in t_ini[i] + la..t_fin[j] - lb loop
                if norm[k] ~ '^[a-z#]$' then car[k] := '*'; end if;
              end loop;
            end if;
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;

  return array_to_string(car, '');
end;
$$;


create or replace function private.censura_nomi(p_group uuid, p_testo text)
returns text
language sql stable security definer set search_path = ''
as $$
  select private.censura_testo(
    (select coalesce(array_agg(gm.display_name), '{}') from public.group_members gm where gm.group_id = p_group),
    p_testo);
$$;

-- Sala prove: stessa censura con nomi inventati (max 20 nomi, testo max 500 caratteri). Non legge né scrive niente.
create function public.prova_censura(p_nomi text[], p_testo text)
returns text
language sql immutable security definer set search_path = ''
as $$
  select case when coalesce(array_length(p_nomi, 1), 0) <= 20 and char_length(coalesce(p_testo, '')) <= 500
              then private.censura_testo(p_nomi, p_testo) end;
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
grant execute on function public.prova_censura(text[], text) to anon, authenticated;
