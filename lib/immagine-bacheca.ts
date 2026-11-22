// L'immagine da condividere: bacheca + personaggio in grande, formato storia 1080×1920.
// Il layout non è fisso: 4 composizioni (collage, ritratto, francobollo, polaroid) con sfondo, lato,
// rotazioni e stelline che cambiano a ogni "Rimescola" (seme). Disegno a mano su canvas, coi colori del sito.
// Tela, personaggio e totem arrivano già "fotografati" (canvas) da components/condividi-bacheca.tsx.

export const LARGHEZZA = 1080;
export const ALTEZZA = 1920;
export const NUMERO_LAYOUT = 4;

const C = {
  abete: "#2f4830",
  abeteScuro: "#1f3321",
  vermiglio: "#e5481e",
  crema: "#f3e6c9",
  senape: "#e2a33b",
  inchiostro: "#1c241d",
  notte: "#22304a",
};

// fondo, colore dei testi, colore delle stelline
const SFONDI = [
  { fondo: C.abete, testo: C.crema, accento: C.senape, anello: null },
  { fondo: C.vermiglio, testo: C.crema, accento: C.crema, anello: null },
  { fondo: C.notte, testo: C.crema, accento: C.senape, anello: null },
  { fondo: C.crema, testo: C.abete, accento: C.vermiglio, anello: C.abete },
];

export type Pezzi = {
  tela: HTMLCanvasElement; // la bacheca (3:4)
  avatar: HTMLCanvasElement; // la toppa tonda col personaggio
  totem: HTMLCanvasElement | null; // il francobollo del totem
  nome: string; // nome della persona
  gruppo: string;
  nomeTotem: string | null;
  fontTitoli: string; // famiglia CSS di Basteleur
  fontTesto: string; // famiglia CSS di Bricolage
};

// generatore col seme (stessa idea dei giochi)
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

function stella(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colore: string) {
  // stellina a 4 punte del sito
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = colore;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
  ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
  ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
  ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
  ctx.fill();
  ctx.restore();
}

function grana(ctx: CanvasRenderingContext2D, r: () => number) {
  ctx.save();
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(r() * LARGHEZZA, r() * ALTEZZA, 2, 2);
  }
  // luce morbida dall'alto
  const g = ctx.createRadialGradient(LARGHEZZA * 0.3, 0, 100, LARGHEZZA * 0.3, 0, ALTEZZA * 0.9);
  g.addColorStop(0, "rgba(255,255,255,0.10)");
  g.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA);
  ctx.restore();
}

// banda a maglia nordica (zig-zag di "punti a V")
function bandaMaglia(ctx: CanvasRenderingContext2D, y: number, colore: string, fondo: string) {
  ctx.save();
  ctx.fillStyle = fondo;
  ctx.fillRect(0, y, LARGHEZZA, 64);
  ctx.strokeStyle = colore;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (let x = -20; x < LARGHEZZA + 40; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, y + 16);
    ctx.lineTo(x + 18, y + 32);
    ctx.lineTo(x + 36, y + 16);
    ctx.moveTo(x, y + 34);
    ctx.lineTo(x + 18, y + 50);
    ctx.lineTo(x + 36, y + 34);
    ctx.stroke();
  }
  ctx.restore();
}

function ombra(ctx: CanvasRenderingContext2D, forte = 1) {
  ctx.shadowColor = `rgba(0,0,0,${0.35 * forte})`;
  ctx.shadowBlur = 40 * forte;
  ctx.shadowOffsetY = 18 * forte;
}

// la tela con una cornice di feltro crema cucita (raggio come la bacheca vera)
function telaIncorniciata(ctx: CanvasRenderingContext2D, tela: HTMLCanvasElement, cx: number, cy: number, w: number, gradi: number) {
  const h = (w * 4) / 3;
  const bordo = 22;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((gradi * Math.PI) / 180);
  ctx.save();
  ombra(ctx);
  ctx.fillStyle = C.crema;
  ctx.beginPath();
  ctx.roundRect(-w / 2 - bordo, -h / 2 - bordo, w + bordo * 2, h + bordo * 2, 44);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 30);
  ctx.clip();
  ctx.drawImage(tela, -w / 2, -h / 2, w, h);
  ctx.restore();
  ctx.setLineDash([16, 12]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(229,72,30,0.7)";
  ctx.beginPath();
  ctx.roundRect(-w / 2 - bordo + 10, -h / 2 - bordo + 10, w + bordo * 2 - 20, h + bordo * 2 - 20, 34);
  ctx.stroke();
  ctx.restore();
}

