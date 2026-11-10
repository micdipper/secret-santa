// Le 5 illustrazioni dei totem, stile francobollo vintage (disegnate da noi in SVG).
// Sono legate al PROFILO, non al nome: se l'organizzatore rinomina un totem l'immagine resta.
import type { ReactNode } from "react";
import type { Profilo } from "@/lib/totem";

const C = { verm: "#e5481e", vermScuro: "#b8330f", abete: "#2c4a32", abeteChiaro: "#4f7a55", crema: "#f3e8cf", carta: "#fbf4e3", senape: "#e9a81c", ink: "#1c241d", pelle: "#e3a47c", grigio: "#8e9298" };

const FONDO: Record<Profilo, string> = {
  IMPEGNO_ALTO_RICEVE_TUTTO: "#f6d9c8",
  IMPEGNO_ALTO_ESIGENTE: "#e8dcc4",
  IMPEGNO_BASSO_RICEVE_TUTTO: "#f3e2b0",
  IMPEGNO_BASSO_ESIGENTE: "#d7e6cf",
  BONUS: "#e6d8ee",
};

// Elfo stakanovista: elfo col cappello a punta, che sorride e tiene un pacco con un fiocco perfetto
function Elfo() {
  return (
    <g>
      <path d="M30 44l20-34 8 6-6 28z" fill={C.abete} />
      <circle cx="58" cy="14" r="5" fill={C.crema} />
      <rect x="28" y="40" width="34" height="7" rx="3" fill={C.crema} />
      <circle cx="45" cy="56" r="14" fill={C.pelle} />
      <path d="M30 54l-7-6 6 10zM60 54l7-6-6 10z" fill={C.pelle} />
      <circle cx="40" cy="55" r="1.8" fill={C.ink} />
      <circle cx="50" cy="55" r="1.8" fill={C.ink} />
      <path d="M40 61c3 3 7 3 10 0" stroke={C.ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="30" y="72" width="30" height="20" rx="2" fill={C.verm} />
      <rect x="43" y="72" width="4" height="20" fill={C.senape} />
      <path d="M45 72c-6-8-12-2-6 1zM45 72c6-8 12-2 6 1z" fill={C.senape} />
      <path d="M66 30l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z" fill={C.senape} />
    </g>
  );
}

// Giudice: toga nera, parrucca bianca a riccioli e martelletto
function Giudice() {
  return (
    <g>
      <path d="M22 96c0-20 10-30 23-30s23 10 23 30z" fill={C.ink} />
      <path d="M41 66l4 10 4-10z" fill={C.carta} />
      <circle cx="45" cy="46" r="13" fill={C.pelle} />
      {[[32, 40], [32, 50], [33, 60], [58, 40], [58, 50], [57, 60], [38, 32], [45, 30], [52, 32]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5.5" fill={C.carta} stroke="#d8cdb6" strokeWidth=".8" />
      ))}
      <circle cx="41" cy="47" r="1.6" fill={C.ink} />
      <circle cx="49" cy="47" r="1.6" fill={C.ink} />
      <path d="M41 54h8" stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" />
      <g transform="rotate(-30 70 64)">
        <rect x="64" y="56" width="16" height="9" rx="2" fill="#8a5a2b" />
        <rect x="70" y="65" width="4" height="16" rx="2" fill="#6b4a2b" />
      </g>
    </g>
  );
}

// Autogrill core: caffè in bicchierino di carta, panino incartato, orologio alle 19:40
function Autogrill() {
  return (
    <g>
      <circle cx="62" cy="28" r="13" fill={C.carta} stroke={C.ink} strokeWidth="2" />
      <path d="M62 28v-8M62 28l5 7" stroke={C.ink} strokeWidth="2" strokeLinecap="round" />
      <path d="M22 50h26l-4 40H26z" fill={C.carta} stroke="#b9a986" strokeWidth="1.2" />
      <rect x="22" y="46" width="26" height="6" rx="2" fill={C.verm} />
      <path d="M30 40c-2-4 2-6 0-10M38 40c-2-4 2-6 0-10" stroke={C.grigio} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M50 74c6-10 30-10 34 0l-2 10H52z" fill="#d9a441" />
      <path d="M52 78h32" stroke={C.abeteChiaro} strokeWidth="3" />
      <path d="M48 84h38l-3 8H51z" fill={C.carta} stroke="#b9a986" strokeWidth="1" />
    </g>
  );
}

