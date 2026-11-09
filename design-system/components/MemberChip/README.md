# MemberChip

Chip di un membro: un nome della lista dell'organizzatore con l'emoji scelta da quella persona.

## Quando usarlo
- Nella schermata d'ingresso ("Tocca il tuo nome"): tutti i nomi del gruppo, toccabili.
- Nella lista dei membri del gruppo e per rientrare.

## Stati
- Normale: toccabile, bordo `ink` su `surface-raised`.
- `ss-member--me`: chi è entrato, fondo `accent`.
- Avatar vuoto (`ss-member__avatar--empty`): la persona non è ancora entrata. Aggiungi `.ss-member__note` ("non ancora entrato").
- `ss-member--taken` + `disabled`: qualcuno ha già preso il nome. Aggiungi la nota "già preso" in `accent-text`: mai solo il colore.

## Cosa fornisci
Un `<button class="ss-member">` con `.ss-member__avatar` (l'emoji della persona, o vuoto) e il nome esattamente come l'ha scritto l'organizzatore. Le emoji compaiono solo qui, scelte dalle persone: mai come decorazione.
