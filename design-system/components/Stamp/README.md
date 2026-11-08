# Stamp

A postage stamp (francobollo) with perforated edges, used for one short fact.

## Use it
- The budget and exchange date on the group page.
- The theme of the group.
- One or two per screen, slightly tilted.

## The consumer provides
`.ss-stamp > .ss-stamp__inner` with `.ss-stamp__value` (display face, at most about 5 characters) and `.ss-stamp__label` (one uppercase word). The default is a cherry field with `on-accent` text, which passes as large text only. `ss-stamp--fir` gives a fir field with paper text. The perforation is a CSS mask, so the stamp needs the page ground behind it.
