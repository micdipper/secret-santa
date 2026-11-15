# Stato dei lavori – Secret Santa

Aggiornato al 17/11/2026. Da leggere insieme a `CLAUDE.md` (brief e regole). Qui c'è solo **come stanno le cose oggi**: la cronologia completa delle giornate è nella storia di git (la versione lunga di questo file è nel commit `8fd57b6`).
**Aggiornarlo a fine blocco** riscrivendo le voci che cambiano, senza aggiungere diari giornalieri.

## ✅ Fatto il 17/11 (richieste di Marzia del 15/11 sera)
- Migrazione `20261117100000_chat_bacheca_gruppo.sql` (applicata): Santa Chat solo quando TUTTI hanno aperto la busta (`private.tutte_le_buste_aperte` + `invia_santa_message`); bacheca con una toppa per tipo (indice `moodboard_items_una_toppa`, le copie doppie che c'erano sono state tolte) e max 5 foto/immagini (trigger `bacheca_max_foto`); l'organizzatore modifica data/budget/tema anche dopo l'estrazione (policy "organizzatore modifica il gruppo").
- **Un accesso per ogni gruppo**: `/nuovo` e l'invito creano sempre un accesso nuovo con password nuova; portachiavi del telefono `lib/portachiavi.ts`; layout `app/gruppo/[id]/layout.tsx` + `components/accesso-gruppo.tsx` (passa da solo all'accesso giusto o spiega come entrare); home con i gruppi del portachiavi (`components/elenco-gruppi.tsx`). Reimposta password senza `signOut`.
- **Pagina del gruppo riorganizzata**: riquadro "Organizza il gruppo" in cima per l'organizzatore; menu in basso `components/menu-gruppo.tsx`; nuove pagine `/gruppo/[id]/santa-chat` (spiega chi manca), `/gruppo/[id]/giochi` (spiega quando si sbloccano; il calendario vero è il blocco 2), `/gruppo/[id]/guardaroba` (ex `/profilo`, che ora reindirizza).
- **Organizza**: data con tasto "Salva/Cambia la data" e pop-up `components/avviso-data.tsx` se a meno di 6 giorni (anche in `/nuovo`); budget e tema modificabili sempre.
- Collaudo `test-e2e/gruppi-separati.mjs`: 20 controlli OK (database + browser con due gruppi sullo stesso telefono). `santa-chat.mjs` aggiornato (apre tutte le buste prima di scrivere).
- Gruppi di test creati il 17/11 da ripulire (chiedere prima): `89995c11-1e0c-46c5-943c-659d9992e084`, `d964ab66-555d-438d-9695-613d15fef9bb`, `0683ed69-d8d3-4734-9135-05fc7d11e971`, `ac6bd558-61de-46c2-9358-d75720112c7e`, `904415f5-4b94-4cf2-a321-c3cec0d1b900`, `699dd717-36ce-46b5-9113-d47f9575d2d5`, `ad6283d1-d289-4f48-85ea-d07a6413cbea`, `5bfbfaea-0745-479c-996c-f1d77ffa2469`, `a8199811-3a31-4b61-9cb0-e68b599c30df`.

## ➡ Da fare (in ordine)
1. **Calendario dei giochi**: piano completo e approvato in `PIANO-GIOCHI.md` (comprende anche la sistemazione delle cuciture/cornici), a blocchi (sezione 9).
   - ✅ **Blocco 1 fatto (16/11)**: migrazione `20261116100000_giochi.sql` applicata (`groups.giochi_attivi`, trigger che blocca la data da T−5 e ricalcola i giochi, tabella `game_runs` in Realtime, `get_giochi`, `start_game_run`, `finish_game_run`, vincitore e premi `neon`/`pazzo`/`godo`/`cornici`/`cowboy` in `unlocked_accessories` e `save_avatar`). Collaudo `test-e2e/giochi.sql`: 34 controlli tutti OK (in transazione annullata, nessun dato lasciato). Organizza: nota sotto la data e campo spento quando è bloccata.
   - Scelte del blocco 1 (diverse dal piano): la data si blocca da T−5 **solo se il gruppo ha i giochi**; il vincitore si annuncia a mezzanotte ma aspetta che finisca chi stava ancora giocando (al massimo durata del gioco + 60 s), così non cambia dopo l'annuncio. Ora finta per i test: `set_config('giochi.ora_finta', …)`, funziona SOLO come postgres.
   - ➡ Prossimo: **blocco 2** (motore comune, calendario, pagina del gioco con classifica in diretta, sala prove).
