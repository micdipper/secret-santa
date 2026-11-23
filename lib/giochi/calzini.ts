// Gioco 8 · CALZINI SPAIATI (PIANO-GIOCHI.md sezione 10, blocco E)
// Griglia di calzini a maglia girati: se ne girano due alla volta, se sono uguali restano scoperti.
// Finita una griglia ne arriva una più grande, con calzini sempre più simili tra loro. 60 secondi.
// Coppia = 10 × livello; griglia finita = 30 × livello e 3 secondi in più.
import { casuale, limita, type Evento, type Gioco, type Mondo } from "./base.ts";

// ----- costanti (taratura) -----
const DURATA = 60; // s
const GRIGLIE = [
  [2, 3],
  [3, 4],
  [4, 4],
  [4, 5],
  [4, 6],
]; // [colonne, righe]; dopo l'ultima si ricomincia da quella
const MOSTRA_SBAGLIO = 0.7; // s in cui si vedono i due calzini sbagliati (un tocco li rigira subito)
const BONUS_TEMPO = 3; // s per griglia finita
const PUNTI = 10;
const PUNTI_GRIGLIA = 30;
const COLORI = ["#c0392b", "#1e5b3a", "#e9a81c", "#2f5d8a", "#7a3b69", "#8a5a33"];
const MOTIVI = 4; // righe, pois, stelline, zig-zag
const GIRA = 0.18; // s dell'animazione del giro

export type Carta = { tipo: number; scoperta: boolean; presa: boolean; giro: number }; // giro = istante dell'ultimo giro
export type StatoCalzini = {
  caso: () => number;
  t: number;
  fine_t: number; // quando finisce il tempo
  livello: number;
  cols: number;
  righe: number;
  carte: Carta[];
  aperte: number[]; // indici delle carte girate (0, 1 o 2)
  sbaglio: number; // istante dello sbaglio (-1 = niente da rigirare)
  punti: number;
  conti: { coppie: number; griglie: number; sbagli: number; tocchi: number };
  fine: boolean;
  eventi: Evento[];
};

// geometria della griglia (anche per il bot)
export function geometria(s: StatoCalzini, m: Mondo) {
  const spazio = 10;
  const largo = m.w - 32;
  const alto = m.h - m.sopra - m.sotto - 24;
  const cw = Math.min((largo - spazio * (s.cols - 1)) / s.cols, ((alto - spazio * (s.righe - 1)) / s.righe) * 0.75);
  const ch = cw / 0.75;
  const x0 = (m.w - (cw * s.cols + spazio * (s.cols - 1))) / 2;
  const y0 = m.sopra + 12 + (alto - (ch * s.righe + spazio * (s.righe - 1))) / 2;
  return { cw, ch, centro: (i: number) => ({ x: x0 + (i % s.cols) * (cw + spazio) + cw / 2, y: y0 + Math.floor(i / s.cols) * (ch + spazio) + ch / 2 }) };
}

function nuovaGriglia(s: StatoCalzini) {
  const [c, r] = GRIGLIE[Math.min(s.livello, GRIGLIE.length - 1)];
  s.cols = c;
  s.righe = r;
  const coppie = (c * r) / 2;
  // dai livelli alti i calzini si somigliano: stesso colore e motivo diverso, o viceversa
  const tutti = Array.from({ length: COLORI.length * MOTIVI }, (_, i) => i);
  const colore = Math.floor(s.caso() * COLORI.length);
  const simili = s.livello >= 2;
  const stesso = (x: number) => simili && Math.floor(x / MOTIVI) === colore;
  const scelti = [...mescolaArr(s, tutti.filter(stesso)), ...mescolaArr(s, tutti.filter((x) => !stesso(x)))].slice(0, coppie);
  const mazzo = mescolaArr(s, [...scelti, ...scelti]);
  s.carte = mazzo.map((tipo) => ({ tipo, scoperta: false, presa: false, giro: s.t }));
  s.aperte = [];
  s.sbaglio = -1;
}

