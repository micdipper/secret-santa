// Toppe ricamate per la bacheca: disegnate da noi in SVG, originali.
// Ogni toppa ha un tipo (simbolo, parola, palette) e un rapporto larghezza/altezza.
// Alcune toppe arrivano dal TOTEM (le vede nel cassetto solo chi ha quel totem),
// altre le crea l'organizzatore per il suo gruppo (toppaPersonalizzata).
// "ritirata" = non compare più nel cassetto, ma resta disegnata dove era già attaccata.

import type { ReactNode } from "react";
import type { Profilo } from "@/lib/totem";
import { STOFFE, impagina, larghezzaTesto, righeDa, type Icona, type Riga, type Stoffa } from "@/lib/parole";
import { FILI, VUOTO } from "@/lib/ricamo";

export type TipoToppa = "simbolo" | "parola" | "palette";
export type Toppa = {
  id: string;
  tipo: TipoToppa;
  nome: string;
  rapporto: number;
  totem?: Profilo;
  ritirata?: boolean;
  personalizzata?: boolean;
  larghezza?: number; // larghezza naturale (solo parole), per attaccarle alla misura giusta
  disegno: () => ReactNode;
};

const C = {
  abete: "#2c4a32", verm: "#e5481e", crema: "#f3e8cf", feltro: "#f1e4c8", senape: "#e9a81c", rosa: "#f4a9c4", kraft: "#cdb48a",
  notte: "#24304a", ink: "#1c241d", bianco: "#fbf6ea", pelle: "#e3a47c", pelleScura: "#c98a63", grigio: "#8e9298", grigioScuro: "#6f737a",
  argento: "#c9ccd1", ghiaccio: "#a8cbe2", bordeaux: "#7d3c5a", marrone: "#5a3520", legno: "#8a6a45", capelli: "#3a2418", tela: "#f6eedb",
};

// ---------- forme di base ----------
function Rotonda({ fondo, filo, children }: { fondo: string; filo: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <circle cx="50" cy="50" r="48" fill={fondo} />
      <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeOpacity=".12" strokeWidth="2" />
      <circle cx="50" cy="50" r="42" fill="none" stroke={filo} strokeWidth="2.4" strokeDasharray="5 4" strokeLinecap="round" />
      {children}
    </svg>
  );
}

// Tiene un disegno dentro il cerchio della toppa (dentro la cucitura).
function Ritaglio({ id, children, r = 39 }: { id: string; children: ReactNode; r?: number }) {
  return (
    <>
      <clipPath id={`trama-${id}`}>
        <circle cx="50" cy="50" r={r} />
      </clipPath>
      <g clipPath={`url(#trama-${id})`}>{children}</g>
    </>
  );
}

