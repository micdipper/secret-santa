Secret Santa è un piccolo sito dove un gruppo di amici pesca i nomi, tiene una moodboard e una wishlist, e scopre il risultato aprendo una busta. Deve sembrare **un Natale classico, giocoso, con un tocco vintage e nordico**: maglioni a fiocchi, stelle a 8 punte, cuori popolari, cartoline anni '50–'60, francobolli, etichette per pacchi, carta da regalo. Curato e di qualità, mai kitsch.

Tre idee reggono ogni schermata:

1. **Carta sul tavolo.** I contenuti sono oggetti di carta: etichette, post-it, polaroid, biglietti, fogli, buste e francobolli appoggiati sul fondo (`surface`), un po' storti (`tilt-*`), con un'ombra morbida (`shadow-paper`). Si sovrappongono come in uno scrapbook.
2. **Il bordo a maglia.** Una banda a maglia ciliegia (`KnitBand`) incornicia le schermate importanti, come lo sprone di un maglione.
3. **Colori pieni da rivista.** Ogni tanto un colore pieno parla forte: una stella a raggiera senape con un numero gigante, un foglio clementina, un timbro rosso. Sono gli accenti, non il fondo.

## Contenuti e tono

- **Italiano, informale, dai del tu:** "La tua busta ti aspetta, Giulia", "Tocca il tuo nome", "Aggiungi un post-it alla moodboard".
- **Maiuscola solo a inizio frase**, anche nei bottoni e nei titoli. Il maiuscolo pieno è solo per occhielli (`eyebrow`), etichette dei francobolli, dei timbri e del countdown.
- **Bottoni brevi che iniziano con un verbo:** "Apri la busta", "Estrai i nomi", "Invita amici", "Reimposta PIN".
- **I nomi sono sacri:** mostra i nomi esattamente come li ha scritti l'organizzatore.
- **Il formato "Nome su… argomento"** (dai fogli di ref. 07) per tutto ciò che qualcuno ha scritto: "Giulia su… regali", "Il tuo Babbo Natale su… taglie".
- **Formati italiani:** "30 €" (con lo spazio), "20 dicembre" (minuscolo), fatti uniti dal punto centrale: "Budget 30 € · Scambio il 20 dicembre".
- **Gli errori dicono cosa fare:** "PIN sbagliato. Riprova o chiedi all'organizzatore." "Con queste esclusioni l'estrazione non è possibile: prova a toglierne una."
- **Il segreto si sente nel tono:** mai un indizio sull'abbinamento di altri. Si dice "il tuo Babbo Natale segreto", "chi ti ha pescato".
- **Niente emoji decorative.** Le emoji esistono solo come avatar scelti dalle persone (`MemberChip`) e come reazioni nel feed.

## Fondamenti visivi

### Colore
Il cuore della palette sono i quattro colori della prova di stile: `fir` (verde abete), `cherry` (ciliegia), `paper` (crema) e `gold` (oro). Intorno ci sono i colori delle altre reference: `kraft` (02), `senape` (03), `clementina`, `rosa`, `butter` e `prugna` (07), `ghiaccio` (09), `notte` (04).

Tre temi, sugli stessi oggetti di carta:
- **Carta** (`light`, predefinito): fondo `paper`, inchiostro `fir`. Per le schermate di lavoro: moodboard, wishlist, moduli.
- **Abete** (`dark`): fondo `fir`, inchiostro `paper`, stelline d'oro. Per la landing, l'intestazione del gruppo e la rivelazione.
- **Notte** (`notte`): fondo nero `notte` come l'archivio di carta di ref. 04, dove i colori pieni e le polaroid risaltano di più. Per la pagina finale "Chi era il Babbo Natale di chi" e come tema scelto dal gruppo.

Regole:
- Il testo è `ink` su `surface`, `surface-raised` o `surface-sunken`; quello secondario è `ink-muted`.
- `cherry` è un **riempimento**, non un colore per il testo: bottone principale (`accent`), bande a maglia, francobolli, cuori, ceralacca. Il testo sopra è `on-accent` a 19px bold o più. Il testo rosso usa `accent-text`.
- Ogni colore pieno ha il suo inchiostro fisso: abete su `kraft`, `rosa`, `senape`, `butter`, `ghiaccio`; notte su `clementina`; carta su `prugna` e `fir-deep`. Mai ciliegia su senape o su rosa.
- `gold` è per gli ornamenti sui fondi scuri; sulla carta gli ornamenti usano `ornament` (`gold-deep`).
- **Al massimo tre colori pieni per schermata**, oltre al fondo. Il ciliegia c'è quasi sempre; gli altri ruotano.
- Lo stato non è mai solo un colore: un errore è `accent-text` più una frase, un nome già preso dice "già preso", la spunta ha un'etichetta.
- Focus: anello pieno di 2px in `focus`, a 2px di distanza, su ogni elemento interattivo.

### Tipografia
Due famiglie, mai una terza:
- **Basteleur Bold** (`display`, Velvetyne, SIL OFL) per titoli, nomi e numeri grandi: `display-giant`, `display-hero`, `display-quote`, `display-title`, `display-heading`. È l'alternativa gratuita al carattere vintage e stellato di Mishca (ref. 01–02).
- **Bricolage Grotesque** (`sans`, Google Fonts, variabile) per tutto il resto: `lead`, `body`, `button`, `label`, `eyebrow`, `caption`, `pin`.
- Ogni campo di input è almeno 16px (`body` è 17px), così Safari su iPhone non fa zoom.
- Le frasi grandi da rivista (`display-quote`, ref. 09) sono una per schermata e vanno tra virgolette “ ”.
- La "scrittura a mano" non è un font: sono gli scarabocchi disegnati (`Scribble`, ref. 08).

