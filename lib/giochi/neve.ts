// Gioco 5 · PALLE DI NEVE ALLE FINESTRE (PIANO-GIOCHI.md 6.5)
// La facciata di una casa con 9 finestre (3×3) e un balcone. Dalle finestre spuntano dei personaggi:
// tocca dove lanciare. La palla parte dal basso e ci mette VOLO secondi ad arrivare: bisogna anticipare
// (se il personaggio si ritira prima, la palla finisce sulla finestra vuota).
// Elfo +10 · elfo dorato +30 (resta fuori pochissimo) · renna sul balcone +40 (si muove: mira avanti)
// · Babbo Natale −25 e combo azzerata (NON colpirlo) · finestra vuota −2 e combo azzerata.
// Insidia: dai SCAMBI_DA secondi alcuni elfi, quando si ritirano, lasciano il posto a Babbo Natale
// nella stessa finestra (chi lancia in ritardo lo colpisce). Colpire l'elfo in tempo lo evita.
// Combo: ogni COMBO_PASSO colpi buoni di fila il moltiplicatore sale (×1 → ×4). 60 secondi.
import { casuale, curve, limita, mescola, type Evento, type Gioco, type Mondo } from "./base.ts";

// ----- costanti (taratura) -----
const DURATA = 60; // s
export const VOLO = 0.25; // s dal lancio all'arrivo
const RICARICA = 0.2; // s tra un lancio e l'altro (antispam)
const OGNI = [0.85, 0.36]; // s tra un personaggio e l'altro (dall'inizio alla fine)
const INSIEME = [2, 5]; // personaggi fuori insieme al massimo
const SALE = 0.12; // s per spuntare
const SCENDE = 0.12; // s per ritirarsi
const RESTA_ELFO = [1.2, 0.5]; // s fuori (dall'inizio alla fine)
const RESTA_ORO = 0.45;
const RESTA_BABBO = [1.4, 0.9];
const P_ORO = 0.1;
const P_BABBO = [0.14, 0.3];
const SCAMBI_DA = 25; // s: da qui un elfo può lasciare il posto a Babbo Natale…
const P_SCAMBIO = [0.15, 0.35]; // …con questa probabilità
const RENNE_DA = 20; // s: da qui passa la renna sul balcone…
const OGNI_RENNA = [6, 10]; // …ogni tanto (s dalla fine della precedente)
const VELOCITA_RENNA = [115, 185]; // px/s
const SOSTE_DA = 40; // s: da qui la renna a volte si ferma un attimo…
const SOSTA = 0.4; // …per tanto così
const RAGGIO_RENNA = 30; // px
const MARGINE_FINESTRA = 8; // px intorno alla finestra che valgono ancora come "finestra"
const VISIBILE = 0.45; // un personaggio si colpisce se è fuori almeno a metà
const PUNTI = { elfo: 10, oro: 30, renna: 40 } as const;
const BABBO = -25;
const VUOTA = -2;
const COMBO_PASSO = 5;
const MOLT_MAX = 4;
const BARCOLLA = 0.45; // s: l'elfo colpito barcolla con le stelline prima di ritirarsi
const OFFESO = 0.7; // s: Babbo Natale colpito resta lì offeso

type Tipo = "elfo" | "oro" | "babbo";
type Personaggio = {
  tipo: Tipo;
  t0: number; // quando inizia a spuntare
  resta: number; // s fuori del tutto
  colpito: number; // istante del colpo (-1 = no)
  poiBabbo: boolean; // quando si ritira, al suo posto spunta Babbo Natale
};
type Finestra = { chi: Personaggio | null; libera: number; imposte: number }; // libera = da quando si può riusare; imposte = quando hanno sbattuto
type Renna = { x: number; dir: number; v: number; sosta: number; fermaDa: number; colpita: number } | null; // sosta = x dove si ferma (NaN = no)
type Palla = { x0: number; y0: number; x: number; y: number; t0: number; viva: boolean };

export type StatoNeve = {
  caso: () => number;
  t: number;
  prossimo: number;
  finestre: Finestra[];
  renna: Renna;
  prossimaRenna: number;
  palle: Palla[];
  ultimoLancio: number;
  punti: number;
  combo: number;
  conti: { lanci: number; elfi: number; dorati: number; renne: number; babbi: number; vuote: number };
  fine: boolean;
  eventi: Evento[];
};

const molt = (combo: number) => Math.min(MOLT_MAX, 1 + Math.floor(combo / COMBO_PASSO));
const avanzamento = (t: number) => limita(t / DURATA, 0, 1);

