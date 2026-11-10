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
- Implementazione: Supabase Auth email+password con email sintetica generata dal sistema (es. `<id>@users.secretsanta.local`); la password la sceglie la persona (minimo 8 caratteri, nessun altro vincolo). **Conferma email disattivata**. Nessuna email viene mai inviata.
- Per rientrare: scegliere il proprio nome dalla lista del gruppo + password.
- Password dimenticata: l'organizzatore preme "Reimposta password" → il sito crea un **link usa-e-getta valido 24 ore** che l'organizzatore manda in privato all'amico; l'amico lo apre e sceglie lui la nuova password (operazione lato server). L'organizzatore non la sceglie né la conosce, quindi non accede all'abbinamento di quella persona.
- Motivo: senza password chiunque con il link potrebbe spacciarsi per un altro e vedere il suo abbinamento; inoltre gli amici perderebbero l'accesso cambiando dispositivo.

## Funzionalità — ordine di priorità

### Fase 1 – MVP (oggi)
1. **Gruppi**: un utente crea un gruppo (nome, budget, data scambio, tema) e diventa organizzatore. Gli altri entrano con il link d'invito. Un utente può stare in più gruppi.
2. **Esclusioni**: l'organizzatore indica chi non deve pescarsi, con un motivo: **coppia** (es. fidanzati) oppure **regalo dell'anno scorso**.
3. **Estrazione**: l'organizzatore la avvia quando tutti sono entrati. Algoritmo: **catena unica** (si mescolano tutti in cerchio e ognuno regala al successivo), così nessuno pesca se stesso e **nessuno si scambia il regalo a vicenda**; deve rispettare le esclusioni (riprovare finché valida; se impossibile, messaggio chiaro). Eseguita **lato server** (route API con chiave di servizio, oppure funzione Postgres `security definer`), mai nel browser. Si esegue una sola volta per gruppo. L'organizzatore partecipa all'estrazione come gli altri. **Dopo l'estrazione il link d'invito smette di funzionare** (nessun nuovo ingresso).
4. **Segretezza totale**: Row Level Security su tutte le tabelle. Ogni utente legge **solo il proprio abbinamento**. **Nessuno, organizzatore compreso, vede gli altri abbinamenti** fino alla rivelazione finale.
5. **Rivelazione animata**: busta 3D (three.js) con dentro il biglietto col nome. Il biglietto si inclina con le dita o col giroscopio (permesso iOS chiesto al tocco "Apri la busta") con effetto olografico, stile carte collezionabili; neve che cade. Fallback 2D se il 3D non è supportato o con "riduci movimento".
6. **Bacheca personale** (nell'interfaccia si chiama "bacheca", non "moodboard"; è il cuore del sito):
   - è una **tela da ricamo** (trama a quadretti tipo aida) su cui si attaccano toppe e si ricama
   - **quiz "Questo o quello"** al primo accesso: ~6 carte, un tocco per risposta, sempre "Salta"; tono **nonsense / meme**, mai serio. Alla fine un **verdetto surreale** ("totem") appuntato in cima alla bacheca. Le risposte aiutano chi regala e decidono quali toppe compaiono nel cassetto. Domande e verdetti definitivi: li propone Marzia.
   - **cassetto di toppe ricamate già pronte**, disegnate da noi in **SVG**: vibe e atmosfere (texture, simboli, parole ricamate col font dei titoli, palette), non prodotti. Sul telefono: tocca per attaccare → poi trascina, ridimensiona e ruota con le dita
   - **ricamo a punto croce col dito**: ogni quadretto toccato diventa una crocetta; griglia abbastanza fine da permettere un minimo di dettaglio (non grossolana), 4-5 colori di filo, gomma e annulla
   - anche foto caricate e immagini da link; niente post-it
   - salvataggio automatico; visibile a tutto il gruppo (in sola lettura per gli altri)
   - gesti col dito scritti da noi (un dito sposta, due dita ingrandiscono e ruotano): **niente `react-rnd`**
7. ~~Lista dei desideri~~ **tolta** (decisione di Marzia): è solo la bacheca a raccontare il mood del regalo.
8. **Pagina gruppo**: membri con avatar, budget, data, **countdown** allo scambio.

9bis. **Avatar e premi** (approvato da Marzia): l'**avatar sostituisce le emoji** ovunque. Personaggio **originale** disegnato da noi in SVG, stile feltro morbido, **sempre a mezzobusto**. Nella pagina "Il mio profilo" si scelgono pelle, capelli e maglione; gli **accessori natalizi si sbloccano SOLO così**: quiz completato → cappello legato al verdetto · almeno una toppa di ogni tipo → sciarpa a maglia nordica · primo ricamo a punto croce → ditale d'oro/gomitolo · almeno una foto o immagine attaccata alla bacheca → fiocco (provvisorio, da confermare) · busta aperta → stellina. **Apertura della busta "a slot machine"**: gli avatar di tutti scorrono come rulli, rallentano e si fermano sulla persona pescata (il risultato è già deciso dal database, è solo spettacolo), poi busta 3D e biglietto. Ordine dei lavori: bacheca → avatar e profilo → slot machine + busta 3D → suoni → pubblicazione.

### Fase 2 – Mini social (domani)
9. **Chat anonima con il tuo Babbo Natale**: chi regala può scrivere alla persona pescata senza rivelarsi; il destinatario può rispondere. Supabase Realtime. RLS: ogni conversazione è leggibile solo dai due partecipanti, e al destinatario non viene mai esposto l'id di chi scrive.
10. **Feed del gruppo**: aggiornamenti tipo "Giulia ha aggiornato la moodboard", reazioni con emoji.
11. **Rivelazione finale**: dalla data dello scambio l'organizzatore può pubblicare tutti gli abbinamenti per il gruppo (pagina "Chi era il Babbo Natale di chi").

### Fase 3 – Solo se avanza tempo
12. Temi grafici selezionabili per gruppo.

### Esclusi
- Gioco "indovina chi", galleria post-scambio, email automatiche.

## Stile visivo
- **Natalizio classico, giocoso, con un tocco vintage — ma curato e di qualità**, non kitsch.
- **Direzione approvata (vedi `reference/17` e `18`)**: sfondo **verde abete in tinta unita** con luce morbida e grana leggera; elementi **tessili e tattili**: riquadri di **feltro** con cucitura tratteggiata, **etichette di stoffa** cucite per le info (giorni, data, budget), **toppe rotonde** per i membri. **Tasti**: vedi "Sistema fisso" qui sotto (tre tipi). **Niente menu in basso**: la pagina del gruppo è il punto di partenza, le pagine interne hanno in alto il tasto tondo per tornare indietro. Oggetti realistici al minimo (es. una pallina), con leggero **effetto profondità** al movimento del telefono. Niente post-it, niente rettangoli rigidi.
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
- Fase 2: `messages`, `feed_events`, `reactions`

## Regole di lavoro
- Procedere per fasi; a fine di ogni fase: commit, deploy su Vercel, verifica dal telefono.
- Prima di scrivere codice per una fase, presentare un breve piano e aspettare l'ok.
- Testare l'estrazione con utenti finti prima di usarla davvero.
- Mai mettere chiavi segrete nel codice: solo variabili d'ambiente su Vercel; nel frontend solo la publishable key di Supabase.
- Non installare skill, plugin o pacchetti non elencati qui senza chiedere.
- Codice semplice e leggibile: nessuna astrazione non necessaria.
