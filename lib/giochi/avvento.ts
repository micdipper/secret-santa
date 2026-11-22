import { leggi, scrivi } from "../memoria.ts";

// Mini giochi dell'avvento: il calendario si apre 5 giorni prima dello scambio (il giorno prima del gioco 1).
// Nella memoria del telefono: quali regali ho già scartato e se ho già visto il benvenuto.
export const GIORNO = 86_400_000;

// Quanti sono i mini giochi e quanti giorni servono da oggi allo scambio per averli (stesse regole del database:
// private.finestra_gioco e il trigger groups_data_e_giochi). Qui e non in elenco.ts, che si porta dietro i giochi interi.
export const NUMERO_GIOCHI = 5;
export const GIORNI_MINIMI_GIOCHI = NUMERO_GIOCHI + 1;

export const aperturaCalendario = (apreGioco1: number) => apreGioco1 - GIORNO;
// giorni che mancano allo scambio (= giorno del gioco 5)
export const giorniAlloScambio = (apreGioco5: number, ora: number) => Math.max(0, Math.ceil((apreGioco5 - ora) / GIORNO));


export const regaliScartati = (gruppo: string) => leggi<number[]>(`avvento-aperti:${gruppo}`, []);
export const segnaScartato = (gruppo: string, n: number) => scrivi(`avvento-aperti:${gruppo}`, [...new Set([...regaliScartati(gruppo), n])]);
export const benvenutoVisto = (gruppo: string) => leggi<boolean>(`avvento-benvenuto:${gruppo}`, false);
export const segnaBenvenuto = (gruppo: string) => scrivi(`avvento-benvenuto:${gruppo}`, true);
