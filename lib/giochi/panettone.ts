// Gioco 6 · AFFETTA IL PANETTONE (PIANO-GIOCHI.md sezione 10, blocco E)
// Dal basso vengono lanciati in aria panettoni e pandori: si affettano strisciando il dito.
// Mai il carbone: tagliarlo costa un cuore. Un dolce che ricade giù intero costa un cuore.
// 3 cuori, 45 secondi. Più dolci nella stessa strisciata = punti che salgono (10, 20, 30…).
// Raro panettone d'oro: +50.
import { casuale, limita, mescola, type Evento, type Gioco, type Mondo, type Tocco } from "./base.ts";

// ----- costanti (taratura) -----
const DURATA = 45; // s
const VITE = 3;
const GRAVITA = 900; // px/s²
const OGNI = [1.1, 0.5]; // s tra un lancio e l'altro, dall'inizio alla fine
const QUANTI = [
  [1, 2],
  [2, 5],
]; // dolci per lancio [min, max], dall'inizio alla fine
const CARBONE_DA = 4; // s: da qui può volare il carbone…
const P_CARBONE = [0.14, 0.3]; // …con questa probabilità per pezzo
const P_ORO = 0.035;
const RAGGIO = { panettone: 34, pandoro: 32, oro: 30, carbone: 26 };
const MARGINE_TAGLIO = 6; // px in più intorno al dolce
const PUNTI = 10;
const PUNTI_ORO = 50;

export type Tipo = "panettone" | "pandoro" | "oro" | "carbone";
export type Dolce = { id: number; tipo: Tipo; x: number; y: number; vx: number; vy: number; ang: number; va: number; nato: number; vivo: boolean };
type Pezzo = { tipo: Tipo; x: number; y: number; vx: number; vy: number; ang: number; va: number; taglio: number; lato: 1 | -1; vita: number };
type Scia = { x: number; y: number; t: number };

export type StatoPanettone = {
  caso: () => number;
  t: number;
  prossimo: number;
  dolci: Dolce[];
  pezzi: Pezzo[];
  prossimoId: number;
  punti: number;
  vite: number;
  // la strisciata in corso (un dito alla volta: gli altri si ignorano)
  dito: { id: number; x: number; y: number; presi: number } | null;
  scia: Scia[];
  conti: { dolci: number; oro: number; carbone: number; caduti: number; strisciate: number; combo: number };
  fine: boolean;
  eventi: Evento[];
};

export const raggio = (t: Tipo) => RAGGIO[t];
const buono = (t: Tipo) => t !== "carbone";

function lancia(s: StatoPanettone, m: Mondo) {
  const k = limita(s.t / DURATA, 0, 1);
  const [min, max] = [Math.round(mescola(QUANTI[0][0], QUANTI[1][0], k)), Math.round(mescola(QUANTI[0][1], QUANTI[1][1], k))];
  const quanti = min + Math.floor(s.caso() * (max - min + 1));
  const alto = m.sopra + 30; // la cima più alta possibile
  for (let i = 0; i < quanti; i++) {
    let tipo: Tipo = s.caso() < 0.55 ? "panettone" : "pandoro";
    if (s.t >= CARBONE_DA && s.caso() < mescola(P_CARBONE[0], P_CARBONE[1], k)) tipo = "carbone";
    else if (s.caso() < P_ORO) tipo = "oro";
    const r = RAGGIO[tipo];
    const x = mescola(m.w * 0.14, m.w * 0.86, s.caso());
    // la cima tra il 15% e il 50% dell'altezza
    const cima = mescola(alto, Math.max(alto + 40, m.h * 0.5), s.caso());
    const y = m.h + r;
    const vy = -Math.sqrt(2 * GRAVITA * (y - cima));
    const volo = (2 * -vy) / GRAVITA;
    // verso il centro, senza uscire dai lati
    const dest = mescola(m.w * 0.2, m.w * 0.8, s.caso());
    const vx = (dest - x) / volo;
    s.dolci.push({ id: s.prossimoId++, tipo, x, y: y + i * 6, vx, vy, ang: s.caso() * 6.28, va: (s.caso() - 0.5) * 5, nato: s.t + i * 0.12, vivo: true });
  }
}

