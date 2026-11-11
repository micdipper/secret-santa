// Avatar originale a mezzobusto, stile feltro, disegnato da noi in SVG.
import { BadgeTotem } from "@/components/totem";
import type { Profilo } from "@/lib/totem";

export type Look = {
  pelle: number;
  capelli: number;
  coloreCapelli: number;
  barba: number;
  occhiali: number;
  maglione: number;
  accessori: string[];
};

export const PELLI = ["#f3bf9b", "#e3a47c", "#cc8a5f", "#a9683f", "#7f4c2e", "#53311f"];
// L'ultimo colore (olografico) è un premio da sbloccare
export const COLORI_CAPELLI = ["#2b1d14", "#5a3520", "#9a5b2c", "#d9a441", "#e0662a", "#b8442b", "#7c7c7c", "url(#avatar-olografico)"];
export const MAGLIONI = ["#e5481e", "#2c4a32", "#e9a81c", "#24304a", "#f4a9c4", "#7d3c5a"];
// L'ultimo taglio (Super) è un premio da sbloccare
export const NOMI_CAPELLI = ["Corti", "Caschetto", "Lunghi", "Chignon", "Ricci", "Rasati", "Cresta", "Afro", "Ciuffo", "Codini", "Treccia", "Spettinati", "Super"];
export const NOMI_BARBA = ["Niente", "Barba corta", "Barba folta", "Baffoni", "Pizzetto"];
export const NOMI_OCCHIALI = ["Niente", "Tondi", "Grandi"];

export const CAPELLI_SUPER = 12;
export const COLORE_OLOGRAFICO = 7;

export const ACCESSORI: { id: string; nome: string; comeSbloccarlo: string }[] = [
  { id: "stellina", nome: "Così ti ricordi i compleanni", comeSbloccarlo: "Completa il sondaggio totem." },
  { id: "fiocco", nome: "È un bracciale o una collana?", comeSbloccarlo: "Almeno 10 cose sulla bacheca, tra cui una foto, un ricamo, un simbolo, una parola e una texture." },
  { id: "sciarpa", nome: "Lupetto grigio da portare indietro", comeSbloccarlo: "Almeno una copia di ogni toppa del cassetto, più una foto e un ricamo." },
  { id: "occhiali", nome: "Occhiali veloci", comeSbloccarlo: "Apri la tua busta." },
  { id: "occhiali_olo", nome: "Occhiali veloci olografici", comeSbloccarlo: "Vinci tutti gli altri premi." },
];
// Lupetto, collana e calendario non si indossano insieme: se ne sceglie uno.
export const ESCLUSIVI = ["sciarpa", "fiocco", "stellina"];
// I due paia di occhiali veloci: o uno o l'altro.
export const OCCHIALI_VELOCI = ["occhiali", "occhiali_olo"];

export const LOOK_BASE: Look = { pelle: 1, capelli: 0, coloreCapelli: 1, barba: 0, occhiali: 0, maglione: 0, accessori: [] };

// Un look iniziale diverso per ognuno (deciso dal seme, così resta sempre lo stesso)
export function lookIniziale(seme: string): Look {
  let h = 0;
  for (const ch of seme) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    pelle: h % PELLI.length,
    capelli: (h >>> 3) % CAPELLI_SUPER,
    coloreCapelli: (h >>> 7) % COLORE_OLOGRAFICO,
    barba: 0,
    occhiali: 0,
    maglione: (h >>> 11) % MAGLIONI.length,
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
    barba: n(x.barba, NOMI_BARBA.length, 0),
    occhiali: n(x.occhiali, NOMI_OCCHIALI.length, 0),
    maglione: n(x.maglione, MAGLIONI.length, base.maglione),
    accessori: soloUnoEsclusivo(Array.isArray(x.accessori) ? x.accessori.filter((a) => typeof a === "string") : []),
  };
}

// Tiene al massimo uno tra lupetto, collana e calendario
function soloUnoEsclusivo(lista: string[]) {
  let tieni = lista;
  for (const gruppo of [ESCLUSIVI, OCCHIALI_VELOCI]) {
    const primo = tieni.find((a) => gruppo.includes(a));
    tieni = tieni.filter((a) => !gruppo.includes(a) || a === primo);
  }
  return tieni;
}

