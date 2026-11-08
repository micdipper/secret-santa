# MemberChip

A member chip: a name from the organiser's list with the emoji avatar that person picked.

## Use it
- The join screen ("Tocca il tuo nome"): every name in the group, tappable.
- The members list on the group page, and the sign-in again flow.

## States
- Default: tappable, `ink` border on `surface-raised`.
- `ss-member--me`: the signed-in person, `accent` fill.
- Empty avatar (`ss-member__avatar--empty`): the person hasn't joined yet. Add a `.ss-member__note` ("non ancora entrato").
- `ss-member--taken` + `disabled`: someone already claimed the name. Add the note "già preso" in `accent-text`, never colour alone.

## The consumer provides
A `<button class="ss-member">` with `.ss-member__avatar` (the person's emoji, or empty) and the display name exactly as the organiser wrote it. Emoji appear only here, chosen by the person: never as decoration.
