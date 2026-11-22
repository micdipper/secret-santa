// Gioco 7 · LA RENNA SALTATRICE (PIANO-GIOCHI.md sezione 10, blocco E)
// La renna corre sui tetti: un tocco = un salto. Salta i comignoli (sempre più fitti, a volte due attaccati)
// e i vuoti tra una casa e l'altra. Va sempre più veloce. Si gioca finché non cade.
// Punteggio = metri percorsi + 5 per ogni campanella presa al volo (sopra alcuni comignoli).
import { casuale, limita, mescola, type Evento, type Gioco, type Mondo } from "./base.ts";

// ----- costanti (taratura) -----
export const GRAVITA = 2600; // px/s²
export const SALTO = 900; // px/s verso l'alto (cima a ~155 px, 0,69 s in aria)
const VELOCITA = [270, 560]; // px/s: all'inizio e dopo ACCELERA secondi
const ACCELERA = 100; // s
const POI = 1.5; // px/s in più ogni secondo dopo ACCELERA…
const VELOCITA_MAX = 780; // …fino a qui
const PX_METRO = 40;
const PRIMO = 2.2; // s prima del primo ostacolo
const DISTANZA = [
  [1.7, 2.7],
  [0.98, 1.45],
]; // s tra un ostacolo e il successivo [min, max], dall'inizio a fine accelerazione
const DOPPI_DA = 25; // s: da qui due comignoli attaccati
const P_DOPPIO = 0.25;
const VUOTI_DA = 15; // s: da qui i vuoti tra le case
const P_VUOTO = [0.18, 0.32];
const VUOTO = [0.22, 0.36]; // larghezza del vuoto in secondi di corsa
const P_CAMPANELLA = 0.3;
const PUNTI_CAMPANELLA = 5;
const ALTEZZA = [38, 72]; // px dei comignoli
export const LARGO_COMIGNOLO = 34;
const STACCO_DOPPIO = 18; // px tra due comignoli attaccati
const RENNA = { w: 36, h: 34 }; // area dell'urto (più piccola del disegno: le corna non contano)
const MEMORIA_TOCCO = 0.12; // s: un tocco appena prima di atterrare vale come salto all'atterraggio
const TEMPO_BONUS = 0.08; // s: si può ancora saltare appena finito il tetto
const DURATA_MAX = 560; // s (tetto di sicurezza: nessuno ci arriva)

export type Ostacolo = { tipo: "comignolo" | "vuoto"; x: number; w: number; h: number; campanella: boolean; presa: boolean; doppio: boolean; superato: boolean };

export type StatoRenna = {
  caso: () => number;
  t: number;
  dist: number; // px percorsi
  v: number;
  y: number; // altezza dei piedi sopra il tetto (0 = a terra)
  vy: number;
  aTerra: boolean;
  staccata: number; // istante in cui ha lasciato il tetto (per il TEMPO_BONUS)
  tocco: number; // istante dell'ultimo tocco non ancora usato (-1 = nessuno)
  ostacoli: Ostacolo[]; // x = in px "del mondo" (si confronta con dist)
  prossimo: number; // dove (in px del mondo) nasce il prossimo ostacolo
  campanelle: number;
  caduta: number; // istante dello schianto (-1 = corre)
  come: "" | "comignolo" | "vuoto";
  conti: { salti: number; comignoli: number; vuoti: number; campanelle: number };
  fine: boolean;
  eventi: Evento[];
};

// posizione della renna sullo schermo e linea dei tetti
export const xRenna = (m: Mondo) => Math.round(m.w * 0.26);
export const yTetto = (m: Mondo) => m.h - m.sotto - Math.max(120, m.h * 0.2);
const metri = (s: StatoRenna) => Math.floor(s.dist / PX_METRO);

function velocita(t: number) {
  if (t > ACCELERA) return Math.min(VELOCITA_MAX, VELOCITA[1] + (t - ACCELERA) * POI);
  return mescola(VELOCITA[0], VELOCITA[1], limita(t / ACCELERA, 0, 1));
}

