// Gioco 1 · PALLINE AL VOLO (PIANO-GIOCHI.md 6.1)
// Dall'alto cadono palline: tocca quelle dorate, mai il carbone. 3 cuori: si perde un cuore toccando
// il carbone o lasciando cadere una dorata sulla neve. 45 secondi.
// Il carbone cade spesso attaccato a una dorata ("trappola"), sempre di più verso la fine.
// 5 dorate di fila alzano il moltiplicatore (fino a ×5). Rara cometa che attraversa: +50.
// Rara meteora di carbone che attraversa come la cometa: toccarla costa un cuore.
// Insidie: dorate che zigzagano e dorate che si spengono a metà caduta e diventano carbone (lampeggiano prima).
import { casuale, limita, mescola, type Evento, type Gioco, type Mondo } from "./base.ts";

// ----- costanti (taratura) -----
const DURATA = 45; // s
const VITE = 3;
const RAGGIO = 26; // px
const MARGINE_TOCCO = 12; // px in più intorno alla pallina…
const MARGINE_VELOCITA = 0.02; // …più 2 px ogni 100 px/s (le palline veloci si prendono meglio)
const RITARDO_TOCCO = 0.1; // s: il dito "arriva" un attimo dopo l'occhio: vale anche dove la pallina era 0,1 s fa
const VELOCITA = [340, 620]; // px/s, dall'inizio alla fine
const OGNI = [0.48, 0.25]; // s tra una pallina e l'altra
const DOPPIE_DA = 6; // s: da qui a volte ne cadono 2 insieme
const P_DOPPIA = 0.4;
const CARBONE = [0.32, 0.4]; // probabilità del carbone
const TRAPPOLE_DA = 3; // s: da qui il carbone può cadere attaccato a una dorata…
const P_TRAPPOLA = [0.5, 0.9]; // …con questa probabilità (da TRAPPOLE_DA alla fine)
const DISTANZA_TRAPPOLA = [2.05, 2.4]; // centro-centro, in raggi (le aree di tocco si sovrappongono)
const ZIGZAG_DA = 5; // s: da qui alcune dorate zigzagano…
const P_ZIGZAG = [0.15, 0.35]; // …con questa probabilità
const ZIGZAG = 40; // px a destra e a sinistra
const SPEGNE_DA = 10; // s: da qui alcune dorate si spengono a metà caduta e diventano carbone…
const P_SPEGNE = [0.1, 0.22]; // …con questa probabilità
const PREAVVISO = 0.4; // s di lampeggio prima di diventare carbone
const P_COMETA = 0.03;
const METEORE_DA = 8; // s: da qui può passare la meteora di carbone
const P_METEORA = 0.04;
const VELOCITA_COMETA = 640; // px/s
const PUNTI = 10;
const PUNTI_COMETA = 50;
const COMBO_PASSO = 5; // ogni 5 dorate di fila il moltiplicatore sale
const MOLT_MAX = 5;

type Tipo = "oro" | "carbone" | "cometa" | "meteora";
const attraversa = (t: Tipo) => t === "cometa" || t === "meteora"; // vanno in diagonale
type Pallina = { tipo: Tipo; x0: number; x: number; y: number; vx: number; vy: number; fase: number; zigzag: boolean; spegne: number; viva: boolean };
// spegne = istante in cui la dorata diventa carbone (-1 = mai)

export type StatoPalline = {
  caso: () => number;
  t: number;
  prossima: number;
  palline: Pallina[];
  punti: number;
  vite: number;
  combo: number; // dorate di fila
  ultimaX: number;
  conti: { oro: number; carbone: number; comete: number; meteore: number; cadute: number; tocchi: number };
  fine: boolean;
  eventi: Evento[];
};

const molt = (combo: number) => Math.min(MOLT_MAX, 1 + Math.floor(combo / COMBO_PASSO));

function aggiungi(s: StatoPalline, p: Omit<Pallina, "viva">) {
  const libera = s.palline.find((x) => !x.viva);
  if (libera) Object.assign(libera, p, { viva: true });
  else s.palline.push({ ...p, viva: true });
}

