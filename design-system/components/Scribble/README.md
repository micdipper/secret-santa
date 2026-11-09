# Scribble

Scarabocchi fatti a mano (ref. 08 e le parole cerchiate di ref. 07): cerchi, sottolineature, evidenziatore, spunte, asterischi, frecce. Sono la "scrittura a mano" del sistema, al posto di un terzo font.

## Quando usarli
- `ss-scribble--cerchio`: una parola importante in un titolo o in un post-it ("il mio *regalo*").
- `ss-scribble--sottolineato`: una parola chiave della moodboard.
- `ss-scribble--evidenziato`: un dato da non perdere (taglia, colore), con `highlight` senape.
- `ss-mark--spunta`: "già preso" nella wishlist (visibile solo a chi regala), passaggi fatti.
- `ss-mark--asterisco`: novità nel feed.
- `ss-mark--freccia`: indica il prossimo passo ("tocca qui").

## Cosa fornisci
Uno `<span>` con `ss-scribble` + variante attorno a 1–3 parole, oppure uno `<span class="ss-mark ss-mark--…">` vuoto. I segni decorativi hanno `aria-hidden="true"`; una spunta che significa qualcosa ha `role="img"` e `aria-label`. Colore: `accent-text` (≥4,5:1 in ogni tema).

## No
- Al massimo uno o due scarabocchi per schermata: devono sembrare un'aggiunta a penna, non un motivo.