2. **Debug completo dell'app vera** (chiesto da Marzia: "prenditi tutto il tempo"), in una sessione dedicata. Quasi tutto è stato provato solo su telefoni simulati.
3. **Rivelazione finale** ("Chi era il Babbo Natale di chi", CLAUDE.md punto 11).
4. **Pubblicazione**: unire il ramo di lavoro in `main` → Production su Vercel (solo quando Marzia lo chiede, con PR).

Aperte, in attesa di Marzia:
- Dati di prova da ripulire (chiedere prima): gruppi "Test E2E Natale" `dc309576-4f8b-4ea2-a87f-4e6de5a9b609`, `a988807a-23de-4270-b5fb-27be88a41257`, `534ccc39-31bf-4cae-a937-f74b0cfda4da`, `abddbc2d-d78c-4711-a69b-294a20318caa` con i loro accessi finti, più l'accesso senza gruppo `ea354d17-bcf7-4cdd-beb6-2b111b6ea253`. Un gruppo "A" di Marzia (creato il 10/11 alle 17:00): chiedere se tenerlo. Una vecchia foto di prova nello Storage `moodboard` (si toglie dalla dashboard).
- Toppe: "chronically online" all'inglese (Marzia aveva scritto "cronically")? "iPhone duo" come due iPhone? Scelte libere da confermare: bradipo e cartello "NO!" (hater), uovo sodo con gli occhi a spirale (so cooked).
- Bacheca: il bug del ricamo "dopo il doppio fondo" non si riproduce nel simulatore (ipotesi: zoom col pinch su iPhone, ora spento). Da verificare sul telefono vero.

## Rami git (regola semplice)
- **Un solo ramo di lavoro: `ccr-f135f3c8-c3chko`**. Contiene tutto. `main` è quasi vuoto finché non si pubblica.
- Ogni sessione cloud riceve in automatico un ramo suo con un nome nuovo (non si può evitare). Regola: **all'inizio** unire `ccr-f135f3c8-c3chko` nel ramo della sessione; **alla fine** fare push sia sul ramo della sessione sia su `ccr-f135f3c8-c3chko` (Marzia ha dato il permesso il 16/11). Così il ramo di lavoro resta sempre il punto di partenza.
- Dopo la pubblicazione il punto di partenza diventa `main`.
- Vercel fa un'anteprima per ogni ramo: quella da provare sul telefono è quella di `ccr-f135f3c8-c3chko`.

