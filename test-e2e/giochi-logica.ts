// Test della logica dei giochi con dei bot, senza browser:
//   node --experimental-strip-types test-e2e/giochi-logica.ts
// Migliaia di partite con semi diversi: niente NaN, la partita finisce sempre,
// stesso seme = stessa partita, punteggi dentro i limiti del server (REGOLE_SERVER).
import { PASSO, casuale, type Mondo, type Tocco } from "../lib/giochi/base.ts";
import { geometria, type StatoCampanelli } from "../lib/giochi/campanelli.ts";
import { GIOCHI, REGOLE_SERVER } from "../lib/giochi/elenco.ts";
import type { StatoStelline } from "../lib/giochi/finto.ts";
import type { StatoPalline } from "../lib/giochi/palline.ts";

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

const botStelline: Bot = (s: StatoStelline, _m, caso, bravura) =>
  s.stelle.filter((o) => o.viva && caso() < bravura * 0.08).map((o) => tocco(o.x + (caso() - 0.5) * 20, o.y + (caso() - 0.5) * 20));

const botPalline: Bot = (s: StatoPalline, m, caso, bravura) => {
  const out: Tocco[] = [];
  for (const p of s.palline) {
    if (!p.viva || p.y < m.sopra) continue;
    const giusta = p.tipo !== "carbone";
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

const BOT: Record<string, Bot> = { stelline: botStelline, palline: botPalline, campanelli: botCampanelli };
const nomeBot = (n: number) => (GIOCHI[n - 1].provvisorio ? "stelline" : ["palline", "campanelli"][n - 1]);

function partita(n: number, seme: number, mondo: Mondo, bravura: number) {
  const { gioco } = GIOCHI[n - 1];
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

for (const info of GIOCHI) {
  const r = REGOLE_SERVER[info.n];
  const partite = info.n === 2 ? 400 : PARTITE; // i campanelli durano molto: meno partite
  const punti: number[] = [];
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
    if (i < 30) {
      const b = partita(info.n, seme, mondo, bravura);
      if (b.punteggio !== a.punteggio || b.firma !== a.firma) errore(`gioco ${info.n} seme ${seme}: stesso seme, partita diversa`);
    }
    punti.push(punteggio);
    maxPs = Math.max(maxPs, punteggio / Math.max(1, secondi));
  }
  punti.sort((a, b) => a - b);
  const mediana = punti[Math.floor(punti.length / 2)];
  console.log(
    `gioco ${info.n} (${info.provvisorio ? "provvisorio" : info.nome}): mediana ${mediana}, record ${punti.at(-1)} (limite ${r.scoreMax}), punti/s max ${maxPs.toFixed(0)} (limite ${r.puntiAlSecondo})`,
  );
}

console.log(errori ? `\n${errori} errori` : "\nTutto OK");
process.exit(errori ? 1 : 0);
