"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

/*
  Il pacchetto regalo del calendario dell'avvento (SVG nostro, stile stoffa del sito).
  Stessa forma e dimensione per tutti e 5: cambia solo la veste (carta, motivo, nastro).
  - "chiuso": col nastro e il fiocco;
  - "apre": il fiocco vola via e i nastri scivolano fuori;
  - "aperto": senza nastro, con la targhetta del numero.
  Il rilievo (cliccabile) o il "disattivato" li decide chi lo usa.
*/
export type FasePacchetto = "chiuso" | "apre" | "aperto";

type Veste = { carta: string; bordo: string; motivo: string; nastro: string; ombraNastro: string; cucitura: string };
const VESTI: Veste[] = [
  { carta: "#e5481e", bordo: "#b8360f", motivo: "#f3e8cf", nastro: "#2c4a32", ombraNastro: "#1e3826", cucitura: "#f3e8cf" }, // stelline
  { carta: "#3f6b48", bordo: "#2c4a32", motivo: "#f3e8cf", nastro: "#e5481e", ombraNastro: "#a8320f", cucitura: "#f3e8cf" }, // pois e crocette
  { carta: "#e9a81c", bordo: "#c18512", motivo: "#e5481e", nastro: "#2c4a32", ombraNastro: "#1e3826", cucitura: "#f3e8cf" }, // zigzag nordico
  { carta: "#f4a9c4", bordo: "#d77d9f", motivo: "#e5481e", nastro: "#e5481e", ombraNastro: "#a8320f", cucitura: "#fbf6ea" }, // punto croce
  { carta: "#7fb3d5", bordo: "#5689ad", motivo: "#fbf6ea", nastro: "#e5481e", ombraNastro: "#a8320f", cucitura: "#fbf6ea" }, // fiocchi di neve
];

function Motivo({ n, colore }: { n: number; colore: string }) {
  switch (n % 5) {
    case 0: // stelline a 4 punte e puntini
      return (
        <g fill={colore}>
          <path d="M6 1.5C6.5 5 7 5.5 10.5 6C7 6.5 6.5 7 6 10.5C5.5 7 5 6.5 1.5 6C5 5.5 5.5 5 6 1.5Z" />
          <path d="M17 12C17.3 14.2 17.8 14.7 20 15C17.8 15.3 17.3 15.8 17 18C16.7 15.8 16.2 15.3 14 15C16.2 14.7 16.7 14.2 17 12Z" />
          <circle cx="16" cy="4" r="1" />
          <circle cx="5" cy="17" r="1" />
        </g>
      );
    case 1: // pois e crocette
      return (
        <g fill={colore} stroke={colore} strokeWidth="1.2" strokeLinecap="round">
          <circle cx="5" cy="5" r="2" stroke="none" />
          <path d="M13.5 13.5l3 3M16.5 13.5l-3 3" />
        </g>
      );
    case 2: // zigzag nordico a righe
      return <path d="M0 7l2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3M0 17l2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3" fill="none" stroke={colore} strokeWidth="1.6" />;
    case 3: // punto croce
      return (
        <g stroke={colore} strokeWidth="1.3" strokeLinecap="round">
          <path d="M3 3l4 4M7 3l-4 4M13 13l4 4M17 13l-4 4" />
        </g>
      );
    default: // fiocchi di neve
      return (
        <g stroke={colore} strokeWidth="1.1" strokeLinecap="round">
          <path d="M6 1.5v9M2.1 3.8l7.8 4.4M2.1 8.2l7.8-4.4" />
          <path d="M16 13v5M13.8 14.2l4.4 2.6M13.8 16.8l4.4-2.6" />
        </g>
      );
  }
}

const centro = { transformBox: "fill-box" as const, transformOrigin: "50% 50%" };

