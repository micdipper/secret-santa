// Gioco 2 · CAMPANELLI (PIANO-GIOCHI.md 6.2)
// 4 campanelli 2×2: il gioco suona una sequenza, tu la ripeti. Si parte da 3 note, +1 a ogni giro.
// Un errore (o 5 secondi senza toccare) = fine. Dal giro 9 un campanello cambia posto prima della sequenza.
import { casuale, curve, limita, mescola, stile, type Evento, type Gioco, type Mondo } from "./base.ts";

// ----- costanti (taratura) -----
const NOTE_INIZIO = 3;
const PASSO = [0.6, 0.28]; // s per nota: dal giro 1 al giro 10 (poi resta 0.28)
const GIRO_VELOCE = 10;
const GIRO_NOTE_CORTE = 6; // da qui la luce dura meno
const GIRO_SCAMBI = 9; // da qui un campanello "birichino" cambia posto
const DURATA_SCAMBIO = 0.5;
const PAUSA = 0.9; // s prima di ogni giro
const ATTESA_MAX = 5; // s per ogni tocco
const RAPIDO = [0.4, 1]; // bonus pieno entro 0,4 s, niente oltre 1 s
const BONUS_MAX = 5;
const PUNTI_NOTA = 10; // a giro completato: 10 × note
const TEMPO_MAX = 580; // s: oltre si chiude da solo (il server accetta fino a 600)

export const COLORI = ["#e5481e", "#e9a81c", "#f4a9c4", "#7fb3d5"];

export type StatoCampanelli = {
  caso: () => number;
  t: number;
  fase: "pausa" | "scambio" | "mostra" | "turno";
  tFase: number;
  giro: number;
  seq: number[]; // campanelli da suonare (indici 0..3)
  pos: number; // nota a cui siamo
  slot: number[]; // slot[campanello] = casella (0..3) dove si trova
  scambio: [number, number] | null;
  luce: number[]; // da quanto è acceso ogni campanello (s); <0 = spento
  durataLuce: number[];
  dondola: number[];
  ultimoTocco: number;
  punti: number;
  note: number;
  fine: boolean;
  eventi: Evento[];
};

const passo = (giro: number) => mescola(PASSO[0], PASSO[1], limita((giro - 1) / (GIRO_VELOCE - 1), 0, 1));

// Le 4 caselle (2×2) sotto la scritta in alto
export function geometria(m: Mondo) {
  const alto = m.sopra + 56;
  const basso = m.h - m.sotto;
  const lato = Math.min(m.w / 2, (basso - alto) / 2, 220);
  const cx = m.w / 2;
  const cy = (alto + basso) / 2;
  return { lato, centri: [0, 1, 2, 3].map((c) => ({ x: cx + (c % 2 ? 0.5 : -0.5) * lato, y: cy + (c < 2 ? -0.5 : 0.5) * lato })), testoY: m.sopra + 20 };
}

function casellaDa(x: number, y: number, m: Mondo) {
  const { lato, centri } = geometria(m);
  return centri.findIndex((c) => Math.abs(x - c.x) <= lato / 2 && Math.abs(y - c.y) <= lato / 2);
}

function accendi(s: StatoCampanelli, i: number, durata: number) {
  s.luce[i] = 0;
  s.durataLuce[i] = durata;
  s.dondola[i] = 1;
}

