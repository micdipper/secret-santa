"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Tasto, TitoloRiquadro } from "@/components/ui";
import { dataBreve, giorniMancanti } from "@/lib/date";

// I minigiochi dell'avvento partono 4 giorni prima dello scambio: servono almeno 6 giorni da oggi
// (stessa regola del database, trigger groups_data_e_giochi).
export const GIORNI_MINIMI_GIOCHI = 6;

export function dataTroppoVicina(data: string | null) {
  const g = giorniMancanti(data || null);
  return g !== null && g >= 0 && g < GIORNI_MINIMI_GIOCHI;
}

// Il primo giorno che va bene per avere i giochi
function primaDataBuona() {
  const oggi = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
  return new Date(new Date(`${oggi}T00:00:00Z`).getTime() + GIORNI_MINIMI_GIOCHI * 86_400_000).toISOString().slice(0, 10);
}

// Pop-up: la data scelta è troppo vicina, quindi niente minigiochi. Si sceglie se cambiarla o continuare.
export function AvvisoDataVicina({ aperto, onAltraData, onContinua }: { aperto: boolean; onAltraData: () => void; onContinua: () => void }) {
  return (
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
            aria-labelledby="avviso-data-titolo"
            className="feltro w-full max-w-sm p-6"
            initial={{ scale: 0.85, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className="relative">
              <TitoloRiquadro>
                <span id="avviso-data-titolo">Questa data è troppo vicina</span>
              </TitoloRiquadro>
              <p className="mt-3">
                I minigiochi dell&apos;avvento si sbloccano uno al giorno nei 4 giorni prima dello scambio, e per prepararli serve che la data sia ad almeno{" "}
                {GIORNI_MINIMI_GIOCHI} giorni da oggi (dal {dataBreve(primaDataBuona())} in poi).
              </p>
              <p className="mt-3">Con questa data tu e il tuo gruppo non potrete giocarci.</p>
              <Tasto className="mt-6" onClick={onAltraData}>
                Scegli un&apos;altra data
              </Tasto>
              <Tasto tipo="secondario" className="mt-3" onClick={onContinua}>
                Continua senza minigiochi
              </Tasto>
              <p className="mt-4 text-sm text-inchiostro/70">
                Consiglio: se la data ufficiale è questa, impostane una fittizia (chettefrega), così tu e i bros potete giocare ai minigiochi a prescindere.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
