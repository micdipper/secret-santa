# Button

Bottoni a pillola, alti almeno `tap-min` (44px), con l'etichetta nello stile `button` (Bricolage Grotesque 19px bold).

## Varianti
- `ss-btn--primary`: l'unica azione principale della schermata ("Apri la busta", "Estrai i nomi", "Entra"). Fondo `accent`, testo `on-accent`, un'ombra dura `fir-deep` che si schiaccia al tocco.
- `ss-btn--secondary`: alternative ("Invita amici", "Aggiungi alla wishlist"). Trasparente con bordo `ink` di 2px.
- `ss-btn--ghost`: azioni leggere o solo per l'organizzatore ("Reimposta PIN", "Libera il nome"). `accent-text`, sottolineato.
- `ss-btn--block`: larghezza piena, in fondo a una schermata mobile.

## Cosa fornisci
Un `<button>` o `<a>` con `ss-btn` e una variante, un'etichetta breve che inizia con un verbo, e `disabled` (o `aria-disabled="true"`) quando l'azione non è ancora possibile, ad esempio l'estrazione prima che tutti siano entrati.

## Sì / no
- Un solo primario per schermata.
- L'etichetta resta 19px bold: è ciò che rende leggibile `on-accent` sul ciliegia. Mai rimpicciolirla.
- Niente emoji nelle etichette.