// ---------- la casa: dove stanno le cose (dipende solo dallo schermo) ----------
export function casa(m: Mondo) {
  const terra = m.h - m.sotto - 64; // dove inizia la neve davanti alla casa
  const cima = m.sopra + 4;
  const x0 = m.w * 0.06;
  const x1 = m.w * 0.94;
  const tetto = Math.min(72, (terra - cima) * 0.13);
  const yFacciata = cima + tetto;
  const balcone = (terra - yFacciata) * 0.2; // striscia del balcone, in basso
  const yBalcone = terra - balcone;
  const riga = (yBalcone - yFacciata - 8) / 3;
  const fw = x1 - x0;
  const ww = Math.min(fw * 0.18, 80); // stretta abbastanza da lasciare posto alle imposte tra una finestra e l'altra
  const wh = Math.min(riga * 0.76, ww * 1.3);
  const finestre = Array.from({ length: 9 }, (_, i) => {
    const cx = x0 + fw * [0.2, 0.5, 0.8][i % 3];
    const cy = yFacciata + 8 + riga * (Math.floor(i / 3) + 0.5);
    return { x: cx - ww / 2, y: cy - wh / 2, w: ww, h: wh, cx, cy };
  });
  return { terra, cima, x0, x1, tetto, yFacciata, yBalcone, balcone, finestre, ww, wh, yRenna: yBalcone + balcone * 0.8 - 16 /* dove poggiano gli zoccoli */, mano: { x: m.w / 2, y: m.h - m.sotto - 20 } };
}

// quanto è fuori il personaggio (0..1) all'istante t, e se si può colpire
export function fuori(p: Personaggio, t: number) {
  const dt = t - p.t0;
  if (dt < 0) return 0;
  if (p.colpito >= 0) {
    const dopo = t - p.colpito - (p.tipo === "babbo" ? OFFESO : BARCOLLA);
    return dopo < 0 ? 1 : 1 - limita(dopo / SCENDE, 0, 1);
  }
  if (dt < SALE) return dt / SALE;
  if (dt < SALE + p.resta) return 1;
  return 1 - limita((dt - SALE - p.resta) / SCENDE, 0, 1);
}
const fineDi = (p: Personaggio) => (p.colpito >= 0 ? p.colpito + (p.tipo === "babbo" ? OFFESO : BARCOLLA) + SCENDE : p.t0 + SALE + p.resta + SCENDE);
export const colpibile = (p: Personaggio, t: number) => p.colpito < 0 && fuori(p, t) >= VISIBILE;

// la renna all'istante t+dt (per il bot e per il disegno anticipato)
export function xRenna(r: NonNullable<Renna>, t: number, dt: number) {
  let x = r.x;
  let resto = dt;
  if (r.fermaDa >= 0) resto = Math.max(0, dt - Math.max(0, r.fermaDa + SOSTA - t));
  const prima = r.dir > 0 ? r.sosta - x : x - r.sosta;
  if (r.fermaDa < 0 && Number.isFinite(r.sosta) && prima >= 0 && prima < r.v * resto) {
    // si ferma per strada
    resto = Math.max(0, resto - prima / r.v - SOSTA);
    x = r.sosta;
  }
  return x + r.dir * r.v * resto;
}

function nasce(s: StatoNeve) {
  const k = avanzamento(s.t);
  const fuoriOra = s.finestre.filter((f) => f.chi).length;
  if (fuoriOra >= Math.round(mescola(INSIEME[0], INSIEME[1], k))) return;
  const libere = s.finestre.map((f, i) => (!f.chi && s.t >= f.libera ? i : -1)).filter((i) => i >= 0);
  if (!libere.length) return;
  const i = libere[Math.floor(s.caso() * libere.length)];
  const sorte = s.caso();
  const tipo: Tipo = sorte < P_ORO ? "oro" : sorte < P_ORO + mescola(P_BABBO[0], P_BABBO[1], k) ? "babbo" : "elfo";
  const resta = tipo === "oro" ? RESTA_ORO : tipo === "babbo" ? mescola(RESTA_BABBO[0], RESTA_BABBO[1], k) : mescola(RESTA_ELFO[0], RESTA_ELFO[1], k) * (0.85 + s.caso() * 0.3);
  const poiBabbo = tipo === "elfo" && s.t >= SCAMBI_DA && s.caso() < mescola(P_SCAMBIO[0], P_SCAMBIO[1], limita((s.t - SCAMBI_DA) / (DURATA - SCAMBI_DA), 0, 1));
  s.finestre[i].chi = { tipo, t0: s.t, resta, colpito: -1, poiBabbo };
}

