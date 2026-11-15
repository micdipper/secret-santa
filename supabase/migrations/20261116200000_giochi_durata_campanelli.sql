-- Gioco 2 (Campanelli): chi sbaglia al primo giro finisce in meno di 5 s, e la partita sarebbe "non valida".
-- Il primo punto arriva dopo almeno 2,8 s (pausa + sequenza), quindi il minimo scende a 2 s. Il resto è identico.
create or replace function private.regole_gioco(p_game integer)
returns table (durata_min integer, durata_max integer, score_max integer, punti_al_secondo integer)
language sql immutable set search_path = ''
as $$
  select r.durata_min, r.durata_max, r.score_max, r.punti_al_secondo from (values
    (1, 3,  50,  8000, 260),
    (2, 2, 600, 12000,  60),
    (3, 2, 600,  6000,  25),
    (4, 3, 300, 20000, 120),
    (5, 5,  65,  6000, 160)
  ) as r (game, durata_min, durata_max, score_max, punti_al_secondo)
  where r.game = p_game
$$;
revoke execute on function private.regole_gioco(integer) from public, anon, authenticated;
