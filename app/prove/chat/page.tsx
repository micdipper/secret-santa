"use client";

import { useEffect, useRef, useState } from "react";
import { normalizzaLook } from "@/components/avatar";
import { SantaChat, type Messaggio, type Ruolo } from "@/components/santa-chat";
import { Tasto } from "@/components/ui";
import { censuraProva } from "@/lib/prove";
import { suoni } from "@/lib/suoni";

// Sala prove della Santa Chat: l'altra parte risponde da sola con frasi pronte. Non si salva niente.
const DAL_BABBO = [
  "Ho visto la tua bacheca… interessante 👀",
  "Domanda seria: tazza o calzini?",
  "Non dico niente, ma ho già un'idea.",
  "Ti piacciono le cose che fanno rumore? Chiedo per un amico.",
  "Ho detto troppo. Fingi di non aver letto.",
];
const DAL_PESCATO = [
  "Chi sei?? Dammi almeno un indizio",
  "Ok, ora ho un po' paura",
  "Tazza. Sempre tazza.",
  "Ti prego, niente calzini",
  "Sto facendo ipotesi su tutti, sappilo",
];

const LOOK_FINTO = normalizzaLook(null, "giulia-prova");

export default function ProvaChat() {
  const [ruolo, setRuolo] = useState<Ruolo>("pescato");
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const giro = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timer.current.forEach(clearTimeout), []);

  function cambiaParte() {
    timer.current.forEach(clearTimeout);
    setMessaggi([]);
    giro.current = 0;
    setRuolo((r) => (r === "babbo" ? "pescato" : "babbo"));
  }

  async function invia(testo: string) {
    const ora = new Date().toISOString();
    const mio = ruolo === "babbo";
    const coperto = await censuraProva(testo); // stessa regola anti-spoiler dei gruppi veri
    setMessaggi((m) => [...m, { id: `p${Date.now()}`, dal_babbo: mio, testo: coperto, created_at: ora }]);
    const frasi = mio ? DAL_PESCATO : DAL_BABBO;
    const risposta = frasi[giro.current++ % frasi.length];
    timer.current.push(
      setTimeout(() => {
        setMessaggi((m) => [...m, { id: `r${Date.now()}`, dal_babbo: !mio, testo: risposta, created_at: new Date().toISOString() }]);
        suoni.arrivato();
      }, 1400 + Math.random() * 1200),
    );
    return coperto !== testo ? { nota: "Alcuni nomi sono diventati asterischi, per evitare spoiler." } : {};
  }

  return (
    <SantaChat
      ruolo={ruolo}
      nomeAltro="Giulia"
      lookAltro={LOOK_FINTO}
      messaggi={messaggi}
      onInvia={invia}
      indietro="/prove"
      etichettaIndietro="Torna alla sala prove"
      contesto="Sala prove · prova a scrivere Giulia, Marco, Sara, Luca o Anna"
      sopra={
        <Tasto tipo="secondario" type="button" className="mt-6" onClick={cambiaParte}>
          {ruolo === "babbo" ? "Prova come chi riceve" : "Prova come Babbo Natale"}
        </Tasto>
      }
    />
  );
}
