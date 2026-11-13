"use client";

// PROVA: la cassettiera delle toppe. Quattro cassetti (Simboli, Parole, Texture, Foto) che si aprono
// e si chiudono al tocco o con uno swipe; dentro le toppe si possono trascinare e sparpagliare.
// Un tocco senza trascinare = "prendi" la toppa. Sopra il mobile c'è il kit del punto croce.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import type { Toppa } from "@/components/toppe";
import { STOFFE, type Stoffa } from "@/lib/parole";

export type Cassetto = "simbolo" | "parola" | "palette" | "foto";
export type OggettoCassetto = { id: string; nome: string; rapporto: number; larghezza: number; disegno: () => React.ReactNode; conNome: boolean };

const CASSETTI: { id: Cassetto; nome: string; stoffa: Stoffa; altezza: number }[] = [
  { id: "simbolo", nome: "Simboli", stoffa: "vermiglio", altezza: 380 },
  { id: "parola", nome: "Parole", stoffa: "senape", altezza: 330 },
  { id: "palette", nome: "Texture", stoffa: "rosa", altezza: 280 },
  { id: "foto", nome: "Foto", stoffa: "ghiaccio", altezza: 250 },
];

// inclinazione "a mano", sempre uguale per lo stesso oggetto
function inclinazione(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 13) - 6;
}

// Posizione iniziale ordinata: file un po' sovrapposte (x, y in % del fondo del cassetto, angolo in alto a sinistra)
function posizioniIniziali(oggetti: OggettoCassetto[]) {
  const pos: Record<string, { x: number; y: number }> = {};
  // toppe tonde (col nome sotto): 3 per fila, in ordine, con lo spazio per il nome
  if (oggetti[0]?.conNome) {
    oggetti.forEach((o, i) => {
      const fila = Math.floor(i / 3);
      pos[o.id] = { x: 9 + (i % 3) * 31 + (fila % 2 ? 1.5 : 0), y: 5 + fila * (o.larghezza / o.rapporto + 12) };
    });
    return pos;
  }
  // parole e foto: file che si sovrappongono un poco
  let x = 4;
  let y = 6;
  let altaFila = 0;
  oggetti.forEach((o, i) => {
    if (x + o.larghezza > 98 && i > 0) {
      x = 4 + (Math.round(y) % 2 ? 0 : 3);
      y += altaFila;
      altaFila = 0;
    }
    pos[o.id] = { x, y };
    x += o.larghezza * 0.86;
    altaFila = Math.max(altaFila, o.larghezza / o.rapporto - 3);
  });
  return pos;
}