// tela come francobollo: bordo dentellato
function telaFrancobollo(ctx: CanvasRenderingContext2D, tela: HTMLCanvasElement, cx: number, cy: number, w: number, gradi: number) {
  const h = (w * 4) / 3;
  const m = 34; // margine bianco
  const W = w + m * 2;
  const H = h + m * 2;
  const r = 13; // raggio dei dentini
  // il francobollo si prepara su un foglio a parte: i dentini bucano solo lui, non lo sfondo
  const f = document.createElement("canvas");
  f.width = W;
  f.height = H;
  const g = f.getContext("2d")!;
  g.fillStyle = "#fbf6ea";
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "destination-out";
  const passo = 2 * r + 12;
  for (let x = 0; x <= W + 1; x += passo) {
    for (const y of [0, H]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  for (let y = 0; y <= H + 1; y += passo) {
    for (const x of [0, W]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalCompositeOperation = "source-over";
  g.drawImage(tela, m, m, w, h);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((gradi * Math.PI) / 180);
  ombra(ctx);
  ctx.drawImage(f, -W / 2, -H / 2);
  ctx.restore();
}

// tela in una polaroid con la didascalia scritta
function telaPolaroid(ctx: CanvasRenderingContext2D, p: Pezzi, cx: number, cy: number, w: number, gradi: number) {
  const h = (w * 4) / 3;
  const m = 36;
  const sotto = 170;
  const W = w + m * 2;
  const H = h + m + sotto;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((gradi * Math.PI) / 180);
  ctx.save();
  ombra(ctx);
  ctx.fillStyle = "#fbf6ea";
  ctx.fillRect(-W / 2, -H / 2, W, H);
  ctx.restore();
  ctx.drawImage(p.tela, -w / 2, -H / 2 + m, w, h);
  ctx.fillStyle = C.abete;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  adattaTesto(ctx, `il mood di ${p.nome}`, `700 {s}px ${p.fontTitoli}`, 64, w);
  ctx.fillText(`il mood di ${p.nome}`, 0, H / 2 - sotto / 2);
  ctx.restore();
}

// il personaggio: la toppa tonda, con ombra
// (il canvas del personaggio ha un margine trasparente: la toppa occupa il cerchio interno)
function avatarGrande(ctx: CanvasRenderingContext2D, avatar: HTMLCanvasElement, cx: number, cy: number, d: number, gradi: number, anello: string | null) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((gradi * Math.PI) / 180);
  if (anello) {
    // su sfondo chiaro la toppa crema non si staccherebbe: un bordo pieno intorno
    ctx.save();
    ombra(ctx, 1.2);
    ctx.fillStyle = anello;
    ctx.beginPath();
    ctx.arc(0, 0, d * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ombra(ctx, 1.2);
  }
  ctx.drawImage(avatar, -d / 2, -d / 2, d, d);
  ctx.restore();
}

function totemAngolo(ctx: CanvasRenderingContext2D, totem: HTMLCanvasElement | null, cx: number, cy: number, w: number, gradi: number) {
  if (!totem) return;
  const h = (w * totem.height) / totem.width;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((gradi * Math.PI) / 180);
  ombra(ctx, 0.7);
  ctx.drawImage(totem, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// rimpicciolisce il font finché il testo sta nella larghezza
function adattaTesto(ctx: CanvasRenderingContext2D, testo: string, font: string, massimo: number, larghezza: number) {
  let s = massimo;
  ctx.font = font.replace("{s}", String(s));
  while (s > 24 && ctx.measureText(testo).width > larghezza) {
    s -= 2;
    ctx.font = font.replace("{s}", String(s));
  }
  return s;
}

// titolo su due righe: piccola sopra, grande sotto
function titolo(ctx: CanvasRenderingContext2D, p: Pezzi, x: number, y: number, larghezza: number, allinea: CanvasTextAlign, colore: string, accento: string) {
  ctx.save();
  ctx.textAlign = allinea;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = colore;
  ctx.globalAlpha = 0.85;
  adattaTesto(ctx, p.gruppo, `500 {s}px ${p.fontTesto}`, 40, larghezza);
  ctx.fillText(p.gruppo, x, y);
  ctx.globalAlpha = 1;
  const s = adattaTesto(ctx, `La bacheca di ${p.nome}`, `700 {s}px ${p.fontTitoli}`, 92, larghezza);
  ctx.fillText(`La bacheca di ${p.nome}`, x, y + s * 1.15);
  if (p.nomeTotem) {
    ctx.fillStyle = accento;
    adattaTesto(ctx, `✦ ${p.nomeTotem}`, `700 {s}px ${p.fontTitoli}`, 46, larghezza);
    ctx.fillText(`✦ ${p.nomeTotem}`, x, y + s * 1.15 + 66);
  }
  ctx.restore();
}

function firma(ctx: CanvasRenderingContext2D, p: Pezzi, colore: string) {
  ctx.save();
  ctx.fillStyle = colore;
  ctx.globalAlpha = 0.7;
  ctx.textAlign = "center";
  ctx.font = `600 30px ${p.fontTesto}`;
  ctx.fillText("Secret Santa ✦ " + new Date().getFullYear(), LARGHEZZA / 2, ALTEZZA - 70);
  ctx.restore();
}

// stelline solo nelle fasce ai lati (mai sopra titolo, tela o personaggio)
function stelline(ctx: CanvasRenderingContext2D, r: () => number, colore: string, quante: number) {
  for (let i = 0; i < quante; i++) {
    const x = r() < 0.5 ? 30 + r() * 70 : LARGHEZZA - 100 + r() * 70;
    stella(ctx, x, 120 + r() * (ALTEZZA - 240), 8 + r() * 14, colore);
  }
}

// Disegna la composizione n. (seme % NUMERO_LAYOUT) con le variazioni del seme.
export function componi(canvas: HTMLCanvasElement, p: Pezzi, seme: number) {
  canvas.width = LARGHEZZA;
  canvas.height = ALTEZZA;
  const ctx = canvas.getContext("2d")!;
  const r = casuale(seme * 7919 + 13);
  const layout = ((seme % NUMERO_LAYOUT) + NUMERO_LAYOUT) % NUMERO_LAYOUT;
  const sf = SFONDI[Math.floor(r() * SFONDI.length)];
  const destra = r() < 0.5; // il personaggio a destra o a sinistra
  const segno = destra ? 1 : -1;
  const ruota = (max: number) => (r() * 2 - 1) * max;

  ctx.fillStyle = sf.fondo;
  ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA);
  grana(ctx, r);
  stelline(ctx, r, sf.accento, 10);

  if (layout === 0) {
    // COLLAGE: titolo in alto, tela al centro un po' storta, personaggio grande sull'angolo in basso
    bandaMaglia(ctx, 0, sf.accento, "rgba(0,0,0,0.18)");
    titolo(ctx, p, 80, 190, LARGHEZZA - 160, "left", sf.testo, sf.accento);
    telaIncorniciata(ctx, p.tela, LARGHEZZA / 2 - segno * 40, 1010, 700, ruota(4));
    avatarGrande(ctx, p.avatar, LARGHEZZA / 2 + segno * 300, 1520, 560, ruota(8), sf.anello);
    totemAngolo(ctx, p.totem, LARGHEZZA / 2 - segno * 380, 1560, 170, ruota(12));
  } else if (layout === 1) {
    // RITRATTO: personaggio enorme in alto che esce dal bordo, tela sotto dall'altra parte, titolo in fondo
    telaIncorniciata(ctx, p.tela, destra ? 430 : LARGHEZZA - 430, 1130, 600, segno * (3 + r() * 3));
    avatarGrande(ctx, p.avatar, destra ? LARGHEZZA - 230 : 230, 470, 860, ruota(6), sf.anello);
    totemAngolo(ctx, p.totem, destra ? LARGHEZZA - 170 : 170, 1090, 180, ruota(14));
    titolo(ctx, p, LARGHEZZA / 2, 1620, LARGHEZZA - 140, "center", sf.testo, sf.accento);
    bandaMaglia(ctx, ALTEZZA - 64, sf.accento, "rgba(0,0,0,0.18)");
  } else if (layout === 2) {
    // FRANCOBOLLO: la tela come un francobollo, personaggio che lo "timbra" dall'angolo
    titolo(ctx, p, LARGHEZZA / 2, 170, LARGHEZZA - 140, "center", sf.testo, sf.accento);
    telaFrancobollo(ctx, p.tela, LARGHEZZA / 2, 1040, 640, ruota(3));
    avatarGrande(ctx, p.avatar, LARGHEZZA / 2 + segno * 330, 1500, 500, ruota(10), sf.anello);
    totemAngolo(ctx, p.totem, LARGHEZZA / 2 - segno * 360, 560, 170, ruota(12));
    firma(ctx, p, sf.testo);
  } else {
    // POLAROID: la tela in una polaroid storta, personaggio che sbuca da dietro
    titolo(ctx, p, destra ? 80 : LARGHEZZA - 80, 180, LARGHEZZA - 160, destra ? "left" : "right", sf.testo, sf.accento);
    avatarGrande(ctx, p.avatar, LARGHEZZA / 2 + segno * 250, 640, 600, ruota(8), sf.anello);
    telaPolaroid(ctx, p, LARGHEZZA / 2 - segno * 30, 1250, 620, segno * -(3 + r() * 4));
    totemAngolo(ctx, p.totem, LARGHEZZA / 2 - segno * 340, 560, 170, ruota(12));
  }
}
