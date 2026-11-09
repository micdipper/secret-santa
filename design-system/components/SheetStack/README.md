# SheetStack

Fogli colorati sovrapposti (ref. 07), ognuno con un occhiello "Nome su… argomento".

## Quando usarli
- Il feed del gruppo: gli ultimi aggiornamenti come una pila di fogli; quello in cima è il più recente.
- La chat anonima: i messaggi del tuo Babbo Natale come fogli ("Il tuo Babbo Natale su… taglie").
- La pagina finale "Chi era il Babbo Natale di chi": un foglio per coppia.

## Cosa fornisci
`.ss-sheets` con 2–4 `.ss-sheet` (l'ultimo nel markup è quello in cima). Ogni foglio ha `.ss-sheet__eyebrow` ("Giulia su… regali", in maiuscolo dal CSS) e `.ss-sheet__body` (una o due frasi). Colori e testo:

| Variante | Fondo | Testo |
| --- | --- | --- |
| (base) | `rosa` | `fir` |
| `--senape` | `senape` | `fir` |
| `--clementina` | `clementina` | `notte` |
| `--burro` | `butter` | `fir` |
| `--ghiaccio` | `ghiaccio` | `fir` |
| `--abete` | `fir-deep` | `paper` |
| `--prugna` | `prugna` | `paper` |

## No
- Non mettere due fogli dello stesso colore uno sopra l'altro.
- Sotto i fogli c'è solo testo: niente bottoni nei fogli coperti.