// ---------- il fondo di un cassetto aperto, con gli oggetti trascinabili ----------
function FondoCassetto({ oggetti, altezza, onPrendi }: { oggetti: OggettoCassetto[]; altezza: number; onPrendi: (o: OggettoCassetto) => void }) {
  const fondo = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(() => posizioniIniziali(oggetti));
  const [ordine, setOrdine] = useState<string[]>(() => oggetti.map((o) => o.id));
  const [preso, setPreso] = useState<string | null>(null);
  const gesto = useRef<{ id: string; x0: number; y0: number; px: number; py: number; mosso: boolean } | null>(null);

  // le unità: x in % della larghezza; y in % della larghezza anche lei (così i quadrati restano quadrati)
  const larg = () => fondo.current?.getBoundingClientRect().width ?? 1;

  return (
    <div ref={fondo} className="cassetto-fondo relative h-full w-full overflow-hidden" style={{ containerType: "inline-size" }}>
      {oggetti.map((o) => {
        const p = pos[o.id] ?? { x: 0, y: 0 };
        const z = ordine.indexOf(o.id) + 1;
        // un po' di profondità: più in fondo al cassetto (in alto) = un filo più piccolo
        const profondita = 0.9 + 0.1 * Math.min(1, (p.y * 3.4) / altezza);
        return (
          <motion.button
            key={o.id}
            type="button"
            aria-label={`Prendi: ${o.nome}`}
            className="absolute flex touch-none flex-col items-center select-none"
            style={{ left: `${p.x}%`, top: `${p.y}cqw`, width: `${o.larghezza}%`, zIndex: z }}
            animate={{ scale: (preso === o.id ? 1.12 : 1) * profondita, rotate: inclinazione(o.id) + (preso === o.id ? -4 : 0) }}
            transition={{ type: "spring", stiffness: 600, damping: 26 }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              gesto.current = { id: o.id, x0: e.clientX, y0: e.clientY, px: p.x, py: p.y, mosso: false };
              setOrdine((l) => [...l.filter((x) => x !== o.id), o.id]); // passa sopra agli altri
            }}
            onPointerMove={(e) => {
              const g = gesto.current;
              if (!g || g.id !== o.id) return;
              const dx = e.clientX - g.x0;
              const dy = e.clientY - g.y0;
              if (!g.mosso && Math.hypot(dx, dy) < 6) return;
              g.mosso = true;
              setPreso(o.id);
              const w = larg();
              const maxY = ((altezza - 24) / w) * 100 - o.larghezza / o.rapporto;
              setPos((s) => ({
                ...s,
                [o.id]: {
                  x: Math.max(-4, Math.min(104 - o.larghezza, g.px + (dx / w) * 100)),
                  y: Math.max(0, Math.min(maxY, g.py + (dy / w) * 100)),
                },
              }));
            }}
            onPointerUp={() => {
              const g = gesto.current;
              gesto.current = null;
              setPreso(null);
              if (g && !g.mosso) onPrendi(o);
            }}
            onPointerCancel={() => {
              gesto.current = null;
              setPreso(null);
            }}
          >
            <span className="block w-full" style={{ aspectRatio: String(o.rapporto), filter: `drop-shadow(0 ${preso === o.id ? 8 : 3}px ${preso === o.id ? 6 : 2}px rgba(0,0,0,.45))` }}>
              {o.disegno()}
            </span>
            {o.conNome && <span className="mt-1 line-clamp-2 w-[125%] text-center text-xs leading-tight text-crema/90">{o.nome}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

// ---------- pomello con la targhetta di stoffa ----------
function Pomello({ nome, stoffa }: { nome: string; stoffa: Stoffa }) {
  const s = STOFFE[stoffa];
  return (
    <span className="pointer-events-none relative flex flex-col items-center">
      <span className="cassetto-rosetta flex size-11 items-center justify-center rounded-full">
        <span className="cassetto-pomello size-8 rounded-full" />
      </span>
      {/* filo che lega la targhetta al pomello */}
      <svg className="-my-1 h-4 w-4" viewBox="0 0 16 16" aria-hidden>
        <path d="M8 0c-2 5 2 9 0 16" stroke="#3a2418" strokeWidth="1.4" fill="none" />
      </svg>
      <span className="relative -rotate-3 rounded-full px-4 py-1.5 font-titolo text-base leading-none shadow-[0_2px_3px_rgba(0,0,0,.35)]" style={{ background: s.fondo, color: s.testo }}>
        <span className="absolute inset-[3px] rounded-full border-[1.5px] border-dashed" style={{ borderColor: s.filo }} />
        <span className="relative">{nome}</span>
      </span>
    </span>
  );
}

// ---------- kit del punto croce (sopra il mobile) ----------
function KitPuntoCroce({ onApri }: { onApri: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label="Kit del punto croce: ricama sulla bacheca"
      onClick={onApri}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.94, y: 2 }}
      transition={{ type: "spring", stiffness: 600, damping: 24 }}
      className="relative flex flex-col items-center"
    >
      <svg viewBox="0 0 150 70" className="w-40 drop-shadow-[0_4px_3px_rgba(0,0,0,.4)]" aria-hidden>
        {/* rocchetti di filo */}
        {[
          [14, "#e5481e"],
          [32, "#e9a81c"],
        ].map(([x, c]) => (
          <g key={x as number}>
            <rect x={(x as number) - 7} y="30" width="14" height="4" rx="1.5" fill="#b07a45" />
            <rect x={(x as number) - 6} y="34" width="12" height="26" fill={c as string} />
            {[38, 43, 48, 53].map((y) => (
              <path key={y} d={`M${(x as number) - 6} ${y}h12`} stroke="#000" strokeOpacity=".15" />
            ))}
            <rect x={(x as number) - 7} y="60" width="14" height="4" rx="1.5" fill="#b07a45" />
          </g>
        ))}
        {/* telaio da ricamo con la tela e una stellina a punto croce */}
        <ellipse cx="95" cy="40" rx="34" ry="26" fill="#f6eedb" />
        <ellipse cx="95" cy="40" rx="34" ry="26" fill="none" stroke="#b07a45" strokeWidth="6" />
        <ellipse cx="95" cy="40" rx="37" ry="29" fill="none" stroke="#8a5a2b" strokeWidth="2" />
        <rect x="91" y="8" width="8" height="7" rx="2" fill="#c9ccd1" />
        <g stroke="#2c4a32" strokeWidth="1.6" strokeLinecap="round">
          {[
            [95, 28],
            [95, 34],
            [89, 40],
            [95, 40],
            [101, 40],
            [95, 46],
            [95, 52],
            [83, 40],
            [107, 40],
          ].map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M${x - 2.4} ${y - 2.4}l4.8 4.8M${x + 2.4} ${y - 2.4}l-4.8 4.8`} />
          ))}
        </g>
        {/* ago col filo */}
        <path d="M120 18L136 4" stroke="#8e9298" strokeWidth="2" strokeLinecap="round" />
        <path d="M118 21c-6 8 2 14-6 22" stroke="#e5481e" strokeWidth="1.4" fill="none" />
      </svg>
      <span className="-mt-1 mb-1 text-xs text-crema/90">Punto croce</span>
    </motion.button>
  );
}

// ---------- la cassettiera ----------
export function Cassettiera({
  contenuto,
  fotoCassetto,
  onPrendi,
  onPuntoCroce,
}: {
  contenuto: Record<Exclude<Cassetto, "foto">, OggettoCassetto[]>;
  fotoCassetto: { oggetti: OggettoCassetto[]; scegli: React.ReactNode };
  onPrendi: (o: OggettoCassetto) => void;
  onPuntoCroce: () => void;
}) {
  const riduci = useReducedMotion();
  const [aperto, setAperto] = useState<Cassetto | null>(null);
  const swipe = useRef<{ y: number } | null>(null);

  function tocca(id: Cassetto, dy: number) {
    if (dy > 24) setAperto(id); // giù = tira fuori
    else if (dy < -24) setAperto((a) => (a === id ? null : a)); // su = richiudi
    else setAperto((a) => (a === id ? null : id));
  }

  return (
    <div className="mx-auto w-full">
      {/* il kit sul piano del mobile */}
      <div className="flex justify-end pr-4">
        <KitPuntoCroce onApri={onPuntoCroce} />
      </div>
      <div className="cassettiera-piano relative z-10 h-4 rounded-t-[10px]" />
      <div className="cassettiera-corpo flex flex-col gap-2 px-3 py-3">
        {CASSETTI.map((c) => {
          const aperta = aperto === c.id;
          const oggetti = c.id === "foto" ? fotoCassetto.oggetti : contenuto[c.id];
          return (
            <div key={c.id} className="relative">
              {/* interno del cassetto tirato fuori: si vede dall'alto, le pareti si stringono verso il fondo */}
              <AnimatePresence initial={false}>
                {aperta && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: c.altezza }}
                    exit={{ height: 0 }}
                    transition={riduci ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 44 }}
                    className="relative overflow-hidden"
                  >
                    <div className="absolute inset-0 flex flex-col">
                      <div className="cassetto-parete-fondo h-5 flex-none" />
                      <div className="relative flex-1">
                        <div className="cassetto-pareti absolute inset-0" />
                        <div className="absolute inset-y-0 right-[2%] left-[2%]">
                          {c.id === "foto" && <div className="relative z-[60] px-3 pt-3">{fotoCassetto.scegli}</div>}
                          <div className={c.id === "foto" ? "absolute inset-x-0 top-20 bottom-0" : "absolute inset-0"}>
                            <FondoCassetto key={oggetti.map((o) => o.id).join()} oggetti={oggetti} altezza={c.altezza - (c.id === "foto" ? 100 : 20)} onPrendi={onPrendi} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* frontale: tocco o swipe (giù apre, su chiude) */}
              <motion.button
                type="button"
                aria-expanded={aperta}
                aria-label={`${aperta ? "Chiudi" : "Apri"} il cassetto ${c.nome}`}
                animate={{ y: aperta ? 2 : 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                className={`cassetto-frontale relative flex h-[92px] w-full touch-none items-center select-none justify-center rounded-[10px] ${aperta ? "cassetto-frontale-aperto" : ""}`}
                onPointerDown={(e) => {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  swipe.current = { y: e.clientY };
                }}
                onPointerUp={(e) => {
                  if (!swipe.current) return;
                  const dy = e.clientY - swipe.current.y;
                  swipe.current = null;
                  tocca(c.id, dy);
                }}
                onPointerCancel={() => (swipe.current = null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    tocca(c.id, 0);
                  }
                }}
              >
                <span className="cassetto-bordo-frontale pointer-events-none absolute inset-[6px] rounded-[6px]" />
                <Pomello nome={c.nome} stoffa={c.stoffa} />
              </motion.button>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between px-4">
        <span className="cassettiera-piede h-4 w-8 rounded-b-md" />
        <span className="cassettiera-piede h-4 w-8 rounded-b-md" />
      </div>
    </div>
  );
}

export function oggettoDaToppa(t: Toppa, conNome: boolean): OggettoCassetto {
  const larghezza = t.tipo === "parola" ? Math.min(90, (t.larghezza ?? 46) * 0.95) : 24;
  return { id: t.id, nome: t.nome, rapporto: t.rapporto, larghezza, disegno: t.disegno, conNome };
}
