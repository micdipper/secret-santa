Secret Santa is a small website where a group of friends draws names, keeps a moodboard and wishlist, and opens the result in an envelope. It should feel like a **classic Christmas with a vintage, Nordic-folk warmth**: knitted jumpers, eight-point stars, folk hearts, cut paper, 1950s–60s Christmas cards, stamps and parcel labels. It should look careful and good, never kitsch.

Two ideas carry every screen:

1. **Paper on a table.** Content is paper: tags, post-its, polaroids, tickets and stamps lie on a ground (`surface`), slightly rotated (`tilt-*`), each with a soft `shadow-paper`.
2. **A knitted edge.** A cherry knit band (`KnitBand`) frames the important screens the way a jumper's yoke frames a face.

## Content fundamentals

- **Italian, informal, second person.** Talk to *tu*: "La tua busta ti aspetta, Giulia", "Tocca il tuo nome", "Aggiungi un post-it alla moodboard".
- **Sentence case** everywhere, including buttons and titles. Uppercase only in stamp labels and countdown units.
- **Verb-first, short buttons:** "Apri la busta", "Estrai i nomi", "Invita amici", "Reimposta PIN".
- **Names are sacred.** Show participants' names exactly as the organiser typed them. Never abbreviate or "fix" them.
- **Italian formats:** "30 €" (number, space, euro), "20 dicembre" (lowercase month), "Scambio il 20 dicembre", a middot to join facts ("Budget 30 € · Scambio il 20 dicembre").
- **Errors say what to do next:** "PIN sbagliato. Riprova o chiedi all'organizzatore." "Non riesco a fare l'estrazione con queste esclusioni: prova a toglierne una."
- **Secrecy in the voice:** never hint at anyone else's match. Use "il tuo Babbo Natale segreto" and "chi ti ha pescato", never a name.
- **No decorative emoji.** Emoji exist only as avatars that people choose for themselves (`MemberChip`) and as feed reactions.

## Visual foundations

### Colour
The palette is four brand colours sampled from the project's mood test: `fir` (verde abete), `cherry` (rosso ciliegia), `paper` (crema) and `gold` (oro tenue). The other colour tokens are derived from these four.

There are two themes over the same paper objects:
- **Carta** (`light`, the default): `paper` ground with `fir` ink. Use it for working screens: moodboard, wishlist, forms.
- **Abete** (`dark`): `fir` ground with `paper` ink and gold stars, the look of the mood test. Use it for the landing, the group header and the reveal, and as the dark theme.

Rules:
- Set text in `ink` on `surface`, `surface-raised` or `surface-sunken`. Secondary text uses `ink-muted`.
- `cherry` is a **fill**, not a text colour. It goes on primary buttons (`accent`), knit bands, stamps and hearts. Labels on it are `on-accent` at 19px bold or larger. Red text uses `accent-text`.
- `gold` is for ornaments on fir only. On paper, ornaments use `ornament` (`gold-deep`).
- Paper objects keep their own colours in both themes: tags `paper-deep`, post-its `postit`, polaroids and the ticket `photo-frame`, all with `fir` text and `fir-muted` secondary text.
- Status is never colour alone: errors pair `accent-text` with a sentence; a taken name says "già preso".
- Focus: a 2px solid `focus` ring, offset 2px, on every interactive element.

### Type
Two families, and never a third:
- **Basteleur Bold** (`display`, Velvetyne, SIL OFL) for titles and names: `display-hero`, `display-title`, `display-heading`. It is the free stand-in for the vintage, starry, folk-tale feel of the reference face. Use it for at most one hero line and one heading per screen. Never set body copy or UI labels in it.
- **Bricolage Grotesque** (`sans`, Google Fonts, variable) for everything else: `lead`, `body`, `button`, `label`, `caption`, `pin`.
- Every input is 16px or larger (`body` is 17px) so iOS Safari never zooms.
- Numbers that change (PIN, countdown) use tabular figures (`pin` style).

### Layout and spacing
- **Mobile first, at 375px.** The page gutter is `space-4` plus `env(safe-area-inset-*)`. Use `100dvh`, never `100vh`.
- Steps run from `space-1` to `space-8` on a 4px base. Use `space-5` between cards and fields, `space-6` between sections, and `space-7` around a knit band.
- Everything tappable is at least `tap-min` (44px). Nothing depends on hover.
- On desktop, centre a column up to about 560px. The moodboard alone may grow wider.
- **Scrapbook, not grid**, for paper only: post-its, polaroids, tags and stamps overlap and rotate by `tilt-left`, `tilt-right` or `tilt-slight`. Controls (buttons, inputs, chips) always sit straight.

### Shapes, borders, shadows
- Paper is cut square (`radius-none`): tickets, stamps, polaroids, bands. Post-its, tags and inputs take a worn `radius-sm`. Cards use `radius-md`. Buttons and chips use `radius-pill`.
- Borders are 2px `ink` on controls. Use `line` for hairlines and dashed perforations only.
- Shadows: `shadow-paper` for anything lying down, `shadow-lifted` while dragging and for the open ticket. Nothing else casts a shadow.
- No gradients, glass or glows, except the reveal ticket's holographic sheen, which lives in the 3D layer.

### Motion
- Soft and short: 160–300ms with ease-out (`cubic-bezier(.2,.8,.2,1)`). Buttons press 2px down. Paper settles with a little spring when dropped.
- Snow and confetti only on the reveal and the exchange day, light enough for a phone.
- `prefers-reduced-motion`: no tilt-following, no snow, and the 2D `RevealCard` instead of the 3D envelope.

## Iconography and ornament

- Every ornament is **drawn by us in SVG**: the four-point `stellina`, the eight-point star, the folk heart and the knit snowflake (group **Ornaments**). Never use clip-art or images from the web.
- In UI, draw ornaments through the CSS classes `ss-star` and `ss-heart`, so their colour follows `ornament` or `accent`. Use the SVG files only for export (PWA icon, share image) and three.js textures.
- Use ornaments in odd counts and in rows: a row of alternating gold and cherry hearts under a title (`ss-hearts`), a pair of four-point stars flanking a hero title, three stars on the ticket.
- Functional icons (close, back, add, link) are not designed yet. When they are, draw them as 2px-stroke line icons in `ink`, never filled emoji.
- There is no logo: the name **Secret Santa**, set in `display-hero`, is the mark.

## Components

| Component | Where |
| --- | --- |
| `Button` | Every action. One `primary` per screen. |
| `KnitBand` | Top of the landing and group pages, and section dividers. |
| `GiftTag` | Recipient names, group facts. |
| `Stamp` | Budget, date, theme. |
| `PostIt`, `Polaroid` | Moodboard items. |
| `RevealCard` | The ticket in the envelope. |
| `PinInput` | Sign-up and sign-in on a new device. |
| `MemberChip` | The join list and the members list. |
| `Countdown` | The group page, until the exchange day. |

All components are plain CSS classes (prefix `ss-`) in `components/bundle.css`. In the Next.js + Tailwind app, map the tokens to Tailwind theme values and keep these class names (or match them one to one) for the paper objects.
