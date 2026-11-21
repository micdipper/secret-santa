// Sondaggio totem: logica fissa, profili fissi e contenuto predefinito (CLAUDE.md, punto 9ter).

import { PROFILO_FRANCOBOLLO, comprimiRitaglio } from "@/lib/foto";

export type Parametro = "impegno" | "esigenza";
export type Profilo = "IMPEGNO_ALTO_RICEVE_TUTTO" | "IMPEGNO_ALTO_ESIGENTE" | "IMPEGNO_BASSO_RICEVE_TUTTO" | "IMPEGNO_BASSO_ESIGENTE" | "BONUS";
export type Punti = "2" | "1" | "-1" | "-2";

export const PROFILI: Profilo[] = ["IMPEGNO_ALTO_RICEVE_TUTTO", "IMPEGNO_ALTO_ESIGENTE", "IMPEGNO_BASSO_RICEVE_TUTTO", "IMPEGNO_BASSO_ESIGENTE", "BONUS"];

// come si legge ogni profilo (solo per l'organizzatore)
export const SPIEGA_PROFILO: Record<Profilo, string> = {
  IMPEGNO_ALTO_RICEVE_TUTTO: "Si impegna tanto · le va bene tutto",
  IMPEGNO_ALTO_ESIGENTE: "Si impegna tanto · è esigente",
  IMPEGNO_BASSO_RICEVE_TUTTO: "Si impegna poco · le va bene tutto",
  IMPEGNO_BASSO_ESIGENTE: "Si impegna poco · è esigente",
  BONUS: "Bonus: non si capisce (un parametro fa esattamente 0)",
};

export const TOTEM_PREDEFINITI: Record<Profilo, { nome: string; descrizione: string }> = {
  IMPEGNO_ALTO_RICEVE_TUTTO: { nome: "Elfo stakanovista", descrizione: "Dà l'anima per il regalo, e accetta felice anche un sasso." },
  IMPEGNO_ALTO_ESIGENTE: { nome: "L'avvocato", descrizione: "Dà il massimo, e si aspetta lo stesso livello." },
  IMPEGNO_BASSO_RICEVE_TUTTO: {
    nome: "Autogrill core",
    descrizione: "Il regalo lo prende il 24 alle 19:40 in autogrill, ma qualsiasi cosa riceva è felice uguale.",
  },
  IMPEGNO_BASSO_ESIGENTE: { nome: "Grinch con la wishlist", descrizione: "Regala la prima cosa che trova, ma guai a sbagliare il suo." },
  BONUS: { nome: "So cooked", descrizione: "Risposte senza un filo logico, impossibile da decifrare." },
};

export const SLOT: { punti: Punti; etichetta: string }[] = [
  { punti: "2", etichetta: "molto +" },
  { punti: "1", etichetta: "poco +" },
  { punti: "-1", etichetta: "poco −" },
  { punti: "-2", etichetta: "molto −" },
];

export type Domanda = { parametro: Parametro; testo: string; risposte: Record<Punti, string> };

export const DOMANDE_PREDEFINITE: Domanda[] = [
  {
    parametro: "impegno",
    testo: "Ti invitano a cena da amici. Porti…",
    risposte: { "2": "dolce fatto in casa con la decorazione a tema", "1": "un vino scelto pensando a chi c'è", "-1": "patatine prese al volo sotto casa", "-2": "me stess* e la mia simpatia" },
  },
  {
    parametro: "esigenza",
    testo: "Un amico ti cucina una cena, ed è un disastro:",
    risposte: { "-2": "mangio tutto e faccio i complimenti, conta il gesto", "-1": "ridiamo e ordiniamo una pizza", "1": "mangio, ma un consiglio glielo do", "2": "recensione su Google: 2 stelle" },
  },
  {
    parametro: "impegno",
    testo: "Compleanno di un amico. Gli fai gli auguri con…",
    risposte: { "2": "video montaggio con le sue foto peggiori", "1": "un messaggio lungo e sentito", "-1": "\"auguriii 🎉\"", "-2": "un like alla storia di qualcun altro" },
  },
  {
    parametro: "esigenza",
    testo: "Ti arriva un pacco Vinted un po' diverso dalle foto:",
    risposte: { "-2": "me lo tengo, è carino lo stesso", "-1": "finisce in fondo all'armadio, pazienza", "1": "scrivo al venditore per capire", "2": "reso, recensione e screenshot nel gruppo" },
  },
  {
    parametro: "impegno",
    testo: "Organizzi una serata a casa tua:",
    risposte: { "2": "tema, playlist e segnaposto", "1": "pulisco e compro qualcosa di buono", "-1": "ognuno porta qualcosa", "-2": "si ordina su Glovo, i piatti li lava chi perde a carte" },
  },
  {
    parametro: "esigenza",
    testo: "Ti trascinano a vedere un film che non ti ispira:",
    risposte: { "-2": "vado volentieri, conta la compagnia", "-1": "vado, magari mi piace pure", "1": "vado, ma faccio notare che la mia scelta era meglio", "2": "ok, ma la prossima volta scelgo io. E anche la cena" },
  },
];

// stessa regola della funzione submit_quiz nel database (usata solo nella sala prove)
export function profiloDa(impegno: number, esigenza: number): Profilo {
  if (impegno === 0 || esigenza === 0) return "BONUS";
  if (impegno > 0) return esigenza < 0 ? "IMPEGNO_ALTO_RICEVE_TUTTO" : "IMPEGNO_ALTO_ESIGENTE";
  return esigenza < 0 ? "IMPEGNO_BASSO_RICEVE_TUTTO" : "IMPEGNO_BASSO_ESIGENTE";
}

export type TotemGruppo = { profilo: Profilo; nome: string; descrizione: string | null; immagine?: string | null };
export const descrizioneDi = (t: { profilo: Profilo; descrizione: string | null }) => t.descrizione || TOTEM_PREDEFINITI[t.profilo].descrizione;

// Foto del totem: ritaglio a francobollo (stesse proporzioni del riquadro interno, 84×104), JPEG sotto i 50 KB per lo Storage
export const fotoPerFrancobollo = (file: File) => comprimiRitaglio(file, PROFILO_FRANCOBOLLO);