function nuovoOstacolo(s: StatoRenna) {
  const k = limita(s.t / ACCELERA, 0, 1);
  const v = s.v;
  if (s.t >= VUOTI_DA && s.caso() < mescola(P_VUOTO[0], P_VUOTO[1], k)) {
    const w = v * mescola(VUOTO[0], VUOTO[1], s.caso());
    s.ostacoli.push({ tipo: "vuoto", x: s.prossimo, w, h: 0, campanella: false, presa: false, doppio: false, superato: false });
  } else {
    const doppio = s.t >= DOPPI_DA && s.caso() < P_DOPPIO;
    // due comignoli attaccati: più bassi, si saltano in un colpo solo
    const h = doppio ? mescola(ALTEZZA[0], 50, s.caso()) : mescola(ALTEZZA[0], ALTEZZA[1], s.caso());
    const w = doppio ? LARGO_COMIGNOLO * 2 + STACCO_DOPPIO : LARGO_COMIGNOLO;
    s.ostacoli.push({ tipo: "comignolo", x: s.prossimo, w, h, campanella: s.caso() < P_CAMPANELLA, presa: false, doppio, superato: false });
  }
  const ult = s.ostacoli[s.ostacoli.length - 1];
  const [a, b] = [mescola(DISTANZA[0][0], DISTANZA[1][0], k), mescola(DISTANZA[0][1], DISTANZA[1][1], k)];
  // la distanza si misura dalla fine dell'ostacolo: c'è sempre il tempo di atterrare e risaltare
  s.prossimo = ult.x + ult.w + v * mescola(a, b, s.caso());
}

// altezza della campanella sopra un comignolo (la si prende solo saltando bene, al centro)
export const altezzaCampanella = (o: Ostacolo) => o.h + 70;

