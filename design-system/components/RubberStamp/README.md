# RubberStamp

Timbro tondo con testo che gira sul bordo (il timbro di ref. 07 e il testo ad arco di ref. 06).

## Quando usarlo
- Sopra un oggetto per dirne lo stato: "Estrazione fatta" sul gruppo, "Già preso" su una voce della wishlist (solo per chi regala), "Rivelato" sulla pagina finale.
- Uno per oggetto, storto con `tilt-strong`, sovrapposto per metà all'angolo dell'oggetto.

## Cosa fornisci
Un `<svg class="ss-rubber" viewBox="0 0 120 120" role="img" aria-label="…">` con un `<path>` circolare in `<defs>` (raggio 43), due `circle.ss-rubber__ring` (r 56 e 31, il secondo `--thin`), un `<text><textPath>` con 3–5 parole separate da ✦, e una parola centrale `.ss-rubber__word`. Ogni timbro nella pagina ha un id di path diverso. Colore `accent-text`, oppure `ss-rubber--ink` per `ink`.
