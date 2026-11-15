// I 5 giochi del calendario: nomi, regole, premi e limiti (gli stessi di private.regole_gioco nel database).
// Finché un gioco vero non è pronto si usa il gioco provvisorio "Stelline" (blocchi 3-5 di PIANO-GIOCHI.md).
import type { Gioco } from "./base.ts";
import { campanelli } from "./campanelli.ts";
import { stelline } from "./finto.ts";
import { palline } from "./palline.ts";
import { regali } from "./regali.ts";
import { slitta } from "./slitta.ts";

export type InfoGioco = {
  n: number;
  nome: string;
  storia: string; // il racconto che spiega il gioco (deve dire il vero: ricontrollarlo a ogni ritocco)
  riepilogo?: (stats: Record<string, number>) => string; // a fine partita, sotto il punteggio (come si è formato)
  sfondoChiaro?: boolean; // il gioco ha lo sfondo chiaro (neve): il 3-2-1 diventa vermiglio
  premio: string; // id del premio (unlocked_accessories)
  nomePremio: string;
  durataMax: number; // secondi (serve anche per "sta giocando…")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ogni gioco ha il suo stato
  gioco: Gioco<any>;
  provvisorio: boolean;
};

const STORIA_PROVVISORIA = "Gioco provvisorio, quello vero arriva presto: tocca le stelline prima che la cucitura intorno si chiuda. Ogni stellina vale 10 punti e hai 20 secondi.";

export const GIOCHI: InfoGioco[] = [
  {
    n: 1,
    nome: "Palline al volo",
    storia:
      "Una raffica di vento ha scosso l'albero e le palline dorate stanno cadendo: salvale con un tocco prima che si rompano sulla neve. Il Grinch ci ha nascosto in mezzo del carbone... e non tutto quello che luccica è oro.",
    premio: "neon",
    nomePremio: "Capelli neon",
    durataMax: 50,
    gioco: palline,
    provvisorio: false,
  },
  {
    n: 2,
    nome: "Campanelli",
    storia:
      "Gli elfi provano il concerto di Natale, ma il direttore ha perso lo spartito. Ascolta i campanelli e risuona la melodia identica. Attento: gli elfi sono dispettosi, tieni aperte le orecchie (e anche gli occhi).",
    premio: "pazzo",
    nomePremio: "Taglio Esplosione",
    durataMax: 600,
    gioco: campanelli,
    provvisorio: false,
  },
  {
    n: 3,
    nome: "Impila i regali",
    storia:
      "Il tuo Babbo Natale ha esagerato con gli acquisti: impila i regali in una torre più alta che puoi, toccando per far cadere ogni pacco. Quello che sporge va perso. La precisione, dicono, viene premiata.",
    premio: "godo",
    nomePremio: "Maglione GODO",
    durataMax: 600,
    gioco: regali,
    provvisorio: false,
  },
  {
    n: 4,
    nome: "Slitta slalom",
    storia:
      "Una bufera ha sparpagliato sulla pista i regali che il tuo Babbo Natale doveva consegnarti. Salta sulla slitta, trascina il dito per guidarla e vai più lontano che puoi, recuperando più regali che puoi. Occhio alle scorciatoie...",
    premio: "cornici",
    nomePremio: "Cornici ricamate",
    durataMax: 300,
    gioco: slitta,
    sfondoChiaro: true,
    riepilogo: (st) => `${st.metri} m + ${st.regali} ${st.regali === 1 ? "regalo" : "regali"} × 25`,
    provvisorio: false,
  },
  { n: 5, nome: "Palle di neve", storia: STORIA_PROVVISORIA, premio: "cowboy", nomePremio: "Cappello da cowboy", durataMax: 65, gioco: stelline, provvisorio: true },
];

export const TENTATIVI = 3;

// Gli stessi controlli di private.regole_gioco (per i test con Node)
export const REGOLE_SERVER: Record<number, { durataMin: number; durataMax: number; scoreMax: number; puntiAlSecondo: number }> = {
  1: { durataMin: 1, durataMax: 50, scoreMax: 8000, puntiAlSecondo: 260 },
  2: { durataMin: 2, durataMax: 600, scoreMax: 12000, puntiAlSecondo: 60 },
  3: { durataMin: 2, durataMax: 600, scoreMax: 6000, puntiAlSecondo: 25 },
  4: { durataMin: 3, durataMax: 300, scoreMax: 20000, puntiAlSecondo: 120 },
  5: { durataMin: 5, durataMax: 65, scoreMax: 6000, puntiAlSecondo: 160 },
};