export const renna: Gioco<StatoRenna> = {
  crea(seme) {
    const s: StatoRenna = {
      caso: casuale(seme),
      t: 0,
      dist: 0,
      v: VELOCITA[0],
      y: 0,
      vy: 0,
      aTerra: true,
      staccata: -1,
      tocco: -1,
      ostacoli: [],
      prossimo: 0,
      campanelle: 0,
      caduta: -1,
      come: "",
      conti: { salti: 0, comignoli: 0, vuoti: 0, campanelle: 0 },
      fine: false,
      eventi: [],
    };
    s.prossimo = VELOCITA[0] * PRIMO + RENNA.w / 2; // il primo arriva dopo PRIMO secondi
    return s;
  },

  aggiorna(s, dt, tocchi, m) {
    if (s.fine) return;
    s.t += dt;
    const xr = xRenna(m);

    // dopo lo schianto: la renna rotola via, poi la partita finisce
    if (s.caduta >= 0) {
      s.vy -= GRAVITA * dt;
      s.y += s.vy * dt;
      // contro il comignolo rimbalza indietro e resta stesa sul tetto; nel vuoto cade giù
      if (s.come === "comignolo" && s.y < 0) {
        s.y = 0;
        s.vy = 0;
      }
      if (s.t - s.caduta > 1.1) s.fine = true;
      return;
    }

    s.v = velocita(s.t);
    s.dist += s.v * dt;
    // nuovi ostacoli appena fuori dallo schermo a destra
    while (s.prossimo < s.dist + (m.w - xr) + 60) nuovoOstacolo(s);
    s.ostacoli = s.ostacoli.filter((o) => o.x + o.w > s.dist - xr - 40);

    if (tocchi.some((t) => t.tipo === "giu")) s.tocco = s.t;

    // sotto i piedi c'è il tetto o un vuoto?
    const piedi = (o: Ostacolo) => o.tipo === "vuoto" && s.dist - RENNA.w * 0.3 > o.x && s.dist + RENNA.w * 0.3 < o.x + o.w;
    const sulVuoto = s.ostacoli.some(piedi);

    // salto: col tocco a terra, o appena finito il tetto, o col tocco fatto un attimo prima di atterrare
    const puo = s.aTerra || (s.staccata >= 0 && s.t - s.staccata <= TEMPO_BONUS && s.vy <= 0 && s.y > -20);
    if (s.tocco >= 0 && s.t - s.tocco <= MEMORIA_TOCCO && puo) {
      s.vy = SALTO;
      s.aTerra = false;
      s.staccata = -1;
      s.tocco = -1;
      s.conti.salti++;
      s.eventi.push({ tipo: "salto", x: xr, y: yTetto(m) });
    }

    if (!s.aTerra) {
      s.vy -= GRAVITA * dt;
      s.y += s.vy * dt;
      if (s.y <= 0 && !sulVuoto && s.y > -24) {
        s.y = 0;
        s.vy = 0;
        s.aTerra = true;
        s.eventi.push({ tipo: "atterra", x: xr, y: yTetto(m) });
      }
    } else if (sulVuoto) {
      // il tetto è finito: si cade (salvo un salto entro TEMPO_BONUS)
      s.aTerra = false;
      s.staccata = s.t;
      s.vy = 0;
    }

    // caduta nel vuoto
    if (!s.aTerra && s.y < -24) {
      s.caduta = s.t;
      s.come = "vuoto";
      s.eventi.push({ tipo: "cade", x: xr, y: yTetto(m) });
      return;
    }

    for (const o of s.ostacoli) {
      if (o.tipo !== "comignolo") continue;
      // urto: la renna (rettangolo) contro il comignolo (o i due comignoli attaccati)
      const sinistra = s.dist + RENNA.w / 2 > o.x && s.dist - RENNA.w / 2 < o.x + o.w;
      if (sinistra && s.y < o.h) {
        s.caduta = s.t;
        s.come = "comignolo";
        s.vy = 500;
        s.eventi.push({ tipo: "urto", x: xr, y: yTetto(m) - o.h });
        return;
      }
      // campanella sopra il comignolo, presa passando vicino
      if (o.campanella && !o.presa && Math.abs(s.dist - (o.x + o.w / 2)) < 26 && Math.abs(s.y + RENNA.h / 2 - altezzaCampanella(o)) < 40) {
        o.presa = true;
        s.campanelle++;
        s.conti.campanelle++;
        s.eventi.push({ tipo: "campanella", x: xr, y: yTetto(m) - altezzaCampanella(o), testo: `+${PUNTI_CAMPANELLA}`, livello: s.campanelle });
      }
    }
    // ostacoli superati (per le statistiche)
    for (const o of s.ostacoli) {
      if (!o.superato && o.x + o.w < s.dist - RENNA.w / 2) {
        o.superato = true;
        if (o.tipo === "vuoto") s.conti.vuoti++;
        else s.conti.comignoli++;
      }
    }
    if (s.t >= DURATA_MAX) s.fine = true;
  },

  finito: (s) => s.fine,
  hud: (s) => ({ punteggio: metri(s) + s.campanelle * PUNTI_CAMPANELLA }),
  eventi: (s) => s.eventi,
  stats: (s) => ({ ...s.conti, metri: metri(s) }),

  disegna(ctx, s, m, riduci, anticipo) {
    const corre = s.caduta < 0;
    const avanti = corre ? s.v * anticipo * (1 / 60) : 0;
    const dist = s.dist + avanti;
    const xr = xRenna(m);
    const yt = yTetto(m);
    ctx.clearRect(-20, -20, m.w + 40, m.h + 40);

    // cielo: luna e stelle fisse, case lontane che scorrono piano
    ctx.fillStyle = "#f3e8cf";
    ctx.beginPath();
    ctx.arc(m.w * 0.8, m.sopra + 50, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e3826";
    ctx.beginPath();
    ctx.arc(m.w * 0.8 - 10, m.sopra + 44, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(246,201,74,.8)";
    for (let i = 0; i < 18; i++) {
      const x = (i * 137) % Math.max(1, m.w);
      const y = m.sopra + ((i * 71) % Math.max(1, yt - m.sopra - 160));
      const r = riduci ? 1.2 : 1 + 0.6 * Math.sin(s.t * 3 + i);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.4, r), 0, Math.PI * 2);
      ctx.fill();
    }
    disegnaCaseLontane(ctx, m, dist * 0.25, yt);

    // tetti in primo piano: una lunga fila con i vuoti
    const vuoti = s.ostacoli.filter((o) => o.tipo === "vuoto").map((o) => [o.x - dist + xr, o.x + o.w - dist + xr]);
    disegnaTetti(ctx, m, yt, vuoti, dist);

    for (const o of s.ostacoli) {
      if (o.tipo !== "comignolo") continue;
      const x = o.x - dist + xr;
      if (x > m.w + 20 || x + o.w < -20) continue;
      disegnaComignolo(ctx, x, yt, LARGO_COMIGNOLO, o.h, s.t, riduci);
      if (o.doppio) disegnaComignolo(ctx, x + LARGO_COMIGNOLO + STACCO_DOPPIO, yt, LARGO_COMIGNOLO, o.h * 0.9, s.t + 1, riduci);
      if (o.campanella && !o.presa) disegnaCampanella(ctx, x + o.w / 2, yt - altezzaCampanella(o), s.t);
    }

    // la renna
    const vy = corre ? s.y + s.vy * anticipo * (1 / 60) : s.y;
    const giro = s.caduta >= 0 ? Math.min(1, (s.t - s.caduta) / 0.6) * (s.come === "vuoto" ? 0.6 : -Math.PI / 2) : s.aTerra ? 0 : limita(-s.vy / 2400, -0.35, 0.35);
    const xCaduta = s.caduta >= 0 && s.come === "comignolo" ? -Math.min(0.5, s.t - s.caduta) * 90 : 0;
    disegnaRenna(ctx, xr + xCaduta, yt - vy, giro, s.aTerra && corre ? dist / 22 : s.t * (corre ? 0 : 2), !s.aTerra);
  },

  effetto(e, fx) {
    if (e.tipo === "salto") {
      fx.scoppio(e.x!, e.y!, ["#fbf6ea", "#dfe9f1"], 6, { velocita: 90, gravita: 300, dimensione: 2.5, durata: 0.4 });
      fx.suono("salto");
    } else if (e.tipo === "atterra") {
      fx.scoppio(e.x!, e.y!, ["#fbf6ea"], 4, { velocita: 60, gravita: 200, dimensione: 2, durata: 0.3 });
    } else if (e.tipo === "campanella") {
      fx.scoppio(e.x!, e.y!, ["#f6c94a", "#fbf6ea"], 16);
      fx.testo(e.x!, e.y! - 30, e.testo!, "#f6c94a", 24);
      fx.suono("regalo", e.livello ?? 0);
    } else if (e.tipo === "urto") {
      fx.scoppio(e.x!, e.y!, ["#c0392b", "#fbf6ea", "#7a4a1d"], 22, { velocita: 220, gravita: 600 });
      fx.trema(14);
      fx.suono("urto");
    } else if (e.tipo === "cade") {
      fx.trema(6);
      fx.suono("puff");
    }
  },
};