function nuovaRenna(s: StatoNeve, m: Mondo) {
  const dir = s.caso() < 0.5 ? 1 : -1;
  const v = mescola(VELOCITA_RENNA[0], VELOCITA_RENNA[1], avanzamento(s.t)) * (0.9 + s.caso() * 0.2);
  const sosta = s.t >= SOSTE_DA && s.caso() < 0.6 ? m.w * mescola(0.3, 0.7, s.caso()) : NaN;
  s.renna = { x: dir > 0 ? -RAGGIO_RENNA * 2 : m.w + RAGGIO_RENNA * 2, dir, v, sosta, fermaDa: -1, colpita: -1 };
}

// dove arriva una palla e cosa colpisce
function arriva(s: StatoNeve, p: Palla, m: Mondo) {
  const c = casa(m);
  const r = s.renna;
  const premia = (tipo: keyof typeof PUNTI, x: number, y: number) => {
    const mm = molt(s.combo);
    s.combo++;
    const v = PUNTI[tipo] * mm;
    s.punti += v;
    s.eventi.push({ tipo, x, y, testo: mm > 1 ? `+${v} ×${mm}` : `+${v}`, livello: s.combo });
    if (molt(s.combo) > mm) s.eventi.push({ tipo: "molt", x, y: y - 40, testo: `×${molt(s.combo)}!` });
  };
  // la renna (davanti alla facciata)
  if (r && r.colpita < 0 && Math.hypot(p.x - r.x, p.y - (c.yRenna - 22)) <= RAGGIO_RENNA) {
    r.colpita = s.t;
    s.conti.renne++;
    premia("renna", r.x, c.yRenna - 30);
    return;
  }
  // una finestra
  const i = c.finestre.findIndex((f) => p.x >= f.x - MARGINE_FINESTRA && p.x <= f.x + f.w + MARGINE_FINESTRA && p.y >= f.y - MARGINE_FINESTRA && p.y <= f.y + f.h + MARGINE_FINESTRA);
  if (i < 0) {
    s.eventi.push({ tipo: "muro", x: p.x, y: p.y });
    return;
  }
  const f = s.finestre[i];
  const w = c.finestre[i];
  const chi = f.chi;
  if (chi && colpibile(chi, s.t)) {
    chi.colpito = s.t;
    if (chi.tipo === "babbo") {
      s.punti = Math.max(0, s.punti + BABBO);
      s.combo = 0;
      s.conti.babbi++;
      s.eventi.push({ tipo: "babbo", x: w.cx, y: w.cy - w.h * 0.2, testo: `${BABBO}` });
    } else {
      chi.poiBabbo = false; // preso in tempo: Babbo Natale non arriva
      if (chi.tipo === "oro") s.conti.dorati++;
      else s.conti.elfi++;
      premia(chi.tipo === "oro" ? "oro" : "elfo", w.cx, w.cy - w.h * 0.2);
    }
    return;
  }
  if (chi && chi.colpito >= 0) {
    // già colpito: la palla si schiaccia e basta
    s.eventi.push({ tipo: "muro", x: p.x, y: p.y });
    return;
  }
  s.punti = Math.max(0, s.punti + VUOTA);
  s.combo = 0;
  s.conti.vuote++;
  s.eventi.push({ tipo: "vuota", x: p.x, y: p.y, testo: `${VUOTA}` });
}

