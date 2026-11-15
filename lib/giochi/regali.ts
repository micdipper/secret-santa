// Gioco 3 · IMPILA I REGALI (PIANO-GIOCHI.md 6.3)
// Un pacco scorre avanti e indietro sopra la torre: tocca per appoggiarlo. La parte che sporge
// viene tagliata e cade; il pacco dopo è largo quanto la parte rimasta. Mancare la torre = fine.
// Perfetto (entro pochi px) = niente taglio e punti in più; 3 perfetti di fila = il pacco si riallarga.
// Più si sale, più il pacco è veloce; dal piano 10 parte da un lato a caso, dal piano 20 accelera al centro.
import { casuale, curve, limita, mescola, stile, type Evento, type Gioco, type Mondo } from "./base.ts";

// ----- costanti (taratura) -----
const ALTEZZA = 30; // px, un pacco
const LARGHEZZA = [0.5, 190]; // il primo pacco: metà schermo, al massimo 190 px
const MARGINE = 10; // px dal bordo dello schermo
const VELOCITA = 260; // px/s al piano 1…
const AUMENTO = 1.04; // …+4% a ogni piano…
const VELOCITA_MAX = 900; // …fino a qui
const LATO_CASUALE_DAL = 10; // piano da cui il pacco parte da un lato a caso (prima: alternati)
const SBALZI_DAL = 20; // piano da cui il pacco accelera al centro e rallenta ai lati
const SBALZO = 0.45; // ai lati ×(1−0,45), al centro ×(1+0,45)
const PERFETTO = 5; // px
const PERFETTI_RIALLARGA = 3; // perfetti di fila per riallargare…
const RIALLARGA = 1.1; // …del 10%
const PAUSA = 0.4; // s tra un pacco appoggiato e il successivo (la torre si assesta, la telecamera sale)
const INIZIO = 0.5; // s prima del primo pacco
const PUNTI_PIANO = 10;
const PUNTI_PERFETTO = 10; // in più
const CADUTA_FINE = 0.8;
const TEMPO_MAX = 580; // s: oltre si chiude da solo (il server accetta fino a 600) // s per veder cadere il pacco mancato prima della fine

export const COLORI_PACCHI = ["#e5481e", "#e9a81c", "#7fb3d5", "#f4a9c4", "#8fbf7a", "#f3e8cf"];
const NASTRI = ["#f3e8cf", "#e5481e", "#f3e8cf", "#e5481e", "#e5481e", "#e5481e"];

type Piano = { x: number; w: number; colore: number }; // x = centro
type Pezzo = { x: number; y: number; w: number; vx: number; vy: number; rot: number; vr: number; colore: number; vivo: boolean };

export type StatoRegali = {
  caso: () => number;
  t: number;
  piani: Piano[]; // piani[0] = la base
  // il pacco che scorre (null durante la pausa)
  pacco: { x: number; w: number; dir: number; colore: number; nato: number } | null;
  prossimo: number; // quando nasce il prossimo pacco
  pezzi: Pezzo[];
  camera: number; // px di cui la torre è scesa (sale la telecamera)
  perfetti: number;
  diFila: number;
  punti: number;
  mancato: number; // istante in cui ha mancato la torre (-1 = no)
  tocchi: number;
  eventi: Evento[];
};

const largo0 = (m: Mondo) => Math.min(m.w * LARGHEZZA[0], LARGHEZZA[1]);
const base = (m: Mondo) => m.h - m.sotto - 64; // y del fondo della base
// y (in alto) del piano i, senza telecamera
const yPiano = (m: Mondo, i: number) => base(m) - (i + 1) * ALTEZZA;
export const velocita = (piano: number) => Math.min(VELOCITA_MAX, VELOCITA * Math.pow(AUMENTO, piano - 1));
export const limiti = (m: Mondo, w: number) => [MARGINE + w / 2, m.w - MARGINE - w / 2] as const;

