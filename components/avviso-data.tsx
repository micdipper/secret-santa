"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Tasto, TitoloRiquadro } from "@/components/ui";
import { dataBreve, giornoPrima, giorniMancanti, oggiRoma } from "@/lib/date";

// I minigiochi dell'avvento partono 4 giorni prima dello scambio: servono almeno 6 giorni da oggi
// (stessa regola del database, trigger groups_data_e_giochi).
export const GIORNI_MINIMI_GIOCHI = 6;
// Quanti sono i mini giochi (come GIOCHI in lib/giochi/elenco.ts, che qui non si importa: si porterebbe dietro i giochi interi)
export const NUMERO_GIOCHI = 5;

export function dataTroppoVicina(data: string | null) {
  const g = giorniMancanti(data || null);
  return g !== null && g >= 0 && g < GIORNI_MINIMI_GIOCHI;
}

// Il primo giorno che va bene per avere tutti i giochi
function primaDataBuona() {
  return giornoPrima(oggiRoma(), -GIORNI_MINIMI_GIOCHI);
}

// Quanti mini giochi si perdono con questa data (stessa regola del database).
// Oggi è "tutti o niente"; con i giochi in più (blocco E) diventerà quelli dei giorni già passati.
export function giochiPersi(data: string | null): number {
  return dataTroppoVicina(data) ? NUMERO_GIOCHI : 0;
}

// Pop-up: con la data scelta si perdono dei mini giochi (e i doni che si vincono). Si conferma o si cambia.
export function AvvisoDataVicina({
  aperto,
  data,
  onAltraData,
  onContinua,
}: {
  aperto: boolean;
  data: string | null;
  onAltraData: () => void;
  onContinua: () => void;
}) {
  const persi = giochiPersi(data);
  const tutti = persi >= NUMERO_GIOCHI;
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
                <span id="avviso-data-titolo">{tutti ? "Con questa data niente mini giochi" : `Con questa data perdete ${persi} ${persi === 1 ? "gioco" : "giochi"}`}</span>
              </TitoloRiquadro>
              <p className="mt-3">
                I mini giochi dell&apos;avvento sono {NUMERO_GIOCHI}, uno al giorno fino allo scambio.{" "}
                {tutti
                  ? "Con questa data non si potrà giocare a nessuno, e nessuno vincerà i doni che ci sono in palio."
                  : `Con questa data i primi ${persi} non si potranno giocare, e con loro i doni che si vincono.`}
              </p>
              <Tasto className="mt-6" onClick={onAltraData}>
                Scegli un altro giorno
              </Tasto>
              <Tasto tipo="secondario" className="mt-3" onClick={onContinua}>
                Confermo questa data
              </Tasto>
              <p className="mt-4 text-sm text-inchiostro/70">
                Consiglio: se lo scambio è davvero così vicino, imposta comunque una data più in là (dal {dataBreve(primaDataBuona())} in poi), così giocate a
                tutti e {NUMERO_GIOCHI}. Tanto chettefrega.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