// ---------- disegni ----------
function disegnaCaseLontane(ctx: CanvasRenderingContext2D, m: Mondo, scorre: number, yt: number) {
  const passo = 70;
  const base = yt - 20;
  ctx.fillStyle = "#24442f";
  const inizio = Math.floor(scorre / passo) - 1;
  for (let i = inizio; i < inizio + m.w / passo + 3; i++) {
    const x = i * passo - scorre;
    const h = 50 + (((i * 7919) % 5) + 5) % 5 * 14;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, base - h);
    ctx.lineTo(x + passo / 2, base - h - 26);
    ctx.lineTo(x + passo, base - h);
    ctx.lineTo(x + passo, base);
    ctx.fill();
    // finestrella accesa
    if (((i * 31) % 3 + 3) % 3 === 0) {
      ctx.fillStyle = "rgba(246,201,74,.75)";
      ctx.fillRect(x + passo / 2 - 6, base - h + 14, 12, 14);
      ctx.fillStyle = "#24442f";
    }
  }
}

function disegnaTetti(ctx: CanvasRenderingContext2D, m: Mondo, yt: number, vuoti: number[][], dist: number) {
  // tegole rosse con la neve sopra; i vuoti lasciano vedere il buio
  const pezzi: number[][] = [];
  let x = -10;
  for (const [a, b] of vuoti.sort((p, q) => p[0] - q[0])) {
    if (b < -10 || a > m.w + 10) continue;
    pezzi.push([x, a]);
    x = b;
  }
  pezzi.push([x, m.w + 10]);
  for (const [a, b] of pezzi) {
    if (b <= a) continue;
    ctx.fillStyle = "#8c2a1c";
    ctx.fillRect(a, yt, b - a, m.h - yt);
    // file di tegole
    ctx.strokeStyle = "rgba(0,0,0,.22)";
    ctx.lineWidth = 2;
    for (let y = yt + 18; y < m.h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(a, y);
      ctx.lineTo(b, y);
      ctx.stroke();
      const sfasa = ((y - yt) / 16) % 2 ? 11 : 0;
      for (let xx = a - ((dist + sfasa) % 22); xx < b; xx += 22) {
        if (xx < a) continue;
        ctx.beginPath();
        ctx.moveTo(xx, y - 16);
        ctx.lineTo(xx, y);
        ctx.stroke();
      }
    }
    // neve sul colmo
    ctx.fillStyle = "#fbf6ea";
    ctx.beginPath();
    ctx.moveTo(a, yt + 8);
    ctx.lineTo(a, yt - 4);
    ctx.lineTo(b, yt - 4);
    ctx.lineTo(b, yt + 8);
    for (let xx = b; xx > a; xx -= 14) ctx.quadraticCurveTo(xx - 7, yt + 15, Math.max(a, xx - 14), yt + 8);
    ctx.fill();
  }
}

