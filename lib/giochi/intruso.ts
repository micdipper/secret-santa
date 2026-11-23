// Gioco 9 · TROVA L'INTRUSO (PIANO-GIOCHI.md sezione 10, blocco E)
// Tante palline dell'albero uguali e una sola un po' diversa: toccala. Ogni volta le palline sono di più
// e l'intrusa somiglia di più alle altre. 60 secondi; un tocco sbagliato toglie 3 secondi.
import { casuale, limita, mescola, type Evento, type Gioco, type Mondo } from "./base.ts";

// ----- costanti (taratura) -----
const DURATA = 60; // s
const MALUS = 3; // s tolti per un tocco sbagliato
const LATO = [3, 7]; // palline per lato (colonne), dal primo turno al TURNI_MAX
const TURNI_MAX = 24; // dopo questo turno la difficoltà non sale più
const DIFFERENZA = [26, 6]; // differenza di luminosità dell'intrusa (punti percentuali)
const PUNTI = 10; // + 1 per turno
const COLORI = [0, 140, 42, 210, 330, 25]; // tinte (rosso, verde, oro, blu, rosa, arancio)

export type StatoIntruso = {
  caso: () => number;
  t: number;
  fine_t: number;
  turno: number;
  cols: number;
  righe: number;
  intrusa: number;
  tinta: number;
  luce: number; // luminosità delle palline (%)
  diff: number; // + o − sulla luminosità dell'intrusa
  nato: number; // inizio del turno (per l'animazione)
  sbaglio: { i: number; t: number } | null;
  punti: number;
  conti: { giuste: number; sbagli: number };
  fine: boolean;
  eventi: Evento[];
};

export function geometria(s: StatoIntruso, m: Mondo) {
  const largo = m.w - 32;
  const alto = m.h - m.sopra - m.sotto - 24;
  const passo = Math.min(largo / s.cols, alto / s.righe);
  const r = passo * 0.4;
  const x0 = (m.w - passo * s.cols) / 2 + passo / 2;
  const y0 = m.sopra + 12 + (alto - passo * s.righe) / 2 + passo / 2;
  return { r, passo, centro: (i: number) => ({ x: x0 + (i % s.cols) * passo, y: y0 + Math.floor(i / s.cols) * passo }) };
}

function nuovoTurno(s: StatoIntruso, m: Mondo) {
  const k = limita(s.turno / TURNI_MAX, 0, 1);
  s.cols = Math.round(mescola(LATO[0], LATO[1], k));
  // le righe riempiono lo schermo con palline più o meno tonde
  const alto = m.h - m.sopra - m.sotto - 24;
  s.righe = limita(Math.floor(alto / ((m.w - 32) / s.cols)), s.cols, s.cols + 4);
  s.intrusa = Math.floor(s.caso() * s.cols * s.righe);
  s.tinta = COLORI[Math.floor(s.caso() * COLORI.length)];
  s.luce = 42 + s.caso() * 14;
  s.diff = (s.caso() < 0.5 ? -1 : 1) * mescola(DIFFERENZA[0], DIFFERENZA[1], k);
  s.nato = s.t;
  s.sbaglio = null;
}

export const intruso: Gioco<StatoIntruso> = {
  crea(seme, m) {
    const s: StatoIntruso = { caso: casuale(seme), t: 0, fine_t: DURATA, turno: 0, cols: 3, righe: 3, intrusa: 0, tinta: 0, luce: 50, diff: 20, nato: 0, sbaglio: null, punti: 0, conti: { giuste: 0, sbagli: 0 }, fine: false, eventi: [] };
    nuovoTurno(s, m);
    return s;
  },

  aggiorna(s, dt, tocchi, m) {
    if (s.fine) return;
    s.t += dt;
    const g = geometria(s, m);
    for (const tc of tocchi) {
      if (tc.tipo !== "giu") continue;
      let i = -1;
      for (let k = 0; k < s.cols * s.righe; k++) {
        const c = g.centro(k);
        if (Math.abs(tc.x - c.x) <= g.passo / 2 && Math.abs(tc.y - c.y) <= g.passo / 2) i = k;
      }
      if (i < 0) continue;
      const c = g.centro(i);
      if (i === s.intrusa) {
        const p = PUNTI + s.turno;
        s.punti += p;
        s.conti.giuste++;
        s.eventi.push({ tipo: "giusta", x: c.x, y: c.y, testo: `+${p}`, livello: s.conti.giuste });
        s.turno++;
        nuovoTurno(s, m);
        return;
      }
      s.fine_t -= MALUS;
      s.conti.sbagli++;
      s.sbaglio = { i, t: s.t };
      s.eventi.push({ tipo: "sbaglio", x: c.x, y: c.y, testo: `−${MALUS} s` });
    }
    if (s.t >= s.fine_t) s.fine = true;
  },

  finito: (s) => s.fine,
  hud: (s) => ({ punteggio: s.punti, tempo: Math.max(0, s.fine_t - s.t) }),
  eventi: (s) => s.eventi,
  stats: (s) => ({ ...s.conti }),

  disegna(ctx, s, m, riduci) {
    ctx.clearRect(-20, -20, m.w + 40, m.h + 40);
    const g = geometria(s, m);
    const entra = riduci ? 1 : limita((s.t - s.nato) / 0.25, 0, 1);
    for (let i = 0; i < s.cols * s.righe; i++) {
      const { x, y } = g.centro(i);
      const l = s.luce + (i === s.intrusa ? s.diff : 0);
      let dx = 0;
      if (s.sbaglio?.i === i && s.t - s.sbaglio.t < 0.35) dx = Math.sin((s.t - s.sbaglio.t) * 60) * 5;
      const r = g.r * (0.6 + 0.4 * entra);
      ctx.save();
      ctx.translate(x + dx, y);
      // filo e cappuccio
      ctx.fillStyle = "#cdb48a";
      ctx.fillRect(-r * 0.22, -r * 1.12, r * 0.44, r * 0.25);
      const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
      grad.addColorStop(0, `hsl(${s.tinta} 70% ${Math.min(95, l + 25)}%)`);
      grad.addColorStop(1, `hsl(${s.tinta} 70% ${l}%)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  effetto(e, fx) {
    if (e.tipo === "giusta") {
      fx.scoppio(e.x!, e.y!, ["#f6c94a", "#fbf6ea"], 18);
      fx.testo(e.x!, e.y! - 30, e.testo!, "#f6c94a");
      fx.suono("colpo", e.livello ?? 0);
    } else if (e.tipo === "sbaglio") {
      fx.testo(e.x!, e.y! - 30, e.testo!, "#e5481e", 26);
      fx.trema(8);
      fx.suono("sbaglio");
    }
  },
};