// il dolce viene tagliato lungo la direzione della strisciata: due metà che si allontanano
function affetta(s: StatoPanettone, d: Dolce, dx: number, dy: number) {
  d.vivo = false;
  const taglio = Math.atan2(dy, dx);
  const nx = -Math.sin(taglio);
  const ny = Math.cos(taglio);
  for (const lato of [1, -1] as const) {
    s.pezzi.push({ tipo: d.tipo, x: d.x, y: d.y, vx: d.vx * 0.5 + nx * lato * 90, vy: Math.min(d.vy, 0) * 0.4 + ny * lato * 90 - 60, ang: 0, va: lato * 3, taglio, lato, vita: 0 });
  }
}

// distanza del punto (px, py) dal tratto da (ax, ay) a (bx, by)
function distanzaDalTratto(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const l = dx * dx + dy * dy;
  const t = l ? limita(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function tratto(s: StatoPanettone, a: { x: number; y: number }, b: Tocco) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx * dx + dy * dy < 4) return; // fermo: non taglia
  for (const d of s.dolci) {
    if (!d.vivo || d.nato > s.t) continue;
    if (distanzaDalTratto(d.x, d.y, a.x, a.y, b.x, b.y) > RAGGIO[d.tipo] + MARGINE_TAGLIO) continue;
    affetta(s, d, dx, dy);
    if (d.tipo === "carbone") {
      s.vite--;
      s.conti.carbone++;
      s.eventi.push({ tipo: "carbone", x: d.x, y: d.y });
      if (s.vite <= 0) {
        s.fine = true;
        return;
      }
      continue;
    }
    const dito = s.dito!;
    dito.presi++;
    if (dito.presi > 1) s.conti.combo++;
    const p = d.tipo === "oro" ? PUNTI_ORO : PUNTI * Math.min(dito.presi, 5);
    s.punti += p;
    s.conti.dolci++;
    if (d.tipo === "oro") s.conti.oro++;
    s.eventi.push({ tipo: d.tipo === "oro" ? "oro" : "fetta", x: d.x, y: d.y, testo: `+${p}`, livello: dito.presi });
  }
}

