// L'immagine da condividere, formato storia 1080×1920 (regole di Marzia, 22/11):
// - titolo sempre in alto, tutto centrato; in fondo l'indirizzo del sito, discreto, fuori da bacheca e personaggio;
// - la bacheca in una cornice di feltro cucita (raggi: esterno = raggio della tela + bordo, cucitura = esterno − distanza);
// - "con il personaggio": il personaggio sta in uno dei 4 angoli (in alto o in basso, a destra o a sinistra)
//   e il francobollo del totem sempre in alto a destra sul personaggio; "solo la bacheca": la tela grande, tutta visibile;
// - cambia solo: angolo del personaggio, colore dello sfondo (mai uguale al colore della tela) e stelline gialle
//   OPPURE neve (mai insieme). Niente bande a maglia.
// Tela, personaggio e totem arrivano già "fotografati" (canvas) da components/condividi-bacheca.tsx.

export const LARGHEZZA = 1080;
export const ALTEZZA = 1920;

const CREMA = "#f3e8cf";
const SENAPE = "#e9a81c";
// sfondi possibili (testo sempre crema): abete, vermiglio, blu notte, bordeaux (gli stessi della tela, lib/parole.ts)
const SFONDI = ["#2c4a32", "#e5481e", "#24304a", "#7d3c5a"];
const ANGOLI = ["alto-sinistra", "alto-destra", "basso-sinistra", "basso-destra"] as const;
export type Angolo = (typeof ANGOLI)[number];

export type Pezzi = {
  tela: HTMLCanvasElement; // la bacheca (3:4), con gli angoli già arrotondati
  raggioTela: number; // raggio degli angoli della tela, in proporzione alla sua larghezza
  coloreTela: string; // colore di fondo della tela (rgb(...) o #...), per non usarlo come sfondo
  avatar: HTMLCanvasElement; // la toppa tonda col personaggio (con un margine trasparente intorno)
  margineAvatar: number; // quanto è il margine trasparente, in proporzione al lato del canvas
  totem: HTMLCanvasElement | null; // il francobollo del totem
  nome: string;
  gruppo: string;
  nomeTotem: string | null;
  sito: string; // indirizzo del sito (senza https://)
  fontTitoli: string;
  fontTesto: string;
};

export type Scelte = { angolo: Angolo; sfondo: string; neve: boolean };

function rgb(colore: string): [number, number, number] {
  const m = colore.match(/\d+(\.\d+)?/g);
  if (colore.startsWith("rgb") && m) return [+m[0], +m[1], +m[2]];
  const h = colore.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const distanza = (a: string, b: string) => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
};

// La combinazione n. "giro" (0 = la prima, poi una in più a ogni "Rimescola"): il COLORE dello sfondo cambia
// a ogni giro, girando su tutti quelli permessi (4, o 3 se uno è simile alla tela), e cambiano anche l'angolo
// del personaggio e stelline/neve. Il seme sceglie da dove si parte.
export function scelta(coloreTela: string, seme: number, giro: number): Scelte {
  const sfondi = SFONDI.filter((s) => distanza(s, coloreTela) > 90);
  const n = sfondi.length;
  const k = seme + giro;
  return {
    sfondo: sfondi[k % n],
    angolo: ANGOLI[(seme + giro + Math.floor(giro / n)) % ANGOLI.length],
    neve: (seme + giro) % 2 === 1,
  };
}

