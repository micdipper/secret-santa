# Secret Santa – Brief di progetto

> **Prima di riprendere il lavoro leggi `STATO.md`**: contiene dove siamo arrivati, cosa manca, le decisioni prese in chat, le bozze del quiz e le note tecniche. Aggiornalo a fine di ogni blocco di lavoro.

Sito web per organizzare il Secret Santa tra amici, con moodboard personali e un tocco da mini social network.
Obiettivo: **finito e online in 1-2 giorni**. Quando c'è da scegliere, vince sempre la soluzione più semplice.

## Utenti e contesto
- Primo utilizzo: ~12 amici. Il sito deve poter essere riutilizzato in futuro con **più gruppi**.
- Lingua dell'interfaccia: italiano.
- **Mobile first obbligatorio**: quasi tutti apriranno il link da iPhone (Safari) o Android (Chrome).
  - Progettare a 375px di larghezza, poi adattare al desktop.
  - Aree toccabili ≥ 44px; nessuna funzione che dipenda solo dall'hover.
  - Input con font-size ≥ 16px (evita lo zoom automatico su iOS).
  - Rispettare le safe area dell'iPhone (`env(safe-area-inset-*)`); usare `dvh` invece di `vh`.
  - PWA leggera: manifest + icone, così il sito si può aggiungere alla schermata Home.

