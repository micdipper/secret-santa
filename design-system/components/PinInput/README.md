# PinInput

Inserimento del PIN a quattro caselle: alla prima iscrizione e su un nuovo dispositivo.

## Cosa fornisci
`.ss-field` con `.ss-field__label`, poi `.ss-pin` con quattro `<input class="ss-pin__box" inputmode="numeric" autocomplete="one-time-code" maxlength="1">`, con avanzamento del focus e incolla gestiti in JS. Sotto: `.ss-field__help` oppure `.ss-field__error` (con `role="alert"`).

## Regole
- Cifre da 32px: iOS non fa mai zoom. Ogni altro campo usa `body` (17px) o più, mai sotto i 16px.
- Caselle 56×64px, sopra `tap-min`.
- Un errore colora i bordi `accent-text` *e* mostra una frase: mai solo il colore.
- Il messaggio d'errore dice cosa fare: "Riprova o chiedi all'organizzatore."
