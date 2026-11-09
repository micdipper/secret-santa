# LineField

Campo a riga da modulo di carta: etichetta in maiuscolo e una riga a puntini su cui scrivere (la scheda "NAME: ____" di ref. 05).

## Quando usarlo
- Creazione del gruppo: nome, budget, data, tema; e la lista dei nomi dei partecipanti.
- Aggiungere una voce alla wishlist (titolo, link).
- Per il PIN usa `PinInput`, non questo.

## Cosa fornisci
`<label class="ss-line">` con `.ss-line__label` (2–3 parole, con i due punti) e `<input class="ss-line__input">` in `body` 17px (mai sotto 16px). Al focus la riga diventa piena nel colore `focus`. Messaggi d'errore e aiuti come in `PinInput` (`.ss-field__error`, `.ss-field__help`).
