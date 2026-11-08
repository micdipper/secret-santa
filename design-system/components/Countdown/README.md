# Countdown

A countdown to the gift exchange, on the group page.

## The consumer provides
`.ss-countdown` (`role="timer"`, with an `aria-label` that reads the whole time as a sentence) holding three `.ss-countdown__unit`s (days, hours, minutes; no seconds, to keep it calm), separated by decorative `ss-star`s. Values are two digits with tabular figures. Update once a minute.

## When the day comes
Replace the countdown with a single line in `display-heading`, e.g. "È il giorno dello scambio!"