## Stack (tutto gratuito)
- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **Supabase**: Postgres, Auth, Storage (immagini moodboard), Realtime (chat)
- **Vercel** per l'hosting, deploy automatico da GitHub (ogni push genera un'anteprima da provare sul telefono)
- Bacheca: gesti col dito scritti da noi (un dito sposta, due dita ingrandiscono e ruotano), senza librerie esterne
- Animazioni: `framer-motion`; neve/coriandoli: `canvas-confetti` o equivalente leggero
- 3D: `three` (solo questa libreria, senza @react-three/*), caricato **solo nella pagina della rivelazione**

## Accesso (senza email)
- L'organizzatore crea un gruppo e ottiene un **link d'invito**.
- Quando crea il gruppo, l'organizzatore **scrive la lista dei nomi veri dei partecipanti** (come drawnames). Così il nome sul biglietto è sempre riconoscibile.
- L'amico apre il link → **tocca il proprio nome nella lista** → sceglie **emoji/avatar + password di almeno 8 caratteri** (una sola volta). Un nome già preso è bloccato; se qualcuno prende per errore il nome sbagliato, l'organizzatore lo libera con "reimposta".
- La password viene richiesta di nuovo solo su un nuovo dispositivo/browser (o dall'app aggiunta alla Home su iPhone, che ha memoria separata da Safari).
- **Ogni gruppo è un'identità a sé** (deciso da Marzia il 15/11): creare un gruppo o entrare da un invito crea SEMPRE un accesso nuovo con una password nuova; personaggio, premi e password non passano da un gruppo all'altro. Il telefono tiene un "portachiavi" (`lib/portachiavi.ts`, localStorage) con gli accessi dei gruppi già aperti, così passando da un gruppo all'altro non si riscrive la password; il layout `app/gruppo/[id]/layout.tsx` passa da solo all'accesso giusto. Mai usare `signOut` (chiude per sempre l'accesso).
- Implementazione: Supabase Auth email+password con email sintetica generata dal sistema (es. `<id>@users.secretsanta.local`); la password la sceglie la persona (minimo 8 caratteri, nessun altro vincolo). **Conferma email disattivata**. Nessuna email viene mai inviata.
- Per rientrare: scegliere il proprio nome dalla lista del gruppo + password.
- Password dimenticata: l'organizzatore preme "Reimposta password" → il sito crea un **link usa-e-getta valido 24 ore** che l'organizzatore manda in privato all'amico; l'amico lo apre e sceglie lui la nuova password (operazione lato server). L'organizzatore non la sceglie né la conosce, quindi non accede all'abbinamento di quella persona.
- Motivo: senza password chiunque con il link potrebbe spacciarsi per un altro e vedere il suo abbinamento; inoltre gli amici perderebbero l'accesso cambiando dispositivo.

## Funzionalità — ordine di priorità

### Fase 1 – MVP (oggi)
1. **Gruppi**: un utente crea un gruppo (nome, budget, data scambio, tema) e diventa organizzatore. Gli altri entrano con il link d'invito. Un utente può stare in più gruppi. Data, budget e tema si cambiano in Organizza **in ogni momento, anche dopo l'estrazione** (la data solo con il tasto "Salva/Cambia la data"; resta bloccata da T−5 se il gruppo ha i giochi). Se la data è a meno di 6 giorni (in "Crea un gruppo" e in Organizza) compare il pop-up `components/avviso-data.tsx`: "Scegli un'altra data" / "Continua senza minigiochi", con il consiglio della data fittizia.
   - **Disponibilità** (in alternativa alla data fissa, richiesta da Marzia il 15/11): l'organizzatore propone da 2 a 14 giorni; ognuno tocca quelli in cui c'è e può cambiarli finché il sondaggio è aperto; tutti vedono le risposte di tutti; il sito segna il giorno con più persone ("il più probabile"). **Solo l'organizzatore chiude**, quando vuole, fissando la data (di base quella più probabile). Pagina `/gruppo/[id]/disponibilita`.
2. **Esclusioni**: l'organizzatore indica chi non deve pescarsi, con un motivo: **si amano** (coppia) o **si odiano** (valgono nei due versi) oppure **già regalato negli anni scorsi** (solo A → B). Le esclusioni le vede solo l'organizzatore (RLS), anche dall'ispeziona.
3. **Estrazione**: l'organizzatore la avvia quando tutti sono entrati. Algoritmo: **catena unica** (si mescolano tutti in cerchio e ognuno regala al successivo), così nessuno pesca se stesso e **nessuno si scambia il regalo a vicenda**; deve rispettare le esclusioni (riprovare finché valida; se impossibile, messaggio chiaro). Eseguita **lato server** (route API con chiave di servizio, oppure funzione Postgres `security definer`), mai nel browser. Si esegue una sola volta per gruppo. L'organizzatore partecipa all'estrazione come gli altri. **Dopo l'estrazione il link d'invito smette di funzionare** (nessun nuovo ingresso).
4. **Segretezza totale**: Row Level Security su tutte le tabelle. Ogni utente legge **solo il proprio abbinamento**. **Nessuno, organizzatore compreso, vede gli altri abbinamenti** fino alla rivelazione finale.
5. **Rivelazione animata**: busta 3D (three.js) con dentro il biglietto col nome. Il biglietto si inclina con le dita o col giroscopio (permesso iOS chiesto al tocco "Apri la busta") con effetto olografico, stile carte collezionabili; neve che cade. Fallback 2D se il 3D non è supportato o con "riduci movimento".
6. **Bacheca personale** (nell'interfaccia si chiama "bacheca", non "moodboard"; è il cuore del sito):
   - è una **tela da ricamo** (trama a quadretti tipo aida) su cui si attaccano toppe e si ricama
   - ~~quiz "Questo o quello"~~ **sostituito dal SONDAGGIO TOTEM** (Fase 2, punto 9ter).
   - **cassettiera** sotto la tela (al posto del "+" e del tasto del ricamo): sul piano il kit da ricamo (toccandolo si ricama sulla tela), 4 cassetti Simboli/Parole/Texture/Foto che si aprono al tocco o trascinando il frontale (il cassetto segue il dito); dentro le toppe sono mescolate, si trascinano (il nome compare in una pillola in basso) e un tocco le attacca. **Doppio fondo**: le toppe del proprio totem ✦ e del gruppo stanno sotto un fondo finto che si apre toccando 3 volte l'angolo sollevato (il cassetto trema); scoperto una volta resta scoperto (memoria del telefono). Ognuno può creare **un suo simbolo e una sua parola** (group_toppe con member_id). Targhette di stoffa sui pomelli che dondolano col giroscopio
   - **ogni toppa si attacca una sola volta** (appena è sulla tela sparisce dal cassetto, togliendola ritorna); **al massimo 5 foto/immagini**; niente "Duplica". Vincoli anche nel database.
   - **cassetto di toppe ricamate già pronte**, disegnate da noi in **SVG**: vibe e atmosfere (texture, simboli, parole ricamate col font dei titoli, palette), non prodotti. Sul telefono: tocca per attaccare → poi trascina, ridimensiona e ruota con le dita
   - **ricamo a punto croce col dito**: ogni quadretto toccato diventa una crocetta; griglia abbastanza fine da permettere un minimo di dettaglio (non grossolana), 4-5 colori di filo, gomma e annulla
   - anche foto caricate e immagini da link; niente post-it
   - salvataggio automatico; visibile a tutto il gruppo (in sola lettura per gli altri)
   - gesti col dito scritti da noi (un dito sposta, due dita ingrandiscono e ruotano): **niente `react-rnd`**
7. ~~Lista dei desideri~~ **tolta** (decisione di Marzia): è solo la bacheca a raccontare il mood del regalo.
8. **Pagina gruppo**: membri con avatar, budget, data, **countdown** allo scambio.

9bis. **Avatar e premi** (approvato da Marzia): l'**avatar sostituisce le emoji** ovunque. Personaggio **originale** disegnato da noi in SVG, stile feltro morbido, **sempre a mezzobusto**. Nella pagina "Il mio profilo" si scelgono pelle, capelli e maglione; gli **accessori natalizi si sbloccano SOLO così**: quiz completato → cappello legato al verdetto · almeno una toppa di ogni tipo → sciarpa a maglia nordica · primo ricamo a punto croce → ditale d'oro/gomitolo · almeno una foto o immagine attaccata alla bacheca → fiocco (provvisorio, da confermare) · busta aperta → stellina. **Apertura della busta "a slot machine"**: gli avatar di tutti scorrono come rulli, rallentano e si fermano sulla persona pescata (il risultato è già deciso dal database, è solo spettacolo), poi busta 3D e biglietto. Ordine dei lavori: bacheca → avatar e profilo → slot machine + busta 3D → suoni → pubblicazione.

### Fase 2 – Mini social (domani)
9. **Santa Chat** (si chiama così ovunque nell'interfaccia) ✅ fatta: chi regala può scrivere alla persona pescata senza rivelarsi; il destinatario può rispondere. Supabase Realtime. RLS: ogni conversazione è leggibile solo dai due partecipanti, e al destinatario non viene mai esposto l'id di chi scrive (nella tabella `santa_messages` l'id di chi regala **non esiste proprio**: la conversazione si riconosce dal destinatario).
   - **Colori fissi per ruolo** (uguali da tutte e due le parti): messaggi di **Babbo Natale = fumetto vermiglio con testo crema**, messaggi di **chi riceve = fumetto di feltro crema con testo inchiostro**; i miei a destra, quelli dell'altro a sinistra. Fumetti piatti (non cliccabili) con cucitura tratteggiata, come le etichette di stoffa.
   - La Santa Chat (in tutti e due i versi) si apre **solo quando TUTTI hanno aperto la busta** (controllato anche da `invia_santa_message`); prima la pagina `/gruppo/[id]/santa-chat` spiega chi manca. Pallino senape con i messaggi nuovi (ultimo letto ricordato nel telefono).
   - Il **Taglio Super** si sblocca scrivendo almeno un messaggio nella Santa Chat (da Babbo o da destinatario).
   - **Limiti**: 5 messaggi a testa al giorno (ora italiana) per conversazione, 50 caratteri l'uno spazi compresi (controllati anche dal database).
9ter. **SONDAGGIO TOTEM personalizzabile** (richiesto da Marzia):
   - **Cos'è**: breve sondaggio a risposta multipla che ogni membro compila; alla fine riceve un **totem**, profilo ironico su come si comporta nel Secret Santa quando regala e quando riceve. Compare sul suo profilo, visibile a tutto il gruppo. Tono leggero: chi risponde non deve accorgersi che le domande servono a profilarlo.
   - **Logica fissa (uguale per tutti i gruppi)**: due parametri, **IMPEGNO** (come regala: + = regalo pensato e curato, − = la prima cosa che capita) ed **ESIGENZA** (come riceve: + = esigente, − = va bene tutto). Ogni domanda appartiene a UN solo parametro e ha sempre 4 risposte con punti fissi **+2, +1, −1, −2**; si sommano i punti per parametro.
   - **5 profili fissi**: impegno>0 ed esigenza<0 → IMPEGNO_ALTO_RICEVE_TUTTO · impegno>0 ed esigenza>0 → IMPEGNO_ALTO_ESIGENTE · impegno<0 ed esigenza<0 → IMPEGNO_BASSO_RICEVE_TUTTO · impegno<0 ed esigenza>0 → IMPEGNO_BASSO_ESIGENTE · impegno=0 oppure esigenza=0 → BONUS.
   - **Quando si crea**: durante la creazione del gruppo, PRIMA del link d'invito. Flusso: 1) dati del gruppo → 2) tasto "Crea sondaggio" → pagina dedicata già compilata col contenuto predefinito (domande, risposte, totem, avviso), da confermare o modificare → 3) solo dopo aver salvato il sondaggio si genera il link d'invito. Dopo la prima risposta di un partecipante domande e risposte si bloccano; nomi e descrizioni dei totem restano modificabili.
   - **Cosa può personalizzare l'organizzatore (solo questo)**: le domande e il testo delle 4 risposte (per ogni domanda sceglie il parametro e riempie gli slot fissi "molto +" +2, "poco +" +1, "poco −" −1, "molto −" −2; niente altri punteggi o parametri; stesso numero di domande per i due parametri, da 2 a 5 per parametro, consigliato 3); il nome dei 5 totem; la descrizione dei 5 totem (sua o quella predefinita, con tasto "Usa descrizione predefinita"). Profili e logica NON modificabili.
   - **Box di consigli per l'organizzatore** nella pagina del sondaggio: le domande servono a descrivere il carattere; ogni domanda misura un solo parametro con 4 risposte da un estremo all'altro; IMPORTANTE niente domande esplicite (✗ "Quanto ti impegni quando fai un regalo?" ✓ "Come carichi la lavastoviglie?" — piatti divisi per forma… (+2) / con un certo ordine, quando ho tempo (+1) / dove c'è spazio (−1) / butto dentro tutto e premo un tasto a caso (−2)); i totem sono identikit molto diversi per far ridere; il bonus esce quando un parametro fa esattamente 0.
   - **Totem predefiniti**: IMPEGNO_ALTO_RICEVE_TUTTO "Elfo stakanovista" — dà l'anima per il regalo, e accetta felice anche un sasso · IMPEGNO_ALTO_ESIGENTE "L'avvocato" (prima "Giudice di MasterChef"; illustrazione: giudice con toga e parrucca) — dà il massimo, e si aspetta lo stesso livello · IMPEGNO_BASSO_RICEVE_TUTTO "Autogrill core" — il regalo lo prende il 24 alle 19:40 in autogrill, ma qualsiasi cosa riceva è felice uguale · IMPEGNO_BASSO_ESIGENTE "Grinch con la wishlist" — regala la prima cosa che trova, ma guai a sbagliare il suo · BONUS "So cooked" — risposte senza un filo logico, impossibile da decifrare.
   - **Domande predefinite** (in quest'ordine):
     1. [IMPEGNO] Ti invitano a cena da amici. Porti… — dolce fatto in casa con la decorazione a tema (+2) / un vino scelto pensando a chi c'è (+1) / patatine prese al volo sotto casa (−1) / me stess* e la mia simpatia (−2)
     2. [ESIGENZA] Un amico ti cucina una cena, ed è un disastro: — mangio tutto e faccio i complimenti, conta il gesto (−2) / ridiamo e ordiniamo una pizza (−1) / mangio, ma un consiglio glielo do (+1) / recensione su Google: 2 stelle (+2)
     3. [IMPEGNO] Compleanno di un amico. Gli fai gli auguri con… — video montaggio con le sue foto peggiori (+2) / un messaggio lungo e sentito (+1) / "auguriii 🎉" (−1) / un like alla storia di qualcun altro (−2)
     4. [ESIGENZA] Ti arriva un pacco Vinted un po' diverso dalle foto: — me lo tengo, è carino lo stesso (−2) / finisce in fondo all'armadio, pazienza (−1) / scrivo al venditore per capire (+1) / reso, recensione e screenshot nel gruppo (+2)
     5. [IMPEGNO] Organizzi una serata a casa tua: — tema, playlist e segnaposto (+2) / pulisco e compro qualcosa di buono (+1) / ognuno porta qualcosa (−1) / si ordina su Glovo, i piatti li lava chi perde a carte (−2)
     6. [ESIGENZA] Ti trascinano a vedere un film che non ti ispira: — vado volentieri, conta la compagnia (−2) / vado, magari mi piace pure (−1) / vado, ma faccio notare che la mia scelta era meglio (+1) / ok, ma la prossima volta scelgo io. E anche la cena (+2)
   - **Esperienza di chi risponde**: una domanda per schermata, barra di avanzamento, ordine delle 4 risposte mescolato, mai visibili punti/parametri/nomi dei profili; alla fine rivelazione animata del totem (illustrazione + nome + descrizione) nello stile vintage; una sola volta per gruppo, verdetto definitivo.
   - **Grafica**: 5 illustrazioni SVG fisse legate ai PROFILI (non ai nomi), stile cartolina/francobollo vintage. L'organizzatore può sostituire l'illustrazione con una **foto dalla galleria**, ritagliata alle proporzioni del francobollo.
   - **Dati e sicurezza (indicativo)**: quiz_questions (id, group_id, parametro, ordine, testo) · quiz_answers (id, question_id, testo, punti ∈ {2,1,−1,−2}) · quiz_totems (group_id, profilo, nome, descrizione; vuota = predefinita) · quiz_results (group_id, user_id, punteggio_impegno, punteggio_esigenza, profilo, created_at). Solo l'organizzatore modifica domande e totem. I punti non arrivano MAI al browser dei partecipanti: il totem si calcola lato server (funzione Postgres security definer) che salva il risultato. Una sola riga in quiz_results per utente e gruppo. Il totem di ciascuno è visibile a tutto il gruppo; le singole risposte a nessuno.
9quater. **Mini giochi dell'avvento** (richiesti da Marzia, piano approvato il 15/11): calendario che si apre a T−5 con 5 regali da scartare, un minigioco a premi al giorno da T−4 al giorno dello scambio, 3 tentativi, classifica in diretta, premio mai detto (solo un indizio), data bloccata da T−5. Tutto il dettaglio in `PIANO-GIOCHI.md`.
   - **Cuciture della toppa del personaggio**: filza per tutti · **catenella** = premio di un post nelle Novità + 5 reazioni · **tulipano, felce, punto croce** = le 3 cornici premio del **gioco 4** (già disegnate, si sbloccano col premio `cornici`).
10. **Novità (feed del gruppo)** ✅ fatto: voci scritte SOLO dal database con trigger (ha creato il gruppo, è nel gruppo, estrazione fatta, ha aperto la busta, ha aggiornato la bacheca — accorpata entro 1 ora —, totem del sondaggio) + **post** dei membri (max **100 caratteri** e/o **una foto**). Ai post e alle voci si può **solo reagire**: una reazione a testa tra 🎄 ❤️ 😂 🔥 👀 🇮🇱 (stessa emoji = la togli, altra = la cambi). L'autore può cancellare il proprio post. La Santa Chat NON compare nel feed. Pagina del gruppo: ultime 3 voci + "Tutte le novità"; pagina `/gruppo/[id]/novita` con "Scrivi un post".
10bis. **Regola ferrea anti-spoiler**: nei post e nella Santa Chat i **nomi dei partecipanti** (nome e cognome, parti di almeno 3 lettere) diventano **asterischi**, lato database (`private.censura_testo`), anche con trucchi: maiuscole, accenti, leet (4→a, 3→e, 1→i, 0→o, 5→s, 7→t, @, !, $…), lettere doppie, puntini/spazi/trattini tra le lettere, nome spezzato in due, asterisco al posto di una lettera, lettere vicine sulla tastiera o nell'alfabeto (1 per nomi fino a 5 lettere, 2 da 6 in su; nessuna per nomi di 3 lettere), due lettere scambiate di posto; per i nomi da 5 lettere in su anche UNA lettera qualsiasi cambiata (mai la prima). Un elenco di parole comuni (luna, cara, rara, mare, maria, pietre, conto…) non viene mai coperto, a meno che sia identico al nome. Il testo originale non viene mai salvato. Limiti noti: soprannomi/diminutivi ("Giuly") e lettere tolte o aggiunte non vengono riconosciuti; una parola comune uguale a un nome (es. "Rosa", "Viola") viene coperta.
11. ~~Rivelazione finale~~ **tolta** (decisione di Marzia, 15/11): la rivelazione si fa dal vivo. Gli abbinamenti restano segreti a tutti.

### Fase 3 – Solo se avanza tempo
12. Temi grafici selezionabili per gruppo.

### Esclusi
- Gioco "indovina chi", galleria post-scambio, email automatiche.

## Stile visivo
- **Natalizio classico, giocoso, con un tocco vintage — ma curato e di qualità**, non kitsch.
- **Direzione approvata (vedi `reference/17` e `18`)**: sfondo **verde abete in tinta unita** con luce morbida e grana leggera; elementi **tessili e tattili**: riquadri di **feltro** con cucitura tratteggiata, **etichette di stoffa** cucite per le info (giorni, data, budget), **toppe rotonde** per i membri. **Tasti**: vedi "Sistema fisso" qui sotto (tre tipi). **Niente menu in basso** (provato e scartato da Marzia il 15/11). **Pagina del gruppo, in quest'ordine**: 1) il fulcro (in attesa dell'estrazione / apri la busta / il tuo regalo è per… + ricorda chi hai pescato; per l'organizzatore prima dell'estrazione è il riquadro "Organizza il gruppo", dopo sta subito sotto); 2) **Guardaroba** col personaggio in grande, un po' fuori scala (esce dal riquadro); 3) **la tua bacheca**, più piccola ma in vista; 4) **Santa Chat e Mini giochi** affiancati: se non ancora sbloccati sono spenti (opacità) col lucchetto, ma si aprono e spiegano quando si sbloccano; allo sblocco compare un pop-up una volta sola (`components/avviso-sblocchi.tsx`); 5) le ultime **Novità**; 6) chi c'è. La pagina del gruppo è il punto di partenza; le pagine interne non hanno il menu e hanno in alto il tasto tondo per tornare indietro. Oggetti realistici al minimo (es. una pallina), con leggero **effetto profondità** al movimento del telefono. Niente post-it, niente rettangoli rigidi.
- **Regole di interfaccia (sempre)**:
  - **Cliccabile = in rilievo** (spessore sotto, si alza al passaggio del mouse, si schiaccia al tocco), stessa animazione ovunque. **Ciò che non è cliccabile è piatto**: mai dare rilievo a cose che non si toccano.
  - **Contrasto sempre**: ogni elemento deve staccarsi dallo sfondo (mai colori quasi uguali al fondo, es. capelli beige su toppa crema). I premi sbloccati devono essere vistosi e "preziosi", diversi dal resto.
  - **Ogni schermata in cui si crea o si modifica qualcosa ha un tasto finale chiaro** ("Salva", "Ho finito", "Crea"…) che conferma e porta avanti, più un'indicazione visibile quando qualcosa si salva da solo ("Salvo…" / "Tutto salvato"). Mai costringere a usare la freccia indietro per finire.
  - **Una funzione, un solo comando**: niente tasti che fanno la stessa cosa (es. si torna indietro solo con "‹ …" in alto, niente "Annulla" che fa lo stesso). Su schermo solo cose utili, niente ridondanze.
  - **Testo dei tasti centrato** (anche otticamente); i tasti dentro i riquadri sono a tutta larghezza e centrati.
  - **Sistema fisso** (definito in `app/globals.css` e `components/ui.tsx`):
    - spaziature a multipli di 4 (4, 8, 12, 16, 20, 24, 32, 40);
    - testi: titolo pagina 32 · titolo riquadro 24 · tasti e voci cliccabili 18 (Basteleur) · testo 16 · nota 14 (Bricolage);
    - raggi: riquadro di feltro 28 (margine interno 24) · tasti alti 56 a pillola (raggio 28) · campi alti 56 con raggio 16; le cuciture interne seguono lo stesso centro (raggio − distanza);
    - **tre tipi di tasto, tutti alti 56**: 1) **primario** pillola vermiglio a tutta larghezza, uno solo per riquadro; 2) **secondario** pillola chiara con testo verde a tutta larghezza; 3) **tondo** cerchio chiaro con icona verde, per piccole azioni. Stesso tipo = identico ovunque;
    - riquadri tutti uguali (feltro crema, titolo 24 verde); per tornare indietro: tasto tondo con la freccia in alto, sopra il titolo della pagina.
  - **Gruppi di tasti in fila (schede, filtri…)**: tasti a toppa in rilievo, giustificati sui due lati del riquadro (il primo allineato alla colonna di sinistra, l'ultimo a quella di destra, quelli in mezzo equidistanti). Vale anche per Santa Chat e feed quando arriveranno.
  - Comandi affiancati (es. "Aggiungi" e "−") alla stessa distanza; un comando che non può agire è spento (es. "−" quando non c'è niente da togliere).
- **Suoni (da fare)**: piccoli suoni ai tocchi dei tasti, sottofondo musicale e suoni buffi per le interazioni con gli oggetti (es. la pallina che dondola). Sempre con un tasto per togliere l'audio; il sottofondo parte solo dopo un tocco (i telefoni bloccano l'audio automatico). Da decidere: suoni generati dal codice (nessun file, nessun problema di licenza) o file audio con licenza libera.
- **Vibe nordica folkloristica natalizia** (il motivo per cui Marzia ama Mishca): motivi a maglia nordica, stelle a 8 punte, cuori e uccellini dell'arte popolare scandinava, carta ritagliata, stelle di paglia. Tutti gli ornamenti sono **disegnati da noi in SVG**, originali, niente immagini prese dal web. Il tocco nordico è **un ingrediente, non tutto il sito**: l'obiettivo è un mashup equilibrato di tutte le reference (collage/scrapbook, colori pieni da rivista, scritte a mano, carta, Natale nordico).
- Riferimenti: cartoline natalizie anni '50-'60, carta da regalo stampata, francobolli, etichette per pacchi, texture di carta leggera.
- Palette di partenza (da affinare con le reference): rosso ciliegia, verde abete scuro, crema/carta, oro tenue.
- Tipografia: titoli in stile Mishca, ma Mishca è a pagamento → font principale gratuito **Basteleur Bold** (Velvetyne, SIL OFL; scelto da Marzia, si può cambiare se non funziona sull'intero sito; alternativa: Sinistre Bold di Collletttivo) + **Bricolage Grotesque** per il testo (Google Fonts, un solo file variabile). Massimo due font. Stelline a 4 punte disegnate come SVG.
- Micro-animazioni morbide; niente di pesante che rallenti il telefono. **Tutto sempre fluido**: movimenti con curve di Bézier ben calibrate (ease-in/out morbidi, rimbalzi con molle), mai scatti o tagli netti.
- Reference di Marzia: cartella `/reference` (da usare come moodboard, non da copiare).
  - **Font e colori** → immagini 01-02 (display serif vintage con stelline a 4 punte stile "Mishca"; rosso-arancio acceso su verde abete scuro e beige carta). Mishca è probabilmente a pagamento: verificare la licenza o scegliere un'alternativa gratuita simile.
  - **Layout e vibe** → immagini 03-09: collage/scrapbook, elementi sparsi e ruotati (polaroid, post-it, buste, biglietti, fogli sovrapposti), scritte a mano, colori pieni da rivista.
  - Il tutto deve trasmettere il **calore del Natale**: etichette per pacchi, francobolli, nastri, rametti di abete, carta da regalo.

## Modello dati (indicativo)
- `profiles` (id, nome, avatar)
- `groups` (id, nome, budget, data_scambio, tema, codice_invito, organizer_id, stato: aperto/estratto/rivelato)
- `group_members` (id, group_id, nome_visualizzato scritto dall'organizzatore, user_id vuoto finché la persona non entra)
- `exclusions` (group_id, user_a, user_b)
- `assignments` (group_id, giver_id, receiver_id) — RLS: leggibile solo dal giver, finché lo stato non è "rivelato"
- `moodboard_items` (id, user_id, group_id, tipo, contenuto, x, y, larghezza, altezza, rotazione, z)
- `santa_messages` (id, group_id, receiver_member_id, dal_babbo, testo ≤ 500, created_at) — si scrive solo con `invia_santa_message`
- `feed_events` (id, group_id, member_id, tipo, dati {testo, foto, profilo}, quando) e `feed_reactions` (event_id, member_id, group_id, emoji; una a testa) — si scrivono solo con trigger, `pubblica_post`, `elimina_post`, `reagisci`

## Regole di lavoro
- Procedere per fasi; a fine di ogni fase: commit, deploy su Vercel, verifica dal telefono.
- Prima di scrivere codice per una fase, presentare un breve piano e aspettare l'ok.
- Testare l'estrazione con utenti finti prima di usarla davvero.
- **Provare le cose legate al tempo senza aspettarlo** ("viaggio nel tempo", scelto da Marzia il 15/11): gruppo di prova con utenti finti su telefoni simulati (Playwright), data dello scambio spostata con SQL tra un momento e l'altro, schermate mandate a Marzia (esempio: `test-e2e/giochi-tempo.mjs`). Marzia non deve provare a mano giorno per giorno; le serve solo essere al computer per confermare le operazioni sul database.
- Mai mettere chiavi segrete nel codice: solo variabili d'ambiente su Vercel; nel frontend solo la publishable key di Supabase.
- Non installare skill, plugin o pacchetti non elencati qui senza chiedere.
- Codice semplice e leggibile: nessuna astrazione non necessaria.
