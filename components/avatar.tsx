// Avatar originale a mezzobusto, stile feltro, disegnato da noi in SVG.

export type Look = {
  pelle: number;
  capelli: number;
  coloreCapelli: number;
  maglione: number;
  accessori: string[];
};

export const PELLI = ["#f6d7bf", "#efc2a0", "#d9a07a", "#b97a52", "#8d5a3b", "#5e3b28"];
export const COLORI_CAPELLI = ["#2b1d14", "#5a3520", "#9a5b2c", "#d9a441", "#e9d9b5", "#b8442b", "#7c7c7c"];
export const MAGLIONI = ["#e5481e", "#2c4a32", "#e9a81c", "#24304a", "#f4a9c4", "#f3e8cf"];
export const NOMI_CAPELLI = ["Corti", "Caschetto", "Lunghi", "Chignon", "Ricci", "Rasati"];

export const ACCESSORI: { id: string; nome: string; comeSbloccarlo: string }[] = [
  { id: "sciarpa", nome: "Sciarpa a maglia", comeSbloccarlo: "Attacca alla tua bacheca almeno una toppa di ogni tipo (simbolo, parola, palette)." },
  { id: "gomitolo", nome: "Spilla gomitolo", comeSbloccarlo: "Ricama qualcosa a punto croce sulla tua bacheca." },
  { id: "fiocco", nome: "Fiocco", comeSbloccarlo: "Attacca alla tua bacheca almeno una foto o un'immagine." },
  { id: "stellina", nome: "Spilla stellina", comeSbloccarlo: "Apri la tua busta." },
];

export const LOOK_BASE: Look = { pelle: 1, capelli: 0, coloreCapelli: 1, maglione: 0, accessori: [] };

// Un look iniziale diverso per ognuno (deciso dall'id, così resta sempre lo stesso)
export function lookIniziale(seme: string): Look {
  let h = 0;
  for (const ch of seme) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    pelle: h % PELLI.length,
    capelli: (h >> 3) % NOMI_CAPELLI.length,
    coloreCapelli: (h >> 6) % COLORI_CAPELLI.length,
    maglione: (h >> 9) % MAGLIONI.length,
    accessori: [],
  };
}

export function normalizzaLook(l: unknown, seme = ""): Look {
  const x = (l ?? {}) as Partial<Look>;
  const base = seme ? lookIniziale(seme) : LOOK_BASE;
  const n = (v: unknown, max: number, d: number) => (typeof v === "number" && v >= 0 && v < max ? v : d);
  return {
    pelle: n(x.pelle, PELLI.length, base.pelle),
    capelli: n(x.capelli, NOMI_CAPELLI.length, base.capelli),
    coloreCapelli: n(x.coloreCapelli, COLORI_CAPELLI.length, base.coloreCapelli),
    maglione: n(x.maglione, MAGLIONI.length, base.maglione),
    accessori: Array.isArray(x.accessori) ? x.accessori.filter((a) => typeof a === "string") : [],
  };
}

function scurisci(hex: string, f = 0.78) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

function Capelli({ stile, c, dietro }: { stile: number; c: string; dietro: boolean }) {
  // "dietro" = la parte che sta dietro la testa
  switch (stile) {
    case 0: // corti
      return dietro ? null : <path d="M30 40c0-14 9-22 20-22s20 8 20 22c-4-6-9-9-14-9-3 3-9 5-16 4-4 0-7 2-10 5z" fill={c} />;
    case 1: // caschetto
      return dietro ? (
        <path d="M27 42c0-16 10-24 23-24s23 8 23 24v16c0 3-3 5-6 5H33c-3 0-6-2-6-5z" fill={c} />
      ) : (
        <path d="M29 42c0-14 9-22 21-22s21 8 21 22c-8-1-15-4-19-9-4 5-12 8-23 9z" fill={c} />
      );
    case 2: // lunghi
      return dietro ? (
        <path d="M26 42c0-16 11-24 24-24s24 8 24 24v30c0 3-3 4-6 4H32c-3 0-6-1-6-4z" fill={c} />
      ) : (
        <path d="M29 44c0-15 9-24 21-24s21 9 21 24c-3-9-10-14-21-14S32 35 29 44z" fill={c} />
      );
    case 3: // chignon
      return dietro ? (
        <circle cx="50" cy="16" r="9" fill={c} />
      ) : (
        <path d="M30 41c0-13 9-21 20-21s20 8 20 21c-5-7-12-10-20-10s-15 3-20 10z" fill={c} />
      );
    case 4: // ricci
      return (
        <g fill={c}>
          {(dietro
            ? [[30, 46], [70, 46], [28, 56], [72, 56]]
            : [[34, 30], [42, 24], [50, 22], [58, 24], [66, 30], [30, 38], [70, 38]]
          ).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={dietro ? 7 : 8} />
          ))}
        </g>
      );
    default: // rasati
      return dietro ? null : <path d="M31 40c1-12 9-19 19-19s18 7 19 19c-6-4-12-6-19-6s-13 2-19 6z" fill={c} opacity=".55" />;
  }
}

