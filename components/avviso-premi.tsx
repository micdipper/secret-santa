"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ACCESSORI, Avatar, CAPELLI_PAZZO, CAPELLI_SUPER, COLORE_NEON, COLORE_OLOGRAFICO, MAGLIONE_GODO, normalizzaLook, type Look } from "@/components/avatar";
import { Tasto, TitoloRiquadro } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";
import { suoni } from "@/lib/suoni";

const NOMI: Record<string, string> = {
  ...Object.fromEntries(ACCESSORI.map((a) => [a.id, a.nome])),
  super: "Taglio Super",
  olografico: "Capelli olografici",
  cuciture: "Cucitura a catenella",
  cornici: "Cornici ricamate",
  neon: "Capelli neon",
  pazzo: "Taglio Esplosione",
  godo: "Maglione GODO",
  cowboy: "Cappello da cowboy",
};

// Le altre parti del sito possono chiedere un controllo subito (es. dopo aver attaccato qualcosa)
export function controllaPremi() {
  window.dispatchEvent(new Event("controlla-premi"));
}

// Segna un premio come già visto (es. annunciato dal pop-up del vincitore dei giochi), così non compare due volte.
// Se su questo telefono non c'è ancora l'elenco, non serve: al primo controllo i premi già vinti non si annunciano.
export async function segnaPremioVisto(premio: string) {
  const { data: s } = await clientSoloBrowser().auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return;
  try {
    const visti = JSON.parse(localStorage.getItem(`premi-visti:${uid}`) ?? "null") as string[] | null;
    if (visti && !visti.includes(premio)) localStorage.setItem(`premi-visti:${uid}`, JSON.stringify([...visti, premio]));
  } catch {}
}

// Pop-up "Hai vinto un premio!": compare appena si sblocca qualcosa.
// Non durante l'apertura della busta (lì si aspetta di tornare indietro), nei mini giochi (lì il premio
// lo annuncia il pop-up del vincitore, components/giochi/annuncio.tsx) né nella sala prove.
// I premi già visti sono ricordati nel telefono.
export function AvvisoPremi() {
  const supabase = clientSoloBrowser();
  const pathname = usePathname();
  const router = useRouter();
  const [premio, setPremio] = useState<{ id: string; look: Look } | null>(null);

  const controlla = useCallback(async () => {
    if (!supabase || pathname.includes("/busta") || pathname.includes("/giochi") || pathname.startsWith("/prove") || pathname.startsWith("/prova") || pathname.startsWith("/stile")) return;
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) return;
    const { data } = await supabase.rpc("my_unlocked_accessories");
    const ora = (data as string[] | null) ?? [];
    const chiave = `premi-visti:${uid}`;
    let visti: string[] | null = null;
    try {
      visti = JSON.parse(localStorage.getItem(chiave) ?? "null");
    } catch {}
    if (!visti) {
      // prima volta su questo telefono: non annuncio quelli già vinti
      try {
        localStorage.setItem(chiave, JSON.stringify(ora));
      } catch {}
      return;
    }
    const nuovo = ora.find((p) => !visti!.includes(p));
    if (!nuovo) return;
    try {
      localStorage.setItem(chiave, JSON.stringify([...visti, nuovo]));
    } catch {}
    const { data: prof } = await supabase.from("profiles").select("look").eq("user_id", uid).maybeSingle();
    const base = normalizzaLook(prof?.look, uid);
    const anteprime: Record<string, Partial<Look>> = {
      super: { capelli: CAPELLI_SUPER, accessori: [] },
      pazzo: { capelli: CAPELLI_PAZZO, accessori: [] },
      olografico: { coloreCapelli: COLORE_OLOGRAFICO, accessori: [] },
      neon: { coloreCapelli: COLORE_NEON, accessori: [] },
      godo: { maglione: MAGLIONE_GODO, accessori: [] },
      cuciture: { cucitura: 1, accessori: [] },
      cornici: { cucitura: 2, accessori: [] },
    };
    const look: Look = { ...base, ...(anteprime[nuovo] ?? { accessori: [nuovo] }) };
    setPremio({ id: nuovo, look });
    suoni.fanfara();
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.4 }, colors: ["#e5481e", "#e9a81c", "#f3e8cf", "#2c4a32"], zIndex: 80 });
  }, [supabase, pathname]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- controllo nel database al cambio di pagina
    controlla();
    const ogni = setInterval(controlla, 20000);
    window.addEventListener("controlla-premi", controlla);
    return () => {
      clearInterval(ogni);
      window.removeEventListener("controlla-premi", controlla);
    };
  }, [controlla]);

  const gruppo = pathname.match(/^\/gruppo\/([^/]+)/)?.[1];

  return (
    <AnimatePresence>
      {premio && (
        <motion.div
          className="!fixed inset-0 !z-[70] flex items-center justify-center bg-inchiostro/60 px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Hai vinto un premio"
        >
          <motion.div
            className="feltro w-full max-w-sm p-6 text-center"
            initial={{ scale: 0.7, y: 40, rotate: -4 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            <div className="relative">
              <p className="text-sm text-inchiostro/70">Hai vinto un premio!</p>
              <TitoloRiquadro className="mt-1">{NOMI[premio.id] ?? "Un premio"}</TitoloRiquadro>
              <span className="toppa mx-auto mt-4 size-32 overflow-hidden">
                <Avatar look={premio.look} className="relative top-[8%] h-full w-full" titolo="Il tuo personaggio col premio" />
              </span>
              <Tasto
                className="mt-6"
                onClick={() => {
                  setPremio(null);
                  router.push(gruppo ? `/gruppo/${gruppo}/guardaroba` : "/");
                }}
              >
                Vai al guardaroba
              </Tasto>
              <Tasto tipo="secondario" className="mt-3" onClick={() => setPremio(null)}>
                Chiudi
              </Tasto>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
