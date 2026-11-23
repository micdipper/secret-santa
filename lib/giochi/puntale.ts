// Gioco 10 · IL PUNTALE (PIANO-GIOCHI.md sezione 10, blocco E)
// Tieni premuto per caricare il lancio della stella (la carica sale e scende), lascia per lanciarla dritta in su:
// deve arrivare all'altezza giusta proprio quando la cima dell'albero, che ondeggia, passa sopra di te.
// Se la stella sale troppo, ricadendo può ancora infilarsi sulla punta (vale metà).
// 10 lanci; ogni albero ha un'altezza diversa e ondeggia di più. Da 20 a 100 punti a lancio (più è centrata
// più vale), +20 se perfetto, +10 per ogni centro di fila.
import { casuale, limita, mescola, type Evento, type Gioco, type Mondo } from "./base.ts";

// ----- costanti (taratura) -----
export const LANCI = 10;
export const PERIODO = 1.6; // s: la carica sale da 0 a 1 e ridiscende in un periodo
export const VOLO = 0.55; // s dal lancio all'arrivo in cima
const TOLLERANZA_X = 44; // px di lato: oltre, la stella manca la punta
const TOLLERANZA_Y = 40; // px in altezza
const PERFETTO = 8; // px
const MINIMO = 20; // punti di una stella presa proprio al bordo
const CADUTA = 1400; // px/s²: la stella che è salita troppo ricade
const DISCESA = 0.5; // presa mentre ricade: vale la metà
const ONDEGGIA = [
  [0.18, 1.1],
  [0.36, 2.4],
]; // [ampiezza in frazioni di larghezza, velocità rad/s], dal primo all'ultimo lancio
const ALTEZZA = [0.45, 0.78]; // altezza della cima (frazione dell'altezza utile) tra cui si sceglie
const ESITO = 1.1; // s in cui si vede com'è andata
const PUNTI = 100;
const PUNTI_PERFETTO = 20;
const PUNTI_SERIE = 10;

export type StatoPuntale = {
  caso: () => number;
  t: number;
  lancio: number; // 0..LANCI-1
  fase: "pronto" | "carica" | "volo" | "cade" | "esito";
  dito: number; // id del dito che carica
  inizio: number; // istante della pressione
  partenza: number; // istante del lancio
  carica: number; // carica al lancio (0..1)
  altezza: number; // altezza della cima per questo lancio (frazione)
  amp: number;
  vel: number;
  fase0: number;
  esito: { preso: boolean; ex: number; ey: number; punti: number; y: number } | null;
  serie: number;
  punti: number;
  conti: { presi: number; perfetti: number };
  fine: boolean;
  eventi: Evento[];
};

// geometria (anche per il bot): base dell'albero, cima, punto di lancio, altezza massima del lancio
export function geometria(s: StatoPuntale, m: Mondo) {
  const terra = m.h - m.sotto - 30;
  const utile = terra - m.sopra - 40;
  const xLancio = m.w / 2;
  return {
    terra,
    xLancio,
    hMax: utile,
    yCima: terra - s.altezza * utile,
    xCima: (t: number) => m.w / 2 + Math.sin(t * s.vel + s.fase0) * s.amp * m.w,
  };
}

export const caricaDopo = (d: number) => {
  const k = (d / PERIODO) % 1;
  return k < 0.5 ? k * 2 : 2 - k * 2;
};

function nuovoLancio(s: StatoPuntale) {
  const k = s.lancio / (LANCI - 1);
  s.amp = mescola(ONDEGGIA[0][0], ONDEGGIA[1][0], k);
  s.vel = mescola(ONDEGGIA[0][1], ONDEGGIA[1][1], k);
  s.fase0 = s.caso() * 6.28;
  s.altezza = mescola(ALTEZZA[0], ALTEZZA[1], s.caso());
  s.fase = "pronto";
  s.esito = null;
}

