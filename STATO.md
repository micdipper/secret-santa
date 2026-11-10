# Stato dei lavori – Secret Santa

Aggiornato al 9 novembre 2026. Da leggere insieme a `CLAUDE.md` (brief e regole) prima di riprendere.

## Dove siamo
| Blocco | Stato |
|---|---|
| 0 · Preparazione (brief, reference, skill, Supabase, Vercel, scheletro) | ✅ fatto |
| 1 · Base grafica (sistema fisso: feltro, tre tasti, testi, raggi) – pagina di prova `/stile` | ✅ fatto |
| Database Fase 1 (tabelle, RLS, funzioni, archivio foto) | ✅ fatto e collaudato |
| 2 · Crea gruppo, invito, pagina gruppo, area organizzatore | ✅ fatto e collaudato |
| Promemoria "Il tuo regalo è per…" nella pagina del gruppo dopo aver aperto la busta (`group_members.envelope_opened_at`) | ✅ fatto e collaudato |
| Reimposta password: link usa-e-getta 24 ore creato dall'organizzatore (⋯ accanto al nome), l'amico sceglie la nuova password (`/reimposta/[codice]`). Fatto con funzioni del database (`create_password_reset`, `use_password_reset`), senza chiave segreta | ✅ fatto e collaudato |
| Bacheca: tela aida, cassetto con 21 toppe SVG (simboli, parole, palette/texture), gesti (1 dito sposta, 2 dita ingrandiscono/ruotano), porta sopra/togli, foto (ridotte a 1200px, archivio privato) e immagini da link, ricamo a punto croce 60×80 con 5 fili, gomma e annulla, salvataggio automatico — `components/bacheca.tsx`, `components/toppe.tsx` | ✅ fatto e collaudato |
| Quiz "Questo o quello" + verdetto (totem) | ⏳ aspetta domande e struttura di Marzia |
| Lista dei desideri | ❌ tolta (decisione di Marzia) |
| Rivelazione: busta 3D con three.js, biglietto olografico, neve | ✅ fatta (vedi note sotto) |
| Suoni (tocchi, sottofondo, oggetti) + tasto per togliere l'audio | ✅ generati dal codice (lib/suoni.ts, Web Audio, nessun file): tump di feltro su ogni .cliccabile, pallina, toppa, punto croce, leva, tic del rullo, campanello, scricchiolii e vetro rotto, tonfo nella neve, puff, grattata, carta, fanfara; carillon originale in sottofondo dopo il primo tocco; TastoAudio nella pagina del gruppo e nella scena della busta (muto ricordato nel telefono) |
| Pubblicazione: unire il ramo in `main` → sito ufficiale su Vercel (Production) | ⏳ a fine Fase 1 |
| Avatar a mezzobusto (sostituisce le emoji ovunque) + pagina `/profilo` + personaggio anche in "Crea un gruppo" (riquadro "Tu") | ✅ fatto: 12 tagli, barba/baffi, occhiali, pelle, colore capelli, maglione. Premi: accessori (sciarpa, gomitolo, fiocco, stellina), taglio **Super** (10 cose sulla bacheca), capelli **olografici** (tutti e 4 gli accessori), cappello col quiz. Il database rifiuta i premi non sbloccati. Niente login separato (deciso da Marzia: resta tutto com'era). |
| Apertura busta "a slot machine" + busta 3D | ✅ fatta (da provare sul telefono): slot "Babbo-matic" con leva vera da trascinare, lampadine, giro di 7,5 s, si ferma su un PACCHETTO "?" (scelta A di Marzia: nome e faccia solo nella busta); scena a tutto schermo con busta 3D (three.js, caricato solo qui) che arriva girando, neve, scintille; "Apri la busta" chiede il permesso movimento su iPhone, lembo che si apre con fodera a righe; biglietto che si gira e si inclina con riflesso olografico; versione 2D con "riduci movimento" o senza WebGL. |
| Fase 2: chat anonima, feed del gruppo, rivelazione finale | ⏳ dopo |

## Decisioni prese (oltre a quelle in CLAUDE.md)
- **Accesso con password di almeno 8 caratteri** (non più PIN). Email finta generata dal sito, nessuna email inviata.
- **Estrazione a catena**: un unico giro, nessuno pesca se stesso né chi gli fa il regalo.
- **Esclusioni con motivo**: 💞 coppia (vale nei due versi) · 🎁 anno scorso (vale solo nel verso A → B).
- **Partecipanti**: l'organizzatore scrive i nomi veri; ognuno tocca il proprio nome dall'invito.
- **Logo**: S color crema in Basteleur su verde abete con cucitura vermiglio (favicon, icona app, manifest PWA).
- Indirizzo e chiave **pubblica** di Supabase sono nel codice (`lib/supabase/config.ts`), perché Vercel rifiutava di salvarle come pubbliche. La chiave **segreta** sta solo su Vercel (`SUPABASE_SECRET_KEY`, tipo segreto, senza `NEXT_PUBLIC_`).

## Bozze del quiz (proposte di Claude, Marzia manderà le sue)
Meccanica "voto anonimo": dopo il tocco compare "✓ Voto registrato in forma anonima" e un secondo dopo una toppa "(scherzo, lo vedono tutti)".
- Sondaggio anonimo: quanto sei tu il problema nel gruppo? — Per niente · Un pochino · Io sono il gruppo · Il problema sono gli altri
- Il tuo animale guida per dicembre — Piccione con un sogno · Capra che urla · Gatto che butta giù i bicchieri · Procione in crisi esistenziale
- Il tuo umore, ma è un colore (più scelte → palette) — Verde ansia · Rosso "ho detto una cosa a caso a cena" · Beige ce la faccio · Blu domenica sera · Rosa dramma · Oro "mi merito tutto"
- Ultimamente sei in fissa con… (più scelte) — Una serie già vista 4 volte · Una ricetta vista alle 2 di notte · Le piante (ne ho uccise 3) · Allenarmi (ho comprato le scarpe) · Niente, sono un sasso
- Il regalo che ti farebbe fingere un malore — Tazza "non parlarmi prima del caffè" · Calzini con la mia faccia · Candela "inverno generico" · Libro su come svegliarsi alle 5
- Sondaggio anonimo: ricevi un regalo brutto, cosa fai? — Piango di gioia (finto) · Lo riciclo entro 24 ore · Lo metto in vendita in diretta · Lo apprezzo, sono una brava persona
- Descriviti con un suono — Bollitore che fischia · Notifica alle 3 di notte · Porta che cigola in un horror · Applauso lento

Verdetti ("totem", titolo surreale + consiglio vero): Piccione con un mutuo · Panettone in fase di scoperta di sé · Renna in smart working · Lucina dell'albero che lampeggia a caso · Calzino spaiato con un piano · Elfo sindacalista · Pigna con troppa autostima.

## Note tecniche per chi riprende
- **Progetto Supabase**: `gesihnbtflnpjxwmpxkd` (Irlanda, piano gratuito). Migrazioni in `supabase/migrations/`.
- **Vercel**: team "Secret Santa", progetto `secret-santa`. Le anteprime si costruiscono dal ramo `claude/confident-sagan-im9axa`; `main` è ancora vuoto (per questo i deploy di `main` danno "No Next.js version detected"). Il collegamento MCP a Vercel a volte non vede il progetto: in quel caso Marzia guarda la scheda Deployments.
- **Collaudo locale nel computer in cloud**: il server Next.js deve passare dal proxy di rete → avviarlo con `NODE_USE_ENV_PROXY=1 npx next start`. Il test automatico (Playwright, 4 telefoni simulati) crea il gruppo "Test E2E Natale".
- **Pulizia dei dati di prova**: cancellare **solo** i dati creati dai test (es. il gruppo "Test E2E Natale" e gli accessi che fanno parte solo di quel gruppo). Mai cancellare per tipo di email: anche gli accessi veri usano `@users.secretsanta.local`. Chiedere sempre prima.
- **Gruppo di prova di Marzia "Cja"**: creato quando l'accesso era ancora con il PIN → quell'accesso non funziona più da un altro telefono con il nuovo sistema a password; conviene ricrearlo.
- Figma: file "Secret Santa – look and feel" (team personale) con le immagini generate per le prove di atmosfera.

- 10/11: su richiesta di Marzia cancellati tutti i suoi gruppi di prova (Cja, Ciao, df) e i loro accessi. Resta solo una vecchia foto di prova nello Storage `moodboard` (si toglie dalla dashboard).
- Galleria di tutti i personaggi in `/stile` (in cima) per controllare i disegni.

- Premi del personaggio (nomi decisi da Marzia; gli id nel database restano sciarpa/gomitolo/fiocco/stellina): "Lupetto grigio da portare indietro" (id sciarpa, cartellino del reso che dondola), "Spilla gomitolo", "È un bracciale o una collana?" (id fiocco, perline al collo), "Così ti ricordi i compleanni" (id stellina, calendario dietro il personaggio). Un solo premio alla volta (solo lato pagina: Marzia ha rifiutato il controllo nel database). Taglio Super = punte a ventaglio con ciocche sulla fronte, disegnato da noi ispirandosi alla reference di Marzia (non ricalcato). Capelli olografici animati (hue-rotate, fermi con riduci movimento).
- 10/11 (giro di feedback di Marzia):
  - Spilla gomitolo TOLTA. Il database calcola ancora "gomitolo" (primo ricamo): serve solo come condizione per i capelli olografici (lupetto + ricamo + collana + calendario).
  - Collana tutta bianca. Lupetto, collana e calendario si escludono a vicenda; il resto (capelli premio, futuro cappello) si somma.
  - Premi (taglio Super, colore olografico, accessori) compaiono nel profilo SOLO quando sbloccati: niente anteprime grigie né "come sbloccarlo".
  - Profilo: niente salvataggio automatico, tasto "Salva" (o "Salva e vai al gruppo") fisso in basso; la freccia indietro esce senza salvare.
  - Organizza: tasto secondario "Vai alla pagina del gruppo" in fondo.
  - Bacheca: 8 fili (via il crema, aggiunti rosa, bordeaux, marrone, nero); le palette a pallini sono state sostituite da texture (pois, bastoncino di zucchero, vichy); la scheda si chiama "Texture".
  - DA FARE: Marzia manderà immagini/descrizioni per sostituire i SIMBOLI delle toppe con soggetti del suo gruppo di amici (stesso stile).
  - "Scegli una foto" non chiede il permesso della galleria: è normale, iPhone e Android aprono il selettore e danno al sito solo la foto scelta.
- Regola nuova (CLAUDE.md): ogni schermata che crea/modifica ha un tasto finale chiaro + indicazione "Salvo…/Tutto salvato". Bacheca: "Ho finito" (aspetta i salvataggi e torna al gruppo). Organizza: "Salvato ✓" sotto data/budget.
- Home: niente personaggio cliccabile (il personaggio si crea in "Crea un gruppo" o entrando dall'invito; poi si cambia dalla pagina del gruppo).
- Leva della slot in 3D vero (components/leva-3d.tsx: pomello laccato, asta cromata con riflessi, attacco dorato; si tira ruotando verso chi guarda, torna su a molla; senza WebGL resta la leva semplice). Luce della busta: si spegne prima che la scena sparisca (prima veniva tagliata).
- Busta: il biglietto ESCE dalla busta in 3D (retro a righe con "?"), la busta scende via, il biglietto viene avanti e si gira mostrando nome e personaggio, poi diventa il biglietto olografico a tutto schermo con "Guarda la bacheca" e il tasto tondo per tornare al gruppo. Leva: oro come le lampadine, attacco di feltro verde sul fianco, disegnata sopra la macchinetta (il pomello non viene più coperto). NOTA: un gruppo "Test E2E Natale" di prova è rimasto nel database (Marzia ha bloccato la pulizia: chiedere prima di cancellarlo).
- Busta come storia (scena-busta.tsx): la slot si ferma sul SIGILLO di ceralacca; la busta cade dal cielo e si pianta nella neve (inquadratura che scende); 3 tocchi = sobbalzo, sobbalzo più forte, volo davanti; il sigillo si GRATTA via sfregando (briciole); il lembo si apre trascinando in su e si curva come carta (se lasciato a metà torna giù); poi il biglietto esce, si gira e mostra il nome. Paesaggio illustrato (stile cartone a 3 toni): neve bianca-fredda, cumuli tondi, abeti verdi con punta innevata, busta crema. Senza 3D o con "riduci movimento": busta 2D con tasto "Apri la busta". NOTA: ci sono gruppi "Test E2E Natale" rimasti nel database (pulizia bloccata da Marzia).
- Neve della scena: azzurro ghiaccio (#a8cbe2, cumuli #c9e0ef) per staccarsi dalla busta crema; nebbia più lontana.
- Luci della scena (interruttori EFFETTI in cima a scena-busta.tsx): ombre morbide + alone sotto la busta, bagliore (si spegne da solo se il telefono va sotto 35 fps), controluce fredda, notte (luce calda + angoli scuri), brillii sulla neve, vivido (contrasto 1.18, saturazione 1.25). Cielo disegnato dentro la scena.
- Busta: niente più fodera a righe; l'apertura a V del corpo è trasparente e da lì si vede l'interno (crema scuro) e il biglietto infilato dentro già mentre si apre il lembo. Bagliore SPENTO (sul telefono vero sbiancava la neve).
- Apertura busta come scena unica (10/11):
  - la scena 3D sta DIETRO la pagina (fixed -z-10, cielo disegnato uguale allo sfondo del sito) e parte già mentre la slot gira (neve che cade dietro);
  - la slot si ferma sul sigillo, il VETRO della finestrella si crepa e va in frantumi (schegge), il sigillo si rimpicciolisce a 70px, il telaio di feltro si apre in due metà vuote che cadono, la leva cade, il riquadro "Chi ti è uscito?" cade giù; resta il verde con la busta 3D intatta (parte esattamente dal posto del sigillo) che cade nella neve con la telecamera che la segue;
  - il lembo si ripiega dietro mentre esce il biglietto (niente riga beige);
  - il biglietto 3D vola esattamente al posto della card finale (stesso disegno 4:5, misure in frazioni della larghezza: disegnaFronte in scena-busta.tsx = BigliettoOlografico); cambio invisibile, la neve resta dietro;
  - card olografica stile Pokémon: bande arcobaleno + brillantini + riflesso SOTTO scritte e personaggio; si accende 0,3 s dopo il cambio.
- Pulizia: cancellati i gruppi "Test E2E Natale". I gruppi A, D, F, H, J sono di Marzia (non toccati).
- Tremore prima della rottura: 2 s di vibrazione che cresce, a metà si crepa il vetro, poi si rompe. Cancellati anche i gruppi di Marzia (A, D, F, H, J); rimasto solo un gruppo "A" creato alle 17:00 (forse nuovo, chiedere).
- Busta, giro del 10/11 sera:
  - la scena 3D si prepara all'apertura della pagina ("Preparo la tua busta…"), poi la pagina compare con la neve già in corso; la scena è TRASPARENTE (lo sfondo è sempre quello della pagina, niente stacco di colore); risoluzione 3D max 1.5x;
  - la busta 3D vera sta dietro la finestrella fin dall'inizio (larga quanto la finestrella; il riquadro e il telaio hanno un buco); quando la slot si rompe la busta si avvicina (si ingrandisce) e poi cade;
  - rottura: tremore 2 s, ragnatela di crepe sul vetro, schegge = celle della ragnatela che cadono; il telaio di feltro cade tutto insieme come stoffa; l'insegna "Babbo-matic" si stacca da un chiodo, dondola e cade; il riquadro "Chi ti è uscito?" cade DIETRO la busta (zIndex -20 sulla pagina; il 3D NON cambia livello, altrimenti la tela sparisce);
  - BUG risolto: i pezzi che uscivano dallo schermo allargavano la pagina e il telefono rimpiccioliva tutto (la busta spariva): ora tagliati (overflow hidden + body/html overflow clip durante la scena);
  - lembo attaccato alla busta (niente fessura), passa dietro al biglietto quando esce;
  - olografia più tenue, senza puntini.
- Audio (10/11 sera): tasto più presente sulle medie; carillon con sonagli e campane dal 3° giro; brano "attesa" (accordi lenti + arpeggio che sale, originale) dalla rottura della slot fino al nome, poi torna il carillon; la musica si ferma uscendo dal sito (visibilitychange/pagehide) e riprende al ritorno; UN SOLO tasto audio (musica+suoni) fisso in alto a destra in ogni schermata (components/audio.tsx nel layout, !fixed perché body > * è relative).
- Biglietto: arriva col dorso ("?") e ondeggia; "Tocca il biglietto per girarlo" → si gira e diventa la card (bug risolto: il posto della card aveva altezza 0 e il biglietto 3D si rimpiccioliva). Olografie natalizie di prova in lib/olografie.ts (rosso e oro / bosco e oro / festa / ghiaccio e argento), visibili in cima a /stile; scelta provvisoria: "festa". Titolo della scena allineato ai tasti tondi.