function nasce(s: StatoPalline, m: Mondo) {
  const k = limita(s.t / DURATA, 0, 1);
  const sorte = s.caso();
  if (sorte < P_COMETA || (s.t >= METEORE_DA && sorte < P_COMETA + P_METEORA)) {
    const daSinistra = s.caso() < 0.5;
    const y = m.sopra + s.caso() * m.h * 0.25;
    aggiungi(s, { tipo: sorte < P_COMETA ? "cometa" : "meteora", x0: 0, x: daSinistra ? -RAGGIO : m.w + RAGGIO, y, vx: (daSinistra ? 1 : -1) * VELOCITA_COMETA * 0.85, vy: VELOCITA_COMETA * 0.42, fase: 0, zigzag: false, spegne: -1 });
    return;
  }
  const quante = s.t >= DOPPIE_DA && s.caso() < P_DOPPIA ? 2 : 1;
  for (let i = 0; i < quante; i++) {
    const largo = Math.max(1, m.w - 2 * (RAGGIO + 12));
    let x = RAGGIO + 12 + s.caso() * largo;
    // lontane dall'ultima, così due palline non si sovrappongono
    if (Math.abs(x - s.ultimaX) < RAGGIO * 3) x = RAGGIO + 12 + ((x - RAGGIO - 12 + largo / 2) % largo);
    s.ultimaX = x;
    const tipo: Tipo = s.caso() < mescola(CARBONE[0], CARBONE[1], k) ? "carbone" : "oro";
    const v = mescola(VELOCITA[0], VELOCITA[1], k) * (0.9 + s.caso() * 0.2);
    const y = -RAGGIO - i * RAGGIO * 2.5;
    const fase = s.caso() * 6.28;
    let zigzag = false;
    let spegne = -1;
    // trappola: il carbone cade di fianco a una dorata appena nata, alla stessa velocità
    if (tipo === "carbone" && s.t >= TRAPPOLE_DA && s.caso() < mescola(P_TRAPPOLA[0], P_TRAPPOLA[1], limita((s.t - TRAPPOLE_DA) / (DURATA - TRAPPOLE_DA), 0, 1))) {
      const oro = s.palline.find((p) => p.viva && p.tipo === "oro" && p.y < m.sopra);
      if (oro) {
        const lato = oro.x0 < m.w / 2 ? 1 : oro.x0 > m.w / 2 ? -1 : s.caso() < 0.5 ? 1 : -1;
        // stessa velocità e stesso dondolio (anche a zigzag) della sua dorata: cadono appaiati
        x = oro.x0 + lato * RAGGIO * mescola(DISTANZA_TRAPPOLA[0], DISTANZA_TRAPPOLA[1], s.caso());
        aggiungi(s, { tipo, x0: x, x, y: oro.y - RAGGIO * (s.caso() - 0.5), vx: 0, vy: oro.vy, fase: oro.fase, zigzag: oro.zigzag, spegne: -1 });
        continue;
      }
    }
    if (tipo === "oro") {
      if (s.t >= ZIGZAG_DA && s.caso() < mescola(P_ZIGZAG[0], P_ZIGZAG[1], k)) {
        zigzag = true;
        x = limita(x, RAGGIO + ZIGZAG + 8, m.w - RAGGIO - ZIGZAG - 8); // non esce dallo schermo
      }
      if (s.t >= SPEGNE_DA && s.caso() < mescola(P_SPEGNE[0], P_SPEGNE[1], k)) {
        // si spegne tra il 35% e il 60% della caduta
        const strada = m.h - m.sotto - y;
        spegne = s.t + (strada * mescola(0.35, 0.6, s.caso())) / v;
      }
    }
    aggiungi(s, { tipo, x0: x, x, y, vx: 0, vy: v, fase, zigzag, spegne });
  }
}

