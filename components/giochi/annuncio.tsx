"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CAPELLI_PAZZO, COLORE_NEON, MAGLIONE_GODO, ToppaAvatar, type Look } from "@/components/avatar";
import { segnaPremioVisto } from "@/components/avviso-premi";
import { Tasto, TitoloRiquadro } from "@/components/ui";
import { GIOCHI } from "@/lib/giochi/elenco";
import { leggi, scrivi } from "@/lib/memoria";
import { suoni } from "@/lib/suoni";

export type Vittoria = { n: number; nome: string; look: Look | null; mio: boolean };

// Il personaggio del vincitore che indossa già il premio
function conPremio(look: Look | null, premio: string): Look | null {
  if (!look) return null;
  if (premio === "neon") return { ...look, coloreCapelli: COLORE_NEON };
  if (premio === "pazzo") return { ...look, capelli: CAPELLI_PAZZO };
  if (premio === "godo") return { ...look, maglione: MAGLIONE_GODO };
  if (premio === "cornici") return { ...look, cucitura: 2 };
  if (premio === "cowboy") return { ...look, accessori: [...look.accessori.filter((a) => a !== "cowboy"), "cowboy"] };
  return look;
}

const chiave = (gruppo: string) => `vincitori-visti:${gruppo}`;
const visti = (gruppo: string) => leggi<number[]>(chiave(gruppo), []);
const segnaVisto = (gruppo: string, n: number) => scrivi(chiave(gruppo), [...new Set([...visti(gruppo), n])]);

/*
  Annuncio del vincitore: quando un gioco si chiude e il vincitore è deciso, la prima volta che si apre
  il calendario o la pagina del gioco compare il pop-up col personaggio che indossa il premio, coriandoli e fanfara.
  Gli annunci già visti sono ricordati nel telefono (vincitori-visti:<gruppo>); gruppo = null (sala prove) = non si ricorda niente.
  Più giochi da annunciare: uno dopo l'altro, dal più vecchio.
*/
export function AnnunciVincitori({ gruppo, vittorie, onFinito }: { gruppo: string | null; vittorie: Vittoria[]; onFinito?: () => void }) {
  const router = useRouter();
  const [chiusi, setChiusi] = useState<number[] | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- memoria del telefono (solo nel browser)
    setChiusi(gruppo ? visti(gruppo) : []);
  }, [gruppo]);

  const ora = chiusi ? [...vittorie].sort((a, b) => a.n - b.n).find((v) => !chiusi.includes(v.n)) : undefined;
  const info = ora ? GIOCHI[ora.n - 1] : null;

  // fanfara e coriandoli quando compare (una volta per annuncio: la pagina si ridisegna ogni secondo)
  const quale = ora ? ora.n : null;
  const mio = !!ora?.mio;
  useEffect(() => {
    if (quale === null) return;
    suoni.fanfara();
    confetti({ particleCount: 110, spread: 90, origin: { y: 0.4 }, colors: ["#e5481e", "#e9a81c", "#f3e8cf", "#2c4a32"], zIndex: 80 });
    // chi ha vinto vede il premio qui: il pop-up "Hai vinto un premio!" non serve più
    if (mio && gruppo) segnaPremioVisto(GIOCHI[quale - 1].premio);
  }, [quale, mio, gruppo]);

  function chiudi() {
    if (!ora) return;
    if (gruppo) segnaVisto(gruppo, ora.n);
    const resto = vittorie.filter((v) => v.n !== ora.n && !chiusi?.includes(v.n));
    setChiusi((c) => [...(c ?? []), ora.n]);
    if (!resto.length) onFinito?.();
  }

  return (
    <AnimatePresence>
      {ora && info && (
        <motion.div
          key={ora.n}
          className="!fixed inset-0 !z-[70] flex items-center justify-center bg-inchiostro/60 px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Vincitore del gioco ${ora.n}`}
        >
          <motion.div
            className="feltro w-full max-w-sm p-6 text-center"
            initial={{ scale: 0.7, y: 40, rotate: -4 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            <div className="relative">
              <p className="text-sm text-inchiostro/70">
                Gioco {ora.n} · {info.nome}
              </p>
              <TitoloRiquadro className="mt-1">{ora.mio ? "Hai vinto tu!" : `Ha vinto ${ora.nome}!`}</TitoloRiquadro>
              <motion.span
                className="mt-4 inline-flex"
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 11, delay: 0.15 }}
              >
                <ToppaAvatar look={conPremio(ora.look, info.premio)} dimensione={128} nome={ora.nome} />
              </motion.span>
              <p className="mt-4">
                {ora.mio ? "Il dono è tuo:" : "Si porta a casa:"}{" "}
                <span className="etichetta-stoffa bg-senape font-titolo text-inchiostro">{info.nomePremio}</span>
              </p>
              {ora.mio ? (
                <>
                  <Tasto
                    className="mt-6"
                    onClick={() => {
                      chiudi();
                      router.push(gruppo ? `/gruppo/${gruppo}/guardaroba` : "/prove/personaggio");
                    }}
                  >
                    Vai al guardaroba
                  </Tasto>
                  <Tasto tipo="secondario" className="mt-3" onClick={chiudi}>
                    Chiudi
                  </Tasto>
                </>
              ) : (
                <Tasto className="mt-6" onClick={chiudi}>
                  Complimenti!
                </Tasto>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
