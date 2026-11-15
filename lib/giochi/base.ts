// Parti comuni dei giochi che NON toccano il browser: tipi, numeri casuali col seme, curve.
// Così la logica di ogni gioco si può provare con Node (test-e2e/giochi-logica.ts).
// (Gli import tra questi file hanno l'estensione .ts: serve a Node per leggerli senza compilare.)
import type { Effetti } from "./motore.ts";

// Un tocco sullo schermo, in pixel CSS rispetto all'area di gioco
export type Tocco = { tipo: "giu" | "muovi" | "su"; id: number; x: number; y: number };

// L'area di gioco: larghezza, altezza e i margini da lasciare liberi (safe area + tasto audio in alto)
export type Mondo = { w: number; h: number; sopra: number; sotto: number };

// Ciò che succede nella partita (colpo, errore…): la logica lo segna, il disegno ne fa particelle e suoni
export type Evento = { tipo: string; x?: number; y?: number; testo?: string; livello?: number };

// Cosa mostrare in alto durante la partita (accanto ai punti; a destra c'è il tasto dell'audio)
export type Hud = { punteggio: number; tempo?: number; vite?: number; viteMax?: number; molt?: number; etichetta?: string };

// Il font dei titoli (Basteleur): il motore lo legge dal CSS all'avvio
export const stile = { fontTitoli: "Georgia, serif" };

/*
  Un gioco = logica pura e deterministica (stesso seme + stessi tocchi = stessa partita)
  + disegno su canvas. La logica non sa niente di schermo, suoni o React.
*/
export interface Gioco<S> {
  crea(seme: number, mondo: Mondo): S;
  // dt è sempre PASSO (passo fisso); i tocchi arrivano solo nel primo passo del fotogramma
  aggiorna(s: S, dt: number, tocchi: readonly Tocco[], mondo: Mondo): void;
  finito(s: S): boolean;
  hud(s: S): Hud;
  eventi(s: S): Evento[]; // il motore li legge e svuota l'elenco
  stats?(s: S): Record<string, number>; // contatori per il controllo del server (piccoli)
  disegna(ctx: CanvasRenderingContext2D, s: S, mondo: Mondo, riduci: boolean): void;
  effetto?(e: Evento, fx: Effetti): void;
}

export const PASSO = 1 / 60;

// Generatore di numeri casuali col seme (mulberry32): numeri tra 0 e 1
export function casuale(seme: number) {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Curve morbide (t tra 0 e 1)
export const curve = {
  lineare: (t: number) => t,
  esceMorbida: (t: number) => 1 - Math.pow(1 - t, 3),
  entraEsce: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  // supera un poco e torna indietro (per gli oggetti che "spuntano")
  rimbalzo: (t: number) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
};

export const limita = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const mescola = (a: number, b: number, t: number) => a + (b - a) * t;
