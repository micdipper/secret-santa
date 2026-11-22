"use client";

// Organizza → "Rifai l'estrazione" (per un errore o per chi si aggiunge all'ultimo minuto).
// Pop-up che spiega cosa succede prima di farlo; la regola vera è in public.rifai_estrazione.

import { PopUp } from "@/components/pop-up";
import { useState } from "react";
import { Errore, Tasto, TitoloRiquadro } from "@/components/ui";

export function RifaiEstrazione({ onRifai }: { onRifai: () => Promise<string | null> }) {
  const [aperto, setAperto] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState("");

  async function conferma() {
    setInCorso(true);
    setErrore("");
    const e = await onRifai();
    setInCorso(false);
    if (e) return setErrore(e);
    setAperto(false);
  }

  return (
    <>
      <Tasto tipo="secondario" className="mt-5" onClick={() => setAperto(true)}>
        Rifai l&apos;estrazione
      </Tasto>
      <PopUp aperto={aperto} etichetta="rifai-titolo" tipo="alertdialog">
        <TitoloRiquadro>
          <span id="rifai-titolo">Rifare l&apos;estrazione?</span>
        </TitoloRiquadro>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Chi regala a chi sparisce e le buste si richiudono: ognuno dovrà riaprire la sua.</li>
          <li>La Santa Chat si svuota, così nessuno riceve messaggi dal Babbo sbagliato.</li>
          <li>Il gruppo torna in attesa: il link d&apos;invito torna a funzionare, puoi aggiungere persone ed esclusioni e poi rifare l&apos;estrazione.</li>
          <li>I doni ricevuti restano a tutti.</li>
        </ul>
        {errore && (
          <div className="mt-4">
            <Errore>{errore}</Errore>
          </div>
        )}
        <Tasto className="mt-6" disabled={inCorso} onClick={conferma}>
          {inCorso ? "Un attimo…" : "Sì, rifacciamola"}
        </Tasto>
        <Tasto tipo="secondario" className="mt-3" disabled={inCorso} onClick={() => setAperto(false)}>
          Lascia com&apos;è
        </Tasto>
      </PopUp>
    </>
  );
}
