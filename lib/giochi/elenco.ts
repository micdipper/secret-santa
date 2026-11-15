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
      "Una raffica di vento ha scosso l'albero e le palline dorate stanno precipitando! Acchiappale con un tocco prima che si rompano sulla neve. Il Grinch ci ha nascosto in mezzo del carbone: non toccarlo, nemmeno quando sfreccia come una meteora, e diffida delle dorate che a metà caduta lampeggiano: sono carbone travestito. Hai 45 secondi e 3 cuori: ne perdi uno per ogni pallina rotta e per ogni carbone toccato. Con 5 prese di fila il bottino vale sempre di più e, se passa la cometa d'oro, non fartela scappare: vale 50!",
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
      'Gli elfi provano il concerto di Natale, ma il direttore ha perso lo spartito: tocca a te. Ascolta la melodia dei campanelli e risuonala uguale, toccandoli nello stesso ordine. A ogni prova gli elfi aggiungono una nota e, dispettosi, ne cambiano una che avevi già sentito: ascolta bene ogni volta! Più sei svelto, più applausi (e punti). Dal 7° giro i campanelli si scambiano di posto: seguili con gli occhi. Basta una stonata, o 5 secondi di silenzio, e il concerto finisce.',
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
      "Il tuo Babbo Natale ha esagerato con gli acquisti e i regali vanno impilati in una torre. Ogni pacco scorre sopra la pila: tocca per appoggiarlo. Quello che sporge si strappa e cade, e il pacco dopo sarà più stretto. Appoggialo preciso al millimetro per un Perfetto, che vale doppio; con tre Perfetti di fila il pacco torna un po' più largo. Più la torre sale, più i pacchi corrono. Se ne manchi uno, la torre è finita.",
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
      "Una bufera di neve ha sparpagliato lungo la pista i regali che il tuo Babbo Natale doveva consegnarti! Salta sulla slitta e recuperali: trascina il dito a destra e a sinistra, dove vuoi sullo schermo, e la slitta ti segue. Schiva abeti, pupazzi di neve e lastre di ghiaccio: basta un urto per ribaltarti. Ogni metro vale un punto e ogni regalo ripreso 25. Più vai avanti, più si corre e più i regali sono rari, nascosti vicino agli ostacoli o in fuga sul ghiaccio. Ma un varco per passare c'è sempre.",
    premio: "cornici",
    nomePremio: "Cornici ricamate",
    durataMax: 300,
    gioco: slitta,
    sfondoChiaro: true,
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
