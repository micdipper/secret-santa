-- Correzioni alla censura dei nomi:
-- * più simboli di fila ai bordi ("Carla!!!") e parole di soli simboli;
-- * asterisco e cancelletto dentro un nome valgono come lettera jolly ("Br*no").
create or replace function private.normalizza(p text)
returns text
language sql immutable set search_path = ''
as $$
  select translate(lower(p),
    'àáâäãåèéêëìíîïòóôöõùúûüçñ' || '4@31!|05$7+8296€' || '*',
    'aaaaaaeeeeiiiiooooouuuucn' || 'aaeiiiossttbzgge' || '#');
$$;

create or replace function private.nome_simile(w text, n text)
returns boolean
language plpgsql immutable set search_path = ''
as $$
declare
  x text := private.comprimi(w);
  len int := char_length(n);
  diverse int := 0;
  jolly int := 0;
  i int;
begin
  if char_length(x) <> len then return false; end if;
  for i in 1..len loop
    if substr(x, i, 1) = '#' then
      jolly := jolly + 1;
    elsif substr(x, i, 1) <> substr(n, i, 1) then
      if not private.lettere_vicine(substr(x, i, 1), substr(n, i, 1)) then return false; end if;
      diverse := diverse + 1;
    end if;
  end loop;
  -- almeno metà delle lettere vere, e poche lettere sostituite
  return jolly * 2 <= len and diverse <= case when len <= 3 then 0 when len <= 5 then 1 else 2 end;
end;
$$;

-- Sostituisce con asterischi i nomi dei partecipanti del gruppo (nome e cognome, parti di almeno 3 lettere).
create or replace function private.censura_nomi(p_group uuid, p_testo text)
returns text
language plpgsql stable security definer set search_path = ''
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
    from public.group_members gm, regexp_split_to_table(gm.display_name, '[^[:alpha:]]+') as tok
    where gm.group_id = p_group
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

