// Impaginazione delle toppe-parola: la toppa cresce con la parola (e con le righe),
// e se il testo è troppo lungo si rimpicciolisce da solo, così non esce mai dal bordo.
// Le larghezze delle lettere di Basteleur Bold sono state misurate una volta (in "em").

const LETTERE: Record<string, number> = {
  " ": 0.3, a: 0.67, b: 0.72, c: 0.6, d: 0.69, e: 0.59, f: 0.52, g: 0.69, h: 0.79, i: 0.44, j: 0.4, k: 0.75, l: 0.43, m: 1.15, n: 0.8,
  o: 0.65, p: 0.71, q: 0.71, r: 0.62, s: 0.59, t: 0.54, u: 0.78, v: 0.65, w: 0.95, x: 0.69, y: 0.65, z: 0.63,
  A: 0.83, B: 0.79, C: 0.77, D: 0.94, E: 0.77, F: 0.78, G: 0.81, H: 1.02, I: 0.52, J: 0.49, K: 0.92, L: 0.74, M: 1.18, N: 1, O: 0.88,
  P: 0.76, Q: 0.88, R: 0.87, S: 0.77, T: 0.74, U: 0.92, V: 0.89, W: 1.18, X: 0.84, Y: 0.73, Z: 0.8,
  "0": 0.84, "1": 0.65, "2": 0.75, "3": 0.74, "4": 0.75, "5": 0.76, "6": 0.74, "7": 0.67, "8": 0.73, "9": 0.74,
  à: 0.67, è: 0.59, é: 0.59, ì: 0.44, ò: 0.65, ù: 0.78, "'": 0.29, "’": 0.3, "?": 0.66, "!": 0.36, ".": 0.36, ",": 0.3, ":": 0.36,
  ";": 0.36, "(": 0.39, ")": 0.39, "-": 0.42, "+": 0.66, "*": 0.39, '"': 0.4, "#": 0.89, "&": 0.99, "@": 1.08, "/": 0.5, "%": 0.91, "€": 0.9, "…": 0.92,
};

export function larghezzaTesto(testo: string, corpo: number) {
  let em = 0;
  for (const ch of Array.from(testo)) em += LETTERE[ch] ?? (/\p{Extended_Pictographic}/u.test(ch) ? 1.2 : ch.charCodeAt(0) > 0xfe00 ? 0 : 0.75);
  return em * corpo;
}

// piccoli simboli ricamati accanto a qualche parola (poco vistosi)
export type Icona = "stellina" | "fiamma" | "cuore" | "puntini" | "domanda";

export type Riga = { testo: string; piccola?: boolean; icona?: Icona };

export const CORPO = 32; // corpo del testo normale (unità della toppa)
const CORPO_PICCOLO = 15;
const INTERLINEA = 1.2;
const MARGINE_X = 30; // dal bordo al testo (la cucitura sta a 9)
const MARGINE_Y = 21;
export const LARGHEZZA_TESTO_MAX = 300; // oltre, il testo si rimpicciolisce
const LARGHEZZA_MIN = 110;

export type Impaginata = {
  w: number;
  h: number;
  raggio: number;
  corpo: number; // corpo usato per le righe normali (può essere < CORPO)
  righe: { testo: string; corpo: number; y: number; larghezza: number; icona?: Icona }[];
};

const largIcona = (corpo: number) => corpo * 0.62;
const larghezzaRiga = (r: Riga, corpo: number) => larghezzaTesto(r.testo, corpo) + (r.icona ? largIcona(corpo) + corpo * 0.18 : 0);

export function impagina(righe: Riga[]): Impaginata {
  const normali = righe.filter((r) => !r.piccola);
  const piccole = righe.filter((r) => r.piccola);
  // un solo corpo per tutte le righe normali: si rimpicciolisce finché la più lunga ci sta
  const maxN = Math.max(1, ...normali.map((r) => larghezzaRiga(r, CORPO)));
  const corpo = Math.min(CORPO, (CORPO * LARGHEZZA_TESTO_MAX) / maxN);
  const maxP = Math.max(1, ...piccole.map((r) => larghezzaRiga(r, CORPO_PICCOLO)));
  const corpoP = Math.min(CORPO_PICCOLO, (CORPO_PICCOLO * LARGHEZZA_TESTO_MAX) / maxP);

  let y = MARGINE_Y;
  const fuori = righe.map((r) => {
    const c = r.piccola ? corpoP : corpo;
    const alta = c * INTERLINEA;
    const riga = { testo: r.testo, corpo: c, y: y + alta / 2, larghezza: larghezzaRiga(r, c), icona: r.icona };
    y += alta;
    return riga;
  });
  const h = Math.max(80, y + MARGINE_Y);
  // se la toppa è più alta del minimo, centro il blocco di testo
  const scarto = (h - (y + MARGINE_Y)) / 2;
  for (const r of fuori) r.y += scarto;
  const w = Math.max(LARGHEZZA_MIN, Math.max(...fuori.map((r) => r.larghezza)) + MARGINE_X * 2);
  return { w, h, raggio: Math.min(38, h / 2), corpo, righe: fuori };
}

// "riga uno\nriga due" → righe
export const righeDa = (testo: string): Riga[] => testo.split("\n").map((t) => ({ testo: t }));

// Stoffe per le toppe-parola: fondo, cucitura e testo già abbinati (contrasto e colori che stanno bene insieme)
export const STOFFE = {
  vermiglio: { nome: "vermiglio", fondo: "#e5481e", filo: "#f3e8cf", testo: "#f3e8cf" },
  verde: { nome: "verde", fondo: "#2c4a32", filo: "#e9a81c", testo: "#f3e8cf" },
  senape: { nome: "senape", fondo: "#e9a81c", filo: "#2c4a32", testo: "#2c4a32" },
  notte: { nome: "blu notte", fondo: "#24304a", filo: "#e9a81c", testo: "#f3e8cf" },
  rosa: { nome: "rosa", fondo: "#f4a9c4", filo: "#7d3c5a", testo: "#7d3c5a" },
  bordeaux: { nome: "bordeaux", fondo: "#7d3c5a", filo: "#f4a9c4", testo: "#f3e8cf" },
  marrone: { nome: "marrone", fondo: "#5a3520", filo: "#cdb48a", testo: "#f3e8cf" },
  nero: { nome: "nero", fondo: "#1c241d", filo: "#e9a81c", testo: "#f3e8cf" },
  crema: { nome: "crema", fondo: "#f3e8cf", filo: "#e5481e", testo: "#2c4a32" },
  kraft: { nome: "kraft", fondo: "#cdb48a", filo: "#2c4a32", testo: "#1c241d" },
  ghiaccio: { nome: "ghiaccio", fondo: "#a8cbe2", filo: "#24304a", testo: "#24304a" },
} as const;
export type Stoffa = keyof typeof STOFFE;
// quelle tra cui sceglie l'organizzatore: i colori dei fili della bacheca + il crema della tela
export const STOFFE_PERSONALIZZABILI: Stoffa[] = ["vermiglio", "verde", "senape", "notte", "rosa", "bordeaux", "marrone", "nero", "crema"];
