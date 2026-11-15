-- Gioco 1 (Palline al volo): più difficile, chi perde i 3 cuori subito può finire in meno di 3 s: minimo a 1 s. Il resto è identico.
create or replace function private.regole_gioco(p_game integer)
returns table (durata_min integer, durata_max integer, score_max integer, punti_al_secondo integer)
language sql immutable set search_path = ''
as $$
  select r.durata_min, r.durata_max, r.score_max, r.punti_al_secondo from (values
    (1, 1,  50,  8000, 260),
    (2, 2, 600, 12000,  60),
    (3, 2, 600,  6000,  25),
    (4, 3, 300, 20000, 120),
    (5, 5,  65,  6000, 160)
  ) as r (game, durata_min, durata_max, score_max, punti_al_secondo)
  where r.game = p_game
$$;
revoke execute on function private.regole_gioco(integer) from public, anon, authenticated;
