// Gioco 4 · SLITTA SLALOM (PIANO-GIOCHI.md 6.4)
// La slitta corre sulla neve (in basso sullo schermo, il mondo scorre verso di lei): trascina il dito
// a destra e a sinistra (movimento relativo: il dito può stare ovunque) per evitare abeti, pupazzi di neve
// e lastre di ghiaccio e prendere i regali. Un urto = fine.
// SEMPRE POSSIBILE: prima si genera un corridoio libero (curva morbida, mai più stretta del minimo e mai
// più ripida di quanto la slitta riesca a seguire a quella velocità), poi si mettono gli ostacoli intorno.
import { casuale, limita, mescola, type Evento, type Gioco, type Mondo } from "./base.ts";

// ----- costanti (taratura) -----
const VELOCITA = [320, 950]; // px/s, dall'inizio…
const SECONDI_ACCELERA = 90; // …a qui (poi resta al massimo)
const LARGA = 34; // px, larghezza della slitta (per i varchi)
const RAGGIO_SLITTA = 12; // px, area d'urto della slitta (un po' più piccola del disegno: urti onesti)
const VARCO = [3.2, 1.6]; // larghezza del corridoio libero, in slitte (dall'inizio al massimo della velocità)
const LATERALE_MAX = 900; // px/s: la slitta non va di lato più veloce di così…
const MORBIDEZZA = 14; // …e insegue il dito con questa prontezza (1/s)
const SENSIBILITA = 1.2; // 1 px di dito = 1,2 px di slitta
const PENDENZA = 0.45; // il corridoio chiede al massimo il 45% di LATERALE_MAX
const TRATTO = [260, 420]; // px tra due curve del corridoio
const FILA = 120; // px tra due file di ostacoli
const PARTENZA = 900; // px liberi all'inizio (quasi 3 s)
const FITTO = [0.5, 0.92]; // probabilità di un ostacolo in ogni posto libero di una fila
const POSTO = 54; // px tra un posto e l'altro della fila
const OGNI_REGALO = [7, 11]; // file tra un regalo e l'altro
const METRO = 20; // px per metro (1 punto a metro)
const PUNTI_REGALO = 25;
const RAGGIO_REGALO = 24; // px: quanto vicino passare per prenderlo
const TEMPO_MAX = 240; // s: traguardo (il server accetta fino a 300)
const DOPO_URTO = 0.7; // s di ribaltone prima della fine

type Tipo = "abete" | "pupazzo" | "ghiaccio";
// rx/ry = semiassi dell'area d'urto (ellisse)
const FORMA: Record<Tipo, { rx: number; ry: number }> = { abete: { rx: 17, ry: 15 }, pupazzo: { rx: 16, ry: 16 }, ghiaccio: { rx: 30, ry: 10 } };
type Ostacolo = { tipo: Tipo; d: number; x: number; vivo: boolean };
type Regalo = { d: number; x: number; colore: number; vivo: boolean };
type Punto = { d: number; c: number; hw: number }; // corridoio: a distanza d il centro è c, mezza larghezza hw

export type StatoSlitta = {
  caso: () => number;
  t: number;
  dist: number; // px percorsi
  v: number;
  x: number; // centro della slitta
  vx: number;
  meta: number; // dove vuole andare (segue il dito)
  dito: { id: number; x0: number; meta0: number } | null;
  corridoio: Punto[];
  ostacoli: Ostacolo[];
  regali: Regalo[];
  fila: number; // d della prossima fila da generare
  prossimoRegalo: number; // fra quante file
  preso: number; // regali presi
  urto: number; // istante dell'urto (-1 = no)
  traguardo: boolean;
  scia: number[]; // x della slitta negli ultimi passi (per i solchi)
  eventi: Evento[];
};

export const ySlitta = (m: Mondo) => m.h - m.sotto - 110;
const velocitaA = (t: number) => mescola(VELOCITA[0], VELOCITA[1], limita(t / SECONDI_ACCELERA, 0, 1));
const punti = (s: StatoSlitta) => Math.floor(s.dist / METRO) + s.preso * PUNTI_REGALO;

// centro e mezza larghezza del corridoio alla distanza d (curva morbida tra i punti)
export function corridoio(s: StatoSlitta, d: number) {
  const c = s.corridoio;
  let i = 0;
  while (i < c.length - 2 && c[i + 1].d < d) i++;
  const a = c[i];
  const b = c[i + 1] ?? a;
  const k = b.d > a.d ? limita((d - a.d) / (b.d - a.d), 0, 1) : 0;
  const morbido = (1 - Math.cos(Math.PI * k)) / 2;
  return { c: mescola(a.c, b.c, morbido), hw: mescola(a.hw, b.hw, k) };
}