## Cosa c'è (tutto fatto e collaudato, salvo dove scritto)
- **Accesso**: password di almeno 8 caratteri, email finta generata dal sito, nessuna email inviata. Reimposta password con link usa-e-getta 24 ore (`create_password_reset`, `use_password_reset`, pagina `/reimposta/[codice]`).
- **Gruppi**: crea gruppo (`/nuovo`) → sondaggio (`/gruppo/[id]/sondaggio?nuovo=1`) → Organizza col link d'invito (il link non vale finché il sondaggio non è salvato). L'organizzatore scrive i nomi veri; ognuno tocca il proprio nome. Organizza: data/budget con "Salvato ✓", toppe del gruppo, "Vai alla pagina del gruppo".
- **Esclusioni**: "Si amano" (coppia, due versi), "Si odiano" (`odio`, due versi), "Già fatto l'anno scorso" (solo A → B). Leggibili solo dall'organizzatore. Componente condiviso `components/esclusioni.tsx`.
- **Estrazione** (`run_draw`, security definer): catena unica, nessuno pesca se stesso né chi gli regala, rispetta le esclusioni, messaggio chiaro se impossibile. Collaudata con 300 estrazioni in transazione annullata. Dopo l'estrazione il link d'invito non vale più.
- **Busta** (`/gruppo/[id]/busta`, `components/apertura-busta.tsx`, `scena-busta.tsx`, `leva-3d.tsx`): slot "Babbo-matic" con leva 3D; le caselle sono buste (foto della busta 3D vera) con il personaggio al posto del sigillo, l'ultima ha il sigillo S. Tremore, vetro che si crepa e si rompe, telaio e insegna che cadono; la busta 3D cade nella neve; sigillo da grattare, lembo da tirare, biglietto che esce, si gira con un tocco e diventa la card olografica "ghiaccio e argento" (`lib/olografie.ts`), che segue il giroscopio. Scena 3D trasparente dietro la pagina, three.js caricato solo qui. Versione 2D con "riduci movimento" o senza WebGL. "Ricorda chi hai pescato" → `/gruppo/[id]/biglietto`. Dopo la busta, nella pagina del gruppo: "Il tuo regalo è per…".
- **Bacheca** (`components/bacheca.tsx`, `cassettiera.tsx`, `toppe.tsx`): tela aida; gesti nostri (1 dito sposta, 2 dita o maniglia vermiglia ingrandiscono/ruotano; pinch della pagina spento); Togli; ogni toppa una volta sola (sparisce dal cassetto), max 5 foto. Cassettiera di legno con 4 cassetti (Simboli, Parole, Texture, Foto) e targhette che dondolano col giroscopio; kit da ricamo sul piano per ricamare (punto croce 60×80, 8 fili, gomma, annulla, secchiello che colora la tela). **Doppio fondo** (3 tocchi) con le toppe del proprio totem e del gruppo. Toppe: "per tutti" (22) + 8 per ogni totem + fino a 4 simboli e 4 parole del gruppo (`group_toppe`, `/gruppo/[id]/toppe`) + una toppa personale per tipo ("+ Il tuo simbolo/parola"). Toppe sostituite = "ritirate" (fuori dal cassetto, visibili dove già attaccate). Foto ridotte a 1200px (`lib/foto.ts`), archivio privato. Tasto finale "Ho finito".
- **Sondaggio totem** (CLAUDE.md 9ter): editor dell'organizzatore con consigli; si compila la prima volta che si apre la propria bacheca ("Iniziamo" / "Adesso no"); calcolo nel database, punti mai nel browser, domande leggibili solo dall'organizzatore. 5 francobolli SVG (`components/totem.tsx`), foto al posto del disegno (`quiz_totems.immagine`), badge accanto al personaggio, totem in cima alla bacheca.
- **Personaggio** (`components/avatar.tsx`, `editor-personaggio.tsx`, pagina `/gruppo/[id]/guardaroba` con "Salva" fisso in basso; un personaggio per gruppo): pelle, 12 tagli, colori capelli, barba, occhiali, maglione, cucitura intorno alla toppa. Premi visibili SOLO quando sbloccati. Pop-up "Hai vinto un premio!" (`components/avviso-premi.tsx`).
- **Premi oggi** (calcolati in `private.unlocked_accessories`, controllati da `save_avatar`):
  | id | nome | come si vince |
  |---|---|---|
  | stellina | Così ti ricordi i compleanni | sondaggio completato |
  | fiocco | È un bracciale o una collana? | 10 cose sulla bacheca |
  | sciarpa | Lupetto grigio da portare indietro | le 8 toppe del proprio totem sulla bacheca + la propria toppa creata |
  | occhiali | Occhiali veloci | busta aperta |
  | super | Taglio Super | almeno un messaggio nella Santa Chat |
  | cuciture | Cucitura a catenella (look.cucitura = 1) | un post nelle Novità + almeno 5 reazioni |
  | olografico + occhiali_olo | Capelli e occhiali veloci olografici | tutti e 6 i premi sopra |
  | cornici | Tulipano, Felce, Punto croce (look.cucitura = 2, 3, 4) | vincere il gioco 4 (da fare, vedi PIANO-GIOCHI.md) |
  Lupetto, collana e calendario si escludono a vicenda; i due occhiali veloci pure.