// dove deve stare la telecamera: il pacco che scorre a ~40% dell'area di gioco
function cameraGiusta(s: StatoRegali, m: Mondo) {
  const yPacco = yPiano(m, s.piani.length);
  const voluta = m.sopra + (m.h - m.sopra - m.sotto) * 0.4;
  return Math.max(0, voluta - yPacco);
}

function nuovoPacco(s: StatoRegali, m: Mondo) {
  const piano = s.piani.length; // 1, 2, 3…
  const sotto = s.piani[piano - 1];
  const daSinistra = piano < LATO_CASUALE_DAL ? piano % 2 === 1 : s.caso() < 0.5;
  const [lo, hi] = limiti(m, sotto.w);
  s.pacco = { x: daSinistra ? lo : hi, w: sotto.w, dir: daSinistra ? 1 : -1, colore: piano % COLORI_PACCHI.length, nato: s.t };
}

// il pacco scorre avanti e indietro (dal piano SBALZI_DAL più veloce al centro, più lento ai lati)
function muovi(pk: NonNullable<StatoRegali["pacco"]>, piano: number, dt: number, m: Mondo) {
  const [lo, hi] = limiti(m, pk.w);
  let v = velocita(piano);
  if (piano >= SBALZI_DAL && hi > lo) v *= 1 - SBALZO + 2 * SBALZO * Math.sin(Math.PI * limita((pk.x - lo) / (hi - lo), 0, 1));
  pk.x += pk.dir * v * dt;
  if (pk.x > hi) {
    pk.x = hi - (pk.x - hi);
    pk.dir = -1;
  } else if (pk.x < lo) {
    pk.x = lo + (lo - pk.x);
    pk.dir = 1;
  }
  pk.x = limita(pk.x, lo, hi);
}

function cade(s: StatoRegali, x: number, y: number, w: number, dir: number, colore: number) {
  const p = s.pezzi.find((p) => !p.vivo) ?? (s.pezzi[s.pezzi.length] = {} as Pezzo);
  Object.assign(p, { x, y, w, vx: dir * (60 + s.caso() * 60), vy: -80, rot: 0, vr: dir * (2 + s.caso() * 2), colore, vivo: true });
}

