# GiftTag

Etichetta per pacchi in carta con il buco per lo spago: dà un nome a una persona o a un regalo.

## Quando usarla
- Il nome del destinatario nella pagina del gruppo ("Per Giulia") e sulle voci della wishlist.
- I dati del gruppo nell'intestazione: budget, data dello scambio.

## Cosa fornisci
`.ss-tag` con `.ss-tag__for` (una parola: "Per", "Budget", "Scambio") e `.ss-tag__name` (il valore, nel carattere display). È sempre `paper-deep` con testo `fir`, in ogni tema. Inclinala con `tilt-right` o `tilt-left`, alternando se sono vicine.

## No
- Non è un bottone. Se deve essere toccabile, mettila in un link alto almeno `tap-min`.
- Valore entro circa 14 caratteri.