// stellina a 4 punte (la nostra firma), centrata in x,y
function Stellina({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const k = r * 0.28;
  return <path d={`M${x} ${y - r}L${x + k} ${y - k}L${x + r} ${y}L${x + k} ${y + k}L${x} ${y + r}L${x - k} ${y + k}L${x - r} ${y}L${x - k} ${y - k}z`} fill={fill} />;
}

// piccoli simboli accanto alle parole, disegnati in un quadrato 10×10
const ICONE: Record<Icona, ReactNode> = {
  stellina: <path d="M5 0l1.3 3.7L10 5 6.3 6.3 5 10 3.7 6.3 0 5l3.7-1.3z" />,
  fiamma: <path d="M5 0c1.2 3 4.5 4.2 4.5 7.2A4.5 3.6 0 0 1 .5 7.2c0-2 1.1-3.2 2.2-4.2.3 1.5.9 2.1 1.5 2.3C3.9 3.6 4.2 1.7 5 0z" />,
  cuore: <path d="M5 9.2C2 7.2 0 5.4 0 3.3 0 1.6 1.3.4 2.8.4c1 0 1.8.6 2.2 1.5C5.4 1 6.2.4 7.2.4 8.7.4 10 1.6 10 3.3c0 2.1-2 3.9-5 5.9z" />,
  puntini: (
    <>
      <circle cx="1.4" cy="7.6" r="1.4" />
      <circle cx="5" cy="7.6" r="1.4" opacity=".7" />
      <circle cx="8.6" cy="7.6" r="1.4" opacity=".4" />
    </>
  ),
  domanda: <path d="M3 3.2C3 1.6 4 .6 5.4.6S8 1.7 8 3c0 2-2.2 2.2-2.2 4h-1.4c0-2.6 2.2-2.8 2.2-4 0-.7-.5-1.1-1.2-1.1S4.2 2.4 4.2 3.2zM4.4 8.3h1.6v1.4H4.4z" />,
};

// Toppa-parola: la misura segue il testo (vedi lib/parole.ts)
export function ToppaParola({ righe, stoffa, senzaTesto = false }: { righe: Riga[]; stoffa: Stoffa; senzaTesto?: boolean }) {
  const s = STOFFE[stoffa];
  const L = impagina(righe);
  return (
    <svg viewBox={`0 0 ${L.w} ${L.h}`} width="100%" height="100%" aria-hidden>
      <rect x="2" y="2" width={L.w - 4} height={L.h - 4} rx={L.raggio - 2} fill={s.fondo} />
      <rect x="2" y="2" width={L.w - 4} height={L.h - 4} rx={L.raggio - 2} fill="none" stroke="#000" strokeOpacity=".12" strokeWidth="2" />
      <rect x="9" y="9" width={L.w - 18} height={L.h - 18} rx={L.raggio - 9} fill="none" stroke={s.filo} strokeWidth="2.4" strokeDasharray="6 5" strokeLinecap="round" />
      {!senzaTesto &&
        L.righe.map((r, i) => {
          const largT = larghezzaTesto(r.testo, r.corpo);
          const x0 = (L.w - r.larghezza) / 2;
          const lato = r.corpo * 0.62;
          return (
            <g key={i} fill={s.testo}>
              {r.testo && (
                <text
                  x={x0}
                  y={r.y + r.corpo * 0.04}
                  dominantBaseline="central"
                  textLength={largT}
                  lengthAdjust="spacingAndGlyphs"
                  style={{ fontFamily: "var(--font-basteleur), Georgia, serif", fontSize: r.corpo }}
                >
                  {r.testo}
                </text>
              )}
              {r.icona && (
                <g transform={`translate(${x0 + largT + r.corpo * 0.18} ${r.y - lato / 2 - r.corpo * 0.06}) scale(${lato / 10})`}>{ICONE[r.icona]}</g>
              )}
            </g>
          );
        })}
    </svg>
  );
}

// ---------- il lupo che ulula (bianco o grigio), girato a sinistra, muso in su ----------
function Lupo({ pelo, ombra, petto }: { pelo: string; ombra: string; petto: string }) {
  return (
    <g>
      {/* coda appoggiata a terra */}
      <path d="M66 81c8 2 15-1 16-8-4 3-9 4-15 3z" fill={ombra} />
      <path
        d="M24 18L37 24L41 22L44 10L49 23C53 26 57 30 58 36C62 44 64 50 68 58C73 64 74 74 70 80L68 84L38 84C36 84 36 81 38 80L41 70C40 62 39 56 38 50L34 44L31 35L24 27L31 25.5L25 20.6Z"
        fill={pelo}
      />
      {/* petto chiaro, zampa posteriore, orecchio */}
      <path d="M31 35l3 9 4 6c1 6 2 12 3 20l-2 10c3 0 5-4 5-10 0-9-2-18-5-25-2-5-5-9-8-10z" fill={petto} />
      <path d="M56 84c-1-9 3-16 11-18" stroke={ombra} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M45 14l2 7" stroke={ombra} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M50 28c2 3 4 5 7 6M52 34c2 2 4 3 6 3" stroke={ombra} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="38.6" cy="27" r="1.3" fill={C.ink} />
      <circle cx="24.8" cy="18.9" r="1.5" fill={C.ink} />
    </g>
  );
}
const LUPO_BIANCO = { pelo: "#f3efe6", ombra: "#b9bcc1", petto: "#ffffff" };
const LUPO_GRIGIO = { pelo: C.grigio, ombra: C.grigioScuro, petto: "#b4b7bc" };

function CieloStellato() {
  return (
    <>
      <Stellina x={72} y={26} r={3} fill={C.senape} />
      <Stellina x={22} y={44} r={2.2} fill={C.crema} />
      <Stellina x={78} y={56} r={2} fill={C.crema} />
    </>
  );
}

// Le parole su una tela larga 100: una parola da una riga e 220 di larghezza diventa larga 46.
const SCALA_PAROLA = 46 / 220;

// ---------- catalogo ----------
export const CATALOGO: Toppa[] = [
  // ===== Simboli per tutti =====
  {
    id: "tazza", tipo: "simbolo", nome: "Cioccolata calda", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.verm} filo={C.crema}>
        <path d="M38 34c-3-5 3-7 0-12M50 33c-3-5 3-7 0-12M62 34c-3-5 3-7 0-12" fill="none" stroke={C.crema} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M28 44h40v17a15 15 0 0 1-15 15H43a15 15 0 0 1-15-15z" fill={C.crema} />
        <path d="M68 48h4a8 8 0 0 1 0 16h-5" fill="none" stroke={C.crema} strokeWidth="4.4" />
        <ellipse cx="48" cy="44" rx="20" ry="4.6" fill="#6b3a22" />
        <rect x="36" y="38.5" width="8" height="7" rx="2" transform="rotate(-12 40 42)" fill={C.bianco} />
        <rect x="47" y="37.5" width="8" height="7" rx="2" transform="rotate(10 51 41)" fill={C.rosa} />
        <rect x="55" y="40" width="7" height="6" rx="2" transform="rotate(-6 58 43)" fill={C.bianco} />
        <path d="M31 58h34" stroke={C.verm} strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
        {[36, 44, 52, 60].map((x) => (
          <path key={x} d={`M${x} 62l3 4 3-4`} fill="none" stroke={C.abete} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Rotonda>
    ),
  },
  {
    id: "fuoco", tipo: "simbolo", nome: "Fuoco del camino", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.abete} filo={C.senape}>
        <path d="M50 22c6 12 18 18 18 34a18 18 0 0 1-36 0c0-9 5-14 9-18 1 6 3 9 6 10-1-10 0-18 3-26z" fill={C.verm} />
        <path d="M50 46c4 6 9 9 9 16a9 9 0 0 1-18 0c0-5 4-8 9-16z" fill={C.senape} />
        <path d="M32 76h36" stroke={C.kraft} strokeWidth="5" strokeLinecap="round" />
      </Rotonda>
    ),
  },
  {
    id: "luna", tipo: "simbolo", nome: "Luna", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.notte} filo={C.senape}>
        <path d="M58 26a26 26 0 1 0 14 40 22 22 0 0 1-14-40z" fill={C.senape} />
        <path d="M70 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={C.crema} />
      </Rotonda>
    ),
  },
  {
    id: "stella", tipo: "simbolo", nome: "Stella nordica", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.crema} filo={C.verm}>
        <path d="M50 18l7 15 15-7-7 15 15 7-15 7 7 15-15-7-7 15-7-15-15 7 7-15-15-7 15-7-7-15 15 7z" fill={C.verm} />
        <circle cx="50" cy="50" r="6" fill={C.crema} />
      </Rotonda>
    ),
  },
  {
    id: "neve", tipo: "simbolo", nome: "Fiocco di neve", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.abete} filo={C.crema}>
        <g stroke={C.crema} strokeWidth="4" strokeLinecap="round">
          {[0, 60, 120].map((r) => (
            <g key={r} transform={`rotate(${r} 50 50)`}>
              <path d="M50 24v52M50 32l-7-6M50 32l7-6M50 68l-7 6M50 68l7 6" fill="none" />
            </g>
          ))}
        </g>
      </Rotonda>
    ),
  },
  {
    id: "foglia", tipo: "simbolo", ritirata: true, nome: "Rametto", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.feltro} filo={C.abete}>
        <path d="M28 72C40 56 56 40 74 28" stroke={C.abete} strokeWidth="4" fill="none" strokeLinecap="round" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(${34 + i * 10} ${66 - i * 10})`}>
            <ellipse cx="-6" cy="-6" rx="8" ry="4" transform="rotate(-50)" fill={C.abete} />
            <ellipse cx="6" cy="2" rx="8" ry="4" transform="rotate(20)" fill={C.abete} />
          </g>
        ))}
        <circle cx="70" cy="62" r="5" fill={C.verm} />
        <circle cx="62" cy="70" r="4" fill={C.verm} />
      </Rotonda>
    ),
  },
  {
    id: "gomitolo", tipo: "simbolo", nome: "Gomitolo", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.rosa} filo={C.abete}>
        <circle cx="48" cy="50" r="22" fill={C.verm} />
        <g stroke={C.crema} strokeWidth="2.5" fill="none" strokeOpacity=".8">
          <path d="M30 42c10 8 26 8 36 0M28 52c12 10 28 10 40 0M34 64c8-12 8-26 0-36M48 72c6-14 6-30 0-44" />
        </g>
        <path d="M66 62c8 4 6 14 14 14" stroke={C.verm} strokeWidth="3" fill="none" strokeLinecap="round" />
      </Rotonda>
    ),
  },
  {
    id: "cuore", tipo: "simbolo", ritirata: true, nome: "Cuore folk", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.feltro} filo={C.verm}>
        <path d="M50 76C34 64 24 54 24 42c0-8 6-14 13-14 6 0 10 3 13 8 3-5 7-8 13-8 7 0 13 6 13 14 0 12-10 22-26 34z" fill={C.verm} />
        <path d="M50 66c-1-8 0-16 0-24" stroke={C.crema} strokeWidth="2.5" />
        <ellipse cx="44" cy="48" rx="5" ry="2.5" transform="rotate(35 44 48)" fill={C.crema} />
        <ellipse cx="56" cy="48" rx="5" ry="2.5" transform="rotate(-35 56 48)" fill={C.crema} />
      </Rotonda>
    ),
  },
  {
    id: "uccellino", tipo: "simbolo", ritirata: true, nome: "Uccellino", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.senape} filo={C.abete}>
        <path d="M34 58c0-10 8-16 18-16 3-7 8-10 13-10s9 4 9 8c0 4-2 6-4 8 1 2 1 4 1 6 0 8-8 12-18 12s-19-2-19-8z" fill={C.abete} />
        <path d="M34 58L18 44l5-1 13 13z" fill={C.abete} />
        <path d="M74 38l7 2-7 3z" fill={C.verm} />
        <circle cx="67" cy="38" r="2" fill={C.crema} />
        <path d="M42 58c5-5 12-6 18-3-4 1-8 3-10 7-2-3-4-4-8-4z" fill={C.crema} />
      </Rotonda>
    ),
  },
  {
    id: "regalo", tipo: "simbolo", nome: "Pacchetto", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.abete} filo={C.crema}>
        <rect x="28" y="42" width="44" height="32" rx="3" fill={C.verm} />
        <rect x="25" y="34" width="50" height="10" rx="3" fill={C.verm} />
        <path d="M50 34v40" stroke={C.senape} strokeWidth="6" />
        <path d="M50 34c-10-12-20-4-12 0zM50 34c10-12 20-4 12 0z" fill={C.senape} />
      </Rotonda>
    ),
  },

  {
    id: "oreo", tipo: "simbolo", nome: "Christmas oreo", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.bordeaux} filo={C.rosa}>
        <path d="M29 58c-3-17 6-28 21-28s24 11 21 28c-2-5-4-9-6-11H35c-2 2-4 6-6 11z" fill={C.capelli} />
        <circle cx="30.5" cy="54" r="3.6" fill={C.pelle} />
        <circle cx="69.5" cy="54" r="3.6" fill={C.pelle} />
        <circle cx="50" cy="52" r="19" fill={C.pelle} />
        {/* cappello di Natale */}
        <path d="M31 36Q35 13 55 13Q70 14 75 31L70 33Q66 22 59 22Q65 27 67 36Z" fill={C.verm} />
        <rect x="28" y="32" width="44" height="9" rx="4.5" fill={C.bianco} />
        <circle cx="74" cy="32" r="5" fill={C.bianco} />
        {/* occhi verso chi guarda */}
        <ellipse cx="43" cy="49" rx="3.4" ry="3.1" fill={C.bianco} />
        <ellipse cx="57" cy="49" rx="3.4" ry="3.1" fill={C.bianco} />
        <circle cx="43" cy="49.4" r="1.9" fill={C.ink} />
        <circle cx="57" cy="49.4" r="1.9" fill={C.ink} />
        <path d="M39 44.5q4-2 7 0M54 44.5q4-2 7 0" stroke={C.capelli} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="37" cy="57" r="3.4" fill={C.verm} opacity=".3" />
        <circle cx="63" cy="57" r="3.4" fill={C.verm} opacity=".3" />
        {/* il tubo di biscotti in bocca */}
        <path d="M44 61.5q6-2.5 12 0" stroke="#b5604a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <rect x="23" y="61" width="54" height="11" rx="5.5" fill="#2f5fb3" />
        <rect x="27" y="63" width="46" height="2" rx="1" fill="#6f95dc" />
        <path d="M34 67.5h6M60 67.5h6" stroke={C.bianco} strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
        <ellipse cx="24.5" cy="66.5" rx="3.2" ry="5.5" fill="#2a1d18" />
        <ellipse cx="25" cy="66.5" rx="3" ry="1.2" fill={C.bianco} />
        <path d="M44 72q6 2.5 12 0" stroke="#b5604a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </Rotonda>
    ),
  },
  {
    id: "cappello", tipo: "simbolo", nome: "Cappello di Natale", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.ghiaccio} filo={C.verm}>
        <path d="M27 64C30 42 42 26 60 24c10-1 17 6 19 16l-8 2c-2-6-6-8-10-6 4 6 6 16 6 28z" fill={C.verm} />
        <path d="M61 36c3 7 4 15 4 28h-6c0-12-1-20-4-26z" fill="#b8330f" opacity=".45" />
        <rect x="22" y="60" width="56" height="14" rx="7" fill={C.bianco} />
        {[27, 35, 43, 51, 59, 67, 74].map((x) => (
          <g key={x} fill={C.bianco}>
            <circle cx={x} cy="61" r="3.4" />
            <circle cx={x} cy="73" r="3.4" />
          </g>
        ))}
        <circle cx="76" cy="44" r="7" fill={C.bianco} />
        <path d="M27 67h46" stroke={C.argento} strokeWidth="1.4" strokeDasharray="2 3" strokeLinecap="round" />
      </Rotonda>
    ),
  },

  // ===== Simboli dei totem =====
  // Impegno alto · va bene tutto
  {
    id: "aa-portatile", tipo: "simbolo", nome: "Portatile", rapporto: 1, totem: "IMPEGNO_ALTO_RICEVE_TUTTO",
    disegno: () => (
      <Rotonda fondo={C.senape} filo={C.abete}>
        <rect x="26" y="27" width="48" height="35" rx="3.5" fill="#3a3f45" />
        <rect x="29.5" y="30.5" width="41" height="28" rx="1.5" fill={C.ghiaccio} />
        <path d="M34 37h17M34 42h26M34 47h12" stroke={C.notte} strokeWidth="2" strokeLinecap="round" />
        <rect x="34" y="51" width="22" height="3.4" rx="1.7" fill={C.bianco} />
        <rect x="34" y="51" width="15" height="3.4" rx="1.7" fill={C.verm} />
        <path d="M18 64h64l-5 9H23z" fill={C.argento} />
        <rect x="42" y="66" width="16" height="3" rx="1.5" fill={C.grigio} />
      </Rotonda>
    ),
  },
  {
    id: "aa-sudato", tipo: "simbolo", nome: "Faccia sudata che ammicca", rapporto: 1, totem: "IMPEGNO_ALTO_RICEVE_TUTTO",
    disegno: () => (
      <Rotonda fondo={C.abete} filo={C.senape}>
        <circle cx="28.5" cy="56" r="4" fill={C.pelle} />
        <circle cx="71.5" cy="56" r="4" fill={C.pelle} />
        <path d="M28 52c0-14 9-24 22-24s22 10 22 24v6c0 12-10 20-22 20S28 70 28 58z" fill={C.pelle} />
        {/* barba di due giorni lungo la mascella */}
        <path d="M30 60c2 10 10 17 20 17s18-7 20-17c-3 5-6 6-8 6-3 4-7 5-12 5s-9-1-12-5c-2 0-5-1-8-6z" fill="#b97a55" opacity=".55" />
        {/* ciuffo */}
        <path d="M28 50c-1-13 8-22 21-22 11 0 20 6 22 17-5-6-11-7-16-6 2-3 1-6-1-7-3 5-13 9-26 18z" fill={C.capelli} />
        {/* sopracciglio alzato e occhio a mezz'asta, l'altro fa l'occhiolino */}
        <path d="M36 44.5q5-4 11-1.5" stroke={C.capelli} strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <circle cx="42" cy="51.5" r="2.6" fill={C.ink} />
        <path d="M38.4 50.2q3.6-2.4 7.2 0" stroke={C.pelleScura} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M54 51q4.5 3 9 0" stroke={C.ink} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M54 46q5-1 9 1" stroke={C.capelli} strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <path d="M49 55l-1.6 5h2.6" stroke={C.pelleScura} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* mezzo sorriso */}
        <path d="M44 65q7 3 13-2.4" stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M57 62.6l1.4-1" stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" />
        {/* gocce di sudore sulla tempia */}
        <path d="M70 40c2 4 4 6 4 8.5a4 4 0 0 1-8 0c0-2.5 2-4.5 4-8.5z" fill={C.ghiaccio} />
        <path d="M74 52c1.4 2.6 2.6 4 2.6 5.6a2.6 2.6 0 0 1-5.2 0c0-1.6 1.2-3 2.6-5.6z" fill={C.ghiaccio} />
        <circle cx="68.6" cy="47" r="1" fill={C.bianco} />
      </Rotonda>
    ),
  },
  {
    id: "aa-capra", tipo: "simbolo", nome: "Capra", rapporto: 1, totem: "IMPEGNO_ALTO_RICEVE_TUTTO",
    disegno: () => (
      <Rotonda fondo={C.verm} filo={C.crema}>
        <path d="M39 35c-5-9-14-11-19-5 6-1 10 1 14 8zM61 35c5-9 14-11 19-5-6-1-10 1-14 8z" fill={C.legno} />
        <ellipse cx="28" cy="45" rx="10" ry="4.4" transform="rotate(-18 28 45)" fill="#e3dccb" />
        <ellipse cx="72" cy="45" rx="10" ry="4.4" transform="rotate(18 72 45)" fill="#e3dccb" />
        <ellipse cx="28" cy="45.5" rx="6" ry="2" transform="rotate(-18 28 45)" fill={C.rosa} />
        <ellipse cx="72" cy="45.5" rx="6" ry="2" transform="rotate(18 72 45)" fill={C.rosa} />
        <path d="M36 36c4-4 24-4 28 0 4 8 2 22-2 32-3 8-8 12-12 12s-9-4-12-12c-4-10-6-24-2-32z" fill="#efe7d6" />
        <path d="M44 34c2 4 4 5 6 5s4-1 6-5" fill="#e3dccb" />
        <ellipse cx="42" cy="51" rx="4.4" ry="3.4" fill={C.senape} />
        <ellipse cx="58" cy="51" rx="4.4" ry="3.4" fill={C.senape} />
        <rect x="39.2" y="50.2" width="5.6" height="1.8" rx=".9" fill={C.ink} />
        <rect x="55.2" y="50.2" width="5.6" height="1.8" rx=".9" fill={C.ink} />
        <path d="M44 70q6 4 12 0" stroke={C.ink} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <circle cx="46.5" cy="65" r="1.2" fill={C.ink} />
        <circle cx="53.5" cy="65" r="1.2" fill={C.ink} />
        <path d="M45 78l5 10 5-10z" fill="#efe7d6" />
      </Rotonda>
    ),
  },
  {
    id: "aa-lupo", tipo: "simbolo", nome: "Lupo bianco", rapporto: 1, totem: "IMPEGNO_ALTO_RICEVE_TUTTO",
    disegno: () => (
      <Rotonda fondo={C.notte} filo={C.senape}>
        <CieloStellato />
        <g transform="translate(2 1)">
          <Lupo {...LUPO_BIANCO} />
        </g>
      </Rotonda>
    ),
  },

  // Impegno alto · esigente
  {
    id: "ae-martelletto", tipo: "simbolo", nome: "Martelletto", rapporto: 1, totem: "IMPEGNO_ALTO_ESIGENTE",
    disegno: () => (
      <Rotonda fondo={C.senape} filo={C.abete}>
        <ellipse cx="50" cy="76" rx="22" ry="5" fill={C.marrone} />
        <rect x="30" y="68" width="40" height="8" rx="3" fill={C.marrone} />
        <ellipse cx="50" cy="68" rx="20" ry="4" fill="#7a4f2a" />
        <g transform="rotate(-35 50 44)">
          <rect x="46.5" y="44" width="7" height="30" rx="3.5" fill="#7a4f2a" />
          <rect x="30" y="28" width="40" height="17" rx="4.5" fill={C.marrone} />
          <rect x="35" y="28" width="4" height="17" fill={C.crema} />
          <rect x="61" y="28" width="4" height="17" fill={C.crema} />
          <rect x="30" y="29.5" width="40" height="3" rx="1.5" fill="#fff" opacity=".18" />
        </g>
        <path d="M22 60l5-2M24 66l6 0M74 58l5-3" stroke={C.abete} strokeWidth="2" strokeLinecap="round" />
      </Rotonda>
    ),
  },
  {
    id: "ae-gioielli", tipo: "simbolo", nome: "Bracciale e collana", rapporto: 1, totem: "IMPEGNO_ALTO_ESIGENTE",
    disegno: () => (
      <Rotonda fondo={C.bordeaux} filo={C.rosa}>
        <path d="M27 20c4 18 13 26 23 26s19-8 23-26" stroke={C.senape} strokeWidth="1.2" fill="none" />
        {Array.from({ length: 11 }, (_, i) => {
          const t = Math.PI * (0.04 + (0.92 * i) / 10);
          return <circle key={i} cx={50 - 23 * Math.cos(t)} cy={20 + 26 * Math.sin(t)} r="3.3" fill={C.bianco} />;
        })}
        <path d="M50 47l5 7-5 8-5-8z" fill={C.senape} />
        <path d="M50 50l2.4 4-2.4 4" fill="none" stroke="#fff" strokeWidth="1" opacity=".6" />
        <ellipse cx="58" cy="74" rx="13" ry="6.5" fill="none" stroke={C.senape} strokeWidth="3.6" strokeDasharray="3.2 1.4" />
        <path d="M70 77c2 2 1 5-2 5" stroke={C.senape} strokeWidth="1.4" fill="none" />
        <circle cx="67" cy="83" r="2.2" fill={C.rosa} />
        <Stellina x={30} y={68} r={3.4} fill={C.bianco} />
      </Rotonda>
    ),
  },
  {
    id: "ae-unghie", tipo: "simbolo", nome: "Mano con lo smalto", rapporto: 1, totem: "IMPEGNO_ALTO_ESIGENTE",
    disegno: () => (
      <Rotonda fondo={C.notte} filo={C.rosa}>
        <g transform="rotate(-14 50 58)">
          <path d="M33 53h33v16c0 9-7 16-16.5 16S33 78 33 69z" fill={C.pelle} />
          {[
            [34, 31, 26],
            [42, 24, 33],
            [50, 26, 31],
            [58, 32, 25],
          ].map(([x, y, h]) => (
            <g key={x}>
              <rect x={x} y={y} width="7.6" height={h + 4} rx="3.8" fill={C.pelle} />
              <rect x={x + 1.3} y={y + 1.3} width="5" height="8" rx="2.5" fill={C.verm} />
              <rect x={x + 2.2} y={y + 2.4} width="1.3" height="3.4" rx=".6" fill="#fff" opacity=".7" />
            </g>
          ))}
          <path d="M34 62c-6-1-11-6-10-11 2-3 6-2 9 2l4 4z" fill={C.pelle} />
          <path d="M42 56v6M50 56v6M58 57v5" stroke={C.pelleScura} strokeWidth="1.2" strokeLinecap="round" />
        </g>
        <Stellina x={25} y={30} r={5} fill={C.senape} />
        <Stellina x={76} y={30} r={3.6} fill={C.bianco} />
        <Stellina x={79} y={58} r={4.4} fill={C.senape} />
        <Stellina x={22} y={68} r={2.8} fill={C.bianco} />
      </Rotonda>
    ),
  },
  {
    id: "ae-imprenditore", tipo: "simbolo", nome: "Imprenditore col giusto mindset", rapporto: 1, totem: "IMPEGNO_ALTO_ESIGENTE",
    disegno: () => (
      <Rotonda fondo={C.crema} filo={C.verm}>
        <path d="M18 60l14-10 9 6 20-22" stroke={C.verm} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M58 29l10-3-2 10z" fill={C.verm} />
        <path d="M27 92c0-16 10-25 23-25s23 9 23 25z" fill={C.notte} />
        <path d="M44 67l6 11 6-11z" fill={C.bianco} />
        <path d="M48.4 69h3.2l1.6 11-3.2 3.4-3.2-3.4z" fill={C.verm} />
        <path d="M36 72l8 10M64 72l-8 10" stroke="#161e30" strokeWidth="2" />
        <rect x="45" y="58" width="10" height="10" rx="4" fill={C.pelleScura} />
        <circle cx="50" cy="50" r="13" fill={C.pelle} />
        <path d="M37 49c-1-10 5-15 13-15 9 0 14 5 13 12-5-5-14-5-26 3z" fill={C.capelli} />
        <rect x="39.5" y="47" width="9.4" height="5.4" rx="2" fill={C.ink} />
        <rect x="51.1" y="47" width="9.4" height="5.4" rx="2" fill={C.ink} />
        <path d="M48.9 48.6h2.2" stroke={C.ink} strokeWidth="1.4" />
        <path d="M41 48.4h3" stroke="#fff" strokeWidth="1" opacity=".5" strokeLinecap="round" />
        <path d="M45 57q5 3.4 10 0" stroke={C.ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </Rotonda>
    ),
  },

  // Impegno basso · va bene tutto
  {
    id: "ba-pugno", tipo: "simbolo", nome: "Pugno chiuso", rapporto: 1, totem: "IMPEGNO_BASSO_RICEVE_TUTTO",
    disegno: () => (
      <Rotonda fondo={C.verm} filo={C.crema}>
        <rect x="40" y="58" width="21" height="30" fill={C.crema} />
        <rect x="37" y="74" width="27" height="6" rx="2" fill={C.senape} />
        <rect x="31" y="27" width="38" height="34" rx="9" fill={C.crema} />
        <path d="M40.5 27v13M50 27v13M59.5 27v13" stroke={C.verm} strokeWidth="2" strokeLinecap="round" />
        <path d="M31 45h22c3.6 0 3.6 7 0 7H33" fill={C.crema} stroke={C.verm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Rotonda>
    ),
  },
  {
    id: "ba-shaka", tipo: "simbolo", nome: "Mano che fa 🤙", rapporto: 1, totem: "IMPEGNO_BASSO_RICEVE_TUTTO",
    disegno: () => (
      <Rotonda fondo={C.abete} filo={C.crema}>
        <g transform="rotate(-12 50 54)">
          <rect x="41" y="60" width="18" height="28" fill={C.pelle} />
          <rect x="39" y="78" width="22" height="6" rx="2" fill={C.verm} />
          <rect x="31" y="18" width="9.4" height="28" rx="4.7" transform="rotate(-30 36 44)" fill={C.pelle} />
          <rect x="58" y="55" width="25" height="8.6" rx="4.3" transform="rotate(22 60 59)" fill={C.pelle} />
          <rect x="33" y="37" width="31" height="29" rx="10" fill={C.pelle} />
          <path d="M40 45h19M40 51.5h19M40 58h16" stroke={C.pelleScura} strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <path d="M24 70q-4-4 0-8M78 34q4 4 0 8" stroke={C.senape} strokeWidth="2" fill="none" strokeLinecap="round" />
      </Rotonda>
    ),
  },
  {
    id: "ba-bradipo", tipo: "simbolo", nome: "Bradipo", rapporto: 1, totem: "IMPEGNO_BASSO_RICEVE_TUTTO",
    disegno: () => (
      <Rotonda fondo={C.ghiaccio} filo={C.notte}>
        <path d="M12 32q38-10 76 0" stroke={C.marrone} strokeWidth="5" fill="none" strokeLinecap="round" />
        <ellipse cx="24" cy="26" rx="5" ry="2.4" transform="rotate(-25 24 26)" fill={C.abete} />
        <ellipse cx="76" cy="26" rx="5" ry="2.4" transform="rotate(25 76 26)" fill={C.abete} />
        <path d="M39 30c-3 7-3 15 1 22M61 30c3 7 3 15-1 22" stroke={C.legno} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M36 27.5l1.6 4M40 27l1 4.4M60 27l-1 4.4M64 27.5l-1.6 4" stroke={C.ink} strokeWidth="1.4" strokeLinecap="round" />
        <ellipse cx="50" cy="64" rx="15" ry="17" fill={C.legno} />
        <circle cx="50" cy="52" r="11.5" fill="#d9c09a" />
        <ellipse cx="45" cy="51" rx="4" ry="2.6" transform="rotate(-20 45 51)" fill={C.marrone} />
        <ellipse cx="55" cy="51" rx="4" ry="2.6" transform="rotate(20 55 51)" fill={C.marrone} />
        <circle cx="45.4" cy="51" r="1.2" fill={C.bianco} />
        <circle cx="54.6" cy="51" r="1.2" fill={C.bianco} />
        <ellipse cx="50" cy="55.6" rx="2" ry="1.4" fill={C.ink} />
        <path d="M46.5 58.6q3.5 2.4 7 0" stroke={C.ink} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M42 78c-1 4-1 6 1 7M58 78c1 4 1 6-1 7" stroke={C.legno} strokeWidth="5" fill="none" strokeLinecap="round" />
        <text x="66" y="46" fontSize="8" fill={C.notte} style={{ fontFamily: "var(--font-basteleur), Georgia, serif" }}>z</text>
        <text x="71" y="40" fontSize="6" fill={C.notte} style={{ fontFamily: "var(--font-basteleur), Georgia, serif" }}>z</text>
      </Rotonda>
    ),
  },
  {
    id: "ba-cartello", tipo: "simbolo", nome: "Cartello di protesta", rapporto: 1, totem: "IMPEGNO_BASSO_RICEVE_TUTTO",
    disegno: () => (
      <Rotonda fondo={C.notte} filo={C.senape}>
        <rect x="47.5" y="50" width="5" height="36" rx="1.5" fill={C.legno} />
        <g transform="rotate(-6 50 40)">
          <rect x="22" y="24" width="56" height="32" rx="3" fill={C.crema} />
          <text x="50" y="41.5" textAnchor="middle" dominantBaseline="central" fontSize="22" fill={C.verm} style={{ fontFamily: "var(--font-basteleur), Georgia, serif" }}>
            NO!
          </text>
        </g>
        <circle cx="50" cy="56" r="1.6" fill={C.grigio} />
      </Rotonda>
    ),
  },

  // Impegno basso · esigente
  {
    id: "be-lupetto", tipo: "simbolo", nome: "Lupetto grigio col cartellino", rapporto: 1, totem: "IMPEGNO_BASSO_ESIGENTE",
    disegno: () => (
      <Rotonda fondo={C.rosa} filo={C.bordeaux}>
        <path d="M22 80l6-28c2-8 7-12 14-12h16c7 0 12 4 14 12l6 28-10 2-2-20-2 22H36l-2-22-2 20z" fill={C.grigio} />
        {[40, 45, 50, 55, 60].map((x) => (
          <path key={x} d={`M${x} 46v34`} stroke={C.grigioScuro} strokeWidth="1.1" opacity=".55" />
        ))}
        <rect x="36" y="78" width="28" height="5" rx="2" fill={C.grigioScuro} />
        <rect x="38" y="24" width="24" height="20" rx="7" fill={C.grigio} />
        <path d="M40 29h20M40 33h20M40 37h20" stroke={C.grigioScuro} strokeWidth="1.3" />
        {/* il cartellino del reso */}
        <path d="M61 30c6 2 9 8 9 15" stroke={C.ink} strokeWidth="1" fill="none" />
        <g transform="rotate(14 72 54)">
          <path d="M66 45h12v18H66z" fill={C.kraft} />
          <circle cx="72" cy="48.5" r="1.4" fill={C.rosa} />
          <path d="M68.6 55h6.8M68.6 59h4.4" stroke={C.verm} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </Rotonda>
    ),
  },
  {
    id: "be-scontrino", tipo: "simbolo", nome: "Scontrino", rapporto: 1, totem: "IMPEGNO_BASSO_ESIGENTE",
    disegno: () => (
      <Rotonda fondo={C.abete} filo={C.crema}>
        <g transform="rotate(7 50 50)">
          <path d="M33 20h34v58l-4.25 4-4.25-4-4.25 4-4.25-4-4.25 4-4.25-4-4.25 4L33 78z" fill={C.bianco} />
          <path d="M40 27h20" stroke={C.ink} strokeWidth="2.4" strokeLinecap="round" />
          {[35, 40, 45, 50, 55].map((y, i) => (
            <g key={y}>
              <path d={`M38 ${y}h${10 + ((i * 5) % 9)}`} stroke={C.grigio} strokeWidth="1.6" strokeLinecap="round" />
              <path d={`M56 ${y}h6`} stroke={C.grigio} strokeWidth="1.6" strokeLinecap="round" />
            </g>
          ))}
          <path d="M38 61h24" stroke={C.ink} strokeWidth="1" strokeDasharray="2 2" />
          <path d="M38 67h9M54 67h8" stroke={C.ink} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M40 73h3M45 73h1.4M48 73h3M53 73h1.4M56 73h3" stroke={C.ink} strokeWidth="2.2" />
        </g>
      </Rotonda>
    ),
  },
  {
    id: "be-lupo", tipo: "simbolo", nome: "Lupo grigio", rapporto: 1, totem: "IMPEGNO_BASSO_ESIGENTE",
    disegno: () => (
      <Rotonda fondo={C.notte} filo={C.senape}>
        <CieloStellato />
        <g transform="translate(2 1)">
          <Lupo {...LUPO_GRIGIO} />
        </g>
      </Rotonda>
    ),
  },
  {
    id: "be-iphone", tipo: "simbolo", nome: "iPhone duo", rapporto: 1, totem: "IMPEGNO_BASSO_ESIGENTE",
    disegno: () => (
      <Rotonda fondo={C.verm} filo={C.crema}>
        <g transform="rotate(-14 42 52)">
          <rect x="29" y="25" width="27" height="52" rx="6.5" fill={C.argento} />
          <rect x="32.5" y="28.5" width="12" height="12" rx="3.4" fill={C.grigio} />
          <circle cx="36" cy="32" r="2.2" fill={C.ink} />
          <circle cx="41" cy="37" r="2.2" fill={C.ink} />
          <circle cx="41" cy="32" r="1" fill={C.bianco} />
        </g>
        <g transform="rotate(10 60 54)">
          <rect x="46" y="28" width="27" height="52" rx="6.5" fill={C.ink} />
          <rect x="49.5" y="31.5" width="12" height="12" rx="3.4" fill="#3a3f45" />
          <circle cx="53" cy="35" r="2.2" fill={C.grigio} />
          <circle cx="58" cy="40" r="2.2" fill={C.grigio} />
          <circle cx="58" cy="35" r="1" fill={C.senape} />
          <rect x="46" y="28" width="27" height="52" rx="6.5" fill="none" stroke="#3a3f45" strokeWidth="1.2" />
        </g>
      </Rotonda>
    ),
  },

  // Bonus (So cooked)
  {
    id: "bo-caricamento", tipo: "simbolo", nome: "Rotellina di caricamento", rapporto: 1, totem: "BONUS",
    disegno: () => (
      <Rotonda fondo={C.crema} filo={C.abete}>
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="46.5" y="22" width="7" height="16" rx="3.5" fill={C.abete} opacity={0.15 + i * 0.12} transform={`rotate(${i * 45} 50 50)`} />
        ))}
      </Rotonda>
    ),
  },
  {
    id: "bo-zuppa", tipo: "simbolo", nome: "Zuppa fumante", rapporto: 1, totem: "BONUS",
    disegno: () => (
      <Rotonda fondo={C.senape} filo={C.abete}>
        <path d="M38 42c-4-6 4-8 0-15M50 42c-4-6 4-8 0-15M62 42c-4-6 4-8 0-15" stroke={C.abete} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M64 50l14-20" stroke={C.argento} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M20 51h60c0 17-13 27-30 27S20 68 20 51z" fill={C.verm} />
        <ellipse cx="50" cy="51" rx="30" ry="6.4" fill="#b85a24" />
        <circle cx="40" cy="50" r="2" fill={C.abete} />
        <circle cx="56" cy="52" r="1.8" fill={C.crema} />
        <circle cx="47" cy="53" r="1.6" fill={C.senape} />
        <circle cx="62" cy="49" r="1.5" fill={C.abete} />
        <path d="M25 62q25 9 50 0" stroke={C.crema} strokeWidth="2.4" strokeDasharray="4 3" fill="none" strokeLinecap="round" />
        <rect x="39" y="76" width="22" height="5" rx="2.5" fill="#b8330f" />
      </Rotonda>
    ),
  },
  {
    id: "bo-lupi", tipo: "simbolo", nome: "Due lupi che ululano", rapporto: 1, totem: "BONUS",
    disegno: () => (
      <Rotonda fondo={C.notte} filo={C.senape}>
        <circle cx="50" cy="24" r="8" fill={C.senape} />
        <circle cx="47" cy="22" r="1.6" fill="#d4931a" />
        <circle cx="53" cy="27" r="1.2" fill="#d4931a" />
        <path d="M18 77q32-6 64 0" stroke={C.abete} strokeWidth="5" fill="none" strokeLinecap="round" />
        <g transform="translate(-7 17) scale(.7)">
          <Lupo {...LUPO_BIANCO} />
        </g>
        <g transform="translate(107 17) scale(-.7 .7)">
          <Lupo {...LUPO_GRIGIO} />
        </g>
      </Rotonda>
    ),
  },
  {
    id: "bo-uovo", tipo: "simbolo", nome: "Uovo sodo", rapporto: 1, totem: "BONUS",
    disegno: () => (
      <Rotonda fondo={C.abete} filo={C.crema}>
        <path d="M28 34c-4-5 3-7 0-12M72 34c-4-5 3-7 0-12" stroke={C.crema} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".7" />
        <path d="M36 52c0-14 6-24 14-24s14 10 14 24c0 6-6 10-14 10s-14-4-14-10z" fill={C.bianco} />
        <path d="M37 40l4 3 4-4 5 4 5-4 4 4 4-3" stroke={C.kraft} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
        <ellipse cx="50" cy="35" rx="7" ry="4" fill={C.senape} />
        {/* occhi a spirale */}
        {[44, 56].map((x) => (
          <path key={x} d={`M${x} 50a1 1 0 0 1 1.6 0a2 2 0 0 1-3.6 .6a3.2 3.2 0 0 1 5.8-1.4`} stroke={C.ink} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        ))}
        <path d="M46 57q2-1.6 4 0t4 0" stroke={C.ink} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M35 58h30l-4 11H39z" fill={C.verm} />
        <path d="M39 69h22l4 9H35z" fill={C.verm} />
        <path d="M37 62h26" stroke={C.crema} strokeWidth="1.6" strokeDasharray="2 2.4" />
      </Rotonda>
    ),
  },
  // ===== Parole ricamate =====
  ...(
    [
      // per tutti
      ["fatto-a-mano", "fatto a mano", "kraft"],
      ["sorpresa", "sorprendimi", "vermiglio"],
      ["chronically", "chronically online", "notte"],
      ["crazy", "crazy", "rosa"],
      ["no-way", "no way", "senape"],
      ["nerdy", "nerdy stuffs", "verde"],
      ["bello", "bello", "crema"],
      ["brutto", "brutto", "marrone"],
      ["perche-no", "perché no", "ghiaccio"],
      // ritirate (restano solo dove erano già attaccate)
      ["comodo", "comodo", "crema", undefined, true],
      ["brilla", [{ testo: "brilla", icona: "stellina" }], "notte", undefined, true],
      ["bosco", "profuma di bosco", "verde", undefined, true],
      ["caos", "caos calmo", "rosa", undefined, true],
      // totem: impegno alto · va bene tutto
      ["aa-hot", [{ testo: "hot", icona: "fiamma" }], "vermiglio", "IMPEGNO_ALTO_RICEVE_TUTTO"],
      ["aa-at-work", "at work", "notte", "IMPEGNO_ALTO_RICEVE_TUTTO"],
      ["aa-goat", "goat", "crema", "IMPEGNO_ALTO_RICEVE_TUTTO"],
      ["aa-overthinker", "overthinker", "senape", "IMPEGNO_ALTO_RICEVE_TUTTO"],
      // impegno alto · esigente
      ["ae-legge", "questa è\nla legge", "bordeaux", "IMPEGNO_ALTO_ESIGENTE"],
      ["ae-diva", [{ testo: "diva", icona: "stellina" }], "rosa", "IMPEGNO_ALTO_ESIGENTE"],
      ["ae-grindset", "grindset", "nero", "IMPEGNO_ALTO_ESIGENTE"],
      ["ae-no-pain", "no pain no gain", "vermiglio", "IMPEGNO_ALTO_ESIGENTE"],
      // impegno basso · va bene tutto
      ["ba-non-mi-va", "non mi va", "kraft", "IMPEGNO_BASSO_RICEVE_TUTTO"],
      ["ba-amo-noi", [{ testo: "amo noi", icona: "cuore" }], "bordeaux", "IMPEGNO_BASSO_RICEVE_TUTTO"],
      ["ba-zero-effort", "zero effort", "verde", "IMPEGNO_BASSO_RICEVE_TUTTO"],
      ["ba-chills", "nel chills", "ghiaccio", "IMPEGNO_BASSO_RICEVE_TUTTO"],
      // impegno basso · esigente
      ["be-tenuto", "hai tenuto\nlo scontrino?", "crema", "IMPEGNO_BASSO_ESIGENTE"],
      [
        "be-spero",
        [{ testo: "spero ti piaccia 😊👍" }, { testo: "(con l'intenzione di ucciderti se non ti piace)", piccola: true }],
        "senape",
        "IMPEGNO_BASSO_ESIGENTE",
      ],
      ["be-bella-merda", "bella merda", "marrone", "IMPEGNO_BASSO_ESIGENTE"],
      ["be-baddie", "vera baddie", "rosa", "IMPEGNO_BASSO_ESIGENTE"],
      // bonus
      ["bo-boh", "boh", "crema", "BONUS"],
      ["bo-buffering", [{ testo: "buffering", icona: "puntini" }], "notte", "BONUS"],
      ["bo-nonhocapito", "nonhocapito", "senape", "BONUS"],
      ["bo-boiled", "totally boiled", "vermiglio", "BONUS"],
    ] as [string, string | Riga[], Stoffa, Profilo?, boolean?][]
  ).map(([id, testo, stoffa, totem, ritirata]) => toppaDiParole(id, typeof testo === "string" ? righeDa(testo) : testo, stoffa, { totem, ritirata })),

  // Texture (al posto delle vecchie palette a pallini)
  {
    id: "pois", tipo: "palette", nome: "Pois", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.verm} filo={C.crema}>
        <Ritaglio id="pois">
          {[18, 32, 46, 60, 74, 88].map((y, r) =>
            [10, 24, 38, 52, 66, 80, 94].map((x) => <circle key={`${x}-${y}`} cx={x + (r % 2) * 7} cy={y} r="3.6" fill={C.crema} />),
          )}
        </Ritaglio>
      </Rotonda>
    ),
  },
  {
    id: "zucchero", tipo: "palette", nome: "Bastoncino di zucchero", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.rosa} filo={C.abete}>
        <Ritaglio id="zucchero">
          {[0, 18, 36, 54, 72, 90, 108, 126, 144].map((x) => (
            <path key={x} d={`M${x} 0l-60 100`} stroke={C.verm} strokeWidth="7" />
          ))}
        </Ritaglio>
      </Rotonda>
    ),
  },
  {
    id: "vichy", tipo: "palette", nome: "Quadretti vichy", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.senape} filo={C.abete}>
        <Ritaglio id="vichy">
          {[12, 28, 44, 60, 76].map((p) => (
            <g key={p} fill={C.abete} opacity=".45">
              <rect x={p} y="0" width="8" height="100" />
              <rect x="0" y={p} width="100" height="8" />
            </g>
          ))}
        </Ritaglio>
      </Rotonda>
    ),
  },
  {
    id: "tartan", tipo: "palette", nome: "Tartan", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.verm} filo={C.crema}>
        <g opacity=".55">
          {[24, 44, 64].map((p) => (
            <g key={p}>
              <rect x={p} y="8" width="10" height="84" fill={C.abete} />
              <rect x="8" y={p} width="84" height="10" fill={C.abete} />
            </g>
          ))}
        </g>
        <g stroke={C.senape} strokeWidth="1.5" opacity=".9">
          {[38, 58, 78].map((p) => (
            <g key={p}>
              <path d={`M${p} 10v80`} />
              <path d={`M10 ${p}h80`} />
            </g>
          ))}
        </g>
      </Rotonda>
    ),
  },
  {
    id: "maglia", tipo: "palette", nome: "Maglia", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.abete} filo={C.crema}>
        {[30, 44, 58, 72].map((y) =>
          [26, 38, 50, 62, 74].map((x) => (
            <path key={`${x}-${y}`} d={`M${x - 5} ${y - 5}l5 8 5-8`} fill="none" stroke={C.crema} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          )),
        )}
      </Rotonda>
    ),
  },
  {
    id: "velluto", tipo: "palette", nome: "Velluto a righe", rapporto: 1,
    disegno: () => (
      <Rotonda fondo="#7a2a3a" filo={C.senape}>
        {[22, 30, 38, 46, 54, 62, 70, 78].map((x) => (
          <path key={x} d={`M${x} 14v72`} stroke="#000" strokeOpacity=".22" strokeWidth="3" />
        ))}
      </Rotonda>
    ),
  },
];


function toppaDiParole(id: string, righe: Riga[], stoffa: Stoffa, extra: Partial<Toppa> = {}): Toppa {
  const L = impagina(righe);
  return {
    id,
    tipo: "parola",
    nome: righe.map((r) => r.testo).join(" "),
    rapporto: L.w / L.h,
    larghezza: Math.min(82, L.w * SCALA_PAROLA),
    disegno: () => <ToppaParola righe={righe} stoffa={stoffa} />,
    ...extra,
  };
}

export function trovaToppa(id: string) {
  return CATALOGO.find((t) => t.id === id);
}

export const NOMI_TIPI: Record<TipoToppa, string> = { simbolo: "Simboli", parola: "Parole", palette: "Texture" };

// ---------- toppe create dall'organizzatore per il suo gruppo ----------
// simbolo: una foto (ritagliata tonda) oppure un ricamo a punto croce su una griglia LATO×LATO
// parola:  testo (anche su più righe) + stoffa
export const LATO = 28;
export const MAX_PERSONALIZZATE = 4; // per tipo
export type ContenutoPersonalizzato = { foto?: string; celle?: string; testo?: string; stoffa?: Stoffa };
export type RigaPersonalizzata = { id: string; tipo: "simbolo" | "parola"; ordine: number; contenuto: ContenutoPersonalizzato };

const PASSO = 78 / LATO; // la griglia sta dentro il cerchio della cucitura
export const dentroCerchio = (c: number, r: number) => Math.hypot(11 + (c + 0.5) * PASSO - 50, 11 + (r + 0.5) * PASSO - 50) <= 38.5;

export function SimboloRicamato({ celle, griglia = false }: { celle: string; griglia?: boolean }) {
  // un tracciato per colore: ogni crocetta sono due diagonali
  const tracciati: string[] = FILI.map(() => "");
  const m = PASSO * 0.2;
  for (let r = 0; r < LATO; r++)
    for (let c = 0; c < LATO; c++) {
      const v = celle[r * LATO + c];
      if (!v || v === VUOTO) continue;
      const x = 11 + c * PASSO;
      const y = 11 + r * PASSO;
      tracciati[Number(v)] += `M${(x + m).toFixed(2)} ${(y + m).toFixed(2)}L${(x + PASSO - m).toFixed(2)} ${(y + PASSO - m).toFixed(2)}M${(x + PASSO - m).toFixed(2)} ${(y + m).toFixed(2)}L${(x + m).toFixed(2)} ${(y + PASSO - m).toFixed(2)}`;
    }
  return (
    <Rotonda fondo={C.tela} filo={C.abete}>
      {griglia && (
        <Ritaglio id="griglia-ricamo">
          {Array.from({ length: LATO + 1 }, (_, i) => (
            <g key={i} stroke={C.abete} strokeOpacity=".12" strokeWidth=".4">
              <path d={`M${11 + i * PASSO} 0v100`} />
              <path d={`M0 ${11 + i * PASSO}h100`} />
            </g>
          ))}
        </Ritaglio>
      )}
      {tracciati.map((d, i) => d && <path key={i} d={d} stroke={FILI[i]} strokeWidth={PASSO * 0.34} strokeLinecap="round" fill="none" />)}
    </Rotonda>
  );
}

export function SimboloFoto({ foto, id }: { foto: string; id: string }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <clipPath id={`foto-${id}`}>
        <circle cx="50" cy="50" r="48" />
      </clipPath>
      <image href={foto} x="2" y="2" width="96" height="96" preserveAspectRatio="xMidYMid slice" clipPath={`url(#foto-${id})`} />
      <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeOpacity=".12" strokeWidth="2" />
      <circle cx="50" cy="50" r="42" fill="none" stroke={C.crema} strokeWidth="2.4" strokeDasharray="5 4" strokeLinecap="round" />
    </svg>
  );
}

