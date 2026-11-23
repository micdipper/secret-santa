// Test della logica dei giochi con dei bot, senza browser:
//   node --experimental-strip-types test-e2e/giochi-logica.ts
// Migliaia di partite con semi diversi: niente NaN, la partita finisce sempre,
// stesso seme = stessa partita, punteggi dentro i limiti del server (REGOLE_SERVER).
import { PASSO, casuale, type Mondo, type Tocco } from "../lib/giochi/base.ts";
import { geometria as geoCalzini, type StatoCalzini } from "../lib/giochi/calzini.ts";
import { geometria, type StatoCampanelli } from "../lib/giochi/campanelli.ts";
import { geometria as geoIntruso, type StatoIntruso } from "../lib/giochi/intruso.ts";
import { VOLO as VOLO_STELLA, geometria as geoPuntale, type StatoPuntale } from "../lib/giochi/puntale.ts";
import { GIOCHI, GIOCHI_NUOVI, REGOLE_SERVER, infoGioco } from "../lib/giochi/elenco.ts";
import { VOLO, casa, colpibile, fuori, xRenna, type StatoNeve } from "../lib/giochi/neve.ts";
import type { StatoPalline } from "../lib/giochi/palline.ts";
import { raggio, type Dolce, type StatoPanettone } from "../lib/giochi/panettone.ts";
import { velocita as velocitaRegali, type StatoRegali } from "../lib/giochi/regali.ts";
import { GRAVITA, SALTO, type Ostacolo, type StatoRenna } from "../lib/giochi/renna.ts";
import { corridoio, type StatoSlitta } from "../lib/giochi/slitta.ts";

const MONDI: Mondo[] = [
  { w: 390, h: 844, sopra: 88 + 47, sotto: 16 + 34 }, // iPhone
  { w: 360, h: 640, sopra: 88, sotto: 16 }, // Android piccolo
  { w: 448, h: 900, sopra: 88, sotto: 16 }, // computer
];
const PARTITE = 1500;
let errori = 0;
const errore = (msg: string) => {
  errori++;
  if (errori < 20) console.log("  ✗", msg);
};

// Bot: bravura 1 = fortissimo (più di una persona vera), 0.4 = medio
type Bot = (s: never, m: Mondo, caso: () => number, bravura: number) => Tocco[];
const tocco = (x: number, y: number): Tocco => ({ tipo: "giu", id: 1, x, y });


const botPalline: Bot = (s: StatoPalline, m, caso, bravura) => {
  const out: Tocco[] = [];
  for (const p of s.palline) {
    if (!p.viva || p.y < m.sopra) continue;
    const giusta = (p.tipo === "oro" && p.spegne < 0) || p.tipo === "cometa"; // il bot "sa" quali sono travestite
    // il bot medio a volte tocca il carbone per sbaglio o si perde una dorata
    if (giusta && caso() < bravura * 0.12) out.push(tocco(p.x + (caso() - 0.5) * 16, p.y + (caso() - 0.5) * 16));
    if (!giusta && caso() < (1 - bravura) * 0.004) out.push(tocco(p.x, p.y));
  }
  return out;
};

const ritardi = new WeakMap<object, number>();
const botCampanelli: Bot = (s: StatoCampanelli, m, caso, bravura) => {
  if (s.fase !== "turno") return [];
  const attesa = ritardi.get(s) ?? 0.2 + caso() * 0.5;
  if (s.t - s.ultimoTocco < attesa) {
    ritardi.set(s, attesa);
    return [];
  }
  ritardi.delete(s);
  // memoria: la probabilità di sbagliare cresce con la lunghezza (il bot bravo arriva lontano)
  const sbaglia = caso() < (bravura === 1 ? 0.004 : 0.02) * (s.seq.length / 4);
  const giusto = s.seq[s.pos];
  const i = sbaglia ? (giusto + 1) % 4 : giusto;
  const c = geometria(m).centri[s.slot[i]];
  return [tocco(c.x + (caso() - 0.5) * 40, c.y + (caso() - 0.5) * 40)];
};

