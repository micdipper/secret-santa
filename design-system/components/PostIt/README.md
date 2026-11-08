# PostIt

A butter-yellow sticky note with a strip of tape, used for keywords and sizes on the moodboard.

## Use it
- Moodboard items of type "post-it" (keywords) and "taglie" (sizes).
- Short text: up to about 6 words in the note, plus an optional `.ss-postit__note` line.

## The consumer provides
`.ss-postit` with the text, alternating `tilt-left` (the default) and `ss-postit--right`. On the moodboard the rotation comes from the item's saved `rotazione`, so set `transform` inline and keep the class for colour, tape and shadow. Use `shadow-lifted` while the note is dragged. The text is always `fir` on `postit`, in both themes.