export const neve: Gioco<StatoNeve> = {
  crea(seme) {
    return {
      caso: casuale(seme),
      t: 0,
      prossimo: 0.5,
      finestre: Array.from({ length: 9 }, () => ({ chi: null, libera: 0, imposte: -9 })),
      renna: null,
      prossimaRenna: RENNE_DA,
      palle: [],
      ultimoLancio: -9,
      punti: 0,
      combo: 0,
      conti: { lanci: 0, elfi: 0, dorati: 0, renne: 0, babbi: 0, vuote: 0 },
      fine: false,
      eventi: [],
    };
  },

  aggiorna(s, dt, tocchi, m) {
    if (s.fine) return;
    s.t += dt;
    const c = casa(m);

    // nuovi personaggi alle finestre
    if (s.t >= s.prossimo && s.t < DURATA - 0.8) {
      nasce(s);
      s.prossimo = s.t + mescola(OGNI[0], OGNI[1], avanzamento(s.t)) * (0.8 + s.caso() * 0.4);
    }
    // chi ha finito si ritira (le imposte sbattono); se doveva, al suo posto spunta Babbo Natale
    for (const f of s.finestre) {
      if (!f.chi || s.t < fineDi(f.chi)) continue;
      const scambio = f.chi.poiBabbo && f.chi.colpito < 0 && s.t < DURATA - 1;
      f.imposte = s.t;
      f.libera = s.t + 0.3;
      f.chi = scambio ? { tipo: "babbo", t0: s.t, resta: mescola(RESTA_BABBO[0], RESTA_BABBO[1], avanzamento(s.t)), colpito: -1, poiBabbo: false } : null;
    }

    // la renna sul balcone
    if (!s.renna && s.t >= s.prossimaRenna && s.t < DURATA - 3) nuovaRenna(s, m);
    const r = s.renna;
    if (r) {
      if (r.colpita >= 0) r.x += r.dir * 420 * dt; // scappa via veloce
      else if (r.fermaDa >= 0) {
        if (s.t - r.fermaDa >= SOSTA) {
          r.fermaDa = -1;
          r.sosta = NaN;
        }
      } else {
        const prima = r.x;
        r.x += r.dir * r.v * dt;
        if (Number.isFinite(r.sosta) && (prima - r.sosta) * (r.x - r.sosta) <= 0) {
          r.x = r.sosta;
          r.fermaDa = s.t;
        }
      }
      if (r.x < -RAGGIO_RENNA * 3 || r.x > m.w + RAGGIO_RENNA * 3) {
        s.renna = null;
        s.prossimaRenna = s.t + mescola(OGNI_RENNA[0], OGNI_RENNA[1], s.caso());
      }
    }

    // lanci: una palla ogni RICARICA secondi, solo sopra la neve
    for (const tc of tocchi) {
      if (tc.tipo !== "giu" || tc.y > c.terra || s.t - s.ultimoLancio < RICARICA) continue;
      s.ultimoLancio = s.t;
      s.conti.lanci++;
      const nuova = { x0: c.mano.x, y0: c.mano.y, x: tc.x, y: tc.y, t0: s.t, viva: true };
      const libera = s.palle.find((p) => !p.viva);
      if (libera) Object.assign(libera, nuova);
      else s.palle.push(nuova);
      s.eventi.push({ tipo: "lancio" });
    }
    for (const p of s.palle) {
      if (p.viva && s.t - p.t0 >= VOLO) {
        p.viva = false;
        arriva(s, p, m);
      }
    }

    if (s.t >= DURATA) s.fine = true;
  },

  finito: (s) => s.fine,
  hud: (s) => ({ punteggio: s.punti, tempo: Math.max(0, DURATA - s.t), molt: molt(s.combo) }),
  eventi: (s) => s.eventi,
  stats: (s) => ({ ...s.conti }),

  disegna(ctx, s, m, riduci, anticipo) {
    ctx.clearRect(-20, -20, m.w + 40, m.h + 40);
    const c = casa(m);
    const t = s.t + anticipo / 60;

    // fiocchi di neve lenti dietro la casa
    ctx.fillStyle = "rgba(243,232,207,.35)";
    for (let i = 0; i < 24; i++) {
      const x = (i * 157 + Math.sin(t * 0.7 + i) * 10) % m.w;
      const y = (((i * 229 + (riduci ? 0 : t * 22)) % (m.h + 40)) + m.h + 40) % (m.h + 40) - 20;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    disegnaCasa(ctx, c, m);
    // le finestre: interno acceso, personaggio, imposte
    c.finestre.forEach((w, i) => {
      const f = s.finestre[i];
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(w.x, w.y, w.w, w.h, [w.w / 2, w.w / 2, 4, 4]);
      ctx.clip();
      const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
      g.addColorStop(0, "#f8d77a");
      g.addColorStop(1, "#e9a81c");
      ctx.fillStyle = g;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      // la tenda in fondo
      ctx.fillStyle = "rgba(229,72,30,.35)";
      ctx.fillRect(w.x, w.y, w.w * 0.18, w.h);
      ctx.fillRect(w.x + w.w * 0.82, w.y, w.w * 0.18, w.h);
      if (f.chi) {
        const v = curve.esceMorbida(fuori(f.chi, t));
        if (v > 0) disegnaPersonaggio(ctx, f.chi, w.cx, w.y + w.h * 0.55 + (1 - v) * w.h * 0.95, w.w, t, riduci);
      }
      ctx.restore();
      // cornice di legno e davanzale con la neve
      ctx.strokeStyle = "#6b4a2f";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(w.x, w.y, w.w, w.h, [w.w / 2, w.w / 2, 4, 4]);
      ctx.stroke();
      ctx.fillStyle = "#f3e8cf";
      ctx.beginPath();
      ctx.roundRect(w.x - 7, w.y + w.h - 2, w.w + 14, 9, 4);
      ctx.fill();
      // imposte verdi: sbattono quando qualcuno si ritira
      const sbatte = riduci ? 0 : Math.max(0, 1 - (t - f.imposte) / 0.35);
      const chiusura = sbatte ? Math.abs(Math.sin(sbatte * Math.PI * 2)) * sbatte * 0.6 : 0;
      for (const lato of [-1, 1]) {
        const larga = w.w * 0.24 * (1 - chiusura);
        const xa = lato < 0 ? w.x - 3 - larga : w.x + w.w + 3;
        ctx.fillStyle = "#2c4a32";
        ctx.beginPath();
        ctx.roundRect(xa, w.y + w.h * 0.12, larga, w.h * 0.86, 3);
        ctx.fill();
        if (larga > 8) {
          ctx.strokeStyle = "rgba(243,232,207,.5)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.roundRect(xa + 3, w.y + w.h * 0.12 + 3, larga - 6, w.h * 0.86 - 6, 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    });

    // il balcone con la renna
    const r = s.renna;
    if (r) disegnaRenna(ctx, xRenna(r, s.t, r.colpita >= 0 ? 0 : anticipo / 60), c.yRenna, r.dir, t, r.colpita >= 0, r.fermaDa >= 0);
    disegnaRinghiera(ctx, c);

    // la neve davanti, con il mucchio di palle e la mano che lancia
    disegnaNeve(ctx, c, m);
    const pronta = limita((s.t - s.ultimoLancio) / RICARICA, 0, 1);
    pallaDiNeve(ctx, c.mano.x, c.mano.y - 6 * pronta, 13 * (0.5 + pronta * 0.5));

    // le palle in volo: arco verso l'alto, sempre più piccole (si allontanano)
    for (const p of s.palle) {
      if (!p.viva) continue;
      const k = limita((t - p.t0) / VOLO, 0, 1);
      const x = mescola(p.x0, p.x, k);
      const y = mescola(p.y0, p.y, k) - Math.sin(Math.PI * k) * 46;
      pallaDiNeve(ctx, x, y, mescola(13, 8, k));
    }
  },

  effetto(e, fx) {
    const x = e.x ?? 0;
    const y = e.y ?? 0;
    if (e.tipo === "lancio") fx.suono("lancio");
    else if (e.tipo === "elfo" || e.tipo === "oro" || e.tipo === "renna") {
      fx.scoppio(x, y, e.tipo === "elfo" ? ["#fbf6ea", "#f3e8cf", "#ffffff"] : ["#fbf6ea", "#f6c94a", "#e9a81c"], e.tipo === "elfo" ? 18 : 30, { velocita: 240 });
      fx.testo(x, y - 30, e.testo!, e.tipo === "elfo" ? "#f3e8cf" : "#f6c94a", e.tipo === "elfo" ? 22 : 28);
      fx.suono("splat");
      fx.suono("colpo", e.livello ?? 0);
      if (e.tipo !== "elfo") fx.suono("regalo", e.livello ?? 0);
    } else if (e.tipo === "molt") {
      fx.testo(x, y - 30, e.testo!, "#e9a81c", 30);
    } else if (e.tipo === "babbo") {
      fx.scoppio(x, y, ["#fbf6ea", "#e5481e"], 18, { velocita: 200 });
      fx.testo(x, y - 34, "Ehi!", "#e5481e", 30);
      fx.testo(x, y, e.testo!, "#e5481e", 24);
      fx.trema(12);
      fx.suono("splat");
      fx.suono("offeso");
    } else if (e.tipo === "vuota") {
      fx.scoppio(x, y, ["#fbf6ea", "#f3e8cf"], 10, { velocita: 140, gravita: 400, dimensione: 3 });
      fx.testo(x, y - 26, e.testo!, "#e5481e", 22);
      fx.trema(5);
      fx.suono("splat");
      fx.suono("sbaglio");
    } else if (e.tipo === "muro") {
      fx.scoppio(x, y, ["#fbf6ea", "#f3e8cf"], 8, { velocita: 120, gravita: 400, dimensione: 3 });
      fx.suono("splat");
    }
  },
};

// ---------- disegni (forme semplici su canvas, nello stile feltro) ----------
type Casa = ReturnType<typeof casa>;

function disegnaCasa(ctx: CanvasRenderingContext2D, c: Casa, m: Mondo) {
  // comignolo (spunta dal tetto) con la neve sopra
  const xc = c.x0 + (c.x1 - c.x0) * 0.18; // a sinistra: a destra c'è il tasto dell'audio
  ctx.fillStyle = "#8a4a2c";
  ctx.fillRect(xc, c.cima - 18, 24, 30);
  ctx.fillStyle = "#fbf6ea";
  ctx.beginPath();
  ctx.roundRect(xc - 4, c.cima - 22, 32, 8, 4);
  ctx.fill();
  // facciata di feltro crema con la cucitura
  ctx.fillStyle = "#f1e4c8";
  ctx.fillRect(c.x0, c.yFacciata, c.x1 - c.x0, c.terra - c.yFacciata);
  ctx.strokeStyle = "rgba(44,74,50,.45)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(c.x0 + 6, c.yFacciata + 6, c.x1 - c.x0 - 12, c.terra - c.yFacciata - 12);
  ctx.setLineDash([]);
  // tetto vermiglio con la neve sopra
  const sporge = 14;
  ctx.fillStyle = "#e5481e";
  ctx.beginPath();
  ctx.moveTo(c.x0 - sporge, c.yFacciata + 4);
  ctx.lineTo(c.x0 + 18, c.cima);
  ctx.lineTo(c.x1 - 18, c.cima);
  ctx.lineTo(c.x1 + sporge, c.yFacciata + 4);
  ctx.closePath();
  ctx.fill();
  // tegole a punto croce
  ctx.strokeStyle = "rgba(251,246,234,.55)";
  ctx.lineWidth = 1.5;
  for (let x = c.x0 + 26; x < c.x1 - 20; x += 18) {
    if (Math.abs(x - m.w / 2) < 16) continue; // lì c'è la stella
    const y = c.cima + (c.yFacciata - c.cima) * 0.55;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 3);
    ctx.lineTo(x + 3, y + 3);
    ctx.moveTo(x + 3, y - 3);
    ctx.lineTo(x - 3, y + 3);
    ctx.stroke();
  }
  ctx.fillStyle = "#fbf6ea";
  ctx.beginPath();
  ctx.moveTo(c.x0 + 14, c.cima + 2);
  ctx.lineTo(c.x1 - 14, c.cima + 2);
  for (let k = 0; k <= 8; k++) {
    const x = mescola(c.x1 - 14, c.x0 + 14, k / 8);
    ctx.quadraticCurveTo(x + (c.x1 - c.x0) / 32, c.cima + 12 + (k % 2) * 6, x, c.cima + 8);
  }
  ctx.closePath();
  ctx.fill();
  // una stella d'oro sotto il tetto
  stella(ctx, m.w / 2, c.cima + (c.yFacciata - c.cima) * 0.55, Math.min(12, c.tetto * 0.25), "#f6c94a");
}

function disegnaRinghiera(ctx: CanvasRenderingContext2D, c: Casa) {
  const y = c.yBalcone + c.balcone * 0.25;
  const h = c.balcone * 0.55;
  // pavimento del balcone
  ctx.fillStyle = "#6b4a2f";
  ctx.fillRect(c.x0 - 8, y + h, c.x1 - c.x0 + 16, 8);
  // colonnine e corrimano
  ctx.fillStyle = "#8a5d3b";
  for (let x = c.x0; x <= c.x1 + 1; x += (c.x1 - c.x0) / 14) ctx.fillRect(x - 2.5, y + 4, 5, h - 2);
  ctx.beginPath();
  ctx.roundRect(c.x0 - 8, y, c.x1 - c.x0 + 16, 7, 3);
  ctx.fill();
  // neve sul corrimano
  ctx.fillStyle = "#fbf6ea";
  ctx.beginPath();
  ctx.roundRect(c.x0 - 6, y - 4, c.x1 - c.x0 + 12, 6, 3);
  ctx.fill();
}

function disegnaNeve(ctx: CanvasRenderingContext2D, c: Casa, m: Mondo) {
  ctx.fillStyle = "#f3e8cf";
  ctx.beginPath();
  ctx.moveTo(-10, m.h + 20);
  ctx.lineTo(-10, c.terra + 10);
  ctx.quadraticCurveTo(m.w * 0.25, c.terra - 6, m.w * 0.5, c.terra + 4);
  ctx.quadraticCurveTo(m.w * 0.75, c.terra + 12, m.w + 10, c.terra + 2);
  ctx.lineTo(m.w + 10, m.h + 20);
  ctx.fill();
  // il mucchietto di palle di scorta
  for (const [dx, dy] of [[-44, 4], [-30, 6], [-37, -6], [40, 5], [53, 6]] as const) pallaDiNeve(ctx, c.mano.x + dx, c.mano.y + dy, 8);
}

function pallaDiNeve(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#d9d2c0");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(44,74,50,.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

// stella a 4 punte (come nel resto del sito)
function stella(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colore: string) {
  const k = 0.18 * r;
  ctx.fillStyle = colore;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + k, y - k, x + r, y);
  ctx.quadraticCurveTo(x + k, y + k, x, y + r);
  ctx.quadraticCurveTo(x - k, y + k, x - r, y);
  ctx.quadraticCurveTo(x - k, y - k, x, y - r);
  ctx.fill();
}

// Un personaggio alla finestra: (cx, cy) = centro della testa, L = larghezza della finestra
function disegnaPersonaggio(ctx: CanvasRenderingContext2D, p: Personaggio, cx: number, cy: number, L: number, t: number, riduci: boolean) {
  const r = L * 0.24; // raggio della testa
  const colpito = p.colpito >= 0;
  const babbo = p.tipo === "babbo";
  const oro = p.tipo === "oro";
  ctx.save();
  // barcolla quando è colpito
  if (colpito && !babbo && !riduci) {
    ctx.translate(cx, cy + r);
    ctx.rotate(Math.sin((t - p.colpito) * 22) * 0.18);
    ctx.translate(-cx, -cy - r);
  }
  // spalle e corpo
  ctx.fillStyle = babbo ? "#e5481e" : oro ? "#e9a81c" : "#2c4a32";
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 2.1, r * 1.5, r * 1.2, 0, Math.PI, 0);
  ctx.fill();
  if (!babbo) {
    // colletto a punte
    ctx.fillStyle = oro ? "#fbf6ea" : "#e5481e";
    ctx.beginPath();
    for (let k = -2; k <= 2; k++) {
      ctx.moveTo(cx + k * r * 0.45 - r * 0.22, cy + r * 0.95);
      ctx.lineTo(cx + k * r * 0.45, cy + r * 1.35);
      ctx.lineTo(cx + k * r * 0.45 + r * 0.22, cy + r * 0.95);
    }
    ctx.fill();
  }
  // orecchie a punta (elfi)
  ctx.fillStyle = "#f3bf9b";
  if (!babbo) {
    for (const lato of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + lato * r * 0.8, cy - r * 0.2);
      ctx.lineTo(cx + lato * r * 1.55, cy - r * 0.55);
      ctx.lineTo(cx + lato * r * 0.85, cy + r * 0.35);
      ctx.fill();
    }
  }
  // faccia
  ctx.fillStyle = babbo && colpito ? "#f08a74" : "#f3bf9b";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // guance
  ctx.fillStyle = "rgba(229,72,30,.35)";
  ctx.beginPath();
  ctx.arc(cx - r * 0.55, cy + r * 0.25, r * 0.18, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.55, cy + r * 0.25, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // barba di Babbo Natale
  if (babbo) {
    ctx.fillStyle = "#fbf6ea";
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.05, cy);
    ctx.quadraticCurveTo(cx - r * 1.1, cy + r * 1.9, cx, cy + r * 2.0);
    ctx.quadraticCurveTo(cx + r * 1.1, cy + r * 1.9, cx + r * 1.05, cy);
    ctx.quadraticCurveTo(cx, cy + r * 0.55, cx - r * 1.05, cy);
    ctx.fill();
    // baffi
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.32, cy + r * 0.38, r * 0.38, r * 0.17, 0.25, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.32, cy + r * 0.38, r * 0.38, r * 0.17, -0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  // occhi
  ctx.strokeStyle = "#1c241d";
  ctx.fillStyle = "#1c241d";
  ctx.lineWidth = Math.max(1.5, r * 0.11);
  ctx.lineCap = "round";
  for (const lato of [-1, 1]) {
    const ox = cx + lato * r * 0.36;
    const oy = cy - r * 0.08;
    if (colpito && !babbo) {
      // occhi a X
      const d = r * 0.13;
      ctx.beginPath();
      ctx.moveTo(ox - d, oy - d);
      ctx.lineTo(ox + d, oy + d);
      ctx.moveTo(ox + d, oy - d);
      ctx.lineTo(ox - d, oy + d);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(ox, oy, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      if (babbo && colpito) {
        // sopracciglia offese
        ctx.beginPath();
        ctx.moveTo(ox - lato * r * 0.2, oy - r * 0.32);
        ctx.lineTo(ox + lato * r * 0.18, oy - r * 0.2);
        ctx.stroke();
      }
    }
  }
  // bocca
  ctx.beginPath();
  if (babbo) {
    if (colpito) ctx.ellipse(cx, cy + r * 0.72, r * 0.12, r * 0.16, 0, 0, Math.PI * 2);
    else ctx.arc(cx, cy + r * 0.55, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
    if (colpito) ctx.fill();
    else ctx.stroke();
  } else if (colpito) {
    ctx.arc(cx, cy + r * 0.5, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.arc(cx, cy + r * 0.3, r * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  // cappello
  if (babbo) {
    ctx.fillStyle = "#e5481e";
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.0, cy - r * 0.45);
    ctx.quadraticCurveTo(cx - r * 0.2, cy - r * 2.0, cx + r * 1.15, cy - r * 1.35);
    ctx.lineTo(cx + r * 1.0, cy - r * 0.45);
    ctx.fill();
    ctx.fillStyle = "#fbf6ea";
    ctx.beginPath();
    ctx.roundRect(cx - r * 1.12, cy - r * 0.72, r * 2.24, r * 0.42, r * 0.2);
    ctx.arc(cx + r * 1.2, cy - r * 1.3, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = oro ? "#f6c94a" : "#3f7a4a";
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.0, cy - r * 0.4);
    ctx.quadraticCurveTo(cx + r * 0.1, cy - r * 2.6, cx + r * 0.9, cy - r * 2.15);
    ctx.quadraticCurveTo(cx + r * 0.6, cy - r * 1.2, cx + r * 1.0, cy - r * 0.4);
    ctx.fill();
    ctx.fillStyle = "#e5481e";
    ctx.beginPath();
    ctx.roundRect(cx - r * 1.08, cy - r * 0.62, r * 2.16, r * 0.34, r * 0.17);
    ctx.fill();
    ctx.fillStyle = oro ? "#fbf6ea" : "#e9a81c";
    ctx.beginPath();
    ctx.arc(cx + r * 0.95, cy - r * 2.15, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // elfo dorato: brillantini intorno
  if (oro && !colpito && !riduci) {
    for (let k = 0; k < 3; k++) {
      const a = t * 3 + k * 2.1;
      stella(ctx, cx + Math.cos(a) * r * 1.7, cy - r * 0.4 + Math.sin(a) * r * 1.1, r * 0.22 * (0.7 + 0.3 * Math.sin(t * 9 + k)), "#fbf6ea");
    }
  }
  // stelline che girano sopra la testa di chi è colpito
  if (colpito && !babbo) {
    for (let k = 0; k < 3; k++) {
      const a = (t - p.colpito) * 9 + (k * Math.PI * 2) / 3;
      stella(ctx, cx + Math.cos(a) * r * 1.1, cy - r * 1.5 + Math.sin(a) * r * 0.3, r * 0.22, "#f6c94a");
    }
  }
}

// La renna sul balcone, vista di lato: corpo, zampe che camminano, palchi, naso rosso
function disegnaRenna(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, t: number, colpita: boolean, ferma: boolean) {
  ctx.save();
  ctx.translate(x, y - (ferma || colpita ? 0 : Math.abs(Math.sin(t * 10)) * 3));
  ctx.scale(dir, 1);
  const passo = ferma ? 0 : Math.sin(t * (colpita ? 24 : 10)) * 0.5;
  ctx.strokeStyle = "#5a3520";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (const [dx, f] of [[-16, 1], [-9, -1], [12, -1], [19, 1]] as const) {
    ctx.beginPath();
    ctx.moveTo(dx, -6);
    ctx.lineTo(dx + Math.sin(passo * f) * 8, 16);
    ctx.stroke();
  }
  // corpo
  ctx.fillStyle = "#9a5b2c";
  ctx.beginPath();
  ctx.ellipse(0, -12, 26, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // coperta rossa a punto croce
  ctx.fillStyle = "#e5481e";
  ctx.beginPath();
  ctx.roundRect(-12, -25, 20, 16, 4);
  ctx.fill();
  ctx.strokeStyle = "#fbf6ea";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.lineTo(2, -13);
  ctx.moveTo(2, -20);
  ctx.lineTo(-6, -13);
  ctx.stroke();
  // collo e testa
  ctx.fillStyle = "#9a5b2c";
  ctx.beginPath();
  ctx.ellipse(22, -26, 7, 14, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(29, -38, 11, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // palchi
  ctx.strokeStyle = "#e9dcc0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(25, -45);
  ctx.lineTo(20, -60);
  ctx.moveTo(22, -53);
  ctx.lineTo(14, -57);
  ctx.moveTo(30, -46);
  ctx.lineTo(33, -61);
  ctx.moveTo(32, -54);
  ctx.lineTo(40, -58);
  ctx.stroke();
  // occhio e naso
  ctx.fillStyle = "#1c241d";
  if (colpita) {
    ctx.strokeStyle = "#1c241d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(27, -43);
    ctx.lineTo(32, -38);
    ctx.moveTo(32, -43);
    ctx.lineTo(27, -38);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(30, -40, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e5481e";
  ctx.beginPath();
  ctx.arc(40, -36, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (colpita) for (let k = 0; k < 3; k++) stella(ctx, x + Math.cos(t * 9 + k * 2.1) * 18, y - 70 + Math.sin(t * 9 + k * 2.1) * 5, 6, "#f6c94a");
}