function casuale(seme: number) {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stella(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = SENAPE;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
  ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
  ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
  ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
  ctx.fill();
  ctx.restore();
}

function fondo(ctx: CanvasRenderingContext2D, colore: string, neve: boolean, r: () => number) {
  ctx.fillStyle = colore;
  ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA);
  // grana leggera e luce morbida dall'alto, come lo sfondo del sito
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(r() * LARGHEZZA, r() * ALTEZZA, 2, 2);
  }
  const g = ctx.createRadialGradient(LARGHEZZA * 0.3, 0, 100, LARGHEZZA * 0.3, 0, ALTEZZA * 0.9);
  g.addColorStop(0, "rgba(255,255,255,0.10)");
  g.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA);
  if (neve) {
    // fiocchi di neve sparsi (sotto a tutto il resto)
    for (let i = 0; i < 170; i++) {
      const raggio = 2 + r() * r() * 9;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.5})`;
      ctx.beginPath();
      ctx.arc(r() * LARGHEZZA, r() * ALTEZZA, raggio, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // stelline gialle solo nelle fasce ai lati (mai sopra titolo, tela o personaggio)
    for (let i = 0; i < 10; i++) {
      const x = r() < 0.5 ? 34 + r() * 60 : LARGHEZZA - 94 + r() * 60;
      stella(ctx, x, 120 + r() * (ALTEZZA - 260), 8 + r() * 14);
    }
  }
}

function ombra(ctx: CanvasRenderingContext2D, forte = 1) {
  ctx.shadowColor = `rgba(0,0,0,${0.35 * forte})`;
  ctx.shadowBlur = 40 * forte;
  ctx.shadowOffsetY = 18 * forte;
}

// la tela nella cornice di feltro crema cucita. x, y = angolo in alto a sinistra della TELA
const BORDO = 24; // feltro intorno alla tela
const DISTANZA_CUCITURA = 11;
function telaIncorniciata(ctx: CanvasRenderingContext2D, p: Pezzi, x: number, y: number, w: number) {
  const h = (w * 4) / 3;
  const raggio = p.raggioTela * w; // come sulla bacheca vera
  const esterno = raggio + BORDO;
  ctx.save();
  ombra(ctx);
  ctx.fillStyle = CREMA;
  ctx.beginPath();
  ctx.roundRect(x - BORDO, y - BORDO, w + BORDO * 2, h + BORDO * 2, esterno);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(p.tela, x, y, w, h);
  // cucitura vermiglia: stesso centro degli angoli, raggio = esterno − distanza
  ctx.save();
  ctx.setLineDash([16, 12]);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "rgba(229,72,30,0.75)";
  const d = DISTANZA_CUCITURA;
  ctx.beginPath();
  ctx.roundRect(x - BORDO + d, y - BORDO + d, w + (BORDO - d) * 2, h + (BORDO - d) * 2, esterno - d);
  ctx.stroke();
  ctx.restore();
}

// il personaggio (diametro della toppa = d) con il totem in alto a destra, come nel sito
function personaggio(ctx: CanvasRenderingContext2D, p: Pezzi, cx: number, cy: number, d: number) {
  const lato = d / (1 - 2 * p.margineAvatar); // il canvas ha un margine trasparente intorno alla toppa
  ctx.save();
  ombra(ctx, 1.2);
  ctx.drawImage(p.avatar, cx - lato / 2, cy - lato / 2, lato, lato);
  ctx.restore();
  if (p.totem) {
    const w = d * 0.36;
    const h = (w * p.totem.height) / p.totem.width;
    ctx.save();
    ctx.translate(cx + d * 0.38, cy - d * 0.34);
    ctx.rotate((8 * Math.PI) / 180);
    ombra(ctx, 0.6);
    ctx.drawImage(p.totem, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

function adattaTesto(ctx: CanvasRenderingContext2D, testo: string, font: string, massimo: number, larghezza: number) {
  let s = massimo;
  ctx.font = font.replace("{s}", String(s));
  while (s > 24 && ctx.measureText(testo).width > larghezza) {
    s -= 2;
    ctx.font = font.replace("{s}", String(s));
  }
  return s;
}

// titolo centrato: gruppo piccolo, "La bacheca di …" grande, totem. Restituisce dove finisce.
function titolo(ctx: CanvasRenderingContext2D, p: Pezzi) {
  const x = LARGHEZZA / 2;
  const larghezza = LARGHEZZA - 160;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = CREMA;
  ctx.globalAlpha = 0.85;
  adattaTesto(ctx, p.gruppo, `500 {s}px ${p.fontTesto}`, 40, larghezza);
  ctx.fillText(p.gruppo, x, 150);
  ctx.globalAlpha = 1;
  const s = adattaTesto(ctx, `La bacheca di ${p.nome}`, `700 {s}px ${p.fontTitoli}`, 92, larghezza);
  let fine = 150 + s * 1.15;
  ctx.fillText(`La bacheca di ${p.nome}`, x, fine);
  if (p.nomeTotem) {
    ctx.fillStyle = SENAPE;
    adattaTesto(ctx, `✦ ${p.nomeTotem} ✦`, `700 {s}px ${p.fontTitoli}`, 46, larghezza);
    fine += 66;
    ctx.fillText(`✦ ${p.nomeTotem} ✦`, x, fine);
  }
  ctx.restore();
  return fine + 40;
}

// l'indirizzo del sito in fondo: si legge, ma non ruba la scena
function sito(ctx: CanvasRenderingContext2D, p: Pezzi) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = CREMA;
  ctx.globalAlpha = 0.6;
  ctx.font = `600 30px ${p.fontTesto}`;
  ctx.fillText(p.sito, LARGHEZZA / 2, ALTEZZA - 64);
  ctx.restore();
}

const SOTTO = ALTEZZA - 130; // sopra l'indirizzo del sito

export function componi(canvas: HTMLCanvasElement, p: Pezzi, scelte: Scelte, conPersonaggio: boolean, seme: number) {
  canvas.width = LARGHEZZA;
  canvas.height = ALTEZZA;
  const ctx = canvas.getContext("2d")!;
  fondo(ctx, scelte.sfondo, scelte.neve, casuale(seme * 7919 + 13));
  const inizio = titolo(ctx, p);
  sito(ctx, p);

  if (!conPersonaggio) {
    // solo la bacheca: più grande possibile, centrata nello spazio libero
    const w = Math.min(LARGHEZZA - 2 * (BORDO + 70), ((SOTTO - inizio - 2 * BORDO) * 3) / 4);
    const h = (w * 4) / 3;
    telaIncorniciata(ctx, p, (LARGHEZZA - w) / 2, inizio + BORDO + (SOTTO - inizio - 2 * BORDO - h) / 2, w);
    return;
  }

  // con il personaggio: tela spostata dalla parte opposta, personaggio sull'angolo, un po' fuori dalla tela
  const sinistra = scelte.angolo.endsWith("sinistra");
  const alto = scelte.angolo.startsWith("alto");
  const d = 440; // diametro del personaggio
  const w = 640; // larghezza della tela
  const h = (w * 4) / 3;
  const sporge = d * 0.62; // quanto il personaggio esce dalla tela (in verticale)
  const altezzaGruppo = h + 2 * BORDO + sporge;
  const y0 = inizio + Math.max(0, (SOTTO - inizio - altezzaGruppo) / 2);
  const telaY = (alto ? y0 + sporge : y0) + BORDO;
  const telaX = sinistra ? LARGHEZZA - 70 - BORDO - w : 70 + BORDO;
  telaIncorniciata(ctx, p, telaX, telaY, w);
  // il personaggio sta sul margine libero e copre solo l'angolo della tela
  const cx = sinistra ? d / 2 + 40 : LARGHEZZA - d / 2 - 40;
  const cy = alto ? telaY - BORDO - sporge + d / 2 : telaY + h + BORDO + sporge - d / 2;
  personaggio(ctx, p, cx, cy, d);
}