// la stella è all'altezza della punta (o non ci arriverà più): presa o mancata, e quanti punti
function valuta(s: StatoPuntale, g: ReturnType<typeof geometria>, ey: number, fattore: number, y: number) {
  const ex = Math.abs(g.xCima(s.t) - g.xLancio);
  const preso = ex <= TOLLERANZA_X && ey <= TOLLERANZA_Y;
  let p = 0;
  if (preso) {
    // più è lontana dal centro, meno vale (scende in fretta: centrarla conta)
    const k = Math.max(ex / TOLLERANZA_X, ey / TOLLERANZA_Y);
    p = Math.round((MINIMO + (PUNTI - MINIMO) * (1 - k) * (1 - k)) * fattore);
    const perfetto = fattore === 1 && ex <= PERFETTO && ey <= PERFETTO;
    if (perfetto) {
      p += PUNTI_PERFETTO;
      s.conti.perfetti++;
    }
    p += PUNTI_SERIE * s.serie;
    s.serie++;
    s.conti.presi++;
    const testo = perfetto ? `Perfetto! +${p}` : fattore < 1 ? `Al volo! +${p}` : `+${p}`;
    s.eventi.push({ tipo: perfetto ? "perfetto" : "preso", x: g.xLancio, y: g.yCima, testo, livello: s.serie });
  } else {
    s.serie = 0;
    s.eventi.push({ tipo: "mancato", x: g.xLancio, y });
  }
  s.punti += p;
  s.esito = { preso, ex, ey, punti: p, y };
  s.fase = "esito";
  s.partenza = s.t;
}