// Occhiali veloci (stile sportivo avvolgente): montatura argentata, lenti nere oppure a specchio azzurre
function OcchialiVeloci({ olografici }: { olografici: boolean }) {
  const id = olografici ? "lenti-olo" : "lenti-nere";
  return (
    <g>
      <defs>
        <linearGradient id="montatura-argento" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset=".55" stopColor="#c3c8ce" />
          <stop offset="1" stopColor="#8e949b" />
        </linearGradient>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {olografici ? (
            <>
              <stop offset="0" stopColor="#1fa3ff" />
              <stop offset=".45" stopColor="#7fe3ff" />
              <stop offset=".7" stopColor="#2f6bff" />
              <stop offset="1" stopColor="#9b7bff" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#3a3f44" />
              <stop offset="1" stopColor="#111417" />
            </>
          )}
        </linearGradient>
      </defs>
      {/* aste che avvolgono la testa */}
      <path d="M29.5 45c1-3 3-4 5-4M70.5 45c-1-3-3-4-5-4" stroke="#aeb3b9" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* montatura a mascherina */}
      <path d="M33 42c5-3 12-3.5 17-2 5-1.5 12-1 17 2 1 3 0 7-3 9-4 2-9 1.5-12-1-1-1-3-1-4 0-3 2.5-8 3-12 1-3-2-4-6-3-9z" fill="url(#montatura-argento)" />
      {/* lenti a goccia */}
      <path d="M36 43.5c3-1.5 8-1.6 11.5-.4.5 2.5-.5 5-3 6-3 1-6.5.5-8-1.6-.8-1.2-.9-2.8-.5-4z" fill={`url(#${id})`} />
      <path d="M64 43.5c-3-1.5-8-1.6-11.5-.4-.5 2.5.5 5 3 6 3 1 6.5.5 8-1.6.8-1.2.9-2.8.5-4z" fill={`url(#${id})`} />
      {/* riflesso */}
      <path d="M38 44.5l4-.6M55 44l4 .3" stroke="#fff" strokeOpacity={olografici ? 0.9 : 0.5} strokeWidth="1" strokeLinecap="round" />
    </g>
  );
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
    case 5: // rasati
      return dietro ? null : <path d="M31 40c1-12 9-19 19-19s18 7 19 19c-6-4-12-6-19-6s-13 2-19 6z" fill={c} opacity=".55" />;
    case 6: // cresta
      return dietro ? null : (
        <g fill={c}>
          <path d="M31 40c1-12 9-19 19-19s18 7 19 19c-6-4-12-6-19-6s-13 2-19 6z" opacity=".45" />
          <path d="M43 32l-1-14 5 7 2-15 4 13 4-11 1 14 4-6-2 14c-5-3-12-4-17-2z" />
        </g>
      );
    case 7: // afro
      return dietro ? (
        <circle cx="50" cy="36" r="29" fill={c} />
      ) : (
        <path d="M30 43c0-14 9-22 20-22s20 8 20 22c-5-6-12-9-20-9s-15 3-20 9z" fill={c} />
      );
    case 8: // ciuffo
      return dietro ? null : (
        <path d="M30 43c-2-14 5-25 18-27 9-2 16 1 21-5 4 7 2 15-4 19 3 3 5 7 5 13-6-7-13-10-21-10-8 0-14 3-19 10z" fill={c} />
      );
    case 9: // codini
      return dietro ? (
        <g fill={c}>
          <ellipse cx="22" cy="54" rx="7" ry="12" transform="rotate(18 22 54)" />
          <ellipse cx="78" cy="54" rx="7" ry="12" transform="rotate(-18 78 54)" />
          <circle cx="27" cy="43" r="3" fill="#e5481e" />
          <circle cx="73" cy="43" r="3" fill="#e5481e" />
        </g>
      ) : (
        <path d="M30 41c0-13 9-21 20-21s20 8 20 21c-4-5-9-8-14-8l-6 4-6-4c-5 0-10 3-14 8z" fill={c} />
      );
    case 10: // treccia
      return dietro ? (
        <g fill={c}>
          <path d="M27 44c0-16 10-25 23-25s23 9 23 25v6H27z" />
          {[52, 60, 68, 76, 84].map((y, i) => (
            <ellipse key={y} cx={68 - i * 0.5} cy={y} rx="6" ry="5" />
          ))}
        </g>
      ) : (
        <path d="M29 44c0-15 9-24 21-24s21 9 21 24c-6-8-16-12-30-10-5 2-9 5-12 10z" fill={c} />
      );
    case 11: // spettinati
      return dietro ? null : (
        <path d="M30 42l-3-12 8 2-1-11 8 5 4-10 5 9 6-8 2 10 8-5-2 10 8-1-3 11c-5-8-12-11-20-11s-15 3-20 11z" fill={c} />
      );
    default: // super (premio): punte enormi a ventaglio
      return dietro ? (
        <g>
          <path d="M31 52L6 48l20-8L3 28l25 1-12-19 22 11 3-19 12 16 12-15 2 19 20-10-10 18 24 2-21 11 18 9-24 4z" fill={c} />
          {/* riflessi grigi su un lato delle punte */}
          <path d="M32 26L18 13l17 9zM42 21l-1-14 5 13zM8 30l20 1-17 2zM65 25l8-9-4 11z" fill="#fff" opacity=".22" />
        </g>
      ) : (
        <g>
          <path d="M29 44c-1-13 8-22 21-22s22 9 21 22l-6-6 1 9-7-9-2 7-5-9-3 8-4-9-3 8-3-7-3 8-1-8z" fill={c} />
          <path d="M36 35l-2 8 3-6zM48 31l-2 8 3-6z" fill="#fff" opacity=".22" />
        </g>
      );
  }
}