export const palline: Gioco<StatoPalline> = {
  crea(seme) {
    return {
      caso: casuale(seme),
      t: 0,
      prossima: 0.4,
      palline: [],
      punti: 0,
      vite: VITE,
      combo: 0,
      ultimaX: -999,
      conti: { oro: 0, carbone: 0, comete: 0, meteore: 0, cadute: 0, tocchi: 0 },
      fine: false,
      eventi: [],
    };
  },

  aggiorna(s, dt, tocchi, m) {
    if (s.fine) return;
    s.t += dt;
    if (s.t >= s.prossima && s.t < DURATA - 0.6) {
      nasce(s, m);
      s.prossima = s.t + mescola(OGNI[0], OGNI[1], limita(s.t / DURATA, 0, 1));
    }

    for (const tc of tocchi) {
      if (tc.tipo !== "giu") continue;
      s.conti.tocchi++;
      // la pallina più vicina al dito, misurando dal tratto che ha percorso negli ultimi 0,1 s
      // (il dito arriva sempre un attimo dopo: senza questo le palline veloci "scappano")
      let presa: Pallina | null = null;
      let meglio = Infinity;
      for (const p of s.palline) {
        if (!p.viva) continue;
        const v = Math.hypot(p.vx, p.vy);
        const d = distanzaDalTratto(tc.x, tc.y, p.x, p.y, p.x - p.vx * RITARDO_TOCCO, p.y - p.vy * RITARDO_TOCCO);
        if (d <= RAGGIO + MARGINE_TOCCO + v * MARGINE_VELOCITA && d < meglio) {
          meglio = d;
          presa = p;
        }
      }
      if (!presa) continue; // tocco a vuoto: niente
      presa.viva = false;
      if (presa.tipo === "carbone" || presa.tipo === "meteora") {
        s.vite--;
        s.combo = 0;
        if (presa.tipo === "meteora") s.conti.meteore++;
        else s.conti.carbone++;
        s.eventi.push({ tipo: "carbone", x: presa.x, y: presa.y });
        if (s.vite <= 0) {
          s.fine = true;
          return;
        }
      } else if (presa.tipo === "cometa") {
        s.punti += PUNTI_COMETA;
        s.conti.comete++;
        s.eventi.push({ tipo: "cometa", x: presa.x, y: presa.y, testo: `+${PUNTI_COMETA}` });
      } else {
        const mm = molt(s.combo);
        s.combo++;
        s.punti += PUNTI * mm;
        s.conti.oro++;
        s.eventi.push({ tipo: "oro", x: presa.x, y: presa.y, testo: mm > 1 ? `+${PUNTI * mm} ×${mm}` : `+${PUNTI}`, livello: s.combo });
        if (molt(s.combo) > mm) s.eventi.push({ tipo: "molt", x: presa.x, y: presa.y - 40, testo: `×${molt(s.combo)}!` });
      }
    }

    // movimento: le palline dondolano un poco mentre cadono, la cometa va dritta
    for (const p of s.palline) {
      if (!p.viva) continue;
      p.y += p.vy * dt;
      if (attraversa(p.tipo)) p.x += p.vx * dt;
      else p.x = p.x0 + (p.zigzag ? Math.sin(s.t * 4.2 + p.fase) * ZIGZAG : Math.sin(s.t * 2.2 + p.fase) * 7);
      // la dorata che si spegne diventa carbone
      if (p.tipo === "oro" && p.spegne >= 0 && s.t >= p.spegne) {
        p.tipo = "carbone";
        p.spegne = -1;
        s.eventi.push({ tipo: "spenta", x: p.x, y: p.y });
      }
    }

    // a terra (sulla neve) o fuori dallo schermo
    const terra = m.h - m.sotto - 18;
    for (const p of s.palline) {
      if (!p.viva) continue;
      if (attraversa(p.tipo)) {
        if (p.x < -RAGGIO * 2 || p.x > m.w + RAGGIO * 2 || p.y > m.h + RAGGIO) p.viva = false;
      } else if (p.y > terra) {
        p.viva = false;
        if (p.tipo === "oro") {
          // dorata sulla neve: si perde un cuore
          s.eventi.push({ tipo: "persa", x: p.x, y: terra });
          s.combo = 0;
          s.conti.cadute++;
          s.vite--;
          if (s.vite <= 0) {
            s.fine = true;
            return;
          }
        } else s.eventi.push({ tipo: "fumo", x: p.x, y: terra });
      }
    }
    if (s.t >= DURATA) s.fine = true;
  },

  finito: (s) => s.fine,
  hud: (s) => ({ punteggio: s.punti, tempo: Math.max(0, DURATA - s.t), vite: s.vite, viteMax: VITE, molt: molt(s.combo) }),
  eventi: (s) => s.eventi,
  stats: (s) => ({ ...s.conti }),

  disegna(ctx, s, m) {
    ctx.clearRect(-20, -20, m.w + 40, m.h + 40);
    disegnaNeve(ctx, m);
    const sprite = sprites();
    for (const p of s.palline) {
      if (!p.viva) continue;
      if (attraversa(p.tipo)) {
        const meteora = p.tipo === "meteora";
        // scia: dorata per la cometa, fumo con le braci per la meteora
        const coda = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * 0.22, p.y - p.vy * 0.22);
        coda.addColorStop(0, meteora ? "rgba(229,72,30,.85)" : "rgba(246,201,74,.9)");
        coda.addColorStop(1, meteora ? "rgba(30,30,30,0)" : "rgba(246,201,74,0)");
        ctx.strokeStyle = coda;
        ctx.lineWidth = 10;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.22, p.y - p.vy * 0.22);
        ctx.stroke();
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(s.t * 6);
        if (meteora) ctx.drawImage(sprite.carbone, -RAGGIO - 6, -RAGGIO - 14, RAGGIO * 2 + 12, RAGGIO * 2 + 20);
        else ctx.drawImage(sprite.cometa, -RAGGIO, -RAGGIO, RAGGIO * 2, RAGGIO * 2);
        ctx.restore();
      } else {
        // una dorata che sta per spegnersi lampeggia tra oro e carbone
        const lampeggia = p.tipo === "oro" && p.spegne >= 0 && s.t > p.spegne - PREAVVISO && Math.floor(s.t * 14) % 2 === 0;
        const img = p.tipo === "oro" && !lampeggia ? sprite.oro : sprite.carbone;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(s.t * 2.2 + p.fase) * 0.18);
        ctx.drawImage(img, -RAGGIO - 6, -RAGGIO - 14, RAGGIO * 2 + 12, RAGGIO * 2 + 20);
        ctx.restore();
      }
    }
  },

  effetto(e, fx) {
    if (e.tipo === "oro") {
      fx.scoppio(e.x!, e.y!, ["#f6c94a", "#fbf6ea", "#e9a81c"], 18);
      fx.testo(e.x!, e.y! - 36, e.testo!);
      fx.suono("colpo", e.livello ?? 0);
    } else if (e.tipo === "molt") {
      fx.testo(e.x!, e.y! - 30, e.testo!, "#e9a81c", 30);
    } else if (e.tipo === "cometa") {
      fx.scoppio(e.x!, e.y!, ["#f6c94a", "#fbf6ea", "#e5481e"], 36, { velocita: 320 });
      fx.testo(e.x!, e.y! - 36, e.testo!, "#f6c94a", 30);
      fx.suono("record");
    } else if (e.tipo === "carbone") {
      fx.scoppio(e.x!, e.y!, ["#1c1c1c", "#3a3a3a", "#555"], 22, { velocita: 180, gravita: 120, dimensione: 4.5, durata: 0.9 });
      fx.testo(e.x!, e.y! - 36, "−♥", "#e5481e", 28);
      fx.trema(12);
      fx.suono("sbaglio");
    } else if (e.tipo === "persa") {
      fx.scoppio(e.x!, e.y!, ["#fbf6ea", "#f6c94a"], 14, { velocita: 160, gravita: 300, dimensione: 3.5 });
      fx.testo(e.x!, e.y! - 40, "−♥", "#e5481e", 28);
      fx.trema(8);
      fx.suono("tonfoNeve");
    } else if (e.tipo === "spenta") {
      fx.scoppio(e.x!, e.y!, ["#3a3a3a", "#f6c94a"], 10, { velocita: 90, gravita: -60, dimensione: 3 });
      fx.suono("puff");
    } else if (e.tipo === "fumo") {
      fx.scoppio(e.x!, e.y!, ["rgba(40,40,40,.6)"], 5, { velocita: 70, gravita: -40, dimensione: 4 });
    }
  },
};

