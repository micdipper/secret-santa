# Secret Santa – Brief di progetto

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
- Moodboard: `react-rnd` (trascina + ridimensiona, supporta il touch) + rotazione con maniglia dedicata
- Animazioni: `framer-motion`; neve/coriandoli: `canvas-confetti` o equivalente leggero
- 3D: `three` (solo questa libreria, senza @react-three/*), caricato **solo nella pagina della rivelazione**

## Accesso (senza email)
- L'organizzatore crea un gruppo e ottiene un **link d'invito**.
- Quando crea il gruppo, l'organizzatore **scrive la lista dei nomi veri dei partecipanti** (come drawnames). Così il nome sul biglietto è sempre riconoscibile.
- L'amico apre il link → **tocca il proprio nome nella lista** → sceglie **emoji/avatar + PIN a 4 cifre** (una sola volta). Un nome già preso è bloccato; se qualcuno prende per errore il nome sbagliato, l'organizzatore lo libera con "reimposta".
- Il PIN viene richiesto di nuovo solo su un nuovo dispositivo/browser (o dall'app aggiunta alla Home su iPhone, che ha memoria separata da Safari).
- Implementazione: Supabase Auth email+password con email sintetica generata dal sistema (es. `<id>@users.secretsanta.local`); la password è il PIN combinato lato codice con un suffisso fisso per rispettare la lunghezza minima di Supabase. **Conferma email disattivata**. Nessuna email viene mai inviata.
- Per rientrare: scegliere il proprio nome dalla lista del gruppo + PIN.
- PIN dimenticato: l'organizzatore può **reimpostare il PIN** di un membro (operazione lato server). Non gli dà accesso all'abbinamento di quella persona.
- Motivo: senza PIN chiunque con il link potrebbe spacciarsi per un altro e vedere il suo abbinamento; inoltre gli amici perderebbero l'accesso cambiando dispositivo.

## Funzionalità — ordine di priorità

### Fase 1 – MVP (oggi)
1. **Gruppi**: un utente crea un gruppo (nome, budget, data scambio, tema) e diventa organizzatore. Gli altri entrano con il link d'invito. Un utente può stare in più gruppi.
2. **Esclusioni**: l'organizzatore indica coppie che non devono pescarsi (es. fidanzati).
3. **Estrazione**: l'organizzatore la avvia quando tutti sono entrati. Algoritmo: permutazione casuale senza auto-abbinamenti che rispetti le esclusioni (riprovare finché valida; se impossibile, messaggio chiaro). Eseguita **lato server** (route API con chiave di servizio, oppure funzione Postgres `security definer`), mai nel browser. Si esegue una sola volta per gruppo. L'organizzatore partecipa all'estrazione come gli altri. **Dopo l'estrazione il link d'invito smette di funzionare** (nessun nuovo ingresso).
4. **Segretezza totale**: Row Level Security su tutte le tabelle. Ogni utente legge **solo il proprio abbinamento**. **Nessuno, organizzatore compreso, vede gli altri abbinamenti** fino alla rivelazione finale.
5. **Rivelazione animata**: busta 3D (three.js) con dentro il biglietto col nome. Il biglietto si inclina con le dita o col giroscopio (permesso iOS chiesto al tocco "Apri la busta") con effetto olografico, stile carte collezionabili; neve che cade. Fallback 2D se il 3D non è supportato o con "riduci movimento".
6. **Moodboard personale** (cuore del sito):
   - bacheca libera dove trascinare, ridimensionare e ruotare elementi con le dita
   - elementi: foto caricate, immagini da link, post-it con parole chiave, palette colori, taglie
   - salvataggio automatico delle posizioni
   - visibile a tutto il gruppo (in sola lettura per gli altri)
7. **Wishlist** accanto alla moodboard: voci con link; la spunta "già preso" è visibile solo a chi regala.
8. **Pagina gruppo**: membri con avatar, budget, data, **countdown** allo scambio.

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
- **Vibe nordica folkloristica natalizia** (il motivo per cui Marzia ama Mishca): motivi a maglia nordica, stelle a 8 punte, cuori e uccellini dell'arte popolare scandinava, carta ritagliata, stelle di paglia. Tutti gli ornamenti sono **disegnati da noi in SVG**, originali, niente immagini prese dal web.
- Riferimenti: cartoline natalizie anni '50-'60, carta da regalo stampata, francobolli, etichette per pacchi, texture di carta leggera.
- Palette di partenza (da affinare con le reference): rosso ciliegia, verde abete scuro, crema/carta, oro tenue.
- Tipografia: titoli in stile Mishca, ma Mishca è a pagamento → font principale gratuito (SIL OFL) **da scegliere tra Basteleur Bold (Velvetyne) e Sinistre Bold (Collletttivo)**, vedi `reference/12` e `reference/13` + **Bricolage Grotesque** per il testo (Google Fonts, un solo file variabile). Massimo due font. Stelline a 4 punte disegnate come SVG.
- Micro-animazioni morbide; niente di pesante che rallenti il telefono.
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
- `wishlist_items` (id, user_id, group_id, titolo, link)
- `wishlist_claims` (item_id, claimed_by) — spunta "già preso" in tabella separata: la vede solo chi l'ha messa, mai il proprietario della wishlist
- Fase 2: `messages`, `feed_events`, `reactions`

## Regole di lavoro
- Procedere per fasi; a fine di ogni fase: commit, deploy su Vercel, verifica dal telefono.
- Prima di scrivere codice per una fase, presentare un breve piano e aspettare l'ok.
- Testare l'estrazione con utenti finti prima di usarla davvero.
- Mai mettere chiavi segrete nel codice: solo variabili d'ambiente su Vercel; nel frontend solo la publishable key di Supabase.
- Non installare skill, plugin o pacchetti non elencati qui senza chiedere.
- Codice semplice e leggibile: nessuna astrazione non necessaria.