export const regali: Gioco<StatoRegali> = {
  crea(seme, m) {
    return {
      caso: casuale(seme),
      t: 0,
      piani: [{ x: m.w / 2, w: largo0(m), colore: 0 }],
      pacco: null,
      prossimo: INIZIO,
      pezzi: [],
      camera: 0,
      perfetti: 0,
      diFila: 0,
      punti: 0,
      mancato: -1,
      tocchi: 0,
      eventi: [],
    };
  },

  aggiorna(s, dt, tocchi, m) {
    s.t += dt;
    for (const p of s.pezzi) {
      if (!p.vivo) continue;
      p.vy += 1800 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y + s.camera > m.h + 200) p.vivo = false;
    }
    s.camera = mescola(s.camera, cameraGiusta(s, m), 1 - Math.exp(-6 * dt));
    if (s.mancato >= 0) return;
    if (s.t > TEMPO_MAX) {
      s.mancato = s.t - CADUTA_FINE;
      return;
    }

    if (!s.pacco && s.t >= s.prossimo) nuovoPacco(s, m);
    const pk = s.pacco;
    if (!pk) return;

    // il tocco vale dove il giocatore VEDE il pacco: prima di spostarlo
    const piano = s.piani.length;
    if (!tocchi.some((t) => t.tipo === "giu")) {
      muovi(pk, piano, dt, m);
      return;
    }
    s.tocchi++;
    const sotto = s.piani[piano - 1];
    const y = yPiano(m, piano);
    const dx = pk.x - sotto.x;
    s.pacco = null;
    s.prossimo = s.t + PAUSA;

    if (Math.abs(dx) <= PERFETTO) {
      // perfetto: si appoggia preciso, niente taglio
      s.perfetti++;
      s.diFila++;
      let w = pk.w;
      const riallarga = s.diFila % PERFETTI_RIALLARGA === 0 && w < largo0(m);
      if (riallarga) w = Math.min(largo0(m), w * RIALLARGA);
      s.piani.push({ x: limita(sotto.x, MARGINE + w / 2, m.w - MARGINE - w / 2), w, colore: pk.colore });
      s.punti += PUNTI_PIANO + PUNTI_PERFETTO;
      s.eventi.push({ tipo: "perfetto", x: sotto.x, y: y - s.camera, testo: `+${PUNTI_PIANO + PUNTI_PERFETTO}`, livello: s.diFila });
      if (riallarga) s.eventi.push({ tipo: "riallarga", x: sotto.x, y: y - s.camera });
      return;
    }

    s.diFila = 0;
    const resto = pk.w - Math.abs(dx);
    if (resto <= 0) {
      // mancato del tutto: il pacco cade giù e la partita finisce
      cade(s, pk.x, y, pk.w, Math.sign(dx), pk.colore);
      s.mancato = s.t;
      s.eventi.push({ tipo: "mancato", x: pk.x, y: y - s.camera });
      return;
    }
    // si taglia la parte che sporge
    const sx = Math.max(pk.x - pk.w / 2, sotto.x - sotto.w / 2);
    const dxx = Math.min(pk.x + pk.w / 2, sotto.x + sotto.w / 2);
    s.piani.push({ x: (sx + dxx) / 2, w: resto, colore: pk.colore });
    const tagliato = Math.abs(dx);
    cade(s, dx > 0 ? dxx + tagliato / 2 : sx - tagliato / 2, y, tagliato, Math.sign(dx), pk.colore);
    s.punti += PUNTI_PIANO;
    s.eventi.push({ tipo: "taglio", x: (sx + dxx) / 2, y: y - s.camera, testo: `+${PUNTI_PIANO}`, livello: piano });
  },

  finito: (s) => s.mancato >= 0 && s.t - s.mancato >= CADUTA_FINE,
  hud: (s) => ({ punteggio: s.punti, etichetta: `Piano ${s.piani.length - 1}` }),
  eventi: (s) => s.eventi,
  stats: (s) => ({ piani: s.piani.length - 1, perfetti: s.perfetti, tocchi: s.tocchi }),

  disegna(ctx, s, m, riduci) {
    ctx.clearRect(-20, -20, m.w + 40, m.h + 40);
    const cam = s.camera;

    // fiocchi di neve lenti che salgono con la telecamera (più lenti dei pacchi: profondità)
    ctx.fillStyle = "rgba(243,232,207,.35)";
    for (let i = 0; i < 26; i++) {
      const x = (i * 151) % m.w;
      const y = (((i * 263 + cam * 0.35 + (riduci ? 0 : s.t * 14)) % (m.h + 40)) + m.h + 40) % (m.h + 40) - 20;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    // la neve sotto la torre
    const yb = base(m) + cam;
    if (yb < m.h + 40) {
      ctx.fillStyle = "#f3e8cf";
      ctx.beginPath();
      ctx.moveTo(-10, m.h + 20);
      ctx.lineTo(-10, yb + 14);
      ctx.quadraticCurveTo(m.w * 0.25, yb - 4, m.w * 0.5, yb + 2);
      ctx.quadraticCurveTo(m.w * 0.75, yb + 8, m.w + 10, yb + 2);
      ctx.lineTo(m.w + 10, m.h + 20);
      ctx.fill();
    }

    // la torre (solo i piani sullo schermo)
    for (let i = 0; i < s.piani.length; i++) {
      const y = yPiano(m, i) + cam;
      if (y > m.h + ALTEZZA || y < -ALTEZZA * 2) continue;
      const p = s.piani[i];
      disegnaPacco(ctx, p.x, y, p.w, i === 0 ? 0 : p.colore, i === 0, false);
    }

    // pezzi tagliati che cadono ruotando
    for (const p of s.pezzi) {
      if (!p.vivo) continue;
      ctx.save();
      ctx.translate(p.x, p.y + cam + ALTEZZA / 2);
      ctx.rotate(p.rot);
      disegnaPacco(ctx, 0, -ALTEZZA / 2, p.w, p.colore, false, false);
      ctx.restore();
    }

    // il pacco che scorre, col fiocco
    if (s.pacco) {
      const pk = s.pacco;
      const entra = curve.esceMorbida(limita((s.t - pk.nato) / 0.18, 0, 1));
      ctx.globalAlpha = entra;
      disegnaPacco(ctx, pk.x, yPiano(m, s.piani.length) + cam - (1 - entra) * 16, pk.w, pk.colore, false, true);
      ctx.globalAlpha = 1;
    }

    // la scritta del piano in alto
    if (s.piani.length > 1 && s.mancato < 0) {
      ctx.font = `700 18px ${stile.fontTitoli}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(243,232,207,.55)";
      if (s.diFila >= 1) ctx.fillText(`Perfetti di fila: ${s.diFila % PERFETTI_RIALLARGA || PERFETTI_RIALLARGA}/${PERFETTI_RIALLARGA}`, m.w / 2, m.sopra + 4);
    }
  },

  effetto(e, fx) {
    if (e.tipo === "perfetto") {
      fx.scoppio(e.x!, e.y!, ["#f6c94a", "#fbf6ea", "#e9a81c"], 22, { velocita: 260 });
      fx.testo(e.x!, e.y! - 34, "Perfetto!", "#f6c94a", 28);
      fx.testo(e.x!, e.y! - 4, e.testo!, "#f3e8cf", 20);
      fx.suono("perfetto", e.livello ?? 1);
    } else if (e.tipo === "riallarga") {
      fx.testo(e.x!, e.y! - 62, "Si riallarga!", "#f3e8cf", 22);
    } else if (e.tipo === "taglio") {
      fx.scoppio(e.x!, e.y!, ["#fbf6ea", "rgba(243,232,207,.6)"], 8, { velocita: 120, gravita: 200, dimensione: 2.5 });
      fx.testo(e.x!, e.y! - 30, e.testo!);
      fx.suono("taglio");
      fx.trema(2);
    } else if (e.tipo === "mancato") {
      fx.suono("urto");
      fx.trema(10);
      fx.testo(e.x!, e.y! - 30, "Mancato!", "#e5481e", 28);
    }
  },
};

// Un pacco di feltro: corpo con angoli morbidi, nastro verticale, cucitura in alto e (se serve) il fiocco.
// x = centro, y = lato superiore.
function disegnaPacco(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, colore: number, baseTorre: boolean, fiocco: boolean) {
  const h = ALTEZZA;
  const sx = x - w / 2;
  const r = Math.min(4, w / 3);
  ctx.fillStyle = baseTorre ? "#6b4a2f" : COLORI_PACCHI[colore];
  ctx.beginPath();
  ctx.roundRect(sx, y, w, h, r);
  ctx.fill();
  // ombra in basso (spessore)
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.fillRect(sx + r / 2, y + h - 5, w - r, 5);
  if (baseTorre) {
    // la base: una cassetta di legno con le venature
    ctx.strokeStyle = "rgba(243,232,207,.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(sx + 6, y + h / 2);
    ctx.lineTo(sx + w - 6, y + h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  // nastro verticale
  const nastro = Math.min(9, w * 0.2);
  ctx.fillStyle = NASTRI[colore];
  ctx.fillRect(x - nastro / 2, y, nastro, h);
  // cucitura tratteggiata a 4 px dal bordo alto
  if (w > 18) {
    ctx.strokeStyle = colore === 5 ? "rgba(44,74,50,.45)" : "rgba(251,246,234,.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(sx + 5, y + 5);
    ctx.lineTo(sx + w - 5, y + 5);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (fiocco) {
    ctx.fillStyle = NASTRI[colore];
    const b = Math.min(10, Math.max(5, w * 0.12));
    ctx.beginPath();
    ctx.ellipse(x - b * 0.9, y - b * 0.35, b, b * 0.55, -0.45, 0, Math.PI * 2);
    ctx.ellipse(x + b * 0.9, y - b * 0.35, b, b * 0.55, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - b * 0.2, b * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = colore === 5 || NASTRI[colore] === "#f3e8cf" ? "#e5481e" : "#2c4a32";
    ctx.fill();
  }
}