// distanza del punto (px, py) dal tratto da (ax, ay) a (bx, by)
function distanzaDalTratto(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const l = dx * dx + dy * dy;
  const t = l ? limita(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// ---------- disegni (preparati una volta in canvas fuori schermo) ----------
let cache: { oro: HTMLCanvasElement; carbone: HTMLCanvasElement; cometa: HTMLCanvasElement } | null = null;

function tela(w: number, h: number, disegna: (c: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w * 2;
  c.height = h * 2;
  const x = c.getContext("2d")!;
  x.scale(2, 2);
  disegna(x);
  return c;
}

function sprites() {
  if (cache) return cache;
  const L = RAGGIO * 2 + 12;
  const H = RAGGIO * 2 + 20;
  const cx = L / 2;
  const cy = 14 + RAGGIO;
  cache = {
    // pallina dorata dell'albero, con il cappuccio e una fascia a punto croce
    oro: tela(L, H, (c) => {
      c.strokeStyle = "#cdb48a";
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(cx, 5, 3.5, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "#cdb48a";
      c.fillRect(cx - 6, 8, 12, 8);
      const g = c.createRadialGradient(cx - 8, cy - 9, 2, cx, cy, RAGGIO);
      g.addColorStop(0, "#fff1b8");
      g.addColorStop(0.35, "#f6c94a");
      g.addColorStop(1, "#b97c0c");
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, RAGGIO, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(229,72,30,.85)";
      c.lineWidth = 1.6;
      for (let k = -4; k <= 4; k++) {
        const x = cx + k * 5.5;
        c.beginPath();
        c.moveTo(x - 2, cy - 2);
        c.lineTo(x + 2, cy + 2);
        c.moveTo(x + 2, cy - 2);
        c.lineTo(x - 2, cy + 2);
        c.stroke();
      }
    }),
    // carbone: un sasso nero spigoloso con riflessi grigi
    carbone: tela(L, H, (c) => {
      c.fillStyle = "#151515";
      c.beginPath();
      const punti = [[-1, -0.7], [-0.2, -1], [0.7, -0.85], [1, -0.1], [0.75, 0.75], [0, 1], [-0.8, 0.7], [-1, 0]];
      punti.forEach(([a, b], i) => (i ? c.lineTo(cx + a * RAGGIO, cy + b * RAGGIO * 0.92) : c.moveTo(cx + a * RAGGIO, cy + b * RAGGIO * 0.92)));
      c.closePath();
      c.fill();
      c.strokeStyle = "rgba(243,232,207,.55)";
      c.lineWidth = 2;
      c.setLineDash([4, 3]);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = "rgba(255,255,255,.18)";
      c.beginPath();
      c.arc(cx - 8, cy - 8, 5, 0, Math.PI * 2);
      c.arc(cx + 6, cy + 2, 3, 0, Math.PI * 2);
      c.fill();
    }),
    // cometa: stella a 4 punte d'oro
    cometa: tela(RAGGIO * 2, RAGGIO * 2, (c) => {
      const r = RAGGIO;
      const k = 0.16 * r;
      c.translate(r, r);
      c.fillStyle = "#f6c94a";
      c.strokeStyle = "#fbf6ea";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, -r);
      c.bezierCurveTo(k, -k, k, -k, r, 0);
      c.bezierCurveTo(k, k, k, k, 0, r);
      c.bezierCurveTo(-k, k, -k, k, -r, 0);
      c.bezierCurveTo(-k, -k, -k, -k, 0, -r);
      c.fill();
      c.stroke();
    }),
  };
  return cache;
}

// la neve in basso, dove cadono le palline
function disegnaNeve(ctx: CanvasRenderingContext2D, m: Mondo) {
  const y = m.h - m.sotto - 18;
  ctx.fillStyle = "#f3e8cf";
  ctx.beginPath();
  ctx.moveTo(0, m.h);
  ctx.lineTo(0, y + 8);
  const onde = 5;
  for (let i = 0; i < onde; i++) {
    const x0 = (m.w / onde) * i;
    ctx.quadraticCurveTo(x0 + m.w / onde / 2, y - 6 + (i % 2) * 6, x0 + m.w / onde, y + 6);
  }
  ctx.lineTo(m.w, m.h);
  ctx.fill();
}
