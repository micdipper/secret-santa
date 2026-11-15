// Test della logica dei giochi con dei bot, senza browser:
//   node --experimental-strip-types test-e2e/giochi-logica.ts
// Migliaia di partite con semi diversi: niente NaN, la partita finisce sempre,
// stesso seme = stessa partita, punteggi dentro i limiti del server (REGOLE_SERVER).
import { PASSO, casuale, type Mondo, type Tocco } from "../lib/giochi/base.ts";
import { GIOCHI, REGOLE_SERVER } from "../lib/giochi/elenco.ts";

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

type Oggetto = { x: number; y: number; viva?: boolean; vivo?: boolean; nata?: number };
// bot generico: tocca un oggetto vivo dello stato (se il gioco ne ha) dopo un tempo di reazione
function partita(n: number, seme: number, mondo: Mondo, bravura: number) {
  const { gioco } = GIOCHI[n - 1];
  const s = gioco.crea(seme, mondo);
  const caso = casuale(seme ^ 0x5bd1e995);
  let passi = 0;
  const tocchiFatti: string[] = [];
  while (!gioco.finito(s)) {
    const tocchi: Tocco[] = [];
    const oggetti = ((s as { stelle?: Oggetto[] }).stelle ?? []).filter((o) => o.viva ?? o.vivo);
    for (const o of oggetti) {
      if (caso() < bravura * 0.08) tocchi.push({ tipo: "giu", id: 1, x: o.x + (caso() - 0.5) * 20, y: o.y + (caso() - 0.5) * 20 });
    }
    if (caso() < 0.01) tocchi.push({ tipo: "giu", id: 1, x: caso() * mondo.w, y: caso() * mondo.h }); // tocco a vuoto
    for (const t of tocchi) tocchiFatti.push(`${passi}:${t.x.toFixed(1)}`);
    gioco.aggiorna(s, PASSO, tocchi, mondo);
    gioco.eventi(s).length = 0;
    passi++;
    if (passi > 60 * 60 * 15) {
      errore(`gioco ${n} seme ${seme}: non finisce`);
      break;
    }
  }
  return { punteggio: gioco.hud(s).punteggio, secondi: passi * PASSO, firma: tocchiFatti.join(",") };
}

for (const info of GIOCHI) {
  const r = REGOLE_SERVER[info.n];
  let max = 0;
  let somma = 0;
  for (let i = 0; i < PARTITE; i++) {
    const seme = (i * 2654435761) >>> 0;
    const mondo = MONDI[i % MONDI.length];
    const bravura = i % 3 === 0 ? 1 : 0.4;
    const a = partita(info.n, seme, mondo, bravura);
    const { punteggio, secondi } = a;
    if (!Number.isFinite(punteggio) || !Number.isInteger(punteggio) || punteggio < 0) errore(`gioco ${info.n} seme ${seme}: punteggio ${punteggio}`);
    if (punteggio > r.scoreMax) errore(`gioco ${info.n} seme ${seme}: ${punteggio} oltre il massimo ${r.scoreMax}`);
    if (punteggio > r.puntiAlSecondo * secondi + 100) errore(`gioco ${info.n} seme ${seme}: troppi punti al secondo (${punteggio} in ${secondi.toFixed(1)} s)`);
    if (secondi < r.durataMin) errore(`gioco ${info.n} seme ${seme}: dura ${secondi.toFixed(1)} s, sotto il minimo ${r.durataMin} (il server la annullerebbe)`);
    if (secondi > r.durataMax) errore(`gioco ${info.n} seme ${seme}: dura ${secondi.toFixed(1)} s, oltre ${r.durataMax}`);
    if (i < 50) {
      const b = partita(info.n, seme, mondo, bravura);
      if (b.punteggio !== a.punteggio || b.firma !== a.firma) errore(`gioco ${info.n} seme ${seme}: stesso seme, partita diversa`);
    }
    max = Math.max(max, punteggio);
    somma += punteggio;
  }
  console.log(`gioco ${info.n} (${info.provvisorio ? "provvisorio" : info.nome}): media ${Math.round(somma / PARTITE)}, record ${max}`);
}

console.log(errori ? `\n${errori} errori` : "\nTutto OK");
process.exit(errori ? 1 : 0);