function Barba({ tipo, c }: { tipo: number; c: string }) {
  switch (tipo) {
    case 1: // corta
      return <path d="M31 47c0 13 8 20 19 20s19-7 19-20c-2 5-5 9-9 10-3-1-6-1-10-1s-7 0-10 1c-4-1-7-5-9-10z" fill={c} />;
    case 2: // folta
      return <path d="M30 44c-1 18 7 30 20 30s21-12 20-30c-2 7-6 12-10 13-3-1-6-1-10-1s-7 0-10 1c-4-1-8-6-10-13z" fill={c} />;
    case 3: // baffoni a manubrio
      return <path d="M50 51c-3 0-6 1-8 3-2 2-6 2-7-1-1 4 3 7 7 6 3-1 5-3 8-3s5 2 8 3c4 1 8-2 7-6-1 3-5 3-7 1-2-2-5-3-8-3z" fill={c} />;
    case 4: // pizzetto
      return (
        <g fill={c}>
          <path d="M44 52c2-1 4-2 6-2s4 1 6 2c-2 1-4 1-6 1s-4 0-6-1z" />
          <path d="M46 59c1 4 2 7 4 7s3-3 4-7c-1 1-3 1-4 1s-3 0-4-1z" />
        </g>
      );
    default:
      return null;
  }
}

function Occhiali({ tipo }: { tipo: number }) {
  if (tipo === 1)
    return (
      <g fill="#fff" fillOpacity=".2" stroke="#1c241d" strokeWidth="1.6">
        <circle cx="43" cy="47" r="5" />
        <circle cx="57" cy="47" r="5" />
        <path d="M48 47h4M38 46l-7-2M62 46l7-2" fill="none" />
      </g>
    );
  if (tipo === 2)
    return (
      <g fill="#fff" fillOpacity=".25" stroke="#e5481e" strokeWidth="2">
        <rect x="35" y="41" width="13" height="11" rx="5" />
        <rect x="52" y="41" width="13" height="11" rx="5" />
        <path d="M48 46h4M35 45l-5-2M65 45l5-2" fill="none" />
      </g>
    );
  return null;
}

// Calendario appeso dietro il personaggio (premio "Così ti ricordi i compleanni").
function Calendario() {
  return (
    <g transform="rotate(-7 19 32)">
      <rect x="7" y="20" width="24" height="25" rx="2.5" fill="#fffaf0" />
      <rect x="7" y="20" width="24" height="7" rx="2.5" fill="#e5481e" />
      <rect x="7" y="24" width="24" height="3" fill="#e5481e" />
      <rect x="12" y="17.5" width="2" height="5" rx="1" fill="#1c241d" />
      <rect x="24" y="17.5" width="2" height="5" rx="1" fill="#1c241d" />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3].map((c) => <rect key={`${r}-${c}`} x={9.5 + c * 5} y={29.5 + r * 3.8} width="3.4" height="2.4" rx=".5" fill="#2c4a32" opacity=".35" />),
      )}
      <circle cx="21.2" cy="34.5" r="2.8" fill="none" stroke="#e5481e" strokeWidth="1.1" />
    </g>
  );
}