// Gioco 3: il bot sceglie a ogni piano di quanto sbagliare e tocca quando il pacco è lì
// (il fortissimo sbaglia di 0-4 px e aspetta di vederlo arrivare: tanti perfetti; il medio di 0-24 px e a volte tocca a caso)
const mire = new WeakMap<object, { piano: number; mira: number; caso: boolean }>();
const botRegali: Bot = (s: StatoRegali, _m, caso, bravura) => {
  if (!s.pacco) return [];
  const piano = s.piani.length;
  const sotto = s.piani[piano - 1];
  let m = mire.get(s);
  if (!m || m.piano !== piano) {
    // errore = mira + tempismo del dito (una persona bravissima sbaglia di ~12 ms, una media di ~35 ms)
    const errore = (bravura === 1 ? caso() * 3 : caso() * 12) + velocitaRegali(piano) * caso() * (bravura === 1 ? 0.012 : 0.035);
    m = { piano, mira: sotto.x + (caso() < 0.5 ? -1 : 1) * errore, caso: bravura < 1 && caso() < 0.05 };
    mire.set(s, m);
  }
  if (m.caso) return s.t - s.pacco.nato > 0.3 ? [tocco(0, 0)] : [];
  if (s.t - s.pacco.nato < 0.25) return []; // tempo di reazione
  const passo = (velocitaRegali(piano) * 1.5) / 60; // quanto si sposta in un fotogramma (al massimo)
  return Math.abs(s.pacco.x - m.mira) <= passo / 2 ? [tocco(0, 0)] : [];
};

// Gioco 4: il bot guarda avanti e segue il centro del corridoio (il fortissimo esattamente;
// il medio con ritardo e un po' di tremolio). Se il fortissimo si schianta, il percorso era impossibile.
const botSlitta: Bot = (s: StatoSlitta, _m, caso, bravura) => {
  const avanti = bravura === 1 ? s.v * 0.07 : s.v * (0.02 + caso() * 0.05);
  const q = corridoio(s, s.dist + avanti);
  const meta = q.c + (bravura === 1 ? 0 : (caso() - 0.5) * q.hw * 2.2);
  if (!s.dito) return [{ tipo: "giu", id: 1, x: s.meta, y: 500 }];
  if (bravura < 1 && caso() < 0.6) return [];
  return [{ tipo: "muovi", id: 1, x: s.dito.x0 + (meta - s.dito.meta0) / 1.2, y: 500 }];
};

// Gioco 5: il bot vede chi è alla finestra da almeno un tempo di reazione e lancia solo se all'arrivo
// della palla sarà ancora fuori (il fortissimo lo sa esattamente; il medio a volte sbaglia i tempi,
// a volte colpisce Babbo Natale per sbaglio). Mira alla renna dove sarà tra VOLO secondi.
const botNeve: Bot = (s: StatoNeve, m, caso, bravura) => {
  if (s.t - s.ultimoLancio < 0.2) return [];
  const c = casa(m);
  const reazione = bravura === 1 ? 0.2 : 0.38;
  const mira = bravura === 1 ? 5 : 16;
  if (caso() > (bravura === 1 ? 0.5 : 0.12)) return [];
  const r = s.renna;
  if (r && r.colpita < 0 && r.x > 0 && r.x < m.w) {
    const x = xRenna(r, s.t, bravura === 1 ? VOLO : VOLO * (0.6 + caso() * 0.8));
    return [tocco(x + (caso() - 0.5) * mira, c.yRenna - 22 + (caso() - 0.5) * mira)];
  }
  for (let i = 0; i < 9; i++) {
    const p = s.finestre[i].chi;
    if (!p || s.t - p.t0 < reazione) continue;
    const errore = bravura === 1 ? 0 : (caso() - 0.3) * 0.3;
    const buono = p.tipo !== "babbo" || (bravura < 1 && caso() < 0.03);
    if (!buono || !colpibile(p, s.t)) continue;
    // all'arrivo sarà ancora fuori? (il medio a volte si sbaglia: errore sui tempi)
    if (fuori(p, s.t + VOLO + errore) < 0.6) continue;
    const w = c.finestre[i];
    return [tocco(w.cx + (caso() - 0.5) * mira, w.cy + (caso() - 0.5) * mira)];
  }
  return [];
};

// Gioco 6: il bot fa una strisciata dritta attraverso un dolce (o due vicini), solo se il carbone non è
// sulla strada. Aspetta di aver visto il dolce (reazione); il medio è più lento e a volte non guarda il carbone.
const distTratto = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay;
  const l = dx * dx + dy * dy;
  const t = l ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const visti = new WeakMap<object, Map<number, number>>();