### Layout e spazi
- **Mobile first a 375px.** Margine laterale `space-4` più `env(safe-area-inset-*)`. Usa `100dvh`, mai `100vh`.
- Spazi da `space-1` a `space-8`, su base 4px: `space-5` tra card e campi, `space-6` tra sezioni, `space-7` attorno a una banda a maglia.
- Tutto ciò che si tocca è almeno `tap-min` (44px). Niente dipende dall'hover.
- Su desktop, una colonna centrale fino a circa 560px; solo la moodboard può allargarsi.
- **Scrapbook, non griglia**, ma solo per la carta: post-it, polaroid, etichette, francobolli, timbri e fogli si sovrappongono e ruotano (`tilt-left`, `tilt-right`, `tilt-slight`; `tilt-strong` per timbri e stelle). I controlli (bottoni, campi, chip, navigazione) stanno sempre dritti.
- Una schermata importante ha **un oggetto protagonista** al centro (busta, biglietto, pila di fogli) su un fondo o su una carta da regalo (`GiftWrap`), con al massimo due oggetti piccoli che gli fanno da contorno.

### Forme, bordi, ombre
- La carta è tagliata dritta (`radius-none`): biglietti, francobolli, polaroid, fogli, bande. Post-it, etichette e campi hanno un angolo appena consumato (`radius-sm`), le card `radius-md`, bottoni, chip e navigazione `radius-pill`.
- I bordi dei controlli sono 2px `ink`. `line` è solo per filetti e perforazioni tratteggiate.
- Ombre: `shadow-paper` per ciò che è appoggiato, `shadow-lifted` per ciò che si trascina, il biglietto aperto, il foglio in cima. Nient'altro fa ombra.
- Niente gradienti, vetri o bagliori, tranne il riflesso olografico del biglietto, che vive nel livello 3D.

### Movimento
- Morbido e breve: 160–300ms in uscita (`cubic-bezier(.2,.8,.2,1)`). I bottoni si schiacciano di 2px. La carta, quando la lasci, si assesta con una piccola molla.
- Neve e coriandoli solo alla rivelazione e il giorno dello scambio, leggeri per il telefono.
- Con `prefers-reduced-motion`: niente inclinazione che segue il dito, niente neve, e la `RevealCard` 2D al posto della busta 3D.

## Iconografia e ornamenti

- Ogni ornamento è **disegnato da noi in SVG**: stellina a 4 punte, stella a 8 punte, cuore popolare, fiocco a maglia, stella a raggiera, ceralacca (gruppo **Ornaments**); scarabocchi (gruppo **Scarabocchi**); carta da regalo ai mandarini e alle stelline (gruppo **Pattern**). Mai clip-art o immagini prese dal web.
- Nell'interfaccia gli ornamenti si disegnano con le classi CSS (`ss-star`, `ss-heart`, `ss-mark`, `ss-scribble`, `ss-wrap`), così il colore segue i token. Gli SVG servono solo per esportare (icona PWA, immagine di condivisione) e per le texture three.js.
- Ornamenti in numero dispari e in fila: cuori alternati oro e ciliegia sotto un titolo (`ss-hearts`), due stelline ai lati di un titolo grande, tre stelline sul biglietto.
- Le icone funzionali (chiudi, indietro, aggiungi, link) non sono ancora disegnate. Quando lo saranno: icone a tratto di 2px in `ink`, con lo stesso segno un po' irregolare degli scarabocchi; mai emoji.
- Non c'è un logo: il nome **Secret Santa** in `display-hero` è il marchio. La stella a 8 punte in un cerchio ciliegia (la ceralacca) è il segno piccolo, per l'icona dell'app.

## Componenti

| Componente | Dove | Reference |
| --- | --- | --- |
| `Button` | Ogni azione. Un solo `primary` per schermata. | 13 |
| `KnitBand` | In cima a landing e gruppo, come divisore. | 13 |
| `GiftWrap` | Fondo della landing, stati vuoti. | 03 |
| `PillNav` | Le sezioni del gruppo. | 06, 03 |
| `GiftTag` | Nomi dei destinatari, dati del gruppo. | brief |
| `Stamp` | Budget, data, tema. | brief |
| `Starburst` | Un numero gigante: giorni, budget. | 09 |
| `Ticket` | L'invito al gruppo, l'evento dello scambio. | 04, 05 |
| `Envelope` | Prima della rivelazione; i messaggi anonimi. | 04, 06 |
| `RevealCard` | Il biglietto nella busta. | brief, 13 |
| `PostIt`, `Polaroid` | Elementi della moodboard. | 04, 05 |
| `SheetStack` | Feed, chat anonima, pagina finale. | 07 |
| `RubberStamp` | Stato di un oggetto: fatto, già preso, rivelato. | 07, 06 |
| `Scribble` | Una parola cerchiata, una spunta, una freccia. | 08, 07 |
| `LineField` | Creazione del gruppo, wishlist. | 05 |
| `PinInput` | Iscrizione e rientro. | brief |
| `MemberChip` | Lista d'ingresso e membri. | brief |
| `Countdown` | Pagina del gruppo, fino allo scambio. | brief |

Tutti i componenti sono classi CSS semplici (prefisso `ss-`) in `components/bundle.css`. Nell'app Next.js + Tailwind, mappa i token nel tema di Tailwind e tieni questi nomi di classe (o corrispondenti uno a uno) per gli oggetti di carta.
