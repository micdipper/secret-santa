# Piano – Mini giochi dell'avvento (calendario a 5 giochi)

> ⚠ 16/11: il calendario, i premi (solo indizi) e il punteggio del gioco 4 sono cambiati su richiesta di Marzia: vale quello che c'è scritto in STATO.md.

Scritto il 15/11/2026 (pianificazione con Opus), approvato da Marzia nelle decisioni qui sotto.
**Chi lo esegue**: leggere prima `CLAUDE.md` e `STATO.md`, poi questo file. Lavorare a blocchi (sezione 9), una sessione per blocco.
**Ramo**: partire dal ramo che contiene tutto il lavoro (vedi "Rami git" in STATO.md, oggi `ccr-f135f3c8-c3chko`), non da `main` né da `confident-sagan`.
Tutte le regole di interfaccia di CLAUDE.md restano valide (mobile first, tre tasti, feltro, contrasto, tasto finale chiaro, animazioni fluide, un solo tasto audio, suoni da `lib/suoni.ts`).

---

## 0. Autorizzazioni: TUTTE INSIEME, ALL'INIZIO (richiesta di Marzia)
Marzia vuole dare tutti i permessi una volta sola all'inizio e poi lasciar lavorare senza interruzioni. Quindi, **prima di qualsiasi altro lavoro** (all'inizio del blocco 1, e all'inizio di ogni sessione nuova se qualcosa manca):
1. Fare l'elenco completo di tutto ciò che chiederà conferma durante TUTTI i blocchi e mostrarlo a Marzia in un unico messaggio, in parole semplici. Come minimo:
   - Supabase: `apply_migration` (modifiche al database), `execute_sql` (test SQL in transazioni annullate, preparazione e pulizia dei gruppi "Test E2E Natale"), `get_advisors`, `list_tables`;
   - comandi: `npm ci`, `npx next build`, `npx next start`, `node` (test della logica dei giochi e test e2e con Playwright, che è già installato), `git add/commit/push` sul ramo di lavoro;
   - Vercel: lettura dello stato delle anteprime.
2. Con un'unica richiesta (skill `update-config`) aggiungere queste regole `allow` in `.claude/settings.json` del progetto, così Marzia approva una volta sola. Niente regole più larghe del necessario (niente `Bash(*)`, niente permessi di cancellazione generici).
3. Le azioni che restano comunque da confermare caso per caso, dirle subito a Marzia: **cancellare dati** (anche quelli di test: chiedere prima, come da STATO.md), **unire in `main`/pubblicare**, **aprire una PR**.
4. Solo dopo il via di Marzia lavorare in autonomia fino alla fine del blocco, senza altre domande salvo dubbi veri sul risultato (in quel caso raggrupparle in un solo messaggio).

## 1. Decisioni di Marzia (definitive)
- 5 minigiochi, **semplici da capire ma già mediamente difficili dal primo**, poi sempre più difficili. Belli, "catchy", senza errori.
- Uno al giorno: si sbloccano a **mezzanotte (Europa/Roma)** a partire da 4 giorni prima dello scambio; **l'ultimo si gioca il giorno dello scambio**.
  - Gioco 1 = T−4 · Gioco 2 = T−3 · Gioco 3 = T−2 · Gioco 4 = T−1 · Gioco 5 = T (giorno dello scambio).
  - Ogni gioco è aperto da 00:00 a 24:00 del suo giorno. **Il vincitore si annuncia sempre alla chiusura (mezzanotte)**, anche se qualcuno non ha giocato. Il gioco 5 si chiude alla mezzanotte dopo lo scambio (scelta di Marzia).
- **3 tentativi** a testa per gioco; conta il **punteggio migliore**. Classifica e punteggi di tutti **visibili in diretta** (parte importante).
- **Data dello scambio bloccata** dalla mezzanotte di T−5 in poi (non si può più cambiare).
- Gruppo con **meno di 6 giorni** allo scambio (alla creazione o dopo un cambio di data) → **i giochi non partono** per quel gruppo.
- Premi per il **solo vincitore** di ogni gioco:
  1. **colore capelli acceso unico** (lo ha solo chi vince);
  2. **taglio di capelli pazzo** unico;
  3. **maglione con "GODO" ricamato**;
  4. le **3 cornici ricamate dell'avatar**: Tulip stitch, Fern stitch, Cross stitch (cornici attorno alla toppa tonda del personaggio; NON sono i ricami della bacheca);
  5. **cappello da cowboy** "davvero cool".
