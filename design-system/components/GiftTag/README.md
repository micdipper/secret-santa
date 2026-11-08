# GiftTag

A kraft gift tag (etichetta per pacchi) with a punched hole: it labels a person or a gift.

## Use it
- The recipient's name on the group page ("Per Giulia") and on wishlist items.
- Group facts on the group header: budget, exchange date.

## The consumer provides
`.ss-tag` holding `.ss-tag__for` (one short word: "Per", "Budget", "Scambio") and `.ss-tag__name` (the value, in the display face). It is always `paper-deep` with `fir` text in both themes. Tilt it with `tilt-right` or `tilt-left`, alternating when several sit together.

## Don't
- Don't make it a button. If it must be tappable, wrap it in a link at least `tap-min` tall.
- Keep the value under about 14 characters.
