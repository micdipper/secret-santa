// Ornamenti nordici originali, disegnati in SVG. Nessuna immagine esterna.
// Il colore segue "currentColor": si cambia con le classi text-*.

type Props = { className?: string; title?: string };

function svgProps(title?: string) {
  return title
    ? { role: "img" as const, "aria-label": title }
    : { "aria-hidden": true as const };
}

// Stellina a 4 punte (come quelle di Mishca)
export function Stellina({ className, title }: Props) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="currentColor" {...svgProps(title)}>
      <path d="M20 0C21.6 12.5 27.5 18.4 40 20 27.5 21.6 21.6 27.5 20 40 18.4 27.5 12.5 21.6 0 20 12.5 18.4 18.4 12.5 20 0Z" />
    </svg>
  );
}

// Stella nordica a 8 punte (stile maglione)
export function StellaNordica({ className, title }: Props) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="currentColor" {...svgProps(title)}>
      <path d="M24 2l5 11 11-5-5 11 11 5-11 5 5 11-11-5-5 11-5-11-11 5 5-11L2 24l11-5-5-11 11 5 5-11z" />
      <circle cx="24" cy="24" r="4.5" fill="var(--color-crema, #f3e8cf)" />
    </svg>
  );
}

// Cuore dell'arte popolare, con foglioline incise
export function CuoreFolk({ className, title }: Props) {
  return (
    <svg viewBox="0 0 48 44" className={className} fill="currentColor" {...svgProps(title)}>
      <path d="M24 43C10 32 1 23 1 13.5 1 6.5 6.5 1 13 1c4.6 0 8.6 2.5 11 6.3C26.4 3.5 30.4 1 35 1c6.5 0 12 5.5 12 12.5C47 23 38 32 24 43z" />
      <g fill="var(--color-crema, #f3e8cf)">
        <path d="M24 34c-1-6 0-12 0-18 0 6 1 12 0 18z" />
        <ellipse cx="19" cy="20" rx="4" ry="2" transform="rotate(35 19 20)" />
        <ellipse cx="29" cy="20" rx="4" ry="2" transform="rotate(-35 29 20)" />
        <ellipse cx="20" cy="27" rx="3.4" ry="1.7" transform="rotate(30 20 27)" />
        <ellipse cx="28" cy="27" rx="3.4" ry="1.7" transform="rotate(-30 28 27)" />
      </g>
    </svg>
  );
}

// Uccellino folk
export function Uccellino({ className, title }: Props) {
  return (
    <svg viewBox="0 0 64 48" className={className} fill="currentColor" {...svgProps(title)}>
      {/* coda a ventaglio */}
      <path d="M18 30L2 10l5-1 13 17zM18 30L6 4l5 0 11 22zM18 30L12 1h5l6 25z" />
      {/* corpo e testa */}
      <path d="M14 32c0-8 8-12 18-12 3-8 9-11 15-11 6 0 10 4 10 9 0 4-2 7-5 9 1 2 1 4 1 6 0 8-9 13-20 13S14 41 14 32z" />
      {/* becco */}
      <path d="M56 15l8 2-8 3z" />
      {/* occhio e ala incisa */}
      <circle cx="49" cy="15" r="2" fill="var(--color-crema, #f3e8cf)" />
      <path
        d="M24 34c5-6 13-7 20-4-5 1-9 4-11 8-2-3-5-4-9-4z"
        fill="var(--color-crema, #f3e8cf)"
      />
      {/* zampine */}
      <path d="M30 45v3M38 45v3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// Rametto di abete
export function Rametto({ className, title }: Props) {
  const aghi = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg viewBox="0 0 120 40" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" {...svgProps(title)}>
      <path d="M4 22C40 18 80 18 116 12" />
      {aghi.map((i) => {
        const x = 12 + i * 11;
        const y = 21 - i * 0.9;
        return (
          <g key={i}>
            <path d={`M${x} ${y}l9 -12`} />
            <path d={`M${x} ${y}l9 12`} />
          </g>
        );
      })}
    </svg>
  );
}

// Fascia a maglia nordica (pattern ripetuto, riempie tutta la larghezza)
const MOTIVO = [
  "....1..1....",
  "....1..1....",
  "11..1111..11",
  ".11..11..11.",
  "..11.11.11..",
  "111111111111",
  "111111111111",
  "..11.11.11..",
  ".11..11..11.",
  "11..1111..11",
  "....1..1....",
  "....1..1....",
];

export function FasciaMaglia({
  className,
  colore = "var(--color-crema)",
  sfondo = "var(--color-vermiglio)",
}: {
  className?: string;
  colore?: string;
  sfondo?: string;
}) {
  const cella = 4;
  const larghezzaTessera = 14 * cella;
  const altezza = 18 * cella;
  const punti: { x: number; y: number }[] = [];
  MOTIVO.forEach((riga, r) =>
    [...riga].forEach((c, col) => {
      if (c === "1") punti.push({ x: (col + 1) * cella, y: (r + 3) * cella });
    }),
  );
  return (
    <svg className={className} height={altezza} width="100%" aria-hidden>
      <defs>
        <pattern id="maglia" width={larghezzaTessera} height={altezza} patternUnits="userSpaceOnUse">
          <rect width={larghezzaTessera} height={altezza} fill={sfondo} />
          {punti.map((p, i) => (
            <rect key={i} x={p.x} y={p.y} width={cella} height={cella} fill={colore} />
          ))}
          {/* puntini di bordo, sopra e sotto */}
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i} fill={colore}>
              <rect x={i * 2 * cella} y={0} width={cella} height={cella} />
              <rect x={i * 2 * cella + cella} y={altezza - cella} width={cella} height={cella} />
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height={altezza} fill="url(#maglia)" />
    </svg>
  );
}