- Gioco 5: **niente gioco di ritmo** (l'audio ha ritardi diversi sui telefoni) → tiro a segno con palle di neve (vedi 6.5).

## 2. Regole precise (per non avere corti circuiti)
- `T` = `groups.exchange_date`. Giorno del gioco k (1..5) = `T − (5 − k)`.
- Apertura gioco k = `(T − (5−k)) 00:00` ora di Roma; chiusura = 24 ore dopo (`00:00` del giorno seguente, ora di Roma). Calcolo SEMPRE nel database con `at time zone 'Europe/Rome'` (dicembre non ha cambi d'ora, ma usare comunque il fuso).
- **Blocco della data**: se il gruppo ha `exchange_date` non nullo e `oggi_Roma >= exchange_date − 5`, la data non si può più cambiare (né a un'altra data né a vuoto). Errore chiaro: "La data è bloccata: i giochi stanno per iniziare."
- **Giochi attivi** (`groups.giochi_attivi boolean`): ricalcolato a OGNI cambio di data (possibile solo prima del blocco) e alla creazione: `true` se `exchange_date - oggi_Roma >= 6`, altrimenti `false`. Data vuota → `false`.
  - Perché funziona: quando si può cambiare la data nessun gioco è ancora iniziato (il primo inizia a T−4, il blocco scatta a T−5), quindi nessun gioco viene mai "saltato" o interrotto.
  - Gruppi già esistenti: la migrazione calcola il valore con la stessa regola.
- **Chi gioca**: i membri con `user_id` (entrati nel gruppo). Non serve che l'estrazione sia fatta. Chi entra a giochi in corso gioca quelli rimasti.
- **Tentativo**: inizia quando la persona preme "Gioca" (il server crea la partita). **Una partita iniziata conta anche se si chiude la pagina** (abbandonata = punteggio 0). Testo chiaro prima: "Ogni partita iniziata conta come tentativo."
- Si può **iniziare** una partita solo con il gioco aperto; una partita iniziata prima di mezzanotte si può **finire** entro `durata massima del gioco + 60 s`.
- **Vincitore**: punteggio migliore più alto (> 0). **Pareggio** → vince chi ha fatto quel punteggio per primo (`finished_at` più vecchio). Nessuno ha giocato o tutti a 0 → nessun vincitore, premio non assegnato.
- I premi sono legati alla **persona** (il personaggio è unico in tutti i gruppi): chi vince in un gruppo li vede ovunque. Va bene così.

## 3. Database (una migrazione: `supabase/migrations/2026111xxxxxxx_giochi.sql`)
Leggere la skill `supabase-postgres-best-practices` prima di scriverla. Applicare con `apply_migration` (Marzia approva).

### 3.1 Ora "finta" per i test
`private.adesso()` → `coalesce(nullif(current_setting('giochi.ora_finta', true), '')::timestamptz, now())`.
Tutte le funzioni dei giochi usano `private.adesso()` e `private.oggi_roma()` (`(private.adesso() at time zone 'Europe/Rome')::date`). Nei test SQL si fa `select set_config('giochi.ora_finta', '…', true)` dentro una transazione annullata. (Gli utenti non possono chiamare `set_config` via API: verificarlo con `get_advisors`.)

### 3.2 Tabelle
- `groups.giochi_attivi boolean not null default false`.
- `public.game_runs`:
  `id uuid pk` · `group_id uuid fk groups on delete cascade` · `member_id uuid fk group_members on delete cascade` · `game smallint check 1..5` · `tentativo smallint check 1..3` · `seme integer not null` (casuale, dal server) · `started_at timestamptz default now()` · `finished_at timestamptz` · `score integer` (null = in corso/abbandonata) · `stats jsonb` (contatori per controllo, max 2 KB) · `unique (member_id, game, tentativo)` · indice `(group_id, game, score desc, finished_at)`.
- RLS su `game_runs`: **select** per i membri del gruppo (`group_id in (select private.my_group_ids())`); **nessun** insert/update/delete diretto (solo funzioni `security definer`).
- Realtime: `alter publication supabase_realtime add table public.game_runs;` (senza, nessun aggiornamento e nessun errore).

### 3.3 Funzioni
- `private.regole_gioco(k)` → durata massima (s), durata minima (s), punteggio massimo, punti massimi al secondo (tabella in sezione 6, colonna "controlli").
- `private.finestra_gioco(group_id, k)` → apertura/chiusura (timestamptz) oppure null se giochi non attivi.
- `private.vincitore_gioco(group_id, k)` → `member_id` o null; null se il gioco non è ancora chiuso.
- `public.get_giochi(p_group_id)` → per ogni k: `stato` ('bloccato' | 'aperto' | 'chiuso'), `apre_alle`, `chiude_alle`, `miei_tentativi`, `vincitore_member_id` (solo se chiuso), più `ora_server` (per i countdown: il client calcola lo scarto con il suo orologio).
- `public.start_game_run(p_group_id, p_game)` → controlla: accesso fatto, membro del gruppo, giochi attivi, gioco aperto ora, tentativi < 3. Inserisce la partita con `seme` casuale; restituisce `id`, `seme`, `tentativo`.
- `public.finish_game_run(p_run_id, p_score, p_stats)` → controlla: partita mia, non ancora finita, `adesso <= started_at + durata_max + 60 s`, `adesso - started_at >= durata_min`, `0 <= score <= punteggio_max`, `score <= punti_al_secondo × secondi trascorsi + margine`. Se un controllo fallisce: salva `score = 0` e restituisce l'errore "Partita non valida" (niente dettagli). Restituisce posizione in classifica e se è il nuovo record personale.
- Trigger `before insert or update of exchange_date on groups`: blocco della data (sezione 2) + ricalcolo di `giochi_attivi`. Vale anche per `create_group`.
- `private.unlocked_accessories`: partire SEMPRE dalla sua **ultima versione** nelle migrazioni (cercarla con grep in `supabase/migrations/`; il 15/11 era `20261115100000_chat_censura_premi`) e lasciare invariato tutto il resto. Aggiungere:
  `neon` = vincitore del gioco 1 in un suo gruppo · `pazzo` = gioco 2 · `godo` = gioco 3 · `cornici` = gioco 4 · `cowboy` = gioco 5. **Non** contano per i premi olografici ("tutti e 6").
  Stessa regola per `public.save_avatar`: partire dall'ultima versione (`20261115200000_cuciture_e_cornici`).
- `public.save_avatar`: rifiutare `coloreCapelli = 8` senza `neon`, `capelli = 13` senza `pazzo`, `maglione = 6` senza `godo`, `cucitura` 2, 3 o 4 senza `cornici` (GIÀ FATTO il 15/11, migrazione `20261115200000_cuciture_e_cornici`), `cowboy` negli accessori senza sbloccarlo (già coperto dal ciclo sugli accessori).
- Revoke/grant come le altre funzioni (solo `authenticated`).

## 4. Avatar e premi (`components/avatar.tsx`, `editor-personaggio.tsx`, `avviso-premi.tsx`)
- ⚠ AGGIORNAMENTO 15/11: le cornici sono GIÀ disegnate e scelte con il campo esistente `look.cucitura` (0 filza, 1 catenella = premio `cuciture` del post con reazioni, **2 Tulipano, 3 Felce, 4 Punto croce = premio `cornici` del gioco 4**). Niente campo `cornice` nuovo: basta aggiungere `cornici` a `private.unlocked_accessories` per il vincitore del gioco 4 (l'editor le mostra da solo quando `cornici` è sbloccato; `save_avatar` già le controlla).
- `COLORI_CAPELLI[8]` = **colore neon** (proposta: fucsia fluo `#ff2bd6` con leggero alone; deve staccarsi dal verde abete e dalla toppa crema). Costante `COLORE_NEON = 8`.
- `NOMI_CAPELLI[13]` = **"Esplosione"** (taglio pazzo): ciocche a saetta e molle che sparano in tutte le direzioni, con un leggero ondeggiare (fermo con "riduci movimento"). Costante `CAPELLI_PAZZO = 13`. Deve funzionare con tutti i colori, compresi olografico e neon.
- `MAGLIONI[6]` = **maglione "GODO"**: crema con scritta GODO a punto croce rossa + fila di rombi nordici. Costante `MAGLIONE_GODO = 6`.
  ⚠ `lookIniziale` oggi usa `% MAGLIONI.length`: cambiarlo in `% MAGLIONE_GODO` (altrimenti qualcuno nascerebbe col premio). Stessa attenzione per capelli e colori: restare sotto `CAPELLI_SUPER` e `COLORE_OLOGRAFICO`.
- **Cornici: già esistono, vanno solo SISTEMATE** (richiesta di Marzia, 16/11). Oggi: la filza (default) è il tratteggio CSS `.toppa::before` in `app/globals.css` (`inset: 4px`, `border: 1.5px dashed rgb(44 74 50 / 0.55)`, cioè verde abete al 55%); le altre 4 (catenella, tulipano, felce, punto croce) sono il componente `Cucitura` in `components/avatar.tsx`, in SVG con `viewBox 0 0 100 100`, raggio 43, filo dorato `#c9931c`, tratti 1.4–1.8 unità e `z-[1]`. Correzioni:
  1. **Colore**: tutte verdi come la filza (`rgb(44 74 50 / 0.55)`, stesso valore, meglio da una variabile CSS condivisa). Via l'oro.
  2. **Spessore**: tutti i tratti uguali alla filza, **1.5 px veri a ogni dimensione della toppa** (usare `vector-effect="non-scaling-stroke"` con `strokeWidth={1.5}`, oppure calcolare in px dalla dimensione). Oggi in SVG lo spessore cresce con la toppa (a 128 px è circa 2,2 px, a 56 px circa 1 px).
  3. **Stesso cerchio**: centro e raggio uguali alla filza (`inset 4px` → raggio = metà dimensione − 4 px − 0,75 px); oggi il raggio 43/100 si allontana dal bordo quando la toppa è grande. Passare la `dimensione` a `Cucitura` per calcolarlo. I motivi (tulipani, felce, crocette) restano proporzionati e non devono uscire dalla toppa.
  4. **Sotto il busto**: la cucitura deve stare SOTTO il personaggio, come la filza (che è `::before` e quindi resta dietro). Togliere `z-[1]` e mettere l'SVG prima dell'Avatar nel DOM con il personaggio sopra (`relative`, z maggiore). Controllare che il busto copra la cucitura in basso come succede con la filza.
  5. Verificare tutte e 5 le cuciture a 40, 56, 72 e 128 px (galleria `/stile` e `/prove/personaggio`) e nel profilo, confrontandole affiancate con la filza.
  Il premio non cambia: catenella = `cuciture` (post + 5 reazioni); tulipano, felce, punto croce = `cornici` (gioco 4).
- **Cappello da cowboy** (accessorio `cowboy`, si somma agli altri, non esclusivo): cuoio marrone, tesa curva, fascia a punto croce con stellina d'oro, leggermente inclinato. Con il cappello i capelli vanno tagliati sotto la tesa (clipPath) e restano visibili ai lati: provarlo con **tutti i 14 tagli**.
- Premi visibili nel profilo SOLO se sbloccati (regola esistente). `/prove/personaggio` e la galleria in `/stile` li mostrano tutti.
- `avviso-premi.tsx`: aggiungere i nomi (`neon` "Capelli neon", `pazzo` "Taglio Esplosione", `godo` "Maglione GODO", `cornici` "Cornici ricamate", `cowboy` "Cappello da cowboy").

## 5. Pagine
- **Pagina del gruppo**: nuovo riquadro "Calendario dei giochi" (solo se `giochi_attivi`): prima di T−4 "I giochi iniziano tra N giorni"; durante: gioco di oggi + countdown alla chiusura; tocca → calendario.
- **`/gruppo/[id]/giochi`** (calendario): 5 finestrelle di feltro numerate stile calendario dell'avvento. Stati: chiusa (cucita, con countdown all'apertura), aperta (in rilievo, cliccabile), finita (mostra il vincitore col suo personaggio e il premio). Tasto tondo indietro in alto.
- **`/gruppo/[id]/giochi/[n]`** (pagina del gioco):
  - Prima: titolo, regole in 3 righe con piccola illustrazione, pallini dei tentativi (●●○), "Ogni partita iniziata conta come tentativo", tasto primario **"Gioca"** (o "Riprova (2 rimasti)").
  - **Classifica in diretta** sotto: personaggio, nome, punteggio migliore, tentativi usati, "sta giocando…" se ha una partita in corso (iniziata da meno della durata massima), chi non ha ancora giocato in fondo e spento. Righe che si riordinano con animazione a molla (framer-motion `layout`); coriandoli quando sali al primo posto.
  - Gioco a tutto schermo (`100dvh`, safe area), conto alla rovescia 3-2-1, poi partita.
  - Fine: punteggio grande, "Nuovo record!" se migliora, posizione in classifica, tasto primario "Riprova (N rimasti)" oppure "Torna alla classifica" se finiti.
  - Dopo la chiusura: annuncio del vincitore (personaggio che indossa il premio, coriandoli, fanfara); per il vincitore il pop-up premi esistente porta al guardaroba. Annuncio già visto ricordato nel telefono (`vincitori-visti:<group>`).
- **Organizza**: sotto la data, nota piatta: "Dal <data T−5> la data si blocca: iniziano i giochi." oppure "Mancano meno di 6 giorni: niente giochi per questo gruppo." Campo data spento quando bloccato.
- **Sala prove** `/prove/giochi` + `/prove/giochi/[n]`: ogni gioco giocabile senza accesso, tentativi illimitati, classifica finta con 5 amici inventati, nessun salvataggio. Aggiungere al riquadro della sala prove.

### 5.1 Diretta (punti importanti)
- Supabase Realtime `postgres_changes` su `game_runs` con filtro `group_id=eq.<id>` (insert + update). Con ~12 persone il costo RLS è trascurabile.
- **Rete di sicurezza**: ricaricare la classifica ogni 8 s mentre la pagina è visibile e subito al ritorno (`visibilitychange`), perché l'iPhone chiude i collegamenti in background. La classifica si calcola sempre dai dati del database, mai sommando gli eventi.
- Countdown basati su `ora_server` (scarto calcolato una volta), non sull'orologio del telefono. A mezzanotte la pagina si aggiorna da sola (gioco che si chiude/apre).

## 6. I 5 giochi
Tutti: verticale, una mano, un solo tipo di controllo, partite brevi, risposta immediata a ogni tocco (suono + particelle + piccolo tremolio + numeri che volano), velocità che cresce. Disegni nostri in stile feltro/natalizio nordico (Path2D su canvas, pre-disegnati in canvas fuori schermo). Casualità SOLO dal `seme` del server (stesso seme = stessa partita). Costanti di difficoltà in cima a ogni file.

| # | Nome | Abilità | Durata | Controlli server (min s · max s · punteggio max · punti/s max) |
|---|---|---|---|---|
| 1 | Palline al volo | riflessi + scelta | 45 s o 3 vite | 1 · 50 · 8000 · 260 |
| 2 | Campanelli | memoria + velocità | finché non sbagli | 2 · 600 · 12000 · 60 |
| 3 | Impila i regali | tempismo preciso | finché non manchi | 2 · 600 · 6000 · 25 |
| 4 | Slitta slalom | controllo continuo | finché non urti | 3 · 300 · 20000 · 120 |
| 5 | Palle di neve alle finestre | mira con anticipo + scelta | 60 s | 5 · 65 · 6000 · 160 |

(I limiti sono larghi; vanno ricontrollati dopo la taratura con partite vere: devono stare almeno al doppio del record realistico.)

### 6.1 Palline al volo (gioco 1)
- ⚠ Tarato con Marzia il 16/11: i valori qui sotto sono quelli di partenza. **Quelli veri sono le costanti in cima a `lib/giochi/palline.ts`** (e il riassunto in STATO.md).
- Dall'alto cadono palline. **Tocca le palline dorate** (+10). **Non toccare il carbone** (perdi 1 dei 3 cuori, la combo si azzera). Pallina dorata che tocca terra = combo azzerata **e un cuore perso** (Marzia, 16/11). Da 12 s il carbone cade sempre più spesso attaccato a una dorata (trappola). Rara **stella cometa** (3%) che attraversa in diagonale veloce: +50. Dorate a **zigzag** (da 5 s) e dorate che **lampeggiano e diventano carbone** a metà caduta (da 10 s; "carbone travestito": toccarle costa un cuore anche quando sono ancora d'oro). Rara **meteora di carbone** (4%, da 8 s) che attraversa allo stesso modo: −1 cuore (Marzia, 16/11).
- Combo: ogni 5 dorate di fila il moltiplicatore sale (×1 → ×5).
- Difficoltà: velocità di caduta da 230 a 560 px/s in 45 s; una nuova ogni 650 ms → 280 ms; dai 15 s a volte ne cadono 2 insieme; il carbone passa dal 20% al 35%. Area di tocco = raggio pallina + 12 px.
- Effetti: pallina che scoppia in brillantini, "+10 ×3" che vola, carbone che fa polvere nera e scuote lo schermo, cuore che si scuce.

### 6.2 Campanelli (gioco 2)
- ⚠ Tarato con Marzia il 16/11: **i valori veri sono le costanti in cima a `lib/giochi/campanelli.ts`** (e il riassunto in STATO.md).
- 4 campanelli 2×2 (colori diversi + nota di una scala pentatonica, suono generato dal codice). Il gioco suona e illumina una sequenza; ripetila toccando. Si parte da **4 note** (Marzia, 16/11), +1 a ogni turno **e una nota già sentita cambia** (dal turno 2); mai 3 note uguali di fila.
- Velocità della sequenza: 600 ms a nota → 280 ms dal turno 10. Dal turno 6 le note sono più brevi. Dal turno 7 (Marzia, 16/11; prima era 9) un campanello "birichino" scambia posto con un altro (animazione di 0,5 s) **prima** della sequenza: la posizione conta, il colore resta.
- Un errore = fine. 5 s per ogni tocco, altrimenti fine.
- Punteggio: 10 × lunghezza della sequenza completata + bonus rapidità (fino a +5 per nota se rispondi entro 400 ms).
- Effetti: campanello che dondola, onda di luce, sequenza giusta = scintille e campanella; errore = "stonata" buffa.

### 6.3 Impila i regali (gioco 3)
- Un pacco scorre avanti e indietro sopra la torre; **tocca per farlo cadere**. La parte che sporge viene tagliata e cade; il pacco successivo è largo quanto la parte rimasta. Mancare del tutto = fine.
- **Perfetto** (entro 5 px) → niente taglio, +2 bonus; 3 perfetti di fila → il pacco si riallarga del 10%.
- Difficoltà: velocità 260 px/s, +4% a ogni piano (massimo 900); dal piano 10 il pacco parte da un lato a caso; dal piano 20 la velocità non è più costante (accelera al centro).
- Punteggio: 10 per piano + 20 per ogni perfetto.
- Effetti: telecamera che sale, pezzo tagliato che cade ruotando, nastro e fiocco sul pacco, "Perfetto!" ricamato.

### 6.4 Slitta slalom (gioco 4)
- La slitta scende (lo sfondo scorre); **trascina il dito a destra/sinistra** (movimento relativo, morbido) per evitare abeti, pupazzi di neve e lastre di ghiaccio e prendere i regali. Un urto = fine.
- Difficoltà: velocità da 320 a 950 px/s in 90 s; varchi sempre più stretti (da 3,2 a 1,6 volte la larghezza della slitta).
- **Sempre possibile**: il percorso si genera prima come corridoio libero (curva continua, mai più stretto del minimo e con curvatura raggiungibile alla velocità attuale), poi gli ostacoli si mettono attorno. Testarlo con un bot.
- Punteggio: 1 per metro + 25 per regalo.
- Effetti: scia nella neve, sbuffi in curva, regalo che salta nel sacco, urto con neve che esplode e slitta che si ribalta.

### 6.5 Palle di neve alle finestre (gioco 5)
- Facciata di una casa con 9 finestre (3×3) e un balcone. Dalle finestre spuntano personaggi; **tocca dove lanciare**: la palla parte dal basso e impiega **0,25 s** ad arrivare (bisogna anticipare: se il personaggio si ritira prima, mancato).
- Personaggi: elfo +10 (resta fuori 1,2 s → 0,5 s) · elfo dorato +30 (0,45 s) · **Babbo Natale −25 e combo azzerata (non colpirlo!)** · dai 20 s una renna che cammina sul balcone (bersaglio in movimento, +40).
- Antispam: una palla ogni 0,2 s; colpire una finestra vuota = −2 e combo azzerata.
- Combo ×1 → ×4. Durata 60 s, ritmo che accelera (più personaggi insieme, più Babbi).
- Effetti: palla che si schiaccia, elfo che barcolla con le stelline, imposte che sbattono, Babbo Natale offeso.
- Racconto (campo `storia`): breve, lascia qualcosa da scoprire (Marzia, 16/11). Proposta: "Invece di incartare i regali, gli elfi si affacciano alle finestre del laboratorio a fare scherzi. Rispondi a palle di neve! Ma chi si affaccia non è sempre un elfo..."

## 7. Motore comune (`lib/giochi/motore.ts`) e file
- Canvas 2D a tutto schermo; risoluzione = dimensione CSS × min(devicePixelRatio, 2); ridimensionamento con `ResizeObserver` (la barra di Safari cambia l'altezza).
- **Passo fisso** 60 Hz con accumulatore (massimo 5 passi per fotogramma), disegno separato dalla logica.
- **Pausa automatica** con `visibilitychange` (partita in pausa, al ritorno "Tocca per continuare"); reset del tempo trascorso al ritorno.
- Tocco: Pointer Events + `setPointerCapture`, `touch-action: none`, niente selezione/menu col tasto lungo, niente zoom.
- Generatore casuale col seme (mulberry32). Oggetti riutilizzati (niente nuovi oggetti a ogni fotogramma).
- Aiuti: particelle, tremolio dello schermo, testo che vola, curve di easing, molle.
- "Riduci movimento": meno tremolio e particelle, gioco identico.
- Suoni in `lib/suoni.ts` (generati dal codice): colpo, combo che sale di tono, errore, note dei campanelli, taglio del pacco, urto, splash di neve, fine partita, record. Musica di sottofondo più bassa durante la partita.
- Ogni gioco: `components/giochi/<nome>.tsx` con logica **pura e deterministica** (`crea(seme)`, `aggiorna(stato, dt, input)`) separata dal disegno → si può testare senza browser.
- Componente comune `components/giochi/partita.tsx`: 3-2-1, pausa, fine partita, invio del punteggio (`finish_game_run`), riprova; in modalità prova non salva.

## 8. Collaudo (obbligatorio prima di dire "fatto")
1. **Test SQL** in una transazione annullata con `giochi.ora_finta`: apertura/chiusura a cavallo della mezzanotte di Roma; blocco della data a T−5; `giochi_attivi` con meno di 6 giorni; 3 tentativi poi rifiuto; partita abbandonata = 0; fine partita dopo la chiusura entro il margine; controlli anti-trucco; pareggio; nessun giocatore; premi sbloccati solo al vincitore e solo dopo la chiusura; un estraneo non legge le partite del gruppo.
2. **Test della logica dei giochi** con Node (`node --experimental-strip-types`, Node 22 c'è) e bot: migliaia di partite con semi diversi → nessun NaN, la partita finisce sempre, slalom sempre percorribile, punteggi sotto i limiti del server.
3. **Playwright** (4 telefoni simulati, gruppo "Test E2E Natale" con data e `giochi_attivi` impostati via SQL): diretta della classifica tra due telefoni, tentativi, annuncio del vincitore, premio nel profilo. Pulire SOLO i dati di test (chiedere prima).
4. **Taratura sul telefono vero di Marzia** (sala prove): ogni gioco deve essere difficile ma onesto; le costanti in cima ai file si cambiano senza toccare la logica.

## 9. Ordine dei lavori (una sessione per blocco)
1. ✅ (16/11) **Autorizzazioni tutte insieme (sezione 0)**, poi database (sezione 3) + test SQL + avviso/blocco data in Organizza.
2. ✅ (16/11) Motore comune + `partita.tsx` + calendario + pagina del gioco con classifica in diretta (con un gioco finto) + sala prove.
3. ✅ (16/11) Giochi 1 e 2 (Palline al volo, Campanelli).
4. ✅ (16/11) Giochi 3 e 4 (Impila i regali, Slitta slalom). Valori veri = costanti in cima a `lib/giochi/regali.ts` e `lib/giochi/slitta.ts` (riassunto in STATO.md); punteggio del gioco 3: 10 a piano + 10 in più per un perfetto.
5. ✅ (17/11) Gioco 5 (Palle di neve, `lib/giochi/neve.ts`) + annuncio del vincitore (`components/giochi/annuncio.tsx`). (Premi grafici e sistemazione delle cuciture: ✅ fatti il 16/11 durante il blocco 3.) Insidia in più rispetto alla 6.5: dai 25 s un elfo può lasciare il posto a Babbo Natale nella stessa finestra.
6. **Collaudo completo** (sezione 8), con Marzia al computer (ogni SQL chiede la sua conferma). Metodo: **viaggio nel tempo** con `test-e2e/giochi-tempo.mjs` (gruppo di prova, si sposta la data dello scambio con SQL, telefoni simulati, schermate mandate a Marzia), così non si aspettano i giorni veri.
   - Già fatto il 15/11 (blocco 5): calendario chiuso → apertura → gioco 1 in diretta → gioco 1 chiuso con annuncio e premio nel guardaroba → giorno dello scambio col gioco 5; test dei bot (`giochi-logica.ts`) tutti OK.
   - Da fare, in ordine:
     1. Cancellare il gruppo di prova rimasto (vedi STATO.md, Marzia ha già detto sì).
     2. Rilanciare `test-e2e/giochi.sql` (in transazione annullata) e `giochi-logica.ts`: dal blocco 1 sono cambiate le regole del server (migrazioni `20261116200000`, `20261116210000`, `20261116230000`), verificare che i 34 controlli siano ancora OK e aggiungere quelli mancanti della sezione 8.1.
     3. Con `giochi-tempo.mjs`, aggiungere i momenti non ancora visti: giochi 2, 3 e 4 giocati nella pagina vera; 3 tentativi e poi rifiuto; partita abbandonata = 0; pareggio (vince chi ha fatto il punteggio per primo); gioco senza giocatori = "nessun vincitore"; vincitori diversi per ogni gioco con tutti e 5 i premi nel guardaroba (neon, Esplosione, GODO, cornici, cowboy); riquadro "Mini giochi" nella pagina del gruppo in ogni momento; Organizza con la data bloccata da T−5. Schermate a Marzia.
     4. Mezzanotte dal vivo (facoltativo): mettere il gioco in chiusura a pochi minuti con una migrazione che permetta l'ora finta solo ai gruppi di prova, oppure lasciarlo com'è (stessa logica dei blocchi 2-4).
     5. Anteprima Vercel del ramo di lavoro e **taratura sul telefono vero di Marzia** in sala prove (`/prove/giochi`): difficoltà di ogni gioco; si cambiano solo le costanti in cima ai file; se cambia la difficoltà ricontrollare il racconto (`storia`) e i limiti del server col bot.
     6. Pulire SOLO i dati di test (chiedendo prima), aggiornare STATO.md, commit e push.
