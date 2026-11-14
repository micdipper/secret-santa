"use client";

// La cassettiera della bacheca (sostituisce il vecchio cassetto col "+" e il tasto del ricamo).
// Sul piano, visto un po' dall'alto, è appoggiato il kit da ricamo: toccandolo si ricama sulla tela.
// Sotto, quattro cassetti (Simboli, Parole, Texture, Foto). Si aprono con un tocco, oppure trascinando
// il frontale: il cassetto segue il dito (giù apre, su chiude).
// Dentro, le toppe si trascinano e si sparpagliano; un tocco senza trascinare = la attacchi alla tela.
// DOPPIO FONDO: le toppe del mio totem e quelle del gruppo stanno sotto un fondo finto; si scopre toccando
// fino a 3 volte l'angolo sollevato in basso a destra (il cassetto trema a ogni tocco). Scoperto una volta,
// non si nasconde più (lo ricorda il telefono).
// Le targhette di stoffa appese ai pomelli dondolano col giroscopio del telefono.

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Toppa } from "@/components/toppe";
import { STOFFE, type Stoffa } from "@/lib/parole";
import { suoni } from "@/lib/suoni";

export type Cassetto = "simbolo" | "parola" | "palette" | "foto";
export type OggettoCassetto = {
  id: string;
  nome: string;
  rapporto: number;
  larghezza: number; // in % della larghezza del fondo
  disegno: () => React.ReactNode;
  conNome: boolean; // il nome compare (in una pillola) solo mentre la trascini
  segno?: "totem" | "gruppo" | "mio"; // toppa del mio totem, del gruppo o creata da me
  nota?: string; // es. "2/5" copie già attaccate
  spento?: boolean;
};
export type ContenutoCassetto = { visibili: OggettoCassetto[]; nascosti: OggettoCassetto[] };

const CASSETTI: { id: Cassetto; nome: string; stoffa: Stoffa }[] = [
  { id: "simbolo", nome: "Simboli", stoffa: "vermiglio" },
  { id: "parola", nome: "Parole", stoffa: "senape" },
  { id: "palette", nome: "Texture", stoffa: "rosa" },
  { id: "foto", nome: "Foto", stoffa: "ghiaccio" },
];

