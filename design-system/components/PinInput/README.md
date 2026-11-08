# PinInput

A four-box PIN entry, used once at sign-up and again on a new device.

## The consumer provides
`.ss-field` with a `.ss-field__label`, then `.ss-pin` holding four `<input class="ss-pin__box" inputmode="numeric" autocomplete="one-time-code" maxlength="1">`. Add focus-advance and paste handling in JS. Below it, either `.ss-field__help` or `.ss-field__error` (with `role="alert"`).

## Rules
- Digits are 32px, so iOS never zooms. Any other input uses `body` (17px) or larger, never below 16px.
- Boxes are 56×64px, above `tap-min`.
- An error turns the borders to `accent-text` *and* shows a sentence: never colour alone.
- Error copy says what to do next: "Riprova o chiedi all'organizzatore."
