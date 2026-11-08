# KnitBand

The knit band is a full-width strip of Nordic knit stitches: cream snowflakes and a dotted edge on cherry, taken from the project's mood test.

## Use it
- At the top of the landing page and the group page, bleeding edge to edge (no side gutter).
- As a divider between the group header and the content, at most twice per screen.
- `ss-knit--small` (26px) for sheets, dialogs and the footer.

## The consumer provides
An empty `<div class="ss-knit">`, decorative only, so add `aria-hidden="true"`. Stitch colour is `on-accent` and the field is `accent`. Both are tokens, so the band follows the theme.

## Don't
- Don't put text on it.
- Don't animate it.
- Don't use it vertically.
