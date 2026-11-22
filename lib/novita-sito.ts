// Le note degli aggiornamenti del sito ("Novità sotto l'albero"): un pop-up che ognuno vede una volta sola
// per telefono (components/novita-sito.tsx). Per un aggiornamento nuovo si aggiunge una voce IN CIMA
// con una versione nuova (la data va bene). ⚠ Il testo lo conferma sempre Marzia prima del deploy.
// Tono: semplice e simpatico, spiega il perché delle scelte senza dettagli tecnici.

export type NotaSito = { versione: string; voci: { titolo: string; testo: string }[] };

export const NOVITA_SITO: NotaSito[] = [
  {
    versione: "2026-11-23",
    voci: [
      {
        titolo: "I premi ora si chiamano regali",
        testo: "È Natale, dai. E una volta vinti restano tuoi per sempre: anche se poi togli qualcosa dalla bacheca, il regalo non te lo riprende nessuno.",
      },
      {
        titolo: "Occhio indiscreto?",
        testo: "Sulla card di chi hai pescato c'è un occhio: toccalo e il nome si nasconde. Per quando qualcuno ti sbircia il telefono (magari proprio la persona pescata).",
      },
      {
        titolo: "Date più chiare",
        testo: "Se l'organizzatore sceglie una data troppo vicina, il sito ora dice chiaro quanti mini giochi si perdono.",
      },
      { titolo: "Bug schiacciati", testo: "Qua e là, come sempre." },
    ],
  },
];
