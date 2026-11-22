"use client";

// Organizza → "Rifai l'estrazione" (per un errore o per chi si aggiunge all'ultimo minuto).
// Pop-up che spiega cosa succede prima di farlo; la regola vera è in public.rifai_estrazione.

import { AnimatePresence, motion } from "framer-motion";
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
      <AnimatePresence>
        {aperto && (
          <motion.div
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/55 px-5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="rifai-titolo"
              className="feltro w-full max-w-sm p-6"
              initial={{ scale: 0.85, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <div className="relative">
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
