# Button

Buttons are pill-shaped, at least `tap-min` (44px) tall, labelled in the `button` style (Bricolage Grotesque 19px bold).

## Variants
- `ss-btn--primary`: the one main action on a screen ("Apri la busta", "Estrai i nomi", "Entra"). `accent` fill, `on-accent` label, a hard `fir-deep` drop that presses down on tap.
- `ss-btn--secondary`: alternatives ("Invita amici", "Aggiungi alla wishlist"). Transparent with a 2px `ink` border.
- `ss-btn--ghost`: low-weight or organiser-only actions ("Reimposta PIN", "Libera il nome"). `accent-text`, underlined.
- `ss-btn--block`: full width, for the bottom of a mobile screen.

## The consumer provides
A `<button>` or `<a>` with class `ss-btn` plus one variant, a short Italian verb-first label, and `disabled` (or `aria-disabled="true"`) when the action isn't ready yet, such as the draw before everyone has joined.

## Do / don't
- One primary per screen.
- Keep the label at 19px bold: that is what lets `on-accent` read on cherry (3.5:1 large-text rule). Never shrink it.
- No emoji in labels.