export function Avatar({ look, className, titolo }: { look: Look; className?: string; titolo?: string }) {
  const pelle = PELLI[look.pelle];
  const capelli = COLORI_CAPELLI[look.coloreCapelli];
  const maglia = MAGLIONI[look.maglione];
  const filo = look.maglione === 5 ? "#e5481e" : "#f3e8cf";
  const ha = (a: string) => look.accessori.includes(a);
  return (
    <svg viewBox="0 0 100 100" className={className} role={titolo ? "img" : undefined} aria-label={titolo} aria-hidden={titolo ? undefined : true}>
      {/* capelli dietro */}
      <Capelli stile={look.capelli} c={capelli} dietro />
      {/* spalle e maglione */}
      <path d="M14 100c0-18 14-30 36-30s36 12 36 30z" fill={maglia} />
      <path d="M18 92c8-4 20-6 32-6s24 2 32 6" fill="none" stroke={filo} strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" opacity=".9" />
      {[26, 38, 50, 62, 74].map((x) => (
        <path key={x} d={`M${x - 3} 96l3-4 3 4-3 4z`} fill={filo} opacity=".9" />
      ))}
      {/* collo */}
      <rect x="44" y="62" width="12" height="12" rx="5" fill={scurisci(pelle, 0.9)} />
      {/* testa */}
      <circle cx="50" cy="45" r="20" fill={pelle} />
      <circle cx="30.5" cy="47" r="3.5" fill={pelle} />
      <circle cx="69.5" cy="47" r="3.5" fill={pelle} />
      {/* viso */}
      <circle cx="43" cy="47" r="2.2" fill="#1c241d" />
      <circle cx="57" cy="47" r="2.2" fill="#1c241d" />
      <circle cx="39" cy="53" r="3.6" fill="#e5481e" opacity=".28" />
      <circle cx="61" cy="53" r="3.6" fill="#e5481e" opacity=".28" />
      <path d="M46 55c2 2.4 6 2.4 8 0" fill="none" stroke="#1c241d" strokeWidth="1.8" strokeLinecap="round" />
      {/* capelli davanti */}
      <Capelli stile={look.capelli} c={capelli} dietro={false} />

      {/* accessori */}
      {ha("sciarpa") && (
        <g>
          <path d="M33 70c10 6 24 6 34 0l3 7c-12 7-28 7-40 0z" fill="#2c4a32" />
          <path d="M60 74l4 18-7 1-3-17z" fill="#2c4a32" />
          {[37, 44, 51, 58, 65].map((x) => (
            <path key={x} d={`M${x - 2} 73l2 3 2-3`} fill="none" stroke="#f3e8cf" strokeWidth="1.4" />
          ))}
          <path d="M56 92l2 4M59 92l1 4M62 92l0 4" stroke="#f3e8cf" strokeWidth="1.4" />
        </g>
      )}
      {ha("gomitolo") && (
        <g>
          <circle cx="34" cy="88" r="5" fill="#e9a81c" />
          <path d="M30 86c3 2 6 2 9 0M30 90c3 2 6 2 9 0" stroke="#b37d0e" strokeWidth="1" fill="none" />
        </g>
      )}
      {ha("fiocco") && (
        <g transform="translate(64 28) rotate(15)">
          <path d="M0 0l-9-6v12zM0 0l9-6v12z" fill="#e5481e" />
          <circle r="2.6" fill="#c93b14" />
        </g>
      )}
      {ha("stellina") && <path d="M68 85l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" fill="#f1d27a" stroke="#b8922f" strokeWidth=".6" />}
    </svg>
  );
}

// Avatar dentro una toppa rotonda cucita (al posto della vecchia emoji).
export function ToppaAvatar({
  look,
  dimensione = 56,
  cliccabile = false,
  novita = false,
  nome,
}: {
  look: Look | null;
  dimensione?: number;
  cliccabile?: boolean;
  novita?: boolean;
  nome?: string;
}) {
  return (
    <span className={`toppa overflow-hidden ${cliccabile ? "cliccabile stoffa-chiara" : ""}`} style={{ width: dimensione, height: dimensione }}>
      {look ? (
        <Avatar look={look} titolo={nome} className="relative top-[8%] h-full w-full" />
      ) : (
        <span className="text-inchiostro/40" aria-hidden style={{ fontSize: dimensione * 0.4 }}>
          ·
        </span>
      )}
      {novita && <span className="absolute top-0.5 right-0 size-3.5 rounded-full bg-senape shadow-[0_0_0_2px_var(--color-abete)]" />}
    </span>
  );
}

// Dalla lista dei profili (user_id, look) al look di una persona; null se non è ancora entrata.
export function lookDi(profili: { user_id: string; look: unknown }[] | null, userId: string | null): Look | null {
  if (!userId) return null;
  return normalizzaLook(profili?.find((p) => p.user_id === userId)?.look, userId);
}