// aggiunge un tratto di corridoio: la curva più ripida possibile (coseno) resta sotto PENDENZA
function allunga(s: StatoSlitta, m: Mondo) {
  const ultimo = s.corridoio[s.corridoio.length - 1];
  const tratto = mescola(TRATTO[0], TRATTO[1], s.caso());
  // velocità prevista quando la slitta arriverà qui (in anticipo: al massimo 3 s dopo)
  const v = velocitaA(s.t + 3);
  const k = limita((v - VELOCITA[0]) / (VELOCITA[1] - VELOCITA[0]), 0, 1);
  const hw = (mescola(VARCO[0], VARCO[1], k) * LARGA) / 2;
  // il coseno ha pendenza massima π/2 · Δ/tratto
  const maxDelta = ((PENDENZA * LATERALE_MAX) / v) * tratto * (2 / Math.PI);
  const lo = hw + 8;
  const hi = m.w - hw - 8;
  let delta = (s.caso() < 0.5 ? -1 : 1) * maxDelta * mescola(0.35, 1, s.caso());
  if (ultimo.c + delta < lo || ultimo.c + delta > hi) delta = -delta;
  s.corridoio.push({ d: ultimo.d + tratto, c: limita(ultimo.c + delta, lo, hi), hw });
}

// una fila di ostacoli fuori dal corridoio (e a volte un regalo dentro)
function nuovaFila(s: StatoSlitta, m: Mondo) {
  const d = s.fila;
  s.fila += FILA;
  if (d < PARTENZA) return;
  const k = limita(s.t / SECONDI_ACCELERA, 0, 1);
  const posti = Math.max(3, Math.round(m.w / POSTO));
  const sfasa = s.caso() * POSTO; // le file non sono tutte allineate
  for (let p = 0; p < posti; p++) {
    const tipo: Tipo = s.caso() < 0.6 ? "abete" : s.caso() < 0.6 ? "pupazzo" : "ghiaccio";
    const { rx, ry } = FORMA[tipo];
    const x = ((p * m.w) / posti + sfasa + (s.caso() - 0.5) * 14) % m.w;
    const dd = d + (s.caso() - 0.5) * 30;
    // libero lungo tutto il passaggio della slitta accanto all'ostacolo
    let libero = true;
    for (const off of [-ry - RAGGIO_SLITTA, 0, ry + RAGGIO_SLITTA]) {
      const q = corridoio(s, dd + off);
      if (Math.abs(x - q.c) < q.hw + rx) libero = false;
    }
    if (!libero || s.caso() > mescola(FITTO[0], FITTO[1], k)) continue;
    const o = s.ostacoli.find((o) => !o.vivo) ?? (s.ostacoli[s.ostacoli.length] = {} as Ostacolo);
    Object.assign(o, { tipo, d: dd, x, vivo: true });
  }
  if (--s.prossimoRegalo <= 0) {
    s.prossimoRegalo = Math.round(mescola(OGNI_REGALO[0], OGNI_REGALO[1], s.caso()));
    const q = corridoio(s, d);
    const r = s.regali.find((r) => !r.vivo) ?? (s.regali[s.regali.length] = {} as Regalo);
    Object.assign(r, { d, x: q.c + (s.caso() - 0.5) * q.hw, colore: Math.floor(s.caso() * 3), vivo: true });
  }
}