export const puntale: Gioco<StatoPuntale> = {
  crea(seme) {
    const s: StatoPuntale = { caso: casuale(seme), t: 0, lancio: 0, fase: "pronto", dito: -1, inizio: 0, partenza: 0, carica: 0, altezza: 0.6, amp: 0, vel: 0, fase0: 0, esito: null, serie: 0, punti: 0, conti: { presi: 0, perfetti: 0 }, fine: false, eventi: [] };
    nuovoLancio(s);
    return s;
  },

  aggiorna(s, dt, tocchi, m) {
    if (s.fine) return;
    s.t += dt;
    const g = geometria(s, m);
    for (const tc of tocchi) {
      if (s.fase === "pronto" && tc.tipo === "giu") {
        s.fase = "carica";
        s.dito = tc.id;
        s.inizio = s.t;
      } else if (s.fase === "carica" && tc.tipo === "su" && tc.id === s.dito) {
        s.fase = "volo";
        s.partenza = s.t;
        s.carica = caricaDopo(s.t - s.inizio);
        s.eventi.push({ tipo: "lancio" });
      }
    }
    const yCima = g.terra - s.carica * g.hMax; // dove arriva la stella
    if (s.fase === "volo" && s.t - s.partenza >= VOLO) {
      const ey = Math.abs(yCima - g.yCima);
      if (ey <= TOLLERANZA_Y) valuta(s, g, ey, 1, g.yCima);
      else if (yCima < g.yCima) s.fase = "cade"; // troppo in alto: ricade, magari sulla punta
      else valuta(s, g, ey, 1, yCima); // troppo in basso: mancata
    }
    if (s.fase === "cade") {
      const tau = s.t - s.partenza - VOLO;
      const y = yCima + 0.5 * CADUTA * tau * tau;
      // quando la stella ricadendo arriva all'altezza della punta: presa o no
      if (y >= g.yCima) valuta(s, g, 0, DISCESA, g.yCima);
    }
    if (s.fase === "esito" && s.t - s.partenza >= ESITO) {
      s.lancio++;
      if (s.lancio >= LANCI) s.fine = true;
      else nuovoLancio(s);
    }
  },

  finito: (s) => s.fine,
  hud: (s) => ({ punteggio: s.punti, etichetta: `${Math.min(LANCI, s.lancio + 1)} di ${LANCI}` }),
  eventi: (s) => s.eventi,
  stats: (s) => ({ ...s.conti }),

  disegna(ctx, s, m) {
    ctx.clearRect(-20, -20, m.w + 40, m.h + 40);
    const g = geometria(s, m);
    // l'albero: dalla base fissa alla cima che ondeggia (la punta "ferma" mentre si vede l'esito)
    const xc = s.fase === "esito" && s.esito?.preso ? g.xLancio : g.xCima(s.t);
    const strati = 5;
    for (let i = 0; i < strati; i++) {
      const k0 = i / strati;
      const k1 = (i + 1) / strati;
      const yb = mescola(g.terra, g.yCima, k0);
      const yt = mescola(g.terra, g.yCima, k1) - 4;
      const xb = mescola(m.w / 2, xc, k0 * k0);
      const xt = mescola(m.w / 2, xc, k1 * k1);
      const lb = mescola(m.w * 0.3, 14, k0);
      ctx.fillStyle = i % 2 ? "#2f6b45" : "#24583a";
      ctx.beginPath();
      ctx.moveTo(xb - lb, yb);
      ctx.lineTo(xt, yt);
      ctx.lineTo(xb + lb, yb);
      ctx.closePath();
      ctx.fill();
      // filo di lucine
      ctx.fillStyle = ["#f6c94a", "#e5481e", "#fbf6ea"][i % 3];
      for (let j = -2; j <= 2; j++) {
        ctx.beginPath();
        ctx.arc(xb + (j * lb) / 3, yb - 6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#7a4a1d";
    ctx.fillRect(m.w / 2 - 12, g.terra, 24, 20);
    // cerchio del bersaglio sulla cima
    ctx.strokeStyle = "rgba(251,246,234,.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(xc, g.yCima, TOLLERANZA_X * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // il punto di lancio: una riga tratteggiata verticale
    ctx.strokeStyle = "rgba(246,201,74,.35)";
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    ctx.moveTo(g.xLancio, g.terra + 20);
    ctx.lineTo(g.xLancio, m.sopra);
    ctx.stroke();
    ctx.setLineDash([]);

    // la stella
    let ys = g.terra + 10;
    let xs = g.xLancio;
    if (s.fase === "volo") {
      const k = limita((s.t - s.partenza) / VOLO, 0, 1);
      ys = mescola(g.terra + 10, g.terra - s.carica * g.hMax, 1 - (1 - k) * (1 - k));
    } else if (s.fase === "cade") {
      const tau = s.t - s.partenza - VOLO;
      ys = g.terra - s.carica * g.hMax + 0.5 * CADUTA * tau * tau;
    } else if (s.fase === "esito" && s.esito) {
      const k = s.t - s.partenza;
      if (s.esito.preso) {
        ys = g.yCima - 10;
      } else {
        ys = s.esito.y + 0.5 * CADUTA * k * k;
        xs = g.xLancio + k * 60;
      }
    }
    if (ys < m.h + 30) disegnaStella(ctx, xs, ys, 18, s.t);

    // la barra della carica, a sinistra (dalla terra fino al punto più alto raggiungibile)
    const c = s.fase === "carica" ? caricaDopo(s.t - s.inizio) : s.fase === "pronto" ? 0 : s.carica;
    const bx = 24;
    const by = g.terra;
    const bh = g.hMax; // la barra è alta quanto il lancio: il giallo arriva dove arriverà la stella
    ctx.fillStyle = "rgba(251,246,234,.2)";
    ctx.beginPath();
    ctx.roundRect(bx - 8, by - bh, 16, bh, 8);
    ctx.fill();
    ctx.fillStyle = "#f6c94a";
    ctx.beginPath();
    ctx.roundRect(bx - 8, by - bh * c, 16, bh * c, 8);
    ctx.fill();
    // tacca all'altezza della cima
    ctx.fillStyle = "#fbf6ea";
    ctx.fillRect(bx - 14, g.yCima - 1.5, 28, 3);
    if (s.fase === "pronto" && s.lancio === 0) {
      ctx.fillStyle = "rgba(251,246,234,.85)";
      ctx.font = `600 16px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Tieni premuto, poi lascia", m.w / 2, m.sopra + 16);
    }
  },

  effetto(e, fx) {
    if (e.tipo === "lancio") fx.suono("lancio");
    else if (e.tipo === "preso" || e.tipo === "perfetto") {
      fx.scoppio(e.x!, e.y!, ["#f6c94a", "#fbf6ea", "#e5481e"], e.tipo === "perfetto" ? 36 : 18);
      fx.testo(e.x!, e.y! - 40, e.testo!, "#f6c94a", e.tipo === "perfetto" ? 28 : 24);
      fx.suono(e.tipo === "perfetto" ? "perfetto" : "colpo", e.livello ?? 1);
    } else if (e.tipo === "mancato") {
      fx.testo(e.x!, e.y! - 30, "mancato!", "#e5481e", 24);
      fx.suono("sbaglio");
    }
  },
};

function disegnaStella(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 3) * 0.15);
  ctx.fillStyle = "#f6c94a";
  ctx.strokeStyle = "#fbf6ea";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
