-- Gioco 4 (Slitta slalom): vince chi prende più regali, a parità chi va più lontano.
-- Il punteggio salvato è regali × 10000 + metri (i metri non arrivano mai a 10000: traguardo a 240 s),
-- così la classifica e il vincitore restano "punteggio più alto". Limiti del gioco 4 allargati di conseguenza
-- (al massimo ~1 regalo al secondo = 10000 punti/s). Il resto è identico a 20261116210000.
create or replace function private.regole_gioco(p_game integer)
returns table (durata_min integer, durata_max integer, score_max integer, punti_al_secondo integer)
language sql immutable set search_path = ''
as $$
  select r.durata_min, r.durata_max, r.score_max, r.punti_al_secondo from (values
    (1, 1,  50,    8000,   260),
    (2, 2, 600,   12000,    60),
    (3, 2, 600,    6000,    25),
    (4, 3, 300, 3000000, 15000),
    (5, 5,  65,    6000,   160)
  ) as r (game, durata_min, durata_max, score_max, punti_al_secondo)
  where r.game = p_game
$$;
revoke execute on function private.regole_gioco(integer) from public, anon, authenticated;
