"use client";

// Tutti i suoni del sito, generati dal codice (nessun file audio, nessuna licenza).
// Si attivano solo dopo il primo tocco (i telefoni bloccano l'audio automatico).
// "muto" è ricordato dal telefono.

let ctx: AudioContext | null = null;
let generale: GainNode | null = null;
let busMusica: GainNode | null = null; // la musica passa di qui (si abbassa durante le partite)
let inMusica = false; // vero mentre si programmano le note della musica
let muto = false;
let musicaBassaOra = false;
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
    busMusica = ctx.createGain();
    busMusica.gain.value = musicaBassaOra ? 0.35 : 1;
    busMusica.connect(generale);
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
  o.connect(g).connect(inMusica && busMusica ? busMusica : generale);
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
  s.connect(f).connect(g).connect(inMusica && busMusica ? busMusica : generale);
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
  // (più corpo sulle medie: un "toc" a 420 Hz e un soffio di stoffa intorno agli 800)
  tasto() {
    nota(200, 0.12, { volume: 0.18, scivola: 0.6 });
    nota(420, 0.08, { tipo: "triangle", volume: 0.16, scivola: 0.75 });
    rumore(0.07, { volume: 0.12, filtro: 850, tipoFiltro: "bandpass", q: 1.2 });
  },
  // pallina di vetro dell'albero
  pallina() {
    campana(1568, 0, 0.12);
    campana(2093, 0.09, 0.08);
  },
  // toppa attaccata: fruscio di stoffa premuta, un colpetto sordo e il "crrk" del velcro/adesivo
  toppa() {
    rumore(0.16, { volume: 0.16, filtro: 1400, tipoFiltro: "bandpass", q: 0.8, scendi: 0.5 });
    nota(95, 0.12, { volume: 0.22, scivola: 0.7, ritardo: 0.04 });
    for (let k = 0; k < 6; k++) rumore(0.018, { volume: 0.05, filtro: 3200, tipoFiltro: "bandpass", q: 2, ritardo: 0.08 + k * 0.022 });
  },

  // Santa Chat: messaggio inviato (foglietto che scivola via + "plin" che sale)
  inviato() {
    rumore(0.14, { volume: 0.1, filtro: 2400, tipoFiltro: "bandpass", q: 0.9, scendi: 1.8 });
    nota(660, 0.12, { tipo: "triangle", volume: 0.08, scivola: 1.5, ritardo: 0.05 });
  },
  // Santa Chat: messaggio arrivato (due sonagli)
  arrivato() {
    campana(1318, 0, 0.1);
    campana(1976, 0.11, 0.07);
  },

  // Novità: reazione con un'emoji ("pop" di bottone)
  reazione() {
    nota(740, 0.07, { tipo: "triangle", volume: 0.12, scivola: 1.6 });
    nota(1480, 0.1, { volume: 0.05, ritardo: 0.05 });
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

  // ---------- giochi ----------
  // 3-2-1
  conto() {
    nota(880, 0.14, { tipo: "triangle", volume: 0.12 });
  },
  via() {
    campana(1318, 0, 0.14);
    campana(1760, 0.07, 0.12);
  },
  // colpo riuscito: più sale la combo, più sale la nota
  colpo(livello = 0) {
    const f = 660 * Math.pow(2, Math.min(livello, 12) / 12);
    nota(f, 0.12, { tipo: "triangle", volume: 0.12, scivola: 1.4 });
    campana(f * 2, 0.02, 0.05);
  },
  // errore buffo (pernacchietta stonata)
  sbaglio() {
    nota(220, 0.28, { tipo: "sawtooth", volume: 0.05, scivola: 0.55 });
    rumore(0.12, { volume: 0.1, filtro: 600 });
  },
  // campanelli del gioco 2: scala pentatonica (do re mi sol), suono di campana
  campanello(i = 0, lungo = 1) {
    const f = [523.25, 587.33, 659.25, 783.99][i % 4];
    nota(f, 0.9 * lungo, { volume: 0.2 });
    nota(f * 2.76, 0.4 * lungo, { volume: 0.06 });
    nota(f * 2, 0.5 * lungo, { tipo: "triangle", volume: 0.05 });
  },
  // gioco 3: pacco appoggiato e tagliato (tonfo morbido + forbici sulla stoffa)
  taglio() {
    nota(150, 0.12, { volume: 0.2, scivola: 0.6 });
    rumore(0.06, { volume: 0.1, filtro: 3000, tipoFiltro: "bandpass", q: 2, ritardo: 0.02 });
    rumore(0.05, { volume: 0.08, filtro: 3600, tipoFiltro: "bandpass", q: 2, ritardo: 0.08 });
  },
  // gioco 3: perfetto (tonfo + campanella che sale con i perfetti di fila)
  perfetto(livello = 1) {
    nota(170, 0.1, { volume: 0.18, scivola: 0.7 });
    const f = 1047 * Math.pow(2, (Math.min(livello, 8) - 1) / 12);
    campana(f, 0.03, 0.14);
    campana(f * 1.5, 0.1, 0.08);
  },
  // gioco 4: regalo preso (due sonagli che salgono)
  regalo(livello = 0) {
    const f = 880 * Math.pow(2, (livello % 5) / 12);
    campana(f, 0, 0.11);
    campana(f * 1.335, 0.07, 0.09);
  },
  // urto: botta sorda nella neve con lo sbuffo
  urto() {
    nota(90, 0.3, { volume: 0.3, scivola: 0.5 });
    rumore(0.45, { volume: 0.32, filtro: 700, scendi: 0.3 });
    rumore(0.2, { volume: 0.1, filtro: 4000, tipoFiltro: "highpass", ritardo: 0.03 });
  },
  // gioco 5: palla di neve lanciata (soffio che sale)
  lancio() {
    rumore(0.16, { volume: 0.08, filtro: 900, tipoFiltro: "bandpass", q: 1.4, scendi: 2.4 });
  },
  // gioco 5: palla che si schiaccia ("sploff" morbido)
  splat() {
    rumore(0.2, { volume: 0.22, filtro: 1200, scendi: 0.25 });
    nota(130, 0.1, { volume: 0.12, scivola: 0.6 });
  },
  // gioco 5: Babbo Natale colpito, offeso ("oh-oh!" che scende)
  offeso() {
    nota(240, 0.18, { tipo: "triangle", volume: 0.16, scivola: 0.85 });
    nota(180, 0.3, { tipo: "triangle", volume: 0.16, scivola: 0.7, ritardo: 0.2 });
  },
  fineGioco() {
    [784, 659, 523, 659].forEach((f, i) => nota(f, 0.28, { tipo: "triangle", volume: 0.1, ritardo: i * 0.12 }));
  },
  record() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => campana(f, i * 0.09, 0.14));
  },
};

