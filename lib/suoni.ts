"use client";

// Tutti i suoni del sito, generati dal codice (nessun file audio, nessuna licenza).
// Si attivano solo dopo il primo tocco (i telefoni bloccano l'audio automatico).
// "muto" è ricordato dal telefono.

let ctx: AudioContext | null = null;
let generale: GainNode | null = null;
let muto = false;
const ascoltatori = new Set<(m: boolean) => void>();

try {
  muto = typeof window !== "undefined" && localStorage.getItem("audio-muto") === "1";
} catch {}

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const A = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!A) return null;
    ctx = new A();
    generale = ctx.createGain();
    generale.gain.value = muto ? 0 : 0.6;
    generale.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function eMuto() {
  return muto;
}

export function seguiMuto(f: (m: boolean) => void) {
  ascoltatori.add(f);
  return () => {
    ascoltatori.delete(f);
  };
}

export function impostaMuto(m: boolean) {
  muto = m;
  try {
    localStorage.setItem("audio-muto", m ? "1" : "0");
  } catch {}
  if (ctx && generale) generale.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05);
  if (m) fermaMusica();
  else avviaMusica();
  ascoltatori.forEach((f) => f(m));
}

// ---------- mattoncini ----------
function nota(freq: number, durata: number, { tipo = "sine" as OscillatorType, volume = 0.3, attacco = 0.005, ritardo = 0, scivola = 0 } = {}) {
  const c = audio();
  if (!c || !generale || muto) return;
  const t = c.currentTime + ritardo;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t);
  if (scivola) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * scivola), t + durata);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume, t + attacco);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
  o.connect(g).connect(generale);
  o.start(t);
  o.stop(t + durata + 0.05);
}

function rumore(durata: number, { volume = 0.2, filtro = 2000, tipoFiltro = "lowpass" as BiquadFilterType, ritardo = 0, q = 1, scendi = 0 } = {}) {
  const c = audio();
  if (!c || !generale || muto) return;
  const t = c.currentTime + ritardo;
  const n = Math.ceil(c.sampleRate * durata);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = tipoFiltro;
  f.frequency.setValueAtTime(filtro, t);
  if (scendi) f.frequency.exponentialRampToValueAtTime(Math.max(40, filtro * scendi), t + durata);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
  s.connect(f).connect(g).connect(generale);
  s.start(t);
}

// campanello: armoniche "di metallo"
function campana(freq: number, ritardo = 0, volume = 0.18) {
  nota(freq, 1.2, { volume, ritardo });
  nota(freq * 2.76, 0.6, { volume: volume * 0.35, ritardo });
  nota(freq * 5.4, 0.3, { volume: volume * 0.15, ritardo });
}

// ---------- i suoni del sito ----------
export const suoni = {
  // tasto di feltro: "tump" morbido
  tasto() {
    nota(180, 0.12, { volume: 0.25, scivola: 0.6 });
    rumore(0.06, { volume: 0.08, filtro: 900 });
  },
  // pallina di vetro dell'albero
  pallina() {
    campana(1568, 0, 0.12);
    campana(2093, 0.09, 0.08);
  },
  toppa() {
    nota(520, 0.12, { volume: 0.2, scivola: 1.6 });
  },
  punto() {
    rumore(0.04, { volume: 0.05, filtro: 3500, tipoFiltro: "bandpass", q: 2 });
  },
  leva() {
    rumore(0.08, { volume: 0.25, filtro: 1500, tipoFiltro: "bandpass", q: 3 });
    nota(110, 0.15, { tipo: "triangle", volume: 0.2, ritardo: 0.05, scivola: 0.7 });
  },
  tic() {
    nota(1800, 0.03, { tipo: "square", volume: 0.04 });
  },
  fermo() {
    campana(1318, 0);
    campana(1760, 0.12);
  },
  scricchiolio() {
    rumore(0.12, { volume: 0.12, filtro: 5000, tipoFiltro: "highpass" });
  },
  vetroRotto() {
    rumore(0.6, { volume: 0.35, filtro: 6000, tipoFiltro: "highpass", scendi: 0.4 });
    [2600, 3300, 4100, 2900, 3700].forEach((f, i) => nota(f, 0.25, { volume: 0.06, ritardo: 0.05 + i * 0.06 }));
  },
  tonfoNeve() {
    rumore(0.35, { volume: 0.35, filtro: 500, scendi: 0.3 });
    nota(70, 0.25, { volume: 0.2, scivola: 0.6 });
  },
  puff() {
    rumore(0.18, { volume: 0.25, filtro: 900, scendi: 0.4 });
  },
  gratta() {
    rumore(0.07, { volume: 0.08, filtro: 2500, tipoFiltro: "bandpass", q: 1.5 });
  },
  carta() {
    rumore(0.25, { volume: 0.1, filtro: 4000, tipoFiltro: "bandpass", q: 0.7 });
  },
  fanfara() {
    [784, 988, 1175, 1568].forEach((f, i) => campana(f, i * 0.11, 0.15));
  },
};

// ---------- musica di sottofondo: carillon originale, a volume basso ----------
// (melodia scritta da noi, in re maggiore, 16 battute che si ripetono)
const MELODIA: [number, number][] = [
  [74, 1], [78, 1], [81, 2], [79, 1], [78, 1], [76, 2],
  [74, 1], [76, 1], [78, 1], [81, 1], [79, 3], [0, 1],
  [83, 1], [81, 1], [79, 2], [78, 1], [76, 1], [74, 2],
  [76, 1], [78, 1], [76, 1], [73, 1], [74, 3], [0, 1],
];
const BASSI = [50, 55, 57, 50, 55, 50, 57, 50];
let timerMusica: ReturnType<typeof setTimeout> | null = null;
let musicaVoluta = false;

const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function avviaMusica() {
  musicaVoluta = true;
  const c = audio();
  if (!c || muto || timerMusica) return;
  const passo = 0.32; // secondi per tempo
  let i = 0;
  let battuta = 0;
  let tempo = 0;
  let ultimaBattuta = -1;
  const suona = () => {
    if (muto || !musicaVoluta) {
      timerMusica = null;
      return;
    }
    const [m, durata] = MELODIA[i % MELODIA.length];
    if (m) {
      nota(freq(m), passo * durata * 1.6, { volume: 0.05 });
      nota(freq(m) * 2, passo * durata, { volume: 0.012 });
    }
    if (Math.floor(tempo / 4) !== ultimaBattuta) {
      ultimaBattuta = Math.floor(tempo / 4);
      nota(freq(BASSI[battuta++ % BASSI.length]), passo * 4, { tipo: "triangle", volume: 0.035, attacco: 0.05 });
    }
    tempo += durata;
    i++;
    timerMusica = setTimeout(suona, passo * durata * 1000);
  };
  suona();
}

export function fermaMusica() {
  if (timerMusica) clearTimeout(timerMusica);
  timerMusica = null;
}

export function smettiMusica() {
  musicaVoluta = false;
  fermaMusica();
}