- **Santa Chat** (`components/santa-chat.tsx`, `/gruppo/[id]/chat?con=pescato|babbo`): l'id di chi regala non viene mai salvato; leggono solo i due interessati; Realtime. 5 messaggi a testa al giorno da 50 caratteri. Babbo = fumetto vermiglio, chi riceve = fumetto crema. Pallino dei messaggi nuovi nella pagina del gruppo.
- **Novità** (feed, `components/feed.tsx`, `feed-gruppo.tsx`, `/gruppo/[id]/novita`): voci automatiche dal database (ingressi, estrazione, busta, bacheca, totem, toppe del gruppo) + post da 100 caratteri con foto. Reazioni 🎄 ❤️ 😂 🔥 👀 🇮🇱, una a testa: tieni premuto per scegliere, tocca una pillola per reagire uguale.
- **Censura dei nomi** in post e Santa Chat (`private.censura_testo`, `censura_nomi`): riconosce leet, lettere vicine, scambiate, una lettera qualsiasi nei nomi lunghi; ~265 parole comuni sempre permesse. Limiti noti: cognomi scritti identici (es. "rossi") e "lucca" restano coperti.
- **Suoni** (`lib/suoni.ts`, tutti generati dal codice): tocchi, oggetti, busta, chat, reazioni; carillon di sottofondo dopo il primo tocco; un solo tasto audio fisso in alto a destra (`components/audio.tsx`); la musica si ferma uscendo dal sito.
- **Sala prove** `/prove` (senza accesso, non salva niente): busta (`/prova-busta`), estrazione, bacheca, personaggio (tutti i premi), sondaggio, toppe, chat, novità; galleria `/stile` (personaggi, toppe, olografie). **Ogni nuova funzione va aggiunta anche qui.**

## Decisioni fisse (oltre a CLAUDE.md)
- Profilo: niente salvataggio automatico, tasto "Salva"; la freccia indietro esce senza salvare. Home senza personaggio cliccabile.
- "Scegli una foto" non chiede il permesso della galleria: è normale.
- Logo: S crema in Basteleur su verde abete con cucitura vermiglio (favicon, icona, manifest).
- Marzia vuole risparmiare token: una sessione nuova per blocco, richieste raggruppate in un solo messaggio, poche prove visive.

## Note tecniche
- **Supabase**: progetto `gesihnbtflnpjxwmpxkd` (Irlanda, gratuito). Migrazioni in `supabase/migrations/`, applicate con `apply_migration`. ⚠ `apply_migration` ed `execute_sql` chiedono una conferma che compare **solo nell'app desktop di Claude** (dal telefono non si vede e scade dopo 60 s): le operazioni sul database vanno fatte con Marzia al computer. ⚠ Se si cambiano `private.unlocked_accessories` o `public.save_avatar`, **partire sempre dall'ultima versione** (oggi rispettivamente `20261115100000_chat_censura_premi` e `20261115200000_cuciture_e_cornici`): in passato una migrazione ha rimesso un premio vecchio.
- Indirizzo e chiave **pubblica** di Supabase sono nel codice (`lib/supabase/config.ts`); la chiave **segreta** sta solo su Vercel (`SUPABASE_SECRET_KEY`).
- **Vercel**: team "Secret Santa", progetto `secret-santa`. Il collegamento MCP a volte non vede il progetto: in quel caso Marzia guarda la scheda Deployments.
- **Prove in locale** nel computer in cloud: `npm ci` (parte senza node_modules), `npx next build`, poi `NODE_USE_ENV_PROXY=1 npx next start -p <porta>` (il server deve passare dal proxy).
- **Test automatici** in `test-e2e/` (Playwright, telefoni simulati): creano gruppi "Test E2E Natale". Pulizia: cancellare **solo** quei gruppi e gli accessi che fanno parte solo di quelli, **chiedendo prima**. Mai cancellare per tipo di email: anche gli accessi veri usano `@users.secretsanta.local`.
- Chiavi del telefono (localStorage): `portachiavi` (accessi dei gruppi), `premi-visti:<uid>`, `doppio-fondo:<memberId>`, `santa-chat-letto:<receiverId>:<ruolo>`, `feed-visto:<gruppo>`.
- Figma: file "Secret Santa – look and feel" (team personale) con le prove di atmosfera.
