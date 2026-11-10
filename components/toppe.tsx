// Toppe ricamate per la bacheca: disegnate da noi in SVG, originali.
// Ogni toppa ha un tipo (simbolo, parola, palette) e un rapporto larghezza/altezza.

import type { ReactNode } from "react";

export type TipoToppa = "simbolo" | "parola" | "palette";
export type Toppa = { id: string; tipo: TipoToppa; nome: string; rapporto: number };

const C = { abete: "#2c4a32", verm: "#e5481e", crema: "#f3e8cf", feltro: "#f1e4c8", senape: "#e9a81c", rosa: "#f4a9c4", kraft: "#cdb48a", notte: "#24304a", ink: "#1c241d" };

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

// Tiene una trama dentro il cerchio della toppa (dentro la cucitura).
function Ritaglio({ id, children }: { id: string; children: ReactNode }) {
  return (
    <>
      <clipPath id={`trama-${id}`}>
        <circle cx="50" cy="50" r="39" />
      </clipPath>
      <g clipPath={`url(#trama-${id})`}>{children}</g>
    </>
  );
}

function Pillola({ fondo, filo, testo, colore }: { fondo: string; filo: string; testo: string; colore: string }) {
  const lungo = testo.length > 10;
  return (
    <svg viewBox="0 0 220 80" width="100%" height="100%" aria-hidden>
      <rect x="2" y="2" width="216" height="76" rx="38" fill={fondo} />
      <rect x="2" y="2" width="216" height="76" rx="38" fill="none" stroke="#000" strokeOpacity=".12" strokeWidth="2" />
      <rect x="9" y="9" width="202" height="62" rx="31" fill="none" stroke={filo} strokeWidth="2.4" strokeDasharray="6 5" strokeLinecap="round" />
      <text
        x="110"
        y="41"
        textAnchor="middle"
        dominantBaseline="central"
        fill={colore}
        style={{ fontFamily: "var(--font-basteleur), Georgia, serif", fontSize: lungo ? 26 : 32 }}
      >
        {testo}
      </text>
    </svg>
  );
}

// ---------- catalogo ----------
export const CATALOGO: (Toppa & { disegno: () => ReactNode })[] = [
  // Simboli
  {
    id: "tazza", tipo: "simbolo", nome: "Tazza fumante", rapporto: 1,
    disegno: () => (
      <Rotonda fondo={C.verm} filo={C.crema}>
        <path d="M30 46h34v16a12 12 0 0 1-12 12H42a12 12 0 0 1-12-12z" fill={C.crema} />
        <path d="M64 50h5a7 7 0 0 1 0 14h-5" fill="none" stroke={C.crema} strokeWidth="4" />
        <path d="M40 40c-4-5 4-7 0-12M50 40c-4-5 4-7 0-12M60 40c-4-5 4-7 0-12" fill="none" stroke={C.crema} strokeWidth="3" strokeLinecap="round" />
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
    id: "foglia", tipo: "simbolo", nome: "Rametto", rapporto: 1,
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
    id: "cuore", tipo: "simbolo", nome: "Cuore folk", rapporto: 1,
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
    id: "uccellino", tipo: "simbolo", nome: "Uccellino", rapporto: 1,
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

  // Parole ricamate
  ...(
    [
      ["comodo", "comodo", C.feltro, C.verm, C.abete],
      ["brilla", "brilla ✦", C.notte, C.senape, C.senape],
      ["fatto-a-mano", "fatto a mano", C.kraft, C.abete, C.ink],
      ["bosco", "profuma di bosco", C.abete, C.crema, C.crema],
      ["caos", "caos calmo", C.rosa, C.verm, C.ink],
      ["sorpresa", "sorprendimi", C.verm, C.crema, C.crema],
    ] as const
  ).map(([id, testo, fondo, filo, colore]) => ({
    id,
    tipo: "parola" as const,
    nome: testo,
    rapporto: 220 / 80,
    disegno: () => <Pillola fondo={fondo} filo={filo} testo={testo} colore={colore} />,
  })),

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

export function trovaToppa(id: string) {
  return CATALOGO.find((t) => t.id === id);
}

export const NOMI_TIPI: Record<TipoToppa, string> = { simbolo: "Simboli", parola: "Parole", palette: "Texture" };
