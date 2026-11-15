// I 5 giochi del calendario: nomi, regole, premi e limiti (gli stessi di private.regole_gioco nel database).
// Finché un gioco vero non è pronto si usa il gioco provvisorio "Stelline" (blocchi 3-5 di PIANO-GIOCHI.md).
import type { Gioco } from "./base.ts";
import { campanelli } from "./campanelli.ts";
import { stelline } from "./finto.ts";
import { palline } from "./palline.ts";

export type InfoGioco = {
  n: number;
  nome: string;
  regole: [string, string, string]; // tre righe
  premio: string; // id del premio (unlocked_accessories)
  nomePremio: string;
  durataMax: number; // secondi (serve anche per "sta giocando…")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ogni gioco ha il suo stato
  gioco: Gioco<any>;
  provvisorio: boolean;
};

const REGOLE_PROVVISORIE: [string, string, string] = [
  "Tocca le stelline prima che la cucitura intorno si chiuda.",
  "Ogni stellina vale 10 punti. Hai 20 secondi.",
  "Gioco provvisorio: quello vero arriva presto.",
];

export const GIOCHI: InfoGioco[] = [
  {
    n: 1,
    nome: "Palline al volo",
    regole: ["Tocca le palline dorate prima che cadano sulla neve.", "Ogni dorata persa e ogni carbone toccato costano un cuore: ne hai 3.", "5 dorate di fila alzano il moltiplicatore. La cometa vale 50!"],
    premio: "neon",
    nomePremio: "Capelli neon",
    durataMax: 50,
    gioco: palline,
    provvisorio: false,
  },
  {
    n: 2,
    nome: "Campanelli",
    regole: ["Ascolta i campanelli e ripeti la sequenza toccandoli.", "A ogni giro si aggiunge una nota: più sei veloce, più punti.", "Un errore e finisce. Dal 7° giro i campanelli cambiano posto!"],
    premio: "pazzo",
    nomePremio: "Taglio Esplosione",
    durataMax: 600,
    gioco: campanelli,
    provvisorio: false,
  },
  { n: 3, nome: "Impila i regali", regole: REGOLE_PROVVISORIE, premio: "godo", nomePremio: "Maglione GODO", durataMax: 600, gioco: stelline, provvisorio: true },
  { n: 4, nome: "Slitta slalom", regole: REGOLE_PROVVISORIE, premio: "cornici", nomePremio: "Cornici ricamate", durataMax: 300, gioco: stelline, provvisorio: true },
  { n: 5, nome: "Palle di neve", regole: REGOLE_PROVVISORIE, premio: "cowboy", nomePremio: "Cappello da cowboy", durataMax: 65, gioco: stelline, provvisorio: true },
];

export const TENTATIVI = 3;

// Gli stessi controlli di private.regole_gioco (per i test con Node)
export const REGOLE_SERVER: Record<number, { durataMin: number; durataMax: number; scoreMax: number; puntiAlSecondo: number }> = {
  1: { durataMin: 3, durataMax: 50, scoreMax: 8000, puntiAlSecondo: 260 },
  2: { durataMin: 2, durataMax: 600, scoreMax: 12000, puntiAlSecondo: 60 },
  3: { durataMin: 2, durataMax: 600, scoreMax: 6000, puntiAlSecondo: 25 },
  4: { durataMin: 3, durataMax: 300, scoreMax: 20000, puntiAlSecondo: 120 },
  5: { durataMin: 5, durataMax: 65, scoreMax: 6000, puntiAlSecondo: 160 },
};