export function Avatar({ look, className, titolo }: { look: Look; className?: string; titolo?: string }) {
  const pelle = PELLI[look.pelle];
  const capelli = COLORI_CAPELLI[look.coloreCapelli];
  const maglia = MAGLIONI[look.maglione];
  const filo = look.maglione === 2 || look.maglione === 4 ? "#2c4a32" : "#f3e8cf";
  const ha = (a: string) => look.accessori.includes(a);
  const olografico = look.coloreCapelli === COLORE_OLOGRAFICO;
  return (
    <svg viewBox="0 0 100 100" className={className} role={titolo ? "img" : undefined} aria-label={titolo} aria-hidden={titolo ? undefined : true}>
      {olografico && (
        <defs>
          <linearGradient id="avatar-olografico" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff4fae" />
            <stop offset=".3" stopColor="#2fb8ff" />
            <stop offset=".55" stopColor="#8a5cff" />
            <stop offset=".8" stopColor="#ffc92e" />
            <stop offset="1" stopColor="#1fd69a" />
          </linearGradient>
        </defs>
      )}
      {ha("stellina") && <Calendario />}
      {/* capelli dietro */}
      <g className={olografico ? "capelli-olografici" : undefined}>
        <Capelli stile={look.capelli} c={capelli} dietro />
      </g>
      {/* spalle e maglione (o il lupetto grigio, se indossato) */}
      {ha("sciarpa") ? (
        <g>
          <path d="M14 100c0-18 14-30 36-30s36 12 36 30z" fill="#8e9298" />
          {[24, 32, 40, 48, 56, 64, 72].map((x) => (
            <path key={x} d={`M${x} ${84 - Math.abs(x - 48) * 0.18}v16`} stroke="#7a7e84" strokeWidth="1.4" />
          ))}
        </g>
      ) : (
        <>
          <path d="M14 100c0-18 14-30 36-30s36 12 36 30z" fill={maglia} />
      <path d="M18 92c8-4 20-6 32-6s24 2 32 6" fill="none" stroke={filo} strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" opacity=".9" />
      {[26, 38, 50, 62, 74].map((x) => (
        <path key={x} d={`M${x - 3} 96l3-4 3 4-3 4z`} fill={filo} opacity=".9" />
      ))}
        </>
      )}
      {/* collo */}
      <rect x="44" y="62" width="12" height="12" rx="5" fill={scurisci(pelle, 0.9)} />
      {ha("sciarpa") && (
        // collo alto arrotolato del lupetto
        <g>
          <rect x="37" y="61" width="26" height="14" rx="6" fill="#8e9298" />
          <path d="M39 65.5h22M39 69.5h22" stroke="#7a7e84" strokeWidth="1.3" />
        </g>
      )}
      {/* testa */}
      <g fill={pelle}>
        <circle cx="30.5" cy="47" r="3.5" />
        <circle cx="69.5" cy="47" r="3.5" />
        <circle cx="50" cy="45" r="20" />
      </g>
      <g className={olografico ? "capelli-olografici" : undefined}>
        <Barba tipo={look.barba} c={capelli} />
      </g>
      {/* viso */}
      <circle cx="43" cy="47" r="2.2" fill="#1c241d" />
      <circle cx="57" cy="47" r="2.2" fill="#1c241d" />
      <circle cx="39" cy="53" r="3.6" fill="#e5481e" opacity=".28" />
      <circle cx="61" cy="53" r="3.6" fill="#e5481e" opacity=".28" />
      {/* il sorriso: con la barba piena non si vede (è coperto) */}
      {look.barba !== 1 && look.barba !== 2 && (
        <path d="M46 55c2 2.4 6 2.4 8 0" fill="none" stroke="#1c241d" strokeWidth="1.8" strokeLinecap="round" />
      )}
      {ha("occhiali") || ha("occhiali_olo") ? <OcchialiVeloci olografici={ha("occhiali_olo")} /> : <Occhiali tipo={look.occhiali} />}
      {/* capelli davanti */}
      <g className={olografico ? "capelli-olografici" : undefined}>
        <Capelli stile={look.capelli} c={capelli} dietro={false} />
      </g>

      {/* accessori */}
      {ha("sciarpa") && (
        // cartellino del reso che dondola
        <g className="cartellino">
          <path d="M60 68c3 3 4 7 4 11" fill="none" stroke="#1c241d" strokeWidth=".8" />
          <path d="M61 79l6-1 1.5 9-6 1z" fill="#cdb48a" />
          <circle cx="64.3" cy="80.6" r=".9" fill="#8e9298" />
          <path d="M62.6 84.4l3.8-.6" stroke="#e5481e" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )}
      {ha("fiocco") && (
        // perline grosse, strette al collo: bracciale o collana?
        <g>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const t = Math.PI * (0.08 + (0.84 * i) / 6);
            return <circle key={i} cx={50 - 11 * Math.cos(t)} cy={68 + 4.5 * Math.sin(t)} r="2.8" fill="#ffffff" />;
          })}
        </g>
      )}
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
  totem,
}: {
  look: Look | null;
  dimensione?: number;
  cliccabile?: boolean;
  novita?: boolean;
  nome?: string;
  totem?: { profilo: Profilo; nome: string; immagine?: string | null } | null; // il badge del totem accanto al personaggio
}) {
  const toppa = (
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
  if (!totem) return toppa;
  return (
    <span className="relative inline-flex flex-none">
      {toppa}
      <BadgeTotem profilo={totem.profilo} nome={totem.nome} immagine={totem.immagine} dimensione={Math.round(dimensione * 0.42)} className="pointer-events-none absolute -right-1 -bottom-1" />
    </span>
  );
}

// Dalla lista dei profili (user_id, look) al look di una persona; null se non è ancora entrata.
export function lookDi(profili: { user_id: string; look: unknown }[] | null, userId: string | null): Look | null {
  if (!userId) return null;
  return normalizzaLook(profili?.find((p) => p.user_id === userId)?.look, userId);
}