export const campanelli: Gioco<StatoCampanelli> = {
  crea(seme) {
    const caso = casuale(seme);
    const seq: number[] = [];
    for (let i = 0; i < NOTE_INIZIO; i++) seq.push(Math.floor(caso() * 4));
    return {
      caso,
      t: 0,
      fase: "pausa",
      tFase: 0,
      giro: 1,
      seq,
      pos: 0,
      slot: [0, 1, 2, 3],
      scambio: null,
      luce: [-1, -1, -1, -1],
      durataLuce: [0, 0, 0, 0],
      dondola: [0, 0, 0, 0],
      ultimoTocco: 0,
      punti: 0,
      note: 0,
      fine: false,
      eventi: [],
    };
  },

  aggiorna(s, dt, tocchi, m) {
    if (s.fine) return;
    s.t += dt;
    s.tFase += dt;
    for (let i = 0; i < 4; i++) {
      if (s.luce[i] >= 0) s.luce[i] += dt;
      if (s.luce[i] > s.durataLuce[i] + 0.4) s.luce[i] = -1;
      s.dondola[i] *= Math.exp(-2.5 * dt);
    }
    if (s.t > TEMPO_MAX) {
      s.fine = true;
      return;
    }

    if (s.fase === "pausa" && s.tFase >= PAUSA) {
      s.tFase = 0;
      if (s.giro >= GIRO_SCAMBI) {
        const a = Math.floor(s.caso() * 4);
        const b = (a + 1 + Math.floor(s.caso() * 3)) % 4;
        s.scambio = [a, b];
        s.fase = "scambio";
        s.eventi.push({ tipo: "scambio" });
      } else {
        s.fase = "mostra";
        s.pos = 0;
      }
    } else if (s.fase === "scambio" && s.tFase >= DURATA_SCAMBIO) {
      const [a, b] = s.scambio!;
      [s.slot[a], s.slot[b]] = [s.slot[b], s.slot[a]];
      s.scambio = null;
      s.fase = "mostra";
      s.tFase = 0;
      s.pos = 0;
    } else if (s.fase === "mostra") {
      const p = passo(s.giro);
      if (s.pos < s.seq.length && s.tFase >= s.pos * p) {
        const i = s.seq[s.pos];
        const durata = p * (s.giro >= GIRO_NOTE_CORTE ? 0.5 : 0.75);
        accendi(s, i, durata);
        s.eventi.push({ tipo: "nota", livello: i, testo: String(durata) });
        s.pos++;
      } else if (s.pos >= s.seq.length && s.tFase >= s.seq.length * p + 0.15) {
        s.fase = "turno";
        s.tFase = 0;
        s.pos = 0;
        s.ultimoTocco = s.t;
      }
    } else if (s.fase === "turno") {
      for (const tc of tocchi) {
        if (tc.tipo !== "giu") continue;
        const casella = casellaDa(tc.x, tc.y, m);
        if (casella < 0) continue;
        const i = s.slot.indexOf(casella);
        const c = geometria(m).centri[casella];
        accendi(s, i, 0.22);
        if (i !== s.seq[s.pos]) {
          s.eventi.push({ tipo: "errore", x: c.x, y: c.y, livello: i });
          s.fine = true;
          return;
        }
        const attesa = s.t - s.ultimoTocco;
        const bonus = Math.round(BONUS_MAX * limita(1 - (attesa - RAPIDO[0]) / (RAPIDO[1] - RAPIDO[0]), 0, 1));
        s.punti += bonus;
        s.note++;
        s.ultimoTocco = s.t;
        s.pos++;
        s.eventi.push({ tipo: "giusto", x: c.x, y: c.y, livello: i, testo: bonus ? `+${bonus}` : "" });
        if (s.pos >= s.seq.length) {
          const premio = PUNTI_NOTA * s.seq.length;
          s.punti += premio;
          s.eventi.push({ tipo: "giro", x: m.w / 2, y: geometria(m).testoY + 40, testo: `+${premio}`, livello: s.giro });
          s.giro++;
          s.seq.push(Math.floor(s.caso() * 4));
          s.fase = "pausa";
          s.tFase = 0;
          return;
        }
      }
      if (s.t - s.ultimoTocco > ATTESA_MAX) {
        s.eventi.push({ tipo: "tempo" });
        s.fine = true;
      }
    }
  },

  finito: (s) => s.fine,
  hud: (s) => ({ punteggio: s.punti, etichetta: `Giro ${s.giro}` }),
  eventi: (s) => s.eventi,
  stats: (s) => ({ giro: s.giro, note: s.note }),

  disegna(ctx, s, m) {
    ctx.clearRect(-20, -20, m.w + 40, m.h + 40);
    const { lato, centri, testoY } = geometria(m);

    // scritta in alto: cosa succede
    const testo =
      s.fase === "mostra" ? "Ascolta…" : s.fase === "turno" ? `Tocca tu! ${s.pos}/${s.seq.length}` : s.fase === "scambio" ? "Attento: si spostano!" : `Giro ${s.giro}: ${s.seq.length} note`;
    ctx.font = `700 26px ${stile.fontTitoli}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = s.fase === "turno" ? "#e9a81c" : "#f3e8cf";
    ctx.fillText(testo, m.w / 2, testoY);
    if (s.fase === "turno") {
      // quanto tempo resta per toccare: una cucitura che si accorcia
      const resta = limita(1 - (s.t - s.ultimoTocco) / ATTESA_MAX, 0, 1);
      ctx.strokeStyle = "rgba(243,232,207,.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(m.w / 2 - 70 * resta, testoY + 22);
      ctx.lineTo(m.w / 2 + 70 * resta, testoY + 22);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // le caselle: toppe di feltro rotonde (raggio della toppa = metà casella − 10)
    const rToppa = lato / 2 - 10;
    for (const c of centri) {
      ctx.fillStyle = "rgba(241,228,200,.12)";
      ctx.beginPath();
      ctx.arc(c.x, c.y, rToppa, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(243,232,207,.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(c.x, c.y, rToppa - 6, 0, Math.PI * 2); // cucitura a 6 px, stesso centro
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (let i = 0; i < 4; i++) {
      let { x, y } = centri[s.slot[i]];
      let alza = 0;
      if (s.scambio && (s.scambio[0] === i || s.scambio[1] === i)) {
        const altro = s.scambio[0] === i ? s.scambio[1] : s.scambio[0];
        const k = curve.entraEsce(limita(s.tFase / DURATA_SCAMBIO, 0, 1));
        const d = centri[s.slot[altro]];
        x = mescola(x, d.x, k);
        y = mescola(y, d.y, k);
        alza = Math.sin(k * Math.PI);
      }
      const acceso = s.luce[i] >= 0 && s.luce[i] <= s.durataLuce[i];
      // onda di luce che si allarga
      if (s.luce[i] >= 0) {
        const k = s.luce[i] / (s.durataLuce[i] + 0.4);
        ctx.strokeStyle = COLORI[i];
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(x, y, rToppa * (0.7 + k * 0.5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (acceso) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, rToppa);
        g.addColorStop(0, "rgba(255,246,214,.75)");
        g.addColorStop(1, "rgba(255,246,214,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, rToppa, 0, Math.PI * 2);
        ctx.fill();
      }
      const angolo = Math.sin(s.t * 16) * 0.32 * s.dondola[i];
      disegnaCampanello(ctx, x, y - alza * 18, rToppa * (acceso ? 0.74 : 0.68) * (1 + alza * 0.12), angolo, COLORI[i]);
    }
  },

  effetto(e, fx) {
    if (e.tipo === "nota") fx.suono("campanello", e.livello ?? 0, Number(e.testo) > 0.3 ? 1 : 0.6);
    else if (e.tipo === "giusto") {
      fx.suono("campanello", e.livello ?? 0, 0.6);
      fx.scoppio(e.x!, e.y!, [COLORI[e.livello ?? 0], "#fbf6ea"], 8, { velocita: 160 });
      if (e.testo) fx.testo(e.x!, e.y! - 50, e.testo, "#e9a81c", 20);
    } else if (e.tipo === "giro") {
      fx.scoppio(e.x!, e.y!, ["#f6c94a", "#fbf6ea", "#e5481e", "#7fb3d5"], 30, { velocita: 300 });
      fx.testo(e.x!, e.y!, e.testo!, "#f3e8cf", 30);
      fx.suono("via");
    } else if (e.tipo === "errore" || e.tipo === "tempo") {
      fx.suono("sbaglio");
      fx.trema(10);
      if (e.x !== undefined) fx.testo(e.x, e.y! - 50, "stonata!", "#e5481e", 26);
    } else if (e.tipo === "scambio") fx.suono("carta");
  },
};

// Campanello di feltro: corpo a campana, bordo, batacchio e fiocco in cima. r = mezza altezza.
function disegnaCampanello(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angolo: number, colore: string) {
  ctx.save();
  ctx.translate(x, y - r * 0.85);
  ctx.rotate(angolo);
  ctx.translate(0, r * 0.85);
  // batacchio
  ctx.fillStyle = "#cdb48a";
  ctx.beginPath();
  ctx.arc(Math.sin(angolo * -2) * r * 0.15, r * 0.82, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  // corpo
  ctx.fillStyle = colore;
  ctx.beginPath();
  ctx.moveTo(-r * 0.86, r * 0.62);
  ctx.bezierCurveTo(-r * 0.6, r * 0.4, -r * 0.62, -r * 0.2, -r * 0.5, -r * 0.5);
  ctx.bezierCurveTo(-r * 0.36, -r * 0.92, r * 0.36, -r * 0.92, r * 0.5, -r * 0.5);
  ctx.bezierCurveTo(r * 0.62, -r * 0.2, r * 0.6, r * 0.4, r * 0.86, r * 0.62);
  ctx.closePath();
  ctx.fill();
  // bordo in basso
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.64, r * 0.88, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  // cucitura sul corpo
  ctx.strokeStyle = "rgba(251,246,234,.75)";
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  ctx.setLineDash([r * 0.1, r * 0.08]);
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, r * 0.36);
  ctx.quadraticCurveTo(0, r * 0.46, r * 0.62, r * 0.36);
  ctx.stroke();
  ctx.setLineDash([]);
  // riflesso
  ctx.fillStyle = "rgba(255,255,255,.28)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.3, r * 0.1, r * 0.28, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // fiocco in cima
  ctx.fillStyle = "#2c4a32";
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, -r * 0.88, r * 0.2, r * 0.1, -0.4, 0, Math.PI * 2);
  ctx.ellipse(r * 0.2, -r * 0.88, r * 0.2, r * 0.1, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e5481e";
  ctx.beginPath();
  ctx.arc(0, -r * 0.88, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