export const panettone: Gioco<StatoPanettone> = {
  crea(seme) {
    return {
      caso: casuale(seme),
      t: 0,
      prossimo: 0.5,
      dolci: [],
      pezzi: [],
      prossimoId: 0,
      punti: 0,
      vite: VITE,
      dito: null,
      scia: [],
      conti: { dolci: 0, oro: 0, carbone: 0, caduti: 0, strisciate: 0, combo: 0 },
      fine: false,
      eventi: [],
    };
  },

  aggiorna(s, dt, tocchi, m) {
    if (s.fine) return;
    s.t += dt;
    if (s.t >= s.prossimo && s.t < DURATA - 1.5) {
      lancia(s, m);
      s.prossimo = s.t + mescola(OGNI[0], OGNI[1], limita(s.t / DURATA, 0, 1));
    }

    // movimento (prima dei tocchi: il dito taglia dove il dolce è ora)
    for (const d of s.dolci) {
      if (!d.vivo || d.nato > s.t) continue;
      d.vy += GRAVITA * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.ang += d.va * dt;
    }

    for (const tc of tocchi) {
      if (tc.tipo === "giu") {
        if (s.dito) continue; // un dito alla volta
        s.dito = { id: tc.id, x: tc.x, y: tc.y, presi: 0 };
        s.conti.strisciate++;
        s.scia = [{ x: tc.x, y: tc.y, t: s.t }];
      } else if (s.dito && tc.id === s.dito.id) {
        tratto(s, s.dito, tc);
        if (s.fine) return;
        s.dito.x = tc.x;
        s.dito.y = tc.y;
        s.scia.push({ x: tc.x, y: tc.y, t: s.t });
        if (tc.tipo === "su") {
          if (s.dito.presi >= 3) s.eventi.push({ tipo: "combo", x: tc.x, y: tc.y, testo: `${s.dito.presi} in un colpo!` });
          s.dito = null;
        }
      }
    }
    // la scia dura un attimo
    while (s.scia.length && s.t - s.scia[0].t > 0.16) s.scia.shift();
    if (s.scia.length > 24) s.scia.splice(0, s.scia.length - 24);

    // dolci ricaduti giù interi: un cuore in meno (il carbone invece sparisce e basta)
    for (const d of s.dolci) {
      if (!d.vivo || d.vy <= 0 || d.y < m.h + RAGGIO[d.tipo] + 4) continue;
      d.vivo = false;
      if (!buono(d.tipo)) continue;
      s.vite--;
      s.conti.caduti++;
      s.eventi.push({ tipo: "caduto", x: limita(d.x, 30, m.w - 30), y: m.h - m.sotto - 30 });
      if (s.vite <= 0) {
        s.fine = true;
        return;
      }
    }
    s.dolci = s.dolci.filter((d) => d.vivo);

    for (const p of s.pezzi) {
      p.vy += GRAVITA * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ang += p.va * dt;
      p.vita += dt;
    }
    s.pezzi = s.pezzi.filter((p) => p.y < m.h + 80);

    if (s.t >= DURATA) s.fine = true;
  },

  finito: (s) => s.fine,
  hud: (s) => ({ punteggio: s.punti, tempo: Math.max(0, DURATA - s.t), vite: s.vite, viteMax: VITE }),
  eventi: (s) => s.eventi,
  stats: (s) => ({ ...s.conti }),

  disegna(ctx, s, m, _riduci, anticipo) {
    ctx.clearRect(-20, -20, m.w + 40, m.h + 40);
    disegnaTavola(ctx, m);
    const sp = sprites();
    const a = anticipo / 60;
    for (const p of s.pezzi) {
      const img = sp[p.tipo];
      const r = RAGGIO[p.tipo];
      ctx.save();
      ctx.translate(p.x + p.vx * a, p.y + p.vy * a);
      ctx.rotate(p.taglio + p.ang);
      // metà del disegno: si taglia lungo la riga del coltello
      ctx.beginPath();
      ctx.rect(-r - 12, p.lato === 1 ? 0 : -r - 20, 2 * r + 24, r + 20);
      ctx.clip();
      ctx.rotate(-p.taglio);
      ctx.drawImage(img, -img.width / 4, -img.height / 4, img.width / 2, img.height / 2);
      ctx.restore();
      // il taglio si vede: l'interno chiaro (o nero per il carbone)
    }
    for (const d of s.dolci) {
      if (d.nato > s.t) continue;
      const img = sp[d.tipo];
      ctx.save();
      ctx.translate(d.x + d.vx * a, d.y + d.vy * a);
      ctx.rotate(d.tipo === "carbone" ? d.ang : Math.sin(d.ang) * 0.5);
      ctx.drawImage(img, -img.width / 4, -img.height / 4, img.width / 2, img.height / 2);
      ctx.restore();
    }
    // la scia del dito: una lama di luce che si assottiglia
    if (s.scia.length > 1) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < s.scia.length; i++) {
        const k = i / (s.scia.length - 1);
        ctx.strokeStyle = `rgba(251,246,234,${0.25 + 0.7 * k})`;
        ctx.lineWidth = 2 + 7 * k;
        ctx.beginPath();
        ctx.moveTo(s.scia[i - 1].x, s.scia[i - 1].y);
        ctx.lineTo(s.scia[i].x, s.scia[i].y);
        ctx.stroke();
      }
    }
  },

  effetto(e, fx) {
    if (e.tipo === "fetta") {
      fx.scoppio(e.x!, e.y!, ["#f6d27a", "#fbf6ea", "#c0392b", "#7a4a1d"], 16, { velocita: 240, gravita: 700, dimensione: 3.5 });
      fx.testo(e.x!, e.y! - 36, e.testo!, (e.livello ?? 1) > 1 ? "#f6c94a" : "#f3e8cf", (e.livello ?? 1) > 1 ? 26 : 22);
      fx.suono("fetta", e.livello ?? 1);
    } else if (e.tipo === "oro") {
      fx.scoppio(e.x!, e.y!, ["#f6c94a", "#fbf6ea", "#e9a81c"], 34, { velocita: 320 });
      fx.testo(e.x!, e.y! - 36, e.testo!, "#f6c94a", 30);
      fx.suono("record");
    } else if (e.tipo === "combo") {
      fx.testo(e.x!, e.y! - 50, e.testo!, "#f6c94a", 26);
    } else if (e.tipo === "carbone") {
      fx.scoppio(e.x!, e.y!, ["#1c1c1c", "#3a3a3a", "#555"], 22, { velocita: 180, gravita: 120, dimensione: 4.5, durata: 0.9 });
      fx.testo(e.x!, e.y! - 36, "−♥", "#e5481e", 28);
      fx.trema(12);
      fx.suono("sbaglio");
    } else if (e.tipo === "caduto") {
      fx.testo(e.x!, e.y!, "−♥", "#e5481e", 28);
      fx.trema(8);
      fx.suono("tonfoNeve");
    }
  },
};

