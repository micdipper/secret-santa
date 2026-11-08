# RevealCard

The ticket (il biglietto) that slides out of the envelope at the draw reveal, with the recipient's name.

## Use it
- The reveal screen: the 2D fallback when 3D or motion is unavailable, and the face texture of the three.js ticket.
- The "your match" card on the group page afterwards.

## The consumer provides
`.ss-reveal` with `.ss-reveal__eyebrow` (one sentence), `.ss-reveal__name` (the name exactly as the organiser wrote it), `.ss-reveal__stars` (three `ss-star`, decorative) and `.ss-reveal__meta`. Always place it on a `fir` ground (the envelope), in both themes. It uses `shadow-lifted` and `tilt-slight`.

## Don't
- Never show anyone else's match in this card.
- The holographic tilt belongs to the 3D layer, not to this CSS. Respect `prefers-reduced-motion`.