// Durante le partite la musica si abbassa (resta i suoni del gioco in primo piano)
export function musicaBassa(bassa: boolean) {
  musicaBassaOra = bassa;
  if (ctx && busMusica) busMusica.gain.setTargetAtTime(bassa ? 0.35 : 1, ctx.currentTime, 0.3);
}

// ---------- musica ----------
// Due brani scritti da noi:
// - "carillon": dolce, in re maggiore; dal terzo giro entrano sonagli e campane natalizie;
// - "attesa": per l'apertura della busta, lento e sospeso, che sale piano (cresce la suspense).
// Si ferma quando si esce dal sito (app in background o scheda nascosta) e riprende al ritorno.
type Brano = "carillon" | "attesa";
const MELODIA: [number, number][] = [
  [74, 1], [78, 1], [81, 2], [79, 1], [78, 1], [76, 2],
  [74, 1], [76, 1], [78, 1], [81, 1], [79, 3], [0, 1],
  [83, 1], [81, 1], [79, 2], [78, 1], [76, 1], [74, 2],
  [76, 1], [78, 1], [76, 1], [73, 1], [74, 3], [0, 1],
];
const BASSI = [50, 55, 57, 50, 55, 50, 57, 50];
// attesa: accordi lunghi (note MIDI) che salgono di tensione
const ACCORDI_ATTESA = [
  [50, 57, 62, 65], // re minore
  [46, 58, 62, 65], // si bemolle
  [48, 55, 60, 67], // do
  [45, 57, 61, 64], // la (sospeso → tensione)
  [50, 57, 62, 66], // re maggiore (spiraglio di luce)
  [43, 59, 62, 67], // sol
  [45, 57, 62, 64], // la sus
  [45, 57, 61, 64], // la
];
let timerMusica: ReturnType<typeof setTimeout> | null = null;
let musicaVoluta = false;
let brano: Brano = "carillon";
let nascosta = false;

const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// sonagli della slitta: tanti piccoli colpi metallici ravvicinati
function sonagli(ritardo = 0, volume = 0.03) {
  for (let k = 0; k < 4; k++) rumore(0.05, { volume: volume * (1 - k * 0.2), filtro: 7500, tipoFiltro: "bandpass", q: 4, ritardo: ritardo + k * 0.025 });
}