// ---------- disegni (preparati una volta in canvas fuori schermo, a 2x) ----------
let cache: Record<Tipo, HTMLCanvasElement> | null = null;

function tela(w: number, h: number, disegna: (c: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w * 2;
  c.height = h * 2;
  const x = c.getContext("2d")!;
  x.scale(2, 2);
  disegna(x);
  return c;
}

// panettone: cupola dorata bruciacchiata sopra, pirottino di carta a righe sotto, uvetta
function disegnaPanettone(c: CanvasRenderingContext2D, r: number, oro: boolean) {
  const L = 2 * r + 24;
  const cx = L / 2;
  const base = L / 2 + r * 0.55;
  // pirottino
  c.fillStyle = oro ? "#e9a81c" : "#c0392b";
  c.beginPath();
  c.moveTo(cx - r * 0.92, base - r * 0.85);
  c.lineTo(cx + r * 0.92, base - r * 0.85);
  c.lineTo(cx + r * 0.82, base);
  c.lineTo(cx - r * 0.82, base);
  c.closePath();
  c.fill();
  c.strokeStyle = oro ? "#fff1b8" : "#f3e8cf";
  c.lineWidth = 1.4;
  for (let i = -3; i <= 3; i++) {
    c.beginPath();
    c.moveTo(cx + i * r * 0.26, base - r * 0.85);
    c.lineTo(cx + i * r * 0.23, base);
    c.stroke();
  }
  // cupola
  const g = c.createRadialGradient(cx - r * 0.3, base - r * 1.4, 2, cx, base - r, r * 1.1);
  g.addColorStop(0, oro ? "#fff1b8" : "#f0c27a");
  g.addColorStop(0.6, oro ? "#f6c94a" : "#b8702a");
  g.addColorStop(1, oro ? "#b97c0c" : "#7a4a1d");
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(cx - r, base - r * 0.8);
  c.bezierCurveTo(cx - r * 1.05, base - r * 1.95, cx + r * 1.05, base - r * 1.95, cx + r, base - r * 0.8);
  c.closePath();
  c.fill();
  // taglio a croce sulla cupola
  c.strokeStyle = oro ? "rgba(255,241,184,.9)" : "rgba(246,210,122,.9)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx - r * 0.35, base - r * 1.45);
  c.lineTo(cx + r * 0.35, base - r * 1.2);
  c.moveTo(cx + r * 0.35, base - r * 1.45);
  c.lineTo(cx - r * 0.35, base - r * 1.2);
  c.stroke();
  if (!oro) {
    c.fillStyle = "#3b1d14";
    for (const [a, b] of [[-0.55, -1.0], [0.5, -1.05], [0.1, -0.95], [-0.2, -1.6]]) {
      c.beginPath();
      c.arc(cx + a * r, base + b * r, 2.2, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    c.fillStyle = "#fbf6ea";
    c.beginPath();
    c.arc(cx - r * 0.45, base - r * 1.35, 3, 0, Math.PI * 2);
    c.fill();
  }
}

function sprites() {
  if (cache) return cache;
  const lato = (r: number) => 2 * r + 24;
  cache = {
    panettone: tela(lato(RAGGIO.panettone), lato(RAGGIO.panettone), (c) => disegnaPanettone(c, RAGGIO.panettone, false)),
    oro: tela(lato(RAGGIO.oro), lato(RAGGIO.oro), (c) => disegnaPanettone(c, RAGGIO.oro, true)),
    // pandoro visto dall'alto: stella a 8 punte con lo zucchero a velo
    pandoro: tela(lato(RAGGIO.pandoro), lato(RAGGIO.pandoro), (c) => {
      const r = RAGGIO.pandoro;
      const cx = lato(r) / 2;
      c.translate(cx, cx);
      const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
      g.addColorStop(0, "#fff4c8");
      g.addColorStop(0.7, "#f2c45a");
      g.addColorStop(1, "#c98a1e");
      c.fillStyle = g;
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.72 : r;
        c[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      c.fill();
      c.fillStyle = "rgba(251,246,234,.92)";
      c.beginPath();
      c.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(251,246,234,.6)";
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath();
        c.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, 2.4, 0, Math.PI * 2);
        c.fill();
      }
    }),
    // carbone: sasso nero spigoloso con una brace che brilla
    carbone: tela(lato(RAGGIO.carbone), lato(RAGGIO.carbone), (c) => {
      const r = RAGGIO.carbone;
      const cx = lato(r) / 2;
      c.fillStyle = "#151515";
      c.beginPath();
      const punti = [[-1, -0.7], [-0.2, -1], [0.7, -0.85], [1, -0.1], [0.75, 0.75], [0, 1], [-0.8, 0.7], [-1, 0]];
      punti.forEach(([a, b], i) => c[i ? "lineTo" : "moveTo"](cx + a * r, cx + b * r));
      c.closePath();
      c.fill();
      c.strokeStyle = "rgba(229,72,30,.9)";
      c.lineWidth = 2;
      c.setLineDash([4, 3]);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = "rgba(229,72,30,.8)";
      c.beginPath();
      c.arc(cx + 5, cx + 3, 3.5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,255,255,.2)";
      c.beginPath();
      c.arc(cx - 7, cx - 7, 4, 0, Math.PI * 2);
      c.fill();
    }),
  };
  return cache;
}

// in basso il bordo di una tovaglia a quadri (da lì partono i dolci)
function disegnaTavola(ctx: CanvasRenderingContext2D, m: Mondo) {
  const y = m.h - m.sotto - 18;
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(0, y, m.w, m.h - y);
  ctx.fillStyle = "rgba(251,246,234,.35)";
  const q = 18;
  for (let x = 0; x < m.w; x += q * 2) ctx.fillRect(x, y, q, m.h - y);
  for (let yy = y; yy < m.h; yy += q * 2) ctx.fillRect(0, yy, m.w, q);
  ctx.strokeStyle = "rgba(251,246,234,.8)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(0, y + 5);
  ctx.lineTo(m.w, y + 5);
  ctx.stroke();
  ctx.setLineDash([]);
}