export function Pacchetto({ n, fase, className = "" }: { n: number; fase: FasePacchetto; className?: string }) {
  const id = useId().replace(/:/g, "");
  const v = VESTI[(n - 1) % VESTI.length];
  const riduci = useReducedMotion();
  const via = fase !== "chiuso";
  const durata = riduci ? 0.01 : 1;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <pattern id={`m${id}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <Motivo n={n - 1} colore={v.motivo} />
        </pattern>
      </defs>
      {/* scatola: bordo (il "coperchio" più scuro), carta col motivo, cucitura interna (raggio 16 − 6 = 10) */}
      <rect width="100" height="100" rx="16" fill={v.bordo} />
      <rect x="6" y="6" width="88" height="88" rx="10" fill={v.carta} />
      <rect x="6" y="6" width="88" height="88" rx="10" fill={`url(#m${id})`} opacity=".85" />
      <rect x="3" y="3" width="94" height="94" rx="13" fill="none" stroke={v.cucitura} strokeOpacity=".7" strokeWidth="1.4" strokeDasharray="4 3" />

      {/* nastri: escono scivolando quando il fiocco vola via */}
      <motion.g style={{ ...centro, transformOrigin: "50% 0%" }} initial={false} animate={via ? { scaleY: 0 } : { scaleY: 1 }} transition={{ duration: 0.4 * durata, delay: 0.25 * durata, ease: [0.55, 0, 0.75, 0.3] }}>
        <rect x="41" y="0" width="18" height="100" fill={v.nastro} />
        <path d="M44 0v100M56 0v100" stroke={v.cucitura} strokeOpacity=".75" strokeWidth="1.2" strokeDasharray="3 2.5" />
      </motion.g>
      <motion.g style={{ ...centro, transformOrigin: "100% 50%" }} initial={false} animate={via ? { scaleX: 0 } : { scaleX: 1 }} transition={{ duration: 0.4 * durata, delay: 0.3 * durata, ease: [0.55, 0, 0.75, 0.3] }}>
        <rect x="0" y="41" width="100" height="18" fill={v.nastro} />
        <path d="M0 44h100M0 56h100" stroke={v.cucitura} strokeOpacity=".75" strokeWidth="1.2" strokeDasharray="3 2.5" />
      </motion.g>

      {/* fiocco: due asole, due code e il nodo; si toglie volando in alto */}
      <motion.g
        style={centro}
        initial={false}
        animate={via ? { y: -70, rotate: -24, scale: 1.15, opacity: 0 } : { y: 0, rotate: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 * durata, ease: [0.4, 0, 0.6, 1] }}
      >
        <g transform="translate(50 50) scale(1.3) translate(-50 -50)">
          <path d="M47 52C42 62 38 72 33 80L40 79L43 86C46 76 48 64 50 54Z" fill={v.ombraNastro} />
          <path d="M53 52C58 62 62 72 67 80L60 79L57 86C54 76 52 64 50 54Z" fill={v.ombraNastro} />
          <path d="M48 48C38 30 18 30 20 42C21 52 38 54 48 52Z" fill={v.nastro} />
          <path d="M52 48C62 30 82 30 80 42C79 52 62 54 52 52Z" fill={v.nastro} />
          <path d="M46 48C38 38 27 37 26 42C25 47 36 50 46 50Z" fill={v.ombraNastro} opacity=".55" />
          <path d="M54 48C62 38 73 37 74 42C75 47 64 50 54 50Z" fill={v.ombraNastro} opacity=".55" />
          <path d="M26 42C29 36 38 37 45 46M74 42C71 36 62 37 55 46" fill="none" stroke={v.cucitura} strokeOpacity=".7" strokeWidth="1.1" strokeDasharray="2.5 2" />
          <rect x="43" y="43" width="14" height="13" rx="5" fill={v.nastro} stroke={v.ombraNastro} strokeWidth="1.5" />
        </g>
      </motion.g>

      {/* aperto: la targhetta di stoffa col numero */}
      <motion.g style={centro} initial={false} animate={fase === "aperto" ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 16 }}>
        <circle cx="50" cy="50" r="22" fill="#fbf6ea" />
        <circle cx="50" cy="50" r="18.5" fill="none" stroke="#e5481e" strokeOpacity=".7" strokeWidth="1.3" strokeDasharray="3 2.5" />
        <text x="50" y="51" textAnchor="middle" dominantBaseline="central" className="font-titolo" fontSize="26" fill="#2c4a32">
          {n}
        </text>
      </motion.g>
    </svg>
  );
}