const botPanettone: Bot = (s: StatoPanettone, m, caso, bravura) => {
  if (s.dito) return [];
  const forte = bravura === 1;
  if (caso() > (forte ? 0.5 : 0.055)) return [];
  let v = visti.get(s);
  if (!v) visti.set(s, (v = new Map()));
  const fondo = m.h - m.sotto - 18;
  const pronti: Dolce[] = [];
  for (const d of s.dolci) {
    if (!d.vivo || d.nato > s.t || d.y > fondo) continue;
    if (!v.has(d.id)) v.set(d.id, s.t);
    if (s.t - v.get(d.id)! >= (forte ? 0.15 : 0.4) && d.tipo !== "carbone") pronti.push(d);
  }
  if (!pronti.length) return [];
  // prima quelli che stanno ricadendo più in basso
  pronti.sort((a, b) => b.y - a.y);
  const a = pronti[0];
  const b = forte ? pronti.find((d) => d !== a && Math.hypot(d.x - a.x, d.y - a.y) < 140) : undefined;
  let [x1, y1, x2, y2] = b ? [a.x, a.y, b.x, b.y] : [a.x - 45, a.y, a.x + 45, a.y];
  const lx = x2 - x1, ly = y2 - y1, l = Math.hypot(lx, ly) || 1;
  [x1, y1, x2, y2] = [x1 - (lx / l) * 30, y1 - (ly / l) * 30, x2 + (lx / l) * 30, y2 + (ly / l) * 30];
  const guarda = forte || caso() > 0.15;
  if (guarda && s.dolci.some((d) => d.vivo && d.tipo === "carbone" && d.nato <= s.t && distTratto(d.x, d.y, x1, y1, x2, y2) < raggio("carbone") + 20)) return [];
  return [
    { tipo: "giu", id: 1, x: x1, y: y1 },
    { tipo: "muovi", id: 1, x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
    { tipo: "su", id: 1, x: x2, y: y2 },
  ];
};

// Gioco 7: il bot salta quando il centro dell'ostacolo è a metà del salto davanti a sé (il fortissimo
// con un errore da ±12 ms, il medio da ±45 ms e ogni tanto si distrae). Se il fortissimo cade presto,
// il percorso era impossibile.
const sbagli = new WeakMap<object, number>();
const botRenna: Bot = (s: StatoRenna, _m, caso, bravura) => {
  if (!s.aTerra || s.caduta >= 0) return [];
  const o: Ostacolo | undefined = s.ostacoli.find((x) => !x.superato && x.x + x.w > s.dist);
  if (!o) return [];
  if (!sbagli.has(o)) sbagli.set(o, (caso() - 0.5) * 2 * (bravura === 1 ? 0.012 : 0.045) + (bravura < 1 && caso() < 0.02 ? 0.25 : 0));
  const volo = (2 * SALTO) / GRAVITA;
  const davanti = o.x + o.w / 2 - s.dist;
  return davanti <= s.v * (volo / 2 + sbagli.get(o)!) ? [tocco(0, 0)] : [];
};

// Gioco 8: il bot ricorda i calzini visti (il fortissimo tutti, il medio solo gli ultimi 8) e tocca con calma
// (una carta ogni 0,25 s il fortissimo, ogni 0,5 s il medio).
const memorie = new WeakMap<object, { visti: Map<number, number>; ultimo: number }>();
const botCalzini: Bot = (s: StatoCalzini, m, caso, bravura) => {
  let mem = memorie.get(s);
  if (!mem) memorie.set(s, (mem = { visti: new Map(), ultimo: 0 }));
  const forte = bravura === 1;
  // ciò che è scoperto adesso lo si vede
  s.carte.forEach((c, i) => {
    if (c.scoperta && !c.presa) mem!.visti.set(i, c.tipo);
    if (c.presa) mem!.visti.delete(i);
  });
  if (!forte) while (mem.visti.size > 8) mem.visti.delete(mem.visti.keys().next().value!);
  if (s.t - mem.ultimo < (forte ? 0.25 : 0.5) + caso() * 0.1) return [];
  mem.ultimo = s.t;
  const libere = s.carte.map((c, i) => i).filter((i) => !s.carte[i].presa && !s.carte[i].scoperta);
  let scelta: number | undefined;
  if (s.aperte.length === 1 && s.sbaglio < 0) {
    const tipo = s.carte[s.aperte[0]].tipo;
    scelta = libere.find((i) => mem!.visti.get(i) === tipo);
  } else {
    // una coppia già nota?
    const perTipo = new Map<number, number>();
    for (const i of libere) {
      const t = mem.visti.get(i);
      if (t === undefined) continue;
      if (perTipo.has(t)) {
        scelta = perTipo.get(t);
        break;
      }
      perTipo.set(t, i);
    }
  }
  scelta ??= libere.find((i) => !mem!.visti.has(i)) ?? libere[Math.floor(caso() * libere.length)];
  if (scelta === undefined) return [];
  const c = geoCalzini(s, m).centro(scelta);
  return [tocco(c.x, c.y)];
};

// Gioco 9: il bot "vede" l'intrusa dopo un tempo che cresce col numero di palline e cala con la differenza
// (il fortissimo è velocissimo); il medio a volte tocca quella sbagliata.
const attese = new WeakMap<object, { turno: number; quando: number; sbaglia: boolean }>();
const botIntruso: Bot = (s: StatoIntruso, m, caso, bravura) => {
  const forte = bravura === 1;
  let a = attese.get(s);
  if (!a || a.turno !== s.turno + s.conti.sbagli * 1000) {
    const n = s.cols * s.righe;
    const fatica = (n / 20) * (12 / Math.abs(s.diff));
    a = { turno: s.turno + s.conti.sbagli * 1000, quando: s.t + (forte ? 0.25 + 0.15 * fatica : 0.6 + 0.6 * fatica * (0.6 + caso())), sbaglia: !forte && caso() < 0.12 * (12 / Math.abs(s.diff)) };
    attese.set(s, a);
  }
  if (s.t < a.quando) return [];
  const g = geoIntruso(s, m);
  const i = a.sbaglia ? (s.intrusa + 1) % (s.cols * s.righe) : s.intrusa;
  const c = g.centro(i);
  return [tocco(c.x, c.y)];
};

// Gioco 10: il bot preme quando, lasciando dopo il tempo giusto per la carica, la cima sarà sopra di lui
// all'arrivo della stella. Errore sul tempo del lascia: ±10 ms il fortissimo, ±45 ms il medio.
const lanci = new WeakMap<object, { lancio: number; lascia: number }>();
const botPuntale: Bot = (s: StatoPuntale, m, caso, bravura) => {
  const g = geoPuntale(s, m);
  const forte = bravura === 1;
  if (s.fase === "pronto") {
    // carica giusta (in salita): d = c* × PERIODO / 2
    const cStar = (g.terra - g.yCima) / g.hMax;
    const d = (cStar * 1.6) / 2;
    const arrivo = (t: number) => g.xCima(t + d + VOLO_STELLA) - g.xLancio;
    if (Math.sign(arrivo(s.t)) !== Math.sign(arrivo(s.t + 1 / 60)) && caso() < (forte ? 1 : 0.5)) {
      lanci.set(s, { lancio: s.lancio, lascia: s.t + d + (caso() - 0.5) * 2 * (forte ? 0.01 : 0.045) });
      return [{ tipo: "giu", id: 1, x: 100, y: 400 }];
    }
    return [];
  }
  const l = lanci.get(s);
  if (s.fase === "carica" && l && s.t >= l.lascia) return [{ tipo: "su", id: 1, x: 100, y: 400 }];
  return [];
};

const BOT: Record<string, Bot> = { calzini: botCalzini, intruso: botIntruso, puntale: botPuntale,  neve: botNeve, palline: botPalline, campanelli: botCampanelli, regali: botRegali, slitta: botSlitta, panettone: botPanettone, renna: botRenna };
const nomeBot = (n: number) => ["palline", "campanelli", "regali", "slitta", "neve", "panettone", "renna", "calzini", "intruso", "puntale"][n - 1];

function partita(n: number, seme: number, mondo: Mondo, bravura: number) {
  const { gioco } = infoGioco(n)!;
  const bot = BOT[nomeBot(n)];
  const s = gioco.crea(seme, mondo);
  const caso = casuale(seme ^ 0x5bd1e995);
  let passi = 0;
  const firma: string[] = [];
  while (!gioco.finito(s)) {
    const tocchi = bot(s as never, mondo, caso, bravura);
    for (const t of tocchi) firma.push(`${passi}:${t.x.toFixed(1)}`);
    gioco.aggiorna(s, PASSO, tocchi, mondo);
    gioco.eventi(s).length = 0;
    passi++;
    if (passi > 60 * 60 * 15) {
      errore(`gioco ${n} seme ${seme}: non finisce`);
      break;
    }
  }
  return { punteggio: gioco.hud(s).punteggio, secondi: passi * PASSO, firma: firma.join(",") };
}

for (const info of [...GIOCHI, ...GIOCHI_NUOVI].filter((g) => !process.env.SOLO || process.env.SOLO.split(",").includes(String(g.n)))) {
  const r = REGOLE_SERVER[info.n];
  const partite = info.n === 2 || info.n === 4 || info.n === 7 ? 400 : PARTITE; // i campanelli durano molto: meno partite
  const punti: number[] = [];
  const dettagli: Record<string, number[]> = { medio: [], forte: [] };
  const puntiBot: Record<string, number[]> = { medio: [], forte: [] };
  let maxPs = 0;
  for (let i = 0; i < partite; i++) {
    const seme = (i * 2654435761) >>> 0;
    const mondo = MONDI[i % MONDI.length];
    const bravura = i % 3 === 0 ? 1 : 0.4;
    const a = partita(info.n, seme, mondo, bravura);
    const { punteggio, secondi } = a;
    if (!Number.isFinite(punteggio) || !Number.isInteger(punteggio) || punteggio < 0) errore(`gioco ${info.n} seme ${seme}: punteggio ${punteggio}`);
    if (punteggio > r.scoreMax) errore(`gioco ${info.n} seme ${seme}: ${punteggio} oltre il massimo ${r.scoreMax}`);
    if (punteggio > r.puntiAlSecondo * secondi + 100) errore(`gioco ${info.n} seme ${seme}: troppi punti al secondo (${punteggio} in ${secondi.toFixed(1)} s)`);
    if (secondi < r.durataMin && punteggio > 0) errore(`gioco ${info.n} seme ${seme}: dura ${secondi.toFixed(1)} s, sotto il minimo ${r.durataMin} (il server la annullerebbe)`);
    if (secondi > r.durataMax) errore(`gioco ${info.n} seme ${seme}: dura ${secondi.toFixed(1)} s, oltre ${r.durataMax}`);
    if (info.n === 7 && bravura === 1 && secondi < 300) errore(`gioco 7 seme ${seme}: il bot perfetto cade dopo ${secondi.toFixed(0)} s (percorso impossibile?)`);
    if (info.n === 4 && bravura === 1 && secondi < 200) errore(`gioco 4 seme ${seme}: il bot perfetto si schianta dopo ${secondi.toFixed(0)} s (percorso impossibile?)`);
    if (i < 30) {
      const b = partita(info.n, seme, mondo, bravura);
      if (b.punteggio !== a.punteggio || b.firma !== a.firma) errore(`gioco ${info.n} seme ${seme}: stesso seme, partita diversa`);
    }
    punti.push(punteggio);
    dettagli[bravura === 1 ? "forte" : "medio"].push(Math.round(secondi));
    puntiBot[bravura === 1 ? "forte" : "medio"].push(punteggio);
    maxPs = Math.max(maxPs, punteggio / Math.max(1, secondi));
  }
  punti.sort((a, b) => a - b);
  const mediana = punti[Math.floor(punti.length / 2)];
  // DETTAGLI=1: secondi di gioco e punti del bot medio e del fortissimo (mediana)
  const med = (a: number[]) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  if (process.env.DETTAGLI) console.log(`  secondi: medio ${med(dettagli.medio)}, fortissimo ${med(dettagli.forte)} · punti: medio ${med(puntiBot.medio)}, fortissimo ${med(puntiBot.forte)}`);
  console.log(
    `gioco ${info.n} (${info.nome}): mediana ${mediana}, record ${punti.at(-1)} (limite ${r.scoreMax}), punti/s max ${maxPs.toFixed(0)} (limite ${r.puntiAlSecondo})`,
  );
}

console.log(errori ? `\n${errori} errori` : "\nTutto OK");
process.exit(errori ? 1 : 0);
