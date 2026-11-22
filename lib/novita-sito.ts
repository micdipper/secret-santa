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
        titolo: "Condividi la tua bacheca",
        testo: "Tocca l'icona del condividi sotto la tela: la tua bacheca e il tuo personaggio diventano un'immagine per le storie, ogni volta impaginata in modo diverso (e se non ti convince, rimescola). Pronta per Instagram, WhatsApp o la galleria.",
      },
      {
        titolo: "Estrazione da rifare?",
        testo: "Qualcuno si è aggiunto all'ultimo o c'era un errore: ora l'organizzatore può rifarla, fino al giorno dello scambio. Le buste si richiudono e la Santa Chat riparte da zero, così nessuno riceve messaggi dal Babbo sbagliato.",
      },
      {
        titolo: "I premi ora si chiamano doni",
        testo: "Così non si confondono coi regali del Secret Santa. E una volta ricevuti restano tuoi per sempre: anche se poi togli qualcosa dalla bacheca, il dono non te lo riprende nessuno.",
      },
      {
        titolo: "Occhio indiscreto?",
        testo: "Sulla card di chi hai pescato c'è un occhio: toccalo e il nome si nasconde. Per quando qualcuno ti sbircia il telefono (magari proprio la persona pescata).",
      },
      {
        titolo: "Date più chiare",
        testo: "Se l'organizzatore sceglie una data troppo vicina, il sito ora dice chiaro quanti mini giochi si perdono.",
      },
      {
        titolo: "Il gruppo non è per sempre",
        testo: "Qualche giorno dopo lo scambio il gruppo sparisce, per fare spazio ai prossimi (il sito è gratis e lo spazio è poco). Una striscia in fondo alla pagina del gruppo ti avvisa per tempo: chiudila pure, domani torna.",
      },
      { titolo: "Bug schiacciati", testo: "Qua e là, come sempre." },
    ],
  },
];