// Grinch con la wishlist: un cuoricino verde piccolissimo e una lista lunghissima che si srotola
function Grinch() {
  return (
    <g>
      <path d="M26 16h34v52c-6 4-10-4-17 0s-11-4-17 0z" fill={C.carta} stroke="#b9a986" strokeWidth="1.2" />
      {[24, 31, 38, 45, 52].map((y) => (
        <g key={y}>
          <rect x="31" y={y} width="4" height="4" rx="1" fill="none" stroke={C.abete} strokeWidth="1.2" />
          <path d={`M38 ${y + 2}h${14 + ((y * 7) % 6)}`} stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ))}
      <path d="M26 68c0 10 10 14 18 18" stroke="#b9a986" strokeWidth="1.2" fill="none" />
      <path d="M66 74c-3-4-9-1-6 4l6 6 6-6c3-5-3-8-6-4z" fill={C.abeteChiaro} />
      <circle cx="66" cy="79" r="1" fill={C.carta} />
    </g>
  );
}

// So cooked: pentola che fuma, spaghetti scotti che strabordano e un punto interrogativo
function Cooked() {
  return (
    <g>
      <path d="M22 54h46v26c0 8-6 12-12 12H34c-6 0-12-4-12-12z" fill={C.grigio} />
      <rect x="18" y="50" width="54" height="7" rx="3" fill="#a5a9ae" />
      <path d="M16 62h-6M74 62h6" stroke="#6f737a" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 52c2 10 6 12 4 22M40 52c-2 8 4 14 0 20M52 52c3 6-2 12 2 18M62 52c-2 10 3 12 0 20" stroke="#e9c86b" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M32 40c-6-8 6-10 0-18M45 40c-6-8 6-10 0-18M58 40c-6-8 6-10 0-18" stroke={C.grigio} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".7" />
      <text x="70" y="34" fontSize="22" fontWeight="700" fill={C.verm} fontFamily="Georgia, serif">?</text>
    </g>
  );
}

const DISEGNO: Record<Profilo, () => ReactNode> = {
  IMPEGNO_ALTO_RICEVE_TUTTO: Elfo,
  IMPEGNO_ALTO_ESIGENTE: Giudice,
  IMPEGNO_BASSO_RICEVE_TUTTO: Autogrill,
  IMPEGNO_BASSO_ESIGENTE: Grinch,
  BONUS: Cooked,
};

// Francobollo: bordo dentellato, cornice, illustrazione. "nome" (facoltativo) va sotto, ricamato.
export function FrancobolloTotem({
  profilo,
  className = "",
  titolo,
  immagine,
}: {
  profilo: Profilo;
  className?: string;
  titolo?: string;
  immagine?: string | null; // foto scelta dall'organizzatore al posto del disegno
}) {
  const Disegno = DISEGNO[profilo];
  const denti = [];
  for (let i = 0; i <= 10; i++) {
    denti.push(<circle key={`t${i}`} cx={i * 10} cy="0" r="3.4" />, <circle key={`b${i}`} cx={i * 10} cy="120" r="3.4" />);
  }
  for (let i = 0; i <= 12; i++) {
    denti.push(<circle key={`l${i}`} cx="0" cy={i * 10} r="3.4" />, <circle key={`r${i}`} cx="100" cy={i * 10} r="3.4" />);
  }
  return (
    <svg viewBox="-4 -4 108 128" className={className} role={titolo ? "img" : undefined} aria-label={titolo} aria-hidden={titolo ? undefined : true}>
      <defs>
        <mask id={`dentelli-${profilo}`}>
          <rect x="-4" y="-4" width="108" height="128" fill="white" />
          <g fill="black">{denti}</g>
        </mask>
      </defs>
      <g mask={`url(#dentelli-${profilo})`}>
        <rect x="0" y="0" width="100" height="120" fill={C.carta} />
      </g>
      <rect x="8" y="8" width="84" height="104" fill={FONDO[profilo]} />
      {immagine ? (
        <image href={immagine} x="8" y="8" width="84" height="104" preserveAspectRatio="xMidYMid slice" />
      ) : (
        <g transform="translate(5 10)">
          <Disegno />
        </g>
      )}
      <rect x="8" y="8" width="84" height="104" fill="none" stroke={C.verm} strokeWidth="1.4" strokeDasharray="3 2.4" />
    </svg>
  );
}

// Badge accanto al personaggio: un piccolo francobollo inclinato
export function BadgeTotem({
  profilo,
  nome,
  immagine,
  dimensione = 26,
  className = "",
}: {
  profilo: Profilo;
  nome?: string;
  immagine?: string | null;
  dimensione?: number;
  className?: string;
}) {
  return (
    <span className={`inline-block rotate-[8deg] drop-shadow-[0_2px_2px_rgba(0,0,0,.35)] ${className}`} style={{ width: dimensione }} title={nome}>
      <FrancobolloTotem profilo={profilo} className="block w-full" titolo={nome} immagine={immagine} />
    </span>
  );
}