function suonaCarillon() {
  const passo = 0.32; // secondi per tempo
  let i = 0;
  let battuta = 0;
  let tempo = 0;
  let ultimaBattuta = -1;
  const giro = MELODIA.reduce((t, [, d]) => t + d, 0);
  const suona = () => {
    if (muto || !musicaVoluta || nascosta || brano !== "carillon") {
      timerMusica = null;
      return;
    }
    inMusica = true;
    const [m, durata] = MELODIA[i % MELODIA.length];
    const giri = Math.floor(tempo / giro);
    if (m) {
      nota(freq(m), passo * durata * 1.6, { volume: 0.05 });
      nota(freq(m) * 2, passo * durata, { volume: 0.012 });
    }
    // dal terzo giro: sonagli sul tempo e campane natalizie a inizio battuta
    if (giri >= 2) {
      for (let k = 0; k < durata; k++) sonagli(k * passo, k % 2 ? 0.018 : 0.03);
    }
    if (Math.floor(tempo / 4) !== ultimaBattuta) {
      ultimaBattuta = Math.floor(tempo / 4);
      const basso = BASSI[battuta++ % BASSI.length];
      nota(freq(basso), passo * 4, { tipo: "triangle", volume: 0.035, attacco: 0.05 });
      if (giri >= 2) campana(freq(basso + 36), 0, 0.05);
      if (giri >= 3 && battuta % 2 === 0) campana(freq(basso + 43), passo * 2, 0.035);
    }
    inMusica = false;
    tempo += durata;
    i++;
    timerMusica = setTimeout(suona, passo * durata * 1000);
  };
  suona();
}

function suonaAttesa() {
  const durataAccordo = 3.2; // lento e disteso
  let n = 0;
  const suona = () => {
    if (muto || !musicaVoluta || nascosta || brano !== "attesa") {
      timerMusica = null;
      return;
    }
    inMusica = true;
    const accordo = ACCORDI_ATTESA[n % ACCORDI_ATTESA.length];
    const sale = Math.min(1, n / 8); // cresce piano
    // tappeto: note lunghe con attacco morbido
    accordo.forEach((m, k) =>
      nota(freq(m), durataAccordo * 1.4, { tipo: k === 0 ? "triangle" : "sine", volume: k === 0 ? 0.05 : 0.022, attacco: 0.9 }),
    );
    // arpeggio che sale, come uno scrigno che sta per aprirsi
    const note = [...accordo.slice(1), accordo[1] + 12, accordo[2] + 12, accordo[3] + 12];
    note.forEach((m, k) => nota(freq(m + 12), 0.9, { volume: 0.018 + 0.012 * sale, ritardo: 0.5 + k * 0.38 }));
    // brillio in cima e un tremolo leggero
    campana(freq(note[note.length - 1] + 12), 0.5 + note.length * 0.38, 0.02 + 0.02 * sale);
    for (let k = 0; k < 8; k++) nota(freq(accordo[3] + 24), 0.12, { volume: 0.004 + 0.004 * sale, ritardo: 1.8 + k * 0.17 });
    inMusica = false;
    n++;
    timerMusica = setTimeout(suona, durataAccordo * 1000);
  };
  suona();
}

export function avviaMusica() {
  musicaVoluta = true;
  const c = audio();
  if (!c || muto || nascosta || timerMusica) return;
  if (brano === "attesa") suonaAttesa();
  else suonaCarillon();
}

// cambia brano (es. "attesa" quando si apre la busta, poi di nuovo "carillon")
export function cambiaBrano(nuovo: Brano) {
  if (brano === nuovo) return;
  brano = nuovo;
  fermaMusica();
  if (musicaVoluta) avviaMusica();
}

export function fermaMusica() {
  if (timerMusica) clearTimeout(timerMusica);
  timerMusica = null;
}

export function smettiMusica() {
  musicaVoluta = false;
  fermaMusica();
}

// uscendo dal sito (altra app, schermo spento, altra scheda) la musica si ferma; al ritorno riprende
if (typeof document !== "undefined") {
  const aggiorna = () => {
    nascosta = document.visibilityState === "hidden";
    if (nascosta) {
      fermaMusica();
      ctx?.suspend();
    } else if (musicaVoluta && !muto) {
      ctx?.resume();
      avviaMusica();
    }
  };
  document.addEventListener("visibilitychange", aggiorna);
  window.addEventListener("pagehide", () => {
    nascosta = true;
    fermaMusica();
    ctx?.suspend();
  });
  window.addEventListener("pageshow", aggiorna);
}