export const slitta: Gioco<StatoSlitta> = {
  crea(seme, m) {
    const s: StatoSlitta = {
      caso: casuale(seme),
      t: 0,
      dist: 0,
      v: VELOCITA[0],
      x: m.w / 2,
      vx: 0,
      meta: m.w / 2,
      dito: null,
      corridoio: [{ d: -400, c: m.w / 2, hw: (VARCO[0] * LARGA) / 2 }, { d: PARTENZA - 200, c: m.w / 2, hw: (VARCO[0] * LARGA) / 2 }],
      ostacoli: [],
      regali: [],
      fila: 0,
      prossimoRegalo: 4,
      preso: 0,
      urto: -1,
      traguardo: false,
      scia: [],
      eventi: [],
    };
    return s;
  },

  aggiorna(s, dt, tocchi, m) {
    s.t += dt;
    if (s.urto >= 0 || s.traguardo) return;

    // il dito: conta solo lo spostamento da dove è stato appoggiato
    for (const tc of tocchi) {
      if (tc.tipo === "giu") s.dito = { id: tc.id, x0: tc.x, meta0: s.meta };
      else if (s.dito && tc.id === s.dito.id) {
        s.meta = limita(s.dito.meta0 + (tc.x - s.dito.x0) * SENSIBILITA, RAGGIO_SLITTA + 4, m.w - RAGGIO_SLITTA - 4);
        if (tc.tipo === "su") s.dito = null;
      }
    }
    s.vx = limita((s.meta - s.x) * MORBIDEZZA, -LATERALE_MAX, LATERALE_MAX);
    s.x = limita(s.x + s.vx * dt, RAGGIO_SLITTA, m.w - RAGGIO_SLITTA);

    s.v = velocitaA(s.t);
    s.dist += s.v * dt;
    s.scia.push(s.x);
    if (s.scia.length > 40) s.scia.shift();

    // genera davanti (oltre il bordo alto dello schermo) e dimentica quello che è passato
    const davanti = s.dist + (ySlitta(m) - m.sopra) + 200;
    while (s.corridoio[s.corridoio.length - 1].d < davanti + 600) allunga(s, m);
    while (s.corridoio.length > 3 && s.corridoio[1].d < s.dist - 300) s.corridoio.shift();
    while (s.fila < davanti) nuovaFila(s, m);
    const dietro = s.dist - (m.h - ySlitta(m)) - 60;
    for (const o of s.ostacoli) if (o.vivo && o.d < dietro) o.vivo = false;
    for (const r of s.regali) if (r.vivo && r.d < dietro) r.vivo = false;

    // urti (ellisse dell'ostacolo allargata del raggio della slitta)
    for (const o of s.ostacoli) {
      if (!o.vivo) continue;
      const { rx, ry } = FORMA[o.tipo];
      const dx = (s.x - o.x) / (rx + RAGGIO_SLITTA);
      const dy = (s.dist - o.d) / (ry + RAGGIO_SLITTA);
      if (dx * dx + dy * dy < 1) {
        s.urto = s.t;
        s.eventi.push({ tipo: "urto", x: s.x, y: ySlitta(m), testo: o.tipo });
        return;
      }
    }
    for (const r of s.regali) {
      if (!r.vivo) continue;
      if (Math.hypot(s.x - r.x, s.dist - r.d) < RAGGIO_REGALO) {
        r.vivo = false;
        s.preso++;
        s.eventi.push({ tipo: "regalo", x: r.x, y: ySlitta(m) - (r.d - s.dist), testo: `+${PUNTI_REGALO}`, livello: s.preso });
      }
    }
    if (s.t >= TEMPO_MAX) {
      s.traguardo = true;
      s.eventi.push({ tipo: "traguardo", x: m.w / 2, y: m.h / 2 });
    }
  },

  finito: (s) => s.traguardo || (s.urto >= 0 && s.t - s.urto >= DOPO_URTO),
  hud: (s) => ({ punteggio: punti(s), etichetta: `${Math.floor(s.dist / METRO)} m` }),
  eventi: (s) => s.eventi,
  stats: (s) => ({ metri: Math.floor(s.dist / METRO), regali: s.preso, secondi: Math.round(s.t) }),

  disegna(ctx, s, m, riduci) {
    ctx.clearRect(-20, -20, m.w + 40, m.h + 40);
    const ys = ySlitta(m);
    const sp = sprites();
    const orizzonte = m.sopra - 28;

    // la pista di neve, con le ombre azzurrine che scorrono
    ctx.fillStyle = "#f1e9d6";
    ctx.fillRect(0, orizzonte, m.w, m.h - orizzonte);
    ctx.strokeStyle = "rgba(127,179,213,.22)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const y = orizzonte + ((((i * 140 + s.dist * 0.999) % 1260) + 1260) % 1260) - 20;
      if (y > m.h + 20) continue;
      const x = (i * 173) % m.w;
      ctx.beginPath();
      ctx.moveTo(x - 30, y);
      ctx.quadraticCurveTo(x, y - 6, x + 30, y);
      ctx.stroke();
    }
    // i solchi della slitta (dietro di lei, in basso)
    if (s.scia.length > 1) {
      ctx.strokeStyle = "rgba(127,150,170,.35)";
      ctx.lineWidth = 2;
      for (const lato of [-9, 9]) {
        ctx.beginPath();
        for (let i = s.scia.length - 1, k = 0; i >= 0; i--, k++) {
          const y = ys + 14 + k * (s.v / 60);
          if (k === 0) ctx.moveTo(s.scia[i] + lato, y);
          else ctx.lineTo(s.scia[i] + lato, y);
        }
        ctx.stroke();
      }
    }

    // ostacoli e regali, dal più lontano al più vicino (quelli vicini coprono quelli dietro);
    // spuntano da dietro il bordo del bosco, mai sopra i punti in alto
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, orizzonte, m.w + 40, m.h);
    ctx.clip();
    const y = (d: number) => ys - (d - s.dist);
    for (const r of s.regali) {
      if (!r.vivo) continue;
      const yy = y(r.d);
      if (yy < orizzonte - 20 || yy > m.h + 30) continue;
      ctx.drawImage(sp.regali[r.colore], r.x - 15, yy - 18 + (riduci ? 0 : Math.sin(s.t * 6 + r.d) * 2), 30, 30);
    }
    const visibili = s.ostacoli.filter((o) => o.vivo && y(o.d) > orizzonte - 60 && y(o.d) < m.h + 60).sort((a, b) => b.d - a.d);
    for (const o of visibili) {
      const yy = y(o.d);
      // ombra
      ctx.fillStyle = "rgba(60,80,100,.18)";
      ctx.beginPath();
      ctx.ellipse(o.x + 4, yy + FORMA[o.tipo].ry * 0.6, FORMA[o.tipo].rx + 4, FORMA[o.tipo].ry * 0.6 + 2, 0, 0, Math.PI * 2);
      ctx.fill();
      const img = sp[o.tipo];
      // gli abeti e i pupazzi "stanno in piedi": il disegno sale sopra l'area d'urto
      if (o.tipo === "abete") ctx.drawImage(img, o.x - 24, yy - 58, 48, 72);
      else if (o.tipo === "pupazzo") ctx.drawImage(img, o.x - 20, yy - 44, 40, 60);
      else ctx.drawImage(img, o.x - 34, yy - 13, 68, 26);
    }

    ctx.restore();
    // bordo del bosco all'orizzonte (fermo)
    ctx.fillStyle = "#1e3826";
    for (let x = -10; x < m.w + 20; x += 22) {
      const h = 16 + ((x * 7) % 11);
      ctx.beginPath();
      ctx.moveTo(x - 10, orizzonte + 2);
      ctx.lineTo(x, orizzonte - h);
      ctx.lineTo(x + 10, orizzonte + 2);
      ctx.fill();
    }


    // la slitta (si inclina in curva; dopo l'urto si ribalta)
    ctx.save();
    ctx.translate(s.x, ys);
    if (s.urto >= 0) {
      const k = limita((s.t - s.urto) / DOPO_URTO, 0, 1);
      ctx.translate(0, -Math.sin(k * Math.PI) * 26);
      ctx.rotate(k * Math.PI * 1.3 * (s.vx >= 0 ? 1 : -1));
    } else ctx.rotate((s.vx / LATERALE_MAX) * 0.32);
    ctx.drawImage(sp.slitta, -22, -30, 44, 60);
    ctx.restore();
  },

  effetto(e, fx) {
    if (e.tipo === "regalo") {
      fx.scoppio(e.x!, e.y!, ["#e5481e", "#e9a81c", "#fbf6ea"], 16, { velocita: 200 });
      fx.testo(e.x!, e.y! - 30, e.testo!, "#e5481e", 24);
      fx.suono("regalo", e.livello ?? 0);
    } else if (e.tipo === "urto") {
      fx.scoppio(e.x!, e.y!, ["#ffffff", "#f3e8cf", "#bfe0f0"], 40, { velocita: 320, gravita: 500, dimensione: 4.5, durata: 1 });
      fx.testo(e.x!, e.y! - 50, e.testo === "abete" ? "Che botta!" : e.testo === "pupazzo" ? "Povero pupazzo!" : "Scivolone!", "#e5481e", 26);
      fx.trema(14);
      fx.suono("urto");
    } else if (e.tipo === "traguardo") {
      fx.scoppio(e.x!, e.y!, ["#f6c94a", "#e5481e", "#fbf6ea"], 60, { velocita: 380 });
      fx.testo(e.x!, e.y!, "Traguardo!", "#e5481e", 36);
      fx.suono("record");
    }
  },
};