function mescolaArr<T>(s: StatoCalzini, a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(s.caso() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rigira(s: StatoCalzini) {
  for (const i of s.aperte) {
    s.carte[i].scoperta = false;
    s.carte[i].giro = s.t;
  }
  s.aperte = [];
  s.sbaglio = -1;
}

export const calzini: Gioco<StatoCalzini> = {
  crea(seme) {
    const s: StatoCalzini = {
      caso: casuale(seme),
      t: 0,
      fine_t: DURATA,
      livello: 0,
      cols: 2,
      righe: 3,
      carte: [],
      aperte: [],
      sbaglio: -1,
      punti: 0,
      conti: { coppie: 0, griglie: 0, sbagli: 0, tocchi: 0 },
      fine: false,
      eventi: [],
    };
    nuovaGriglia(s);
    return s;
  },

  aggiorna(s, dt, tocchi, m) {
    if (s.fine) return;
    s.t += dt;
    if (s.sbaglio >= 0 && s.t - s.sbaglio >= MOSTRA_SBAGLIO) rigira(s);

    const g = geometria(s, m);
    for (const tc of tocchi) {
      if (tc.tipo !== "giu") continue;
      const i = s.carte.findIndex((_, k) => {
        const c = g.centro(k);
        return Math.abs(tc.x - c.x) <= g.cw / 2 + 4 && Math.abs(tc.y - c.y) <= g.ch / 2 + 4;
      });
      if (i < 0) continue;
      const carta = s.carte[i];
      if (s.sbaglio >= 0) rigira(s); // un tocco rigira subito i due sbagliati
      if (carta.scoperta || carta.presa) continue;
      s.conti.tocchi++;
      carta.scoperta = true;
      carta.giro = s.t;
      s.aperte.push(i);
      s.eventi.push({ tipo: "gira" });
      if (s.aperte.length < 2) continue;
      const [a, b] = s.aperte.map((k) => s.carte[k]);
      const c = g.centro(i);
      if (a.tipo === b.tipo) {
        a.presa = b.presa = true;
        s.aperte = [];
        const p = PUNTI * (s.livello + 1);
        s.punti += p;
        s.conti.coppie++;
        s.eventi.push({ tipo: "coppia", x: c.x, y: c.y, testo: `+${p}`, livello: s.conti.coppie });
        if (s.carte.every((x) => x.presa)) {
          const pg = PUNTI_GRIGLIA * (s.livello + 1);
          s.punti += pg;
          s.conti.griglie++;
          s.fine_t += BONUS_TEMPO;
          s.eventi.push({ tipo: "griglia", x: m.w / 2, y: m.h / 2, testo: `+${pg}  +${BONUS_TEMPO} s` });
          s.livello++;
          nuovaGriglia(s);
          return;
        }
      } else {
        s.sbaglio = s.t;
        s.conti.sbagli++;
        s.eventi.push({ tipo: "sbaglio", x: c.x, y: c.y });
      }
    }
    if (s.t >= s.fine_t) s.fine = true;
  },

  finito: (s) => s.fine,
  hud: (s) => ({ punteggio: s.punti, tempo: Math.max(0, s.fine_t - s.t) }),
  eventi: (s) => s.eventi,
  stats: (s) => ({ ...s.conti }),

  disegna(ctx, s, m) {
    ctx.clearRect(-20, -20, m.w + 40, m.h + 40);
    const g = geometria(s, m);
    s.carte.forEach((c, i) => {
      const { x, y } = g.centro(i);
      // giro: si stringe e si riallarga
      const k = limita((s.t - c.giro) / GIRA, 0, 1);
      const largo = Math.abs(Math.cos(k * Math.PI));
      const mostra = k < 0.5 ? !(c.scoperta || c.presa) : c.scoperta || c.presa;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(Math.max(0.04, largo), 1);
      ctx.globalAlpha = c.presa && k >= 1 ? 0.55 : 1;
      // il cartellino di stoffa
      ctx.fillStyle = mostra ? "#f3e8cf" : "#c0392b";
      ctx.beginPath();
      ctx.roundRect(-g.cw / 2, -g.ch / 2, g.cw, g.ch, 12);
      ctx.fill();
      ctx.strokeStyle = mostra ? "rgba(30,56,38,.35)" : "rgba(251,246,234,.7)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.roundRect(-g.cw / 2 + 5, -g.ch / 2 + 5, g.cw - 10, g.ch - 10, 8);
      ctx.stroke();
      ctx.setLineDash([]);
      if (mostra) disegnaCalzino(ctx, c.tipo, Math.min(g.cw, g.ch * 0.75) * 0.8);
      else disegnaStella(ctx, Math.min(g.cw, g.ch) * 0.18);
      ctx.restore();
    });
  },

  effetto(e, fx) {
    if (e.tipo === "gira") fx.suono("carta");
    else if (e.tipo === "coppia") {
      fx.scoppio(e.x!, e.y!, ["#f6c94a", "#fbf6ea"], 16);
      fx.testo(e.x!, e.y! - 30, e.testo!, "#f6c94a");
      fx.suono("colpo", e.livello ?? 0);
    } else if (e.tipo === "griglia") {
      fx.testo(e.x!, e.y!, e.testo!, "#f6c94a", 30);
      fx.suono("record");
    } else if (e.tipo === "sbaglio") fx.suono("sbaglio");
  },
};

function disegnaStella(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = "rgba(251,246,234,.85)";
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// calzino a maglia: bordo chiaro in alto, gamba, piede verso destra; motivo dentro
function disegnaCalzino(ctx: CanvasRenderingContext2D, tipo: number, d: number) {
  const colore = COLORI[Math.floor(tipo / MOTIVI)];
  const motivo = tipo % MOTIVI;
  const u = d / 10;
  ctx.save();
  ctx.translate(-u * 2, -u * 0.5);
  const forma = () => {
    ctx.beginPath();
    ctx.moveTo(-u * 2, -u * 5);
    ctx.lineTo(u * 2, -u * 5);
    ctx.lineTo(u * 2, u * 1.5);
    ctx.quadraticCurveTo(u * 5.5, u * 1.8, u * 5.5, u * 3.6);
    ctx.quadraticCurveTo(u * 5.4, u * 5.4, u * 2.5, u * 5.4);
    ctx.lineTo(-u * 0.5, u * 5.4);
    ctx.quadraticCurveTo(-u * 2, u * 5.4, -u * 2, u * 3.5);
    ctx.closePath();
  };
  forma();
  ctx.fillStyle = colore;
  ctx.fill();
  ctx.save();
  forma();
  ctx.clip();
  ctx.fillStyle = "rgba(251,246,234,.85)";
  ctx.strokeStyle = "rgba(251,246,234,.85)";
  ctx.lineWidth = u * 0.6;
  if (motivo === 0) for (let y = -u * 2.5; y < u * 6; y += u * 1.6) ctx.fillRect(-u * 3, y, u * 10, u * 0.6);
  else if (motivo === 1) for (let y = -u * 2.5; y < u * 6; y += u * 1.5) for (let x = -u * 2 + ((y / u) % 3 ? 0 : u * 0.75); x < u * 6; x += u * 1.5) {
    ctx.beginPath();
    ctx.arc(x, y, u * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }
  else if (motivo === 2) for (const [x, y] of [[0, -u * 1.5], [0, u * 1.5], [u * 3.5, u * 3.6]]) {
    ctx.save();
    ctx.translate(x, y);
    disegnaStellina(ctx, u * 1.1);
    ctx.restore();
  }
  else {
    for (const y of [-u * 1.5, u * 0.8, u * 3.2]) {
      ctx.beginPath();
      for (let x = -u * 3, k = 0; x < u * 7; x += u, k++) ctx[k ? "lineTo" : "moveTo"](x, y + (k % 2 ? u * 0.6 : -u * 0.6));
      ctx.stroke();
    }
  }
  ctx.restore();
  // bordo a coste, tallone e punta chiari
  ctx.fillStyle = "#fbf6ea";
  ctx.fillRect(-u * 2.3, -u * 5.6, u * 4.6, u * 1.8);
  ctx.strokeStyle = colore;
  ctx.lineWidth = u * 0.25;
  for (let x = -u * 1.6; x < u * 2.2; x += u * 0.8) {
    ctx.beginPath();
    ctx.moveTo(x, -u * 5.4);
    ctx.lineTo(x, -u * 4);
    ctx.stroke();
  }
  ctx.restore();
}

function disegnaStellina(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}
