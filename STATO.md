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
| Bacheca: quiz, toppe SVG nel cassetto, ricamo a punto croce, foto, lista dei desideri | ⏳ da fare (aspetta le domande/verdetti di Marzia) |
| Rivelazione: busta 3D con three.js, biglietto olografico, neve (oggi c'è una versione semplice) | ⏳ da fare |
| Suoni (tocchi, sottofondo, oggetti) + tasto per togliere l'audio | ⏳ da fare (decidere: generati dal codice o file con licenza libera) |
| Pubblicazione: unire il ramo in `main` → sito ufficiale su Vercel (Production) | ⏳ a fine Fase 1 |
| Avatar a mezzobusto (sostituisce le emoji) + pagina profilo + accessori sbloccabili solo con le azioni della tabella in CLAUDE.md (punto 9bis) | ⏳ dopo la bacheca |
| Apertura busta "a slot machine" con gli avatar, poi busta 3D | ⏳ dopo avatar |
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
