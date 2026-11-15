-- Censura: anche due lettere vicine scambiate di posto ("Alessadnra", "Giluia") contano come una sola modifica.
create or replace function private.nome_simile(w text, n text)
returns boolean
language plpgsql immutable set search_path = ''
as $$
declare
  x text := private.comprimi(w);
  len int := char_length(n);
  diverse int := 0;
  jolly int := 0;
  i int := 1;
begin
  if char_length(x) <> len then return false; end if;
  while i <= len loop
    if substr(x, i, 1) = '#' then
      jolly := jolly + 1;
    elsif substr(x, i, 1) <> substr(n, i, 1) then
      if i < len and substr(x, i, 1) = substr(n, i + 1, 1) and substr(x, i + 1, 1) = substr(n, i, 1) then
        i := i + 1; -- scambio di due lettere vicine
      elsif not private.lettere_vicine(substr(x, i, 1), substr(n, i, 1)) then
        return false;
      end if;
      diverse := diverse + 1;
    end if;
    i := i + 1;
  end loop;
  -- almeno metà delle lettere vere, e poche modifiche: 0 per nomi di 3 lettere, 1 fino a 5, 2 da 6 in su
  return jolly * 2 <= len and diverse <= case when len <= 3 then 0 when len <= 5 then 1 else 2 end;
end;
$$;