export function toppaPersonalizzata(riga: RigaPersonalizzata): Toppa {
  const id = `g:${riga.id}`;
  const k = riga.contenuto;
  if (riga.tipo === "parola") {
    return toppaDiParole(id, righeDa(k.testo || " "), k.stoffa ?? "vermiglio", { personalizzata: true });
  }
  return {
    id,
    tipo: "simbolo",
    nome: "Simbolo del gruppo",
    rapporto: 1,
    personalizzata: true,
    disegno: () => (k.foto ? <SimboloFoto foto={k.foto} id={riga.id} /> : <SimboloRicamato celle={k.celle ?? ""} />),
  };
}

// ---------- la "vibe" di un totem: i suoi 4 simboli e le sue 4 parole (non cliccabili) ----------
export function VibeTotem({ profilo }: { profilo: Profilo }) {
  const sue = CATALOGO.filter((t) => t.totem === profilo);
  return (
    <div className="flex flex-col gap-3" aria-label="Toppe di questo totem">
      <div className="grid grid-cols-4 gap-3">
        {sue
          .filter((t) => t.tipo === "simbolo")
          .map((t) => (
            <span key={t.id} className="block" title={t.nome}>
              {t.disegno()}
            </span>
          ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {sue
          .filter((t) => t.tipo === "parola")
          .map((t) => (
            <span key={t.id} className="block" style={{ width: (t.larghezza ?? 46) * 2.2, aspectRatio: String(t.rapporto) }} title={t.nome}>
              {t.disegno()}
            </span>
          ))}
      </div>
    </div>
  );
}