// ---------- disegni (preparati una volta in canvas fuori schermo) ----------
type Sprites = { abete: HTMLCanvasElement; pupazzo: HTMLCanvasElement; ghiaccio: HTMLCanvasElement; slitta: HTMLCanvasElement; regali: HTMLCanvasElement[] };
let cache: Sprites | null = null;

function tela(w: number, h: number, disegna: (c: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w * 2;
  c.height = h * 2;
  const x = c.getContext("2d")!;
  x.scale(2, 2);
  disegna(x);
  return c;
}

function sprites(): Sprites {
  if (cache) return cache;
  const regalo = (corpo: string, nastro: string) =>
    tela(30, 30, (c) => {
      c.fillStyle = corpo;
      c.beginPath();
      c.roundRect(4, 9, 22, 18, 3);
      c.fill();
      c.fillStyle = nastro;
      c.fillRect(13, 9, 4, 18);
      c.fillRect(4, 15, 22, 4);
      c.beginPath();
      c.ellipse(11, 7, 5, 3, -0.5, 0, Math.PI * 2);
      c.ellipse(19, 7, 5, 3, 0.5, 0, Math.PI * 2);
      c.fill();
    });
  cache = {
    // abete nordico: tre piani di rami con la neve sulle punte, tronco marrone
    abete: tela(48, 72, (c) => {
      c.fillStyle = "#6b4a2f";
      c.fillRect(20, 56, 8, 12);
      const piani: [number, number, number][] = [[50, 22, 22], [38, 18, 17], [25, 13, 12]];
      for (const [base, mezza, alto] of piani) {
        c.fillStyle = "#2c4a32";
        c.beginPath();
        c.moveTo(24 - mezza, base + 6);
        c.lineTo(24, base - alto - 6);
        c.lineTo(24 + mezza, base + 6);
        c.closePath();
        c.fill();
        c.fillStyle = "#fbf6ea";
        c.beginPath();
        c.moveTo(24 - mezza, base + 6);
        c.quadraticCurveTo(24, base, 24 + mezza, base + 6);
        c.quadraticCurveTo(24, base + 2.5, 24 - mezza, base + 6);
        c.fill();
      }
      c.fillStyle = "#e9a81c";
      c.beginPath();
      c.arc(24, 6, 3, 0, Math.PI * 2);
      c.fill();
    }),
    // pupazzo di neve col contorno (sulla neve deve staccarsi), sciarpa vermiglia e cappello
    pupazzo: tela(40, 60, (c) => {
      c.strokeStyle = "#7d8a96";
      c.lineWidth = 1.5;
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(20, 42, 15, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.beginPath();
      c.arc(20, 21, 10, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = "#e5481e";
      c.fillRect(10, 28, 20, 5);
      c.fillRect(24, 28, 5, 11);
      c.fillStyle = "#1c1c1c";
      c.fillRect(12, 9, 16, 3);
      c.fillRect(15, 0, 10, 10);
      c.beginPath();
      c.arc(17, 19, 1.4, 0, Math.PI * 2);
      c.arc(23, 19, 1.4, 0, Math.PI * 2);
      c.arc(20, 40, 1.6, 0, Math.PI * 2);
      c.arc(20, 46, 1.6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#e9a81c";
      c.beginPath();
      c.moveTo(20, 22);
      c.lineTo(27, 24);
      c.lineTo(20, 25);
      c.fill();
    }),
    // lastra di ghiaccio: azzurra con i riflessi
    ghiaccio: tela(68, 26, (c) => {
      c.fillStyle = "#bfe0f0";
      c.strokeStyle = "#5f97bd";
      c.lineWidth = 1.8;
      c.beginPath();
      c.ellipse(34, 13, 32, 11, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.strokeStyle = "rgba(255,255,255,.9)";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(16, 10);
      c.lineTo(28, 7);
      c.moveTo(36, 17);
      c.lineTo(50, 13);
      c.stroke();
    }),
    // slitta vista dall'alto: pattini curvi, pianale vermiglio con la cucitura, sacco dei regali
    slitta: tela(44, 60, (c) => {
      c.strokeStyle = "#5a3b22";
      c.lineWidth = 3;
      c.lineCap = "round";
      for (const x of [9, 35]) {
        c.beginPath();
        c.moveTo(x, 54);
        c.lineTo(x, 12);
        c.quadraticCurveTo(x, 3, 22 + (x - 22) * 0.4, 4);
        c.stroke();
      }
      c.fillStyle = "#e5481e";
      c.beginPath();
      c.roundRect(6, 14, 32, 40, 6);
      c.fill();
      c.strokeStyle = "rgba(251,246,234,.75)";
      c.lineWidth = 1.5;
      c.setLineDash([3, 3]);
      c.beginPath();
      c.roundRect(10, 18, 24, 32, 3);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = "#cdb48a";
      c.beginPath();
      c.arc(22, 38, 10, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#6b4a2f";
      c.beginPath();
      c.arc(22, 30, 3, 0, Math.PI * 2);
      c.fill();
    }),
    regali: [regalo("#e5481e", "#f3e8cf"), regalo("#e9a81c", "#e5481e"), regalo("#7fb3d5", "#e5481e")],
  };
  return cache;
}
