// Le note degli aggiornamenti del sito ("Novità sotto l'albero"): un pop-up che ognuno vede una volta sola
// per telefono (components/novita-sito.tsx). Per un aggiornamento nuovo si aggiunge una voce IN CIMA
// con una versione nuova (la data va bene). ⚠ Il testo lo conferma sempre Marzia prima del deploy.
// Tono: semplice e simpatico, spiega il perché delle scelte senza dettagli tecnici.

export type NotaSito = { versione: string; voci: { titolo: string; testo: string }[] };

export const NOVITA_SITO: NotaSito[] = [
  {
    versione: "2026-11-23",
    voci: [
      { titolo: "Condividi la tua bacheca", testo: "Diventa un'immagine per le storie, con o senza di te." },
      { titolo: "Estrazione da rifare?", testo: "Ora l'organizzatore può rifarla." },
      { titolo: "Doni", testo: "I premi ora si chiamano così, e restano tuoi per sempre." },
      { titolo: "Occhio", testo: "Sulla card di chi hai pescato: tocca e il nome si nasconde." },
      { titolo: "Fine del Secret Santa", testo: "Una striscia ti avvisa prima che il gruppo sparisca." },
    ],
  },
];
