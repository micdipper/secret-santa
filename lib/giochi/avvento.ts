import { leggi, scrivi } from "../memoria.ts";

// Mini giochi dell'avvento: il calendario si apre 5 giorni prima dello scambio (il giorno prima del gioco 1).
// Nella memoria del telefono: quali regali ho già scartato e se ho già visto il benvenuto.
export const GIORNO = 86_400_000;

export const aperturaCalendario = (apreGioco1: number) => apreGioco1 - GIORNO;
// giorni che mancano allo scambio (= giorno del gioco 5)
export const giorniAlloScambio = (apreGioco5: number, ora: number) => Math.max(0, Math.ceil((apreGioco5 - ora) / GIORNO));


export const regaliScartati = (gruppo: string) => leggi<number[]>(`avvento-aperti:${gruppo}`, []);
export const segnaScartato = (gruppo: string, n: number) => scrivi(`avvento-aperti:${gruppo}`, [...new Set([...regaliScartati(gruppo), n])]);
export const benvenutoVisto = (gruppo: string) => leggi<boolean>(`avvento-benvenuto:${gruppo}`, false);
export const segnaBenvenuto = (gruppo: string) => scrivi(`avvento-benvenuto:${gruppo}`, true);
