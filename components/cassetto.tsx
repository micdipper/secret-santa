"use client";

// PROVA: il cassetto delle toppe disegnato come un vero cassetto di legno, tirato fuori,
// con le toppe appoggiate in file ordinate, un po' una sull'altra (come scaglie).

import { motion, useReducedMotion } from "framer-motion";
import type { Toppa } from "@/components/toppe";

// inclinazione "a mano" sempre uguale per la stessa toppa
function inclinazione(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 15) - 7;
}

type Posto = { t: Toppa; x: number; y: number; w: number; h: number };

// Dispone le toppe in file: ognuna copre un poco la vicina, ogni fila copre un poco quella sopra.
function disponi(toppe: Toppa[]): { posti: Posto[]; altezza: number } {
  const posti: Posto[] = [];
  const M = 4; // margine dal bordo (unità: larghezza del fondo = 100)
  if (toppe[0]?.tipo === "parola") {
    let x = M;
    let y = M;
    let altaFila = 0;
    for (const t of toppe) {
      const w = Math.min(92, (t.larghezza ?? 46) * 0.92);
      const h = w / t.rapporto;
      if (x + w > 100 - M + 4 && x > M) {
        x = M + (posti.length % 2 ? 6 : 0);
        y += altaFila * 0.72;
        altaFila = 0;
      }
      posti.push({ t, x, y, w, h });
      x += w - 5; // si sovrappongono un poco
      altaFila = Math.max(altaFila, h);
    }
    return { posti, altezza: y + altaFila + M };
  }
  const W = 28;
  const passoX = 21;
  const passoY = W * 0.64;
  toppe.forEach((t, i) => {
    const riga = Math.floor(i / 4);
    const col = i % 4;
    posti.push({ t, x: M + col * passoX + (riga % 2 ? passoX * 0.2 : 0), y: M + riga * passoY, w: W, h: W });
  });
  const righe = Math.ceil(toppe.length / 4);
  return { posti, altezza: M * 2 + (righe - 1) * passoY + W };
}

export function CassettoIllustrato({ toppe, etichetta, onScegli }: { toppe: Toppa[]; etichetta: string; onScegli: (t: Toppa) => void }) {
  const riduci = useReducedMotion();
  const { posti, altezza } = disponi(toppe);
  return (
    <div className="relative mx-auto w-full select-none">
      {/* fianchi e fondo del cassetto, visti un po' dall'alto */}
      <div className="cassetto-legno rounded-t-[22px] px-3 pt-3" style={{ transform: riduci ? undefined : "perspective(900px) rotateX(14deg)", transformOrigin: "50% 100%" }}>
        <div className="cassetto-fondo relative overflow-hidden rounded-t-[12px]" style={{ aspectRatio: `100 / ${altezza}` }}>
          {posti.map(({ t, x, y, w, h }, i) => (
            <motion.button
              key={t.id}
              type="button"
              aria-label={`Attacca: ${t.nome}`}
              onClick={() => onScegli(t)}
              initial={riduci ? false : { opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 26, delay: i * 0.025 }}
              whileHover={riduci ? undefined : { y: -4, scale: 1.04 }}
              whileTap={riduci ? undefined : { scale: 1.1, y: -8 }}
              className="absolute block"
              style={{
                left: `${x}%`,
                top: `${(y / altezza) * 100}%`,
                width: `${w}%`,
                height: `${(h / altezza) * 100}%`,
                rotate: inclinazione(t.id),
                zIndex: i + 1,
                filter: "drop-shadow(0 3px 2px rgba(0,0,0,.45))",
              }}
            >
              {t.disegno()}
            </motion.button>
          ))}
        </div>
      </div>
      {/* frontale con il portaetichette d'ottone e il pomello */}
      <div className="cassetto-frontale relative flex h-20 items-center justify-center gap-5 rounded-b-[22px]">
        <span className="cassetto-ottone flex h-9 items-center rounded-[6px] px-1.5">
          <span className="flex h-6 items-center rounded-[3px] bg-crema px-3 font-titolo text-base leading-none text-abete">{etichetta}</span>
        </span>
        <span className="cassetto-pomello size-9 rounded-full" aria-hidden />
      </div>
    </div>
  );
}