function disegnaComignolo(ctx: CanvasRenderingContext2D, x: number, yt: number, w: number, h: number, t: number, riduci: boolean) {
  ctx.fillStyle = "#b8452c";
  ctx.fillRect(x, yt - h, w, h + 2);
  ctx.strokeStyle = "rgba(251,246,234,.45)";
  ctx.lineWidth = 1.2;
  for (let y = yt - h + 9; y < yt; y += 9) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    const s = ((y - yt) / 9) % 2 ? w / 2 : w / 4;
    ctx.beginPath();
    ctx.moveTo(x + s, y - 9);
    ctx.lineTo(x + s, y);
    ctx.stroke();
  }
  // bordo con la neve
  ctx.fillStyle = "#fbf6ea";
  ctx.beginPath();
  ctx.roundRect(x - 4, yt - h - 8, w + 8, 10, 5);
  ctx.fill();
  // fumo
  if (!riduci) {
    ctx.fillStyle = "rgba(243,232,207,.3)";
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.6 + i / 3) % 1;
      ctx.beginPath();
      ctx.arc(x + w / 2 + Math.sin(k * 6 + i) * 6 - k * 16, yt - h - 14 - k * 46, 5 + k * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function disegnaCampanella(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 5) * 0.25);
  ctx.fillStyle = "#f6c94a";
  ctx.strokeStyle = "#b97c0c";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, 9);
  ctx.quadraticCurveTo(-11, -12, 0, -12);
  ctx.quadraticCurveTo(11, -12, 11, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#b97c0c";
  ctx.beginPath();
  ctx.arc(0, 11, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(-6, -17, 12, 5);
  ctx.restore();
}

// la renna di profilo: corpo, collo, testa col naso rosso, corna e quattro zampe che corrono
function disegnaRenna(ctx: CanvasRenderingContext2D, x: number, piedi: number, giro: number, passo: number, inAria: boolean) {
  ctx.save();
  ctx.translate(x, piedi - 24);
  ctx.rotate(giro);
  const marrone = "#8a5a33";
  const scuro = "#5e3b20";
  // zampe
  ctx.strokeStyle = scuro;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  const zampe = [-13, -6, 8, 15];
  zampe.forEach((zx, i) => {
    const a = inAria ? (i < 2 ? 0.6 : -0.6) : Math.sin(passo + (i % 2 ? Math.PI : 0) + (i < 2 ? 0 : 0.8)) * 0.6;
    ctx.beginPath();
    ctx.moveTo(zx, 4);
    ctx.lineTo(zx + Math.sin(a) * 18, 4 + Math.cos(a) * 18);
    ctx.stroke();
  });
  // corpo
  ctx.fillStyle = marrone;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // pancia chiara
  ctx.fillStyle = "#e8d2b0";
  ctx.beginPath();
  ctx.ellipse(2, 5, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // coda
  ctx.fillStyle = "#fbf6ea";
  ctx.beginPath();
  ctx.ellipse(-22, -6, 5, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // collo e testa
  ctx.fillStyle = marrone;
  ctx.beginPath();
  ctx.moveTo(12, -6);
  ctx.lineTo(22, -24);
  ctx.lineTo(30, -20);
  ctx.lineTo(20, -2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(29, -25, 10, 7, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // naso rosso
  ctx.fillStyle = "#e5481e";
  ctx.beginPath();
  ctx.arc(39, -22, 4, 0, Math.PI * 2);
  ctx.fill();
  // occhio
  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.arc(30, -28, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // corna
  ctx.strokeStyle = "#d9b77a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(25, -31);
  ctx.lineTo(20, -46);
  ctx.moveTo(22, -40);
  ctx.lineTo(14, -44);
  ctx.moveTo(21, -44);
  ctx.lineTo(26, -50);
  ctx.moveTo(28, -31);
  ctx.lineTo(31, -44);
  ctx.moveTo(30, -40);
  ctx.lineTo(37, -44);
  ctx.stroke();
  // sciarpa vermiglia che sventola
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.ellipse(16, -6, 5, 7, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, -6);
  ctx.lineTo(2, -14 + Math.sin(passo * 2) * 3);
  ctx.lineTo(4, -6 + Math.sin(passo * 2) * 3);
  ctx.fill();
  ctx.restore();
}
