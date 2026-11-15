// I 5 giochi del calendario: nomi, regole, premi e limiti (gli stessi di private.regole_gioco nel database).
// Finché un gioco vero non è pronto si usa il gioco provvisorio "Stelline" (blocchi 3-5 di PIANO-GIOCHI.md).
import type { Gioco } from "./base.ts";
import { campanelli } from "./campanelli.ts";
import { stelline } from "./finto.ts";
import { palline } from "./palline.ts";
import { regali } from "./regali.ts";
import { PESO_REGALO, slitta } from "./slitta.ts";

export type InfoGioco = {
  n: number;
  nome: string;
  storia: string; // il racconto che spiega il gioco (deve dire il vero: ricontrollarlo a ogni ritocco)
  indizio: string; // il premio non si dice: solo un indizio
  // come leggere il punteggio: [grande, piccolo] (gioco 4: regali e metri). Senza: il numero così com'è.
  formatta?: (punteggio: number) => [string, string];
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
    indizio: "Questo colore ti donerà.",
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
    indizio: "Un nuovo look, parola di parrucchiere.",
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
    indizio: "Forse vorrai cambiare maglione.",
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
    indizio: "La tua toppa si farà più elegante.",
    storia:
      "Una bufera ha sparpagliato sulla pista i regali che il tuo Babbo Natale doveva consegnarti. Salta sulla slitta e trascina il dito per guidarla: vince chi ne recupera di più. Occhio alle scorciatoie...",
    premio: "cornici",
    nomePremio: "Cornici ricamate",
    durataMax: 300,
    gioco: slitta,
    sfondoChiaro: true,
    formatta: (p) => [`🎁 ${Math.floor(p / PESO_REGALO)}`, `${p % PESO_REGALO} m`],
    provvisorio: false,
  },
  { n: 5, nome: "Palle di neve", indizio: "Qualcosa da mettere in testa.", storia: STORIA_PROVVISORIA, premio: "cowboy", nomePremio: "Cappello da cowboy", durataMax: 65, gioco: stelline, provvisorio: true },
];

export const TENTATIVI = 3;

// Gli stessi controlli di private.regole_gioco (per i test con Node)
export const REGOLE_SERVER: Record<number, { durataMin: number; durataMax: number; scoreMax: number; puntiAlSecondo: number }> = {
  1: { durataMin: 1, durataMax: 50, scoreMax: 8000, puntiAlSecondo: 260 },
  2: { durataMin: 2, durataMax: 600, scoreMax: 12000, puntiAlSecondo: 60 },
  3: { durataMin: 2, durataMax: 600, scoreMax: 6000, puntiAlSecondo: 25 },
  4: { durataMin: 3, durataMax: 300, scoreMax: 3000000, puntiAlSecondo: 15000 }, // regali × 10000 + metri
  5: { durataMin: 5, durataMax: 65, scoreMax: 6000, puntiAlSecondo: 160 },
};

// Il punteggio da mostrare: [grande, piccolo] (es. gioco 4 → ["🎁 3", "145 m"])
export function testoPunti(n: number, punteggio: number): [string, string] {
  return GIOCHI[n - 1]?.formatta?.(punteggio) ?? [String(punteggio), ""];
}
