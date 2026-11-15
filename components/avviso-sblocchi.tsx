"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tasto, TitoloRiquadro } from "@/components/ui";

// Pop-up nella pagina del gruppo quando una sezione si sblocca (Santa Chat, calendario dei mini giochi).
// Ogni sblocco si annuncia una volta sola per gruppo (ricordato nel telefono).
const SBLOCCHI = {
  chat: {
    titolo: "La Santa Chat è aperta!",
    testo: "Tutti hanno aperto la busta: ora puoi scrivere in segreto alla persona che hai pescato, e il tuo Babbo Natale può scrivere a te.",
    tasto: "Vai alla Santa Chat",
    pagina: "santa-chat",
  },
  giochi: {
    titolo: "Il calendario dei mini giochi è aperto!",
    testo: "Fino allo scambio ogni giorno c'è un regalo da scartare: un mini gioco con 3 tentativi, la classifica in diretta e un premio per chi vince.",
    tasto: "Apri il calendario",
    pagina: "giochi",
  },
} as const;
type Sblocco = keyof typeof SBLOCCHI;

export function AvvisoSblocchi({ groupId, chatAperta, giochiAperti }: { groupId: string; chatAperta: boolean; giochiAperti: boolean }) {
  const router = useRouter();
  const [mostra, setMostra] = useState<Sblocco | null>(null);
  const chiave = `sblocchi-visti:${groupId}`;

  useEffect(() => {
    let visti: string[] = [];
    try {
      visti = JSON.parse(localStorage.getItem(chiave) ?? "[]");
    } catch {}
    const nuovo = (chatAperta && !visti.includes("chat") ? "chat" : giochiAperti && !visti.includes("giochi") ? "giochi" : null) as Sblocco | null;
    if (!nuovo) return;
    try {
      localStorage.setItem(chiave, JSON.stringify([...visti, nuovo]));
    } catch {}
    // dopo un attimo, così non si sovrappone al caricamento della pagina
    const t = setTimeout(() => setMostra(nuovo), 600);
    return () => clearTimeout(t);
  }, [chiave, chatAperta, giochiAperti]);

  const s = mostra ? SBLOCCHI[mostra] : null;
  return (
    <AnimatePresence>
      {s && (
        <motion.div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/55 px-5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={s.titolo}
            className="feltro w-full max-w-sm p-6 text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            <div className="relative">
              <p className="text-sm text-inchiostro/70">Si è sbloccato qualcosa</p>
              <TitoloRiquadro className="mt-1">{s.titolo}</TitoloRiquadro>
              <p className="mt-3">{s.testo}</p>
              <Tasto
                className="mt-6"
                onClick={() => {
                  setMostra(null);
                  router.push(`/gruppo/${groupId}/${s.pagina}`);
                }}
              >
                {s.tasto}
              </Tasto>
              <Tasto tipo="secondario" className="mt-3" onClick={() => setMostra(null)}>
                Chiudi
              </Tasto>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