function hash(t: string) {
  let h = 0;
  for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
// inclinazione "a mano", sempre uguale per lo stesso oggetto
const inclinazione = (id: string) => (hash(id) % 13) - 6;

// mescola sempre allo stesso modo (così le toppe non saltano a ogni visita)
export function mescola<T extends { id: string }>(lista: T[]) {
  return [...lista].sort((a, b) => hash(a.id + "~") - hash(b.id + "~"));
}

// Posizioni (x, y in % della larghezza del fondo, angolo in alto a sinistra), a partire dalla riga "da".
// Toppe tonde: 4 per fila, un po' sovrapposte e storte, con piccoli spostamenti; parole: file a scaglie.
function disponi(oggetti: OggettoCassetto[], da = 3) {
  const pos: Record<string, { x: number; y: number }> = {};
  let fine = da;
  if (oggetti[0]?.rapporto === 1) {
    oggetti.forEach((o, i) => {
      const fila = Math.floor(i / 4);
      const h = hash(o.id);
      const x = 3 + (i % 4) * 23 + (fila % 2 ? 4 : 0) + ((h % 7) - 3);
      const y = da + fila * 17 + ((h >> 3) % 5) - 2;
      pos[o.id] = { x: Math.max(0, Math.min(100 - o.larghezza, x)), y: Math.max(0, y) };
      fine = Math.max(fine, pos[o.id].y + o.larghezza);
    });
    return { pos, fine: fine + 3 };
  }
  let x = 4;
  let y = da;
  let altaFila = 0;
  oggetti.forEach((o, i) => {
    if (x + o.larghezza > 98 && i > 0) {
      x = 4 + (Math.round(y) % 2 ? 0 : 3);
      y += altaFila;
      altaFila = 0;
    }
    pos[o.id] = { x, y };
    fine = Math.max(fine, y + o.larghezza / o.rapporto);
    x += o.larghezza * 0.86;
    altaFila = Math.max(altaFila, o.larghezza / o.rapporto - 3);
  });
  return { pos, fine: fine + 4 };
}

// ---------- pillola col nome della toppa (mentre la trascini) ----------
export function PillolaNome({ nome }: { nome: string | null }) {
  return (
    <AnimatePresence>
      {nome && (
        <motion.p
          key="pillola-nome"
          role="status"
          initial={{ opacity: 0, y: 10, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ type: "spring", stiffness: 520, damping: 32 }}
          className="pointer-events-none fixed inset-x-0 bottom-[max(24px,env(safe-area-inset-bottom))] z-[300] mx-auto w-fit max-w-[86vw] rounded-full bg-senape px-4 py-2 text-center text-sm font-semibold text-inchiostro shadow-[0_8px_18px_-6px_rgba(0,0,0,.65)]"
        >
          <span className="pointer-events-none absolute inset-[3px] rounded-full border-[1.5px] border-dashed border-inchiostro/40" />
          <span className="relative">{nome}</span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

// ---------- il fondo di un cassetto aperto, con le toppe trascinabili e il doppio fondo ----------
function FondoCassetto({
  visibili,
  nascosti,
  stoffa,
  onPrendi,
  onNome,
  onScopri,
  onTrema,
}: {
  visibili: OggettoCassetto[];
  nascosti: OggettoCassetto[];
  stoffa: Stoffa;
  onPrendi: (o: OggettoCassetto) => void;
  onNome: (n: string | null) => void;
  onScopri: (ids: string[]) => void;
  onTrema: () => void;
}) {
  const riduci = useReducedMotion();
  const fondo = useRef<HTMLDivElement>(null);
  // prima quelle in vista; quelle del doppio fondo, quando si scoprono, arrivano nelle file sotto
  const [{ pos: iniziali, fine: fineVisibili }] = useState(() => disponi(visibili));
  const [{ pos: inizialiNascosti, fine: fineTutti }] = useState(() => disponi(nascosti, fineVisibili - 1));
  const [pos, setPos] = useState({ ...iniziali, ...inizialiNascosti });
  const [ordine, setOrdine] = useState<string[]>(() => [...visibili, ...nascosti].map((o) => o.id));
  const [preso, setPreso] = useState<string | null>(null);
  const [tocchi, setTocchi] = useState(0); // tocchi sul doppio fondo (3 = si apre)
  const scoperto = tocchi >= 3;
  const gesto = useRef<{ id: string; x0: number; y0: number; px: number; py: number; mosso: boolean } | null>(null);
  const larg = () => fondo.current?.getBoundingClientRect().width ?? 1;
  const oggetti = scoperto ? [...visibili, ...nascosti] : visibili;
  const fine = scoperto || nascosti.length === 0 ? Math.max(fineVisibili, fineTutti) : fineVisibili + 6;
  const legno = STOFFE[stoffa];

  function toccaDoppioFondo() {
    if (scoperto) return;
    const n = tocchi + 1;
    setTocchi(n);
    onTrema();
    suoni.punto();
    if (n >= 3) {
      suoni.toppa();
      navigator.vibrate?.(20);
      setTimeout(() => onScopri(nascosti.map((o) => o.id)), 1400);
    }
  }

  return (
    // contenitore largo quanto il fondo: le misure in cqw (altezza e posizioni) si riferiscono alla sua larghezza
    <div style={{ containerType: "inline-size" }}>
      <motion.div ref={fondo} className="cassetto-fondo relative w-full overflow-hidden" animate={{ height: `${fine}cqw` }} transition={{ type: "spring", stiffness: 300, damping: 34 }}>
        {oggetti.map((o) => {
          const p = pos[o.id] ?? { x: 0, y: 0 };
          const z = ordine.indexOf(o.id) + 1;
          const daSotto = scoperto && nascosti.some((n) => n.id === o.id);
          return (
            <motion.button
              key={o.id}
              type="button"
              aria-label={`Attacca alla tela: ${o.nome}${o.spento ? " (già 5 copie)" : ""}`}
              aria-disabled={o.spento}
              className={`absolute block touch-none select-none ${o.spento ? "opacity-45" : ""}`}
              style={{ left: `${p.x}%`, top: `${p.y}cqw`, width: `${o.larghezza}%`, zIndex: z, aspectRatio: String(o.rapporto) }}
              // quelle del doppio fondo saltano fuori dall'angolo in basso a destra
              initial={daSotto && !riduci ? { opacity: 0, scale: 0.3, x: 120, y: 40 } : false}
              animate={{ opacity: 1, x: 0, y: 0, scale: preso === o.id ? 1.12 : 1, rotate: inclinazione(o.id) + (preso === o.id ? -4 : 0) }}
              transition={{ type: "spring", stiffness: daSotto ? 260 : 600, damping: daSotto ? 18 : 26, delay: daSotto ? 0.25 + (hash(o.id) % 6) * 0.06 : 0 }}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                gesto.current = { id: o.id, x0: e.clientX, y0: e.clientY, px: p.x, py: p.y, mosso: false };
                setOrdine((l) => [...l.filter((x) => x !== o.id), o.id]); // passa sopra alle altre
              }}
              onPointerMove={(e) => {
                const g = gesto.current;
                if (!g || g.id !== o.id) return;
                const dx = e.clientX - g.x0;
                const dy = e.clientY - g.y0;
                if (!g.mosso && Math.hypot(dx, dy) < 6) return;
                if (!g.mosso && o.conNome) onNome(o.nome);
                g.mosso = true;
                setPreso(o.id);
                const w = larg();
                setPos((s) => ({
                  ...s,
                  [o.id]: {
                    x: Math.max(-4, Math.min(104 - o.larghezza, g.px + (dx / w) * 100)),
                    y: Math.max(0, Math.min(fine - o.larghezza / o.rapporto - 1, g.py + (dy / w) * 100)),
                  },
                }));
              }}
              onPointerUp={() => {
                const g = gesto.current;
                gesto.current = null;
                setPreso(null);
                onNome(null);
                if (g && !g.mosso && !o.spento) onPrendi(o);
              }}
              onPointerCancel={() => {
                gesto.current = null;
                setPreso(null);
                onNome(null);
              }}
            >
              <span className="relative block h-full w-full" style={{ filter: `drop-shadow(0 ${preso === o.id ? 8 : 3}px ${preso === o.id ? 6 : 2}px rgba(0,0,0,.45))` }}>
                {o.disegno()}
                {o.segno === "totem" && (
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-senape text-[11px] text-inchiostro shadow" title="Dal tuo totem">
                    ✦
                  </span>
                )}
                {o.segno === "gruppo" && <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full border-2 border-crema bg-rosa shadow" title="Del gruppo" />}
                {o.segno === "mio" && <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full border-2 border-crema bg-ghiaccio shadow" title="Creata da te" />}
                {o.nota && <span className="absolute -bottom-1 -left-1 rounded-full bg-crema px-1.5 text-[11px] leading-4 text-abete shadow">{o.nota}</span>}
              </span>
            </motion.button>
          );
        })}

        {/* il doppio fondo: angolo sollevato in basso a destra (si vede che sotto c'è dell'altro) */}
        {nascosti.length > 0 && (
          <AnimatePresence>
            {!scoperto ? (
              <motion.button
                key="doppio-fondo"
                type="button"
                onClick={toccaDoppioFondo}
                aria-label={`C'è un doppio fondo: toccalo ancora ${3 - tocchi} ${3 - tocchi === 1 ? "volta" : "volte"} per aprirlo`}
                className="absolute right-0 bottom-0 z-[500] h-12 w-28"
                exit={{ opacity: 0, x: 40, y: 20, rotate: 12 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* fessura scura + bordo del pannello, che si solleva un po' di più a ogni tocco */}
                <svg viewBox="0 0 112 48" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
                  <path d={`M4 48L112 ${26 - tocchi * 5}V48Z`} fill="#000" opacity={0.4 + tocchi * 0.1} />
                  <path d={`M4 48L112 ${26 - tocchi * 5}`} stroke={legno.fondo} strokeWidth="4.4" strokeLinecap="round" />
                  <path d={`M10 47L112 ${32 - tocchi * 5}`} stroke="#000" strokeOpacity=".25" strokeWidth="1" />
                </svg>
              </motion.button>
            ) : null}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}

// ---------- targhetta di stoffa appesa al pomello: dondola col giroscopio ----------
function Pomello({ nome, stoffa, gravita, aperta }: { nome: string; stoffa: Stoffa; gravita: MotionValue<number>; aperta: boolean }) {
  const s = STOFFE[stoffa];
  const spinta = useMotionValue(0);
  const obiettivo = useTransform([gravita, spinta] as MotionValue<number>[], ([g, k]: number[]) => g + k);
  const angolo = useSpring(obiettivo, { stiffness: 140, damping: 6, mass: 0.6 });
  const primo = useRef(true);
  // quando il cassetto si apre o si chiude la targhetta prende una spinta e oscilla
  useEffect(() => {
    if (primo.current) {
      primo.current = false;
      return;
    }
    spinta.set(aperta ? 24 : -24);
    const t = setTimeout(() => spinta.set(0), 90);
    return () => clearTimeout(t);
  }, [aperta, spinta]);

  return (
    <span className="pointer-events-none relative flex flex-col items-center">
      <span className="cassetto-rosetta flex size-11 items-center justify-center rounded-full">
        <span className="cassetto-pomello size-8 rounded-full" />
      </span>
      <motion.span className="-mt-3 flex flex-col items-center" style={{ rotate: angolo, transformOrigin: "50% 0" }}>
        {/* filo che lega la targhetta al pomello */}
        <svg className="h-5 w-3" viewBox="0 0 12 20" aria-hidden>
          <path d="M6 0v20" stroke="#3a2418" strokeWidth="1.4" />
        </svg>
        <span className="relative rounded-full px-4 py-1.5 font-titolo text-base leading-none shadow-[0_3px_3px_rgba(0,0,0,.35)]" style={{ background: s.fondo, color: s.testo }}>
          <span className="absolute inset-[3px] rounded-full border-[1.5px] border-dashed" style={{ borderColor: s.filo }} />
          <span className="relative">{nome}</span>
        </span>
      </motion.span>
    </span>
  );
}

// ---------- il piano della cassettiera con il kit da ricamo appoggiato sopra ----------
// Visto un po' dall'alto: il bordo dietro è più stretto di quello davanti; gli oggetti hanno l'ombra sul piano.
function PianoConKit({ onKit }: { onKit: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onKit}
      aria-label="Kit da ricamo: tocca per ricamare sulla tela"
      whileTap={{ scale: 0.985, y: 2 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className="relative block w-full"
    >
      <svg viewBox="0 0 360 134" className="block w-full" aria-hidden>
        <defs>
          <linearGradient id="piano-legno" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a8723f" />
            <stop offset="1" stopColor="#c48b52" />
          </linearGradient>
          <linearGradient id="bordo-legno" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9c6534" />
            <stop offset="1" stopColor="#7d5027" />
          </linearGradient>
          <radialGradient id="ombra-ogg">
            <stop offset="0" stopColor="#000" stopOpacity=".42" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="filo-rosso" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#b8330f" />
            <stop offset=".45" stopColor="#f0663c" />
            <stop offset="1" stopColor="#b8330f" />
          </linearGradient>
          <linearGradient id="filo-senape" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#b37f10" />
            <stop offset=".45" stopColor="#f5c24a" />
            <stop offset="1" stopColor="#b37f10" />
          </linearGradient>
          <linearGradient id="filo-verde" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1e3826" />
            <stop offset=".45" stopColor="#4f7a55" />
            <stop offset="1" stopColor="#1e3826" />
          </linearGradient>
        </defs>

        {/* piano in prospettiva + venature */}
        <path d="M30 36H330L360 118H0Z" fill="url(#piano-legno)" />
        {[52, 66, 82, 100].map((y, i) => (
          <path key={y} d={`M${30 - (y - 36) * 0.366} ${y}H${330 + (y - 36) * 0.366}`} stroke="#000" strokeOpacity={0.05 + i * 0.01} strokeWidth="1" />
        ))}
        <path d="M30 36H330" stroke="#6e4420" strokeWidth="2" />
        {/* bordo davanti del piano (spessore) */}
        <path d="M0 118H360V130Q360 134 356 134H4Q0 134 0 130Z" fill="url(#bordo-legno)" />
        <path d="M0 118.5H360" stroke="#e0aa70" strokeWidth="1.2" />

        {/* puntaspilli a pomodoro, dietro a sinistra */}
        <ellipse cx="66" cy="66" rx="26" ry="6" fill="url(#ombra-ogg)" />
        <path d="M44 56c0-12 10-18 22-18s22 6 22 18c0 7-10 11-22 11s-22-4-22-11z" fill="#d23c17" />
        <path d="M55 41c-2 8-2 18 0 25M66 39v28M77 41c2 8 2 18 0 25" stroke="#9e2a0b" strokeWidth="1.3" fill="none" />
        <path d="M58 41l8-6 8 6-8-2z" fill="#2c4a32" />
        {[
          [52, 46, "#f3e8cf"],
          [62, 42, "#e9a81c"],
          [74, 45, "#24304a"],
          [80, 52, "#f4a9c4"],
        ].map(([x, y, c]) => (
          <g key={`${x}`}>
            <path d={`M${x} ${y}l${(x as number) < 66 ? -5 : 5} -9`} stroke="#8e9298" strokeWidth="1.1" />
            <circle cx={(x as number) + ((x as number) < 66 ? -5 : 5)} cy={(y as number) - 9} r="2.4" fill={c as string} />
          </g>
        ))}

        {/* rocchetti in piedi, dietro a destra */}
        {[
          [236, 60, "url(#filo-rosso)"],
          [262, 64, "url(#filo-senape)"],
          [286, 58, "url(#filo-verde)"],
        ].map(([x, y, f]) => {
          const cx = x as number;
          const base = y as number;
          return (
            <g key={cx}>
              <ellipse cx={cx} cy={base + 2} rx="16" ry="4" fill="url(#ombra-ogg)" />
              <path d={`M${cx - 11} ${base}a11 3 0 0 0 22 0v-3h-22z`} fill="#8a5a2b" />
              <rect x={cx - 9} y={base - 26} width="18" height="24" fill={f as string} />
              {[0, 1, 2, 3, 4].map((k) => (
                <path key={k} d={`M${cx - 9} ${base - 23 + k * 5}h18`} stroke="#000" strokeOpacity=".12" />
              ))}
              <ellipse cx={cx} cy={base - 27} rx="11" ry="3" fill="#b07a45" />
              <ellipse cx={cx} cy={base - 27} rx="3" ry=".9" fill="#5e3a1b" />
            </g>
          );
        })}

        {/* matassina di filo con la fascetta di carta, sdraiata */}
        <ellipse cx="318" cy="96" rx="26" ry="5" fill="url(#ombra-ogg)" />
        <path d="M296 90c6-6 38-6 44 0 2 4-2 8-22 8s-24-4-22-8z" fill="#f4a9c4" />
        <path d="M300 88c8 3 28 3 36 0M300 93c8 3 28 3 36 0" stroke="#d47b9f" strokeWidth="1" fill="none" />
        <path d="M312 86h12l1 11h-14z" fill="#f3e8cf" />
        <path d="M314 90h8" stroke="#e5481e" strokeWidth="1.4" />

        {/* telaio da ricamo appoggiato sul piano (schiacciato dalla prospettiva) */}
        <ellipse cx="160" cy="100" rx="70" ry="14" fill="url(#ombra-ogg)" />
        <ellipse cx="160" cy="94" rx="62" ry="20" fill="#7d5027" />
        <ellipse cx="160" cy="91" rx="62" ry="20" fill="#c48b52" />
        <ellipse cx="160" cy="91" rx="55" ry="16.5" fill="#f6eedb" />
        {/* trama aida, schiacciata */}
        <g stroke="#2c4a32" strokeOpacity=".08" strokeWidth=".6">
          {Array.from({ length: 14 }, (_, i) => (
            <path key={`v${i}`} d={`M${112 + i * 7} 77v28`} />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <path key={`h${i}`} d={`M106 ${80 + i * 5}h108`} />
          ))}
        </g>
        {/* stellina già ricamata a metà */}
        <g stroke="#e5481e" strokeWidth="1.5" strokeLinecap="round">
          {[
            [160, 82],
            [160, 86],
            [154, 90],
            [160, 90],
            [166, 90],
            [148, 90],
            [160, 94],
          ].map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M${x - 2.2} ${y - 1.4}l4.4 2.8M${x + 2.2} ${y - 1.4}l-4.4 2.8`} />
          ))}
        </g>
        {/* l'ago infilato col filo che va verso il rocchetto */}
        <path d="M168 93l22 -10" stroke="#c9ccd1" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M190 83c10-4 18 2 26 -4s16-4 20-8" stroke="#e5481e" strokeWidth="1.1" fill="none" />
        {/* vite del telaio */}
        <rect x="156" y="68" width="8" height="6" rx="1.5" fill="#c9ccd1" />
        <ellipse cx="160" cy="91" rx="62" ry="20" fill="none" stroke="#a8723f" strokeWidth="1" />

        {/* forbicine a cicogna, sdraiate davanti a destra */}
        <ellipse cx="262" cy="110" rx="26" ry="4" fill="url(#ombra-ogg)" />
        <g transform="translate(240 104) rotate(-8)">
          <path d="M0 0c8-4 14-4 18 0M0 4c8 2 14 2 18-1" stroke="#c9931c" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="-5" cy="-1" rx="5" ry="3" fill="none" stroke="#c9931c" strokeWidth="2" />
          <ellipse cx="-5" cy="5" rx="5" ry="3" fill="none" stroke="#c9931c" strokeWidth="2" />
          <path d="M18 0l22 1-22 3z" fill="#d9dde2" />
          <circle cx="17" cy="1.5" r="1.4" fill="#7e560c" />
        </g>

        {/* ditale e bottoni sparsi */}
        <ellipse cx="96" cy="108" rx="10" ry="3" fill="url(#ombra-ogg)" />
        <path d="M88 106v-10a8 3 0 0 1 16 0v10a8 3 0 0 1-16 0z" fill="#c9ccd1" />
        <ellipse cx="96" cy="96" rx="8" ry="3" fill="#e2e5e9" />
        {[0, 1, 2].map((k) => (
          <path key={k} d={`M89 ${99 + k * 3}h14`} stroke="#8e9298" strokeWidth=".8" strokeDasharray="1 1.4" />
        ))}
        {[
          [40, 106, "#e9a81c"],
          [222, 114, "#2c4a32"],
          [126, 70, "#f3e8cf"],
        ].map(([x, y, c]) => (
          <g key={`${x}`}>
            <ellipse cx={x as number} cy={(y as number) + 1.5} rx="7" ry="2.2" fill="#000" opacity=".25" />
            <ellipse cx={x as number} cy={y as number} rx="6" ry="2.6" fill={c as string} />
            <circle cx={(x as number) - 1.4} cy={y as number} r=".7" fill="#000" opacity=".5" />
            <circle cx={(x as number) + 1.4} cy={y as number} r=".7" fill="#000" opacity=".5" />
          </g>
        ))}
      </svg>
    </motion.button>
  );
}


// ---------- un cassetto: interno che segue il dito + frontale col pomello ----------
function UnCassetto({
  c,
  aperto,
  onApri,
  onChiudi,
  gravita,
  interno: disegnaInterno,
}: {
  c: (typeof CASSETTI)[number];
  aperto: boolean;
  onApri: () => void;
  onChiudi: () => void;
  gravita: MotionValue<number>;
  interno: (trema: () => void) => React.ReactNode; // il fondo del cassetto (riceve "fai tremare il cassetto")
}) {
  const riduci = useReducedMotion();
  const interno = useRef<HTMLDivElement>(null);
  const altezza = useMotionValue(0); // quanto è tirato fuori (px)
  const [piena, setPiena] = useState(0); // altezza dell'interno tutto aperto
  const trascina = useRef<{ y0: number; h0: number; mosso: boolean } | null>(null);
  const scossa = useMotionValue(0); // il cassetto trema quando si tocca il doppio fondo
  function trema() {
    if (riduci) return;
    animate(scossa, [0, -4, 4, -3, 3, -1, 0], { duration: 0.36, ease: [0.36, 0, 0.64, 1] });
  }

  // misura l'interno (cambia quando si scopre il doppio fondo o si aggiungono toppe)
  useLayoutEffect(() => {
    const el = interno.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPiena(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // aperto/chiuso dall'esterno (tocco, o un altro cassetto che si apre) e misura che cambia
  useEffect(() => {
    if (trascina.current) return;
    const verso = aperto ? piena : 0;
    if (riduci) altezza.set(verso);
    else animate(altezza, verso, { type: "spring", stiffness: 420, damping: 40 });
  }, [aperto, piena, altezza, riduci]);

  function molla(apri: boolean) {
    if (riduci) altezza.set(apri ? piena : 0);
    else animate(altezza, apri ? piena : 0, { type: "spring", stiffness: 420, damping: 40 });
  }

  return (
    <div className="relative">
      <motion.div style={{ height: altezza }} className="relative overflow-hidden">
        <motion.div ref={interno} style={{ x: scossa }}>
          <div className="cassetto-parete-fondo h-5" />
          <div className="cassetto-pareti px-[2%] pb-1">{disegnaInterno(trema)}</div>
        </motion.div>
      </motion.div>
      {/* frontale: tocco = apri/chiudi; trascinando, il cassetto segue il dito */}
      <button
        type="button"
        aria-expanded={aperto}
        aria-label={`${aperto ? "Chiudi" : "Apri"} il cassetto ${c.nome}`}
        className={`cassetto-frontale relative flex h-[92px] w-full touch-none items-start justify-center rounded-[10px] pt-3 select-none ${aperto ? "cassetto-frontale-aperto" : ""}`}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          altezza.stop();
          trascina.current = { y0: e.clientY, h0: altezza.get(), mosso: false };
        }}
        onPointerMove={(e) => {
          const t = trascina.current;
          if (!t) return;
          const dy = e.clientY - t.y0;
          if (!t.mosso && Math.abs(dy) < 6) return;
          t.mosso = true;
          // segue il dito (con un po' di resistenza oltre il tutto aperto)
          const h = t.h0 + dy;
          altezza.set(h < 0 ? 0 : h > piena ? piena + (h - piena) * 0.15 : h);
        }}
        onPointerUp={() => {
          const t = trascina.current;
          trascina.current = null;
          if (!t) return;
          if (!t.mosso) return aperto ? onChiudi() : onApri();
          const h = altezza.get();
          // basta tirarlo un po' per aprirlo (o spingerlo un po' per chiuderlo)
          const apri = t.h0 < piena / 2 ? h > piena * 0.2 : h > piena * 0.8;
          if (apri) onApri();
          else onChiudi();
          molla(apri);
        }}
        onPointerCancel={() => {
          trascina.current = null;
          molla(aperto);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (aperto) onChiudi();
            else onApri();
          }
        }}
      >
        <span className="cassetto-bordo-frontale pointer-events-none absolute inset-[6px] rounded-[6px]" />
        <Pomello nome={c.nome} stoffa={c.stoffa} gravita={gravita} aperta={aperto} />
      </button>
    </div>
  );
}

// ---------- la cassettiera ----------
export function Cassettiera({
  contenuto,
  azioni,
  foto,
  onPrendi,
  onKit,
  onScopri,
}: {
  contenuto: Record<Exclude<Cassetto, "foto">, ContenutoCassetto>;
  azioni?: Partial<Record<Cassetto, React.ReactNode>>; // es. "crea il tuo simbolo", in cima al cassetto
  foto: React.ReactNode; // cosa c'è nel cassetto delle foto (scegli una foto, link)
  onPrendi: (o: OggettoCassetto) => void;
  onKit: () => void;
  onScopri: (ids: string[]) => void; // doppio fondo aperto: queste toppe ora sono scoperte
}) {
  const riduci = useReducedMotion();
  const [aperto, setAperto] = useState<Cassetto | null>(null);
  const [nome, setNome] = useState<string | null>(null);

  // gravità per le targhette: col telefono inclinato a destra pendono verso sinistra (e viceversa)
  const gravita = useMotionValue(0);
  const chiestoPermesso = useRef(false);
  useEffect(() => {
    if (riduci) return;
    function giroscopio(e: DeviceOrientationEvent) {
      if (e.gamma == null) return;
      gravita.set(Math.max(-40, Math.min(40, -e.gamma)));
    }
    window.addEventListener("deviceorientation", giroscopio);
    return () => window.removeEventListener("deviceorientation", giroscopio);
  }, [gravita, riduci]);
  // su iPhone il giroscopio va chiesto dopo un tocco
  function chiediGiroscopio() {
    if (chiestoPermesso.current) return;
    chiestoPermesso.current = true;
    const D = (globalThis as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (typeof D?.requestPermission === "function") D.requestPermission().catch(() => {});
  }

  return (
    <div className="relative mx-auto w-full select-none" onPointerDownCapture={chiediGiroscopio}>
      {/* suggerimento: il kit si tocca */}
      <div className="pointer-events-none relative flex items-end gap-1 pl-1">
        <p className="max-w-[40%] font-titolo text-sm leading-tight text-senape">Tocca il kit per cominciare a ricamare</p>
        <motion.svg
          viewBox="0 0 40 40"
          className="-mb-6 h-10 w-10 flex-none text-senape"
          aria-hidden
          animate={riduci ? undefined : { y: [0, 4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        >
          <path d="M4 6c14 0 24 8 26 26" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M23 26l7 7 5-9" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </div>

      <PianoConKit onKit={onKit} />

      {/* corpo del mobile: i fianchi più scuri danno lo spessore */}
      <div className="cassettiera-corpo -mt-px flex flex-col gap-2 px-3 py-3">
        {CASSETTI.map((c) => (
          <UnCassetto
            key={c.id}
            c={c}
            aperto={aperto === c.id}
            onApri={() => setAperto(c.id)}
            onChiudi={() => setAperto((a) => (a === c.id ? null : a))}
            gravita={gravita}
            interno={(trema) =>
              c.id === "foto" ? (
                <div className="cassetto-fondo p-4">{foto}</div>
              ) : (
                <>
                  {azioni?.[c.id] && <div className="cassetto-fondo px-3 pt-3">{azioni[c.id]}</div>}
                  <FondoCassetto
                    key={[...contenuto[c.id].visibili, ...contenuto[c.id].nascosti].map((o) => o.id).sort().join()}
                    visibili={contenuto[c.id].visibili}
                    nascosti={contenuto[c.id].nascosti}
                    stoffa={c.stoffa}
                    onPrendi={onPrendi}
                    onNome={setNome}
                    onScopri={onScopri}
                    onTrema={trema}
                  />
                </>
              )
            }
          />
        ))}
      </div>
      <div className="flex justify-between px-4">
        <span className="cassettiera-piede h-4 w-8 rounded-b-md" />
        <span className="cassettiera-piede h-4 w-8 rounded-b-md" />
      </div>
      <p className="mt-3 text-center text-xs text-crema/75">
        <span className="mr-1 inline-flex size-4 items-center justify-center rounded-full bg-senape text-[10px] text-inchiostro">✦</span>
        dal tuo totem
        <span className="mr-1 ml-3 inline-block size-3 rounded-full border-2 border-crema bg-rosa align-[-1px]" />
        del gruppo
        <span className="mr-1 ml-3 inline-block size-3 rounded-full border-2 border-crema bg-ghiaccio align-[-1px]" />
        tua
      </p>
      <PillolaNome nome={nome} />
    </div>
  );
}

export function oggettoDaToppa(t: Toppa, extra: Partial<OggettoCassetto> = {}): OggettoCassetto {
  const parola = t.tipo === "parola";
  const larghezza = parola ? Math.min(90, (t.larghezza ?? 46) * 0.95) : 23;
  return {
    id: t.id,
    nome: t.nome,
    rapporto: t.rapporto,
    larghezza,
    disegno: t.disegno,
    conNome: !parola,
    segno: t.totem ? "totem" : t.personalizzata ? "gruppo" : undefined,
    ...extra,
  };
}
