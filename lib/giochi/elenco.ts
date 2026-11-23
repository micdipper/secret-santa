// I 5 giochi del calendario: nomi, regole, premi e limiti (gli stessi di private.regole_gioco nel database).
import { NUMERO_GIOCHI } from "./avvento.ts";
import type { Gioco } from "./base.ts";
import { calzini } from "./calzini.ts";
import { campanelli } from "./campanelli.ts";
import { intruso } from "./intruso.ts";
import { neve } from "./neve.ts";
import { palline } from "./palline.ts";
import { panettone } from "./panettone.ts";
import { puntale } from "./puntale.ts";
import { regali } from "./regali.ts";
import { renna } from "./renna.ts";
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
};

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
  },
  {
    n: 5,
    nome: "Palle di neve",
    indizio: "Qualcosa da mettere in testa.",
    storia:
      "Gli elfi si affacciano alla finestra per spiarti: tocca dove lanciare e prendili con una palla di neve, ma la palla ci mette un attimo ad arrivare. Gli elfi d'oro e la renna valgono di più. Babbo Natale invece non va colpito: si offende (e ti toglie punti). Hai un minuto.",
    premio: "cowboy",
    nomePremio: "Cappello da cowboy",
    durataMax: 65,
    gioco: neve,
  },
];

// Blocco E (PIANO-GIOCHI.md sezione 10): i giochi nuovi, numerati 6-10 nel database. Per ora solo in sala prove:
// entrano nel calendario vero (e in GIOCHI) col pezzo E4, insieme alla migrazione.
export const GIOCHI_NUOVI: InfoGioco[] = [
  {
    n: 6,
    nome: "Affetta il panettone",
    indizio: "Qualcosa da mettere in testa, ma non un cappello.",
    storia:
      "In cucina gli elfi lanciano in aria panettoni e pandori: striscia il dito per affettarli al volo, più ne prendi con un colpo solo e più punti fai. Non lasciarli ricadere interi... e il carbone non si affetta, si evita.",
    premio: "corna",
    nomePremio: "Cerchietto con le corna di renna",
    durataMax: 50,
    gioco: panettone,
  },
  {
    n: 7,
    nome: "La renna saltatrice",
    indizio: "Per chi ha sempre freddo alle orecchie.",
    storia:
      "Una renna si è persa e corre sui tetti per tornare alla slitta. Tocca lo schermo per farla saltare i comignoli e i vuoti tra le case: più va lontano, più punti fai, e le campanelle in cima ai salti valgono qualcosa in più. Corre sempre più veloce, e basta un comignolo per finire nella neve.",
    premio: "paraorecchie",
    nomePremio: "Paraorecchie di pelo",
    durataMax: 600,
    gioco: renna,
    formatta: (p) => [`${p} m`, ""],
  },
  {
    n: 8,
    nome: "Calzini spaiati",
    indizio: "Qualcosa che si accende quando meno te lo aspetti.",
    storia:
      "La lavatrice degli elfi ha mescolato tutti i calzini della Vigilia. Girane due alla volta e rimetti insieme le coppie: se non sono uguali tornano giù, ricordati dov'erano. Ogni cesto finito ne porta uno più grande, con calzini sempre più simili, e qualche secondo in più. Hai un minuto.",
    premio: "lucine",
    nomePremio: "Maglione con le lucine",
    durataMax: 300,
    gioco: calzini,
  },
  {
    n: 9,
    nome: "Trova l'intruso",
    indizio: "Un colpo di freddo, ma solo in testa.",
    storia:
      "Sull'albero c'è una pallina che non è come le altre: un pelo più chiara, o un pelo più scura. Trovala e toccala. Ogni volta le palline aumentano e l'intrusa si mimetizza meglio. Hai un minuto, e ogni tocco sbagliato ti costa 3 secondi.",
    premio: "brina",
    nomePremio: "Capelli brina",
    durataMax: 65,
    gioco: intruso,
  },
  {
    n: 10,
    nome: "Il puntale",
    indizio: "La tua toppa brillerà.",
    storia:
      "Manca solo la stella in cima all'albero, ma l'albero non sta fermo un attimo. Tieni premuto per caricare il lancio (la carica sale e poi riscende), poi lascia: la stella vola dritta in su e deve arrivare alla cima proprio quando le passa sopra. Hai 10 lanci, e ogni albero ondeggia più del precedente.",
    premio: "cornice_lucine",
    nomePremio: "Cornice di lucine",
    durataMax: 120,
    gioco: puntale,
  },
];

// Qualsiasi gioco dal suo numero nel database (1-5 di oggi, 6-10 nuovi)
export const infoGioco = (n: number) => [...GIOCHI, ...GIOCHI_NUOVI].find((g) => g.n === n);

export const TENTATIVI = 3;

// Gli stessi controlli di private.regole_gioco (per i test con Node)
export const REGOLE_SERVER: Record<number, { durataMin: number; durataMax: number; scoreMax: number; puntiAlSecondo: number }> = {
  1: { durataMin: 1, durataMax: 50, scoreMax: 8000, puntiAlSecondo: 260 },
  2: { durataMin: 2, durataMax: 600, scoreMax: 12000, puntiAlSecondo: 60 },
  3: { durataMin: 2, durataMax: 600, scoreMax: 6000, puntiAlSecondo: 25 },
  4: { durataMin: 3, durataMax: 300, scoreMax: 3000000, puntiAlSecondo: 15000 }, // regali × 10000 + metri
  5: { durataMin: 5, durataMax: 65, scoreMax: 6000, puntiAlSecondo: 160 },
  // blocco E: proposte da scrivere in private.regole_gioco con la migrazione del pezzo E4
  6: { durataMin: 1, durataMax: 50, scoreMax: 4000, puntiAlSecondo: 80 },
  7: { durataMin: 2, durataMax: 600, scoreMax: 15000, puntiAlSecondo: 30 },
  8: { durataMin: 2, durataMax: 300, scoreMax: 15000, puntiAlSecondo: 150 },
  9: { durataMin: 1, durataMax: 65, scoreMax: 5000, puntiAlSecondo: 100 },
  10: { durataMin: 8, durataMax: 120, scoreMax: 2000, puntiAlSecondo: 200 },
};

// Il punteggio da mostrare: [grande, piccolo] (es. gioco 4 → ["🎁 3", "145 m"])
export function testoPunti(n: number, punteggio: number): [string, string] {
  return infoGioco(n)?.formatta?.(punteggio) ?? [String(punteggio), ""];
}

// Il numero dei giochi è scritto anche in avvento.ts (per le pagine che non devono caricare i giochi): devono coincidere
if (GIOCHI.length !== NUMERO_GIOCHI) throw new Error("GIOCHI e NUMERO_GIOCHI (avvento.ts) non coincidono");
