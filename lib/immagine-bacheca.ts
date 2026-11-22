// L'immagine da condividere, formato storia 1080×1920 (regole di Marzia, 22-23/11):
// - titolo in alto, tutto centrato, con una gerarchia chiara: gruppo (piccolo) → "Questa è la mia bacheca" (grande)
//   → "del secretfanta" → totem (piccolo); in fondo una toppa col sito ("ricamata su secretfanta.vercel.app"),
//   di un colore sempre diverso e ben staccato dallo sfondo; mai sopra bacheca o personaggio;
// - la bacheca nella cornice di feltro cucita (raggi concentrici: esterno = raggio della tela + bordo, cucitura = esterno − distanza);
// - "con te": personaggio in uno dei 4 angoli, totem sempre in alto a destra sul personaggio, e accanto in piccolo
//   "questa cosa invece sono io" con una freccia; "solo bacheca": la tela grande, tutta visibile;
// - sfondo: sempre 4 colori possibili, i 4 che si staccano di più dal colore della tela (mai quello della tela);
//   testi chiari o scuri a seconda dello sfondo; stelline gialle OPPURE neve (mai insieme); niente bande a maglia;
// - un po' di movimento: tela, personaggio e totem leggermente ruotati e spostati, diversi a ogni "Rimescola".
// Tela, personaggio e totem arrivano già "fotografati" (canvas) da components/condividi-bacheca.tsx.

export const LARGHEZZA = 1080;
export const ALTEZZA = 1920;
export const SITO = "secretfanta.vercel.app";

// i colori del sito (gli stessi delle stoffe della tela, lib/parole.ts)
const COLORI = {
  abete: "#2c4a32",
  vermiglio: "#e5481e",
  senape: "#e9a81c",
  notte: "#24304a",
  rosa: "#f4a9c4",
  bordeaux: "#7d3c5a",
  marrone: "#5a3520",
  nero: "#1c241d",
  crema: "#f3e8cf",
  kraft: "#cdb48a",
  ghiaccio: "#a8cbe2",
};
const CREMA = COLORI.crema;
const INCHIOSTRO = COLORI.nero;
const SENAPE = COLORI.senape;
const PALETTE = Object.values(COLORI);
const ANGOLI = ["alto-sinistra", "alto-destra", "basso-sinistra", "basso-destra"] as const;
export type Angolo = (typeof ANGOLI)[number];

export type Pezzi = {
  tela: HTMLCanvasElement; // la bacheca (3:4), con gli angoli già arrotondati
  raggioTela: number; // raggio degli angoli della tela, in proporzione alla sua larghezza
  coloreTela: string; // colore di fondo della tela (rgb(...) o #...)
  avatar: HTMLCanvasElement; // la toppa tonda col personaggio (con un margine trasparente intorno)
  margineAvatar: number; // margine trasparente, in proporzione al lato del canvas
  totem: HTMLCanvasElement | null;
  nome: string;
  gruppo: string;
  nomeTotem: string | null;
  fontTitoli: string;
  fontTesto: string;
};

export type Scelte = { angolo: Angolo; sfondo: string; neve: boolean; toppaSito: string };

// ---------- colori ----------
function rgb(colore: string): [number, number, number] {
  const m = colore.match(/\d+(\.\d+)?/g);
  if (colore.startsWith("rgb") && m) return [+m[0], +m[1], +m[2]];
  const h = colore.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function luminanza(colore: string) {
  const [r, g, b] = rgb(colore).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
// rapporto di contrasto (1 = uguali, 21 = bianco su nero)
function contrasto(a: string, b: string) {
  const [x, y] = [luminanza(a), luminanza(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const distanza = (a: string, b: string) => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
};
// il colore più leggibile sopra uno sfondo, tra quelli dati
const piuLeggibile = (fondo: string, scelte: string[]) => [...scelte].sort((a, b) => contrasto(b, fondo) - contrasto(a, fondo))[0];

// I 4 sfondi che si staccano di più dalla tela (mai il colore della tela, e diversi tra loro)
export function sfondiPer(coloreTela: string): string[] {
  // mai il colore della tela, e mai il crema della cornice (si confonderebbe)
  const candidati = PALETTE.filter((c) => distanza(c, coloreTela) > 60 && distanza(c, CREMA) > 60).sort(
    (a, b) => contrasto(b, coloreTela) + distanza(b, coloreTela) / 200 - (contrasto(a, coloreTela) + distanza(a, coloreTela) / 200),
  );
  const scelti: string[] = [];
  for (const c of candidati) {
    if (scelti.length === 4) break;
    if (scelti.every((s) => distanza(s, c) > 70)) scelti.push(c);
  }
  for (const c of candidati) if (scelti.length < 4 && !scelti.includes(c)) scelti.push(c);
  return scelti;
}

// La combinazione n. "giro" (0 = la prima, +1 a ogni "Rimescola"): il colore dello sfondo cambia a ogni giro girando
// sui 4, e cambiano anche l'angolo del personaggio, stelline/neve e il colore della toppa col sito.
export function scelta(coloreTela: string, seme: number, giro: number): Scelte {
  const sfondi = sfondiPer(coloreTela);
  const k = seme + giro;
  const sfondo = sfondi[k % sfondi.length];
  // la toppa del sito: tra i 3 colori più staccati dallo sfondo, uno diverso ogni volta
  const toppe = PALETTE.filter((c) => c !== sfondo)
    .sort((a, b) => contrasto(b, sfondo) - contrasto(a, sfondo))
    .slice(0, 3);
  return {
    sfondo,
    angolo: ANGOLI[(seme + giro + Math.floor(giro / sfondi.length)) % ANGOLI.length],
    neve: k % 2 === 1,
    toppaSito: toppe[k % toppe.length],
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

// ---------- pezzi del disegno ----------
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
  g.addColorStop(1, "rgba(0,0,0,0.16)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA);
  const chiaro = luminanza(colore) > 0.4;
  if (neve) {
    // fiocchi sparsi (sotto a tutto il resto); sugli sfondi chiari un po' più scuri, se no non si vedono
    for (let i = 0; i < 170; i++) {
      const raggio = 2 + r() * r() * 9;
      ctx.fillStyle = chiaro ? `rgba(255,255,255,${0.6 + r() * 0.4})` : `rgba(255,255,255,${0.35 + r() * 0.5})`;
      if (chiaro) {
        ctx.shadowColor = "rgba(0,0,0,0.18)";
        ctx.shadowBlur = 3;
      }
      ctx.beginPath();
      ctx.arc(r() * LARGHEZZA, r() * ALTEZZA, raggio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowColor = "transparent";
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

// la tela nella cornice di feltro crema cucita, centrata in (cx, cy) e ruotata di "gradi"
const BORDO = 24;
const DISTANZA_CUCITURA = 11;
function telaIncorniciata(ctx: CanvasRenderingContext2D, p: Pezzi, cx: number, cy: number, w: number, gradi: number) {
  const h = (w * 4) / 3;
  const raggio = p.raggioTela * w; // come sulla bacheca vera
  const esterno = raggio + BORDO;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((gradi * Math.PI) / 180);
  ctx.save();
  ombra(ctx);
  ctx.fillStyle = CREMA;
  ctx.beginPath();
  ctx.roundRect(-w / 2 - BORDO, -h / 2 - BORDO, w + BORDO * 2, h + BORDO * 2, esterno);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(p.tela, -w / 2, -h / 2, w, h);
  // cucitura vermiglia: stesso centro degli angoli, raggio = esterno − distanza
  ctx.setLineDash([16, 12]);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "rgba(229,72,30,0.75)";
  const d = DISTANZA_CUCITURA;
  ctx.beginPath();
  ctx.roundRect(-w / 2 - BORDO + d, -h / 2 - BORDO + d, w + (BORDO - d) * 2, h + (BORDO - d) * 2, esterno - d);
  ctx.stroke();
  ctx.restore();
}

// il personaggio (diametro della toppa = d) con il totem in alto a destra, come nel sito
function personaggio(ctx: CanvasRenderingContext2D, p: Pezzi, cx: number, cy: number, d: number, gradi: number, gradiTotem: number) {
  const lato = d / (1 - 2 * p.margineAvatar); // il canvas ha un margine trasparente intorno alla toppa
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((gradi * Math.PI) / 180);
  ombra(ctx, 1.2);
  ctx.drawImage(p.avatar, -lato / 2, -lato / 2, lato, lato);
  ctx.restore();
  if (p.totem) {
    const w = d * 0.36;
    const h = (w * p.totem.height) / p.totem.width;
    ctx.save();
    ctx.translate(cx + d * 0.38, cy - d * 0.34);
    ctx.rotate((gradiTotem * Math.PI) / 180);
    ombra(ctx, 0.6);
    ctx.drawImage(p.totem, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

// "questa cosa invece sono io" scritto a mano, con una freccia curva verso il personaggio.
// (x, y) = centro della scritta; (px, py) = punto del personaggio da indicare
function notaIo(ctx: CanvasRenderingContext2D, p: Pezzi, x: number, y: number, px: number, py: number, colore: string, gradi: number) {
  ctx.save();
  ctx.fillStyle = colore;
  ctx.strokeStyle = colore;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 36px ${p.fontTitoli}`;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((gradi * Math.PI) / 180);
  ctx.fillText("questa cosa", 0, -22);
  ctx.fillText("invece sono io", 0, 22);
  ctx.restore();
  // freccia: dal fianco della scritta al bordo del personaggio, con una curva morbida (come fatta a mano)
  const verso = Math.sign(px - x) || 1;
  const sx = x + verso * 145;
  const sy = y + 6;
  const ex = px;
  const ey = py;
  const lunga = Math.hypot(ex - sx, ey - sy) || 1;
  // punto di controllo: a metà strada, spostato di lato (la curva "pancia" verso l'alto)
  const mx = (sx + ex) / 2 + ((ey - sy) / lunga) * 45 * verso;
  const my = (sy + ey) / 2 - Math.abs((ex - sx) / lunga) * 45;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(mx, my, ex, ey);
  ctx.stroke();
  // punta: segue la direzione della curva all'arrivo
  const ang = Math.atan2(ey - my, ex - mx);
  ctx.beginPath();
  ctx.moveTo(ex + Math.cos(ang + 2.55) * 24, ey + Math.sin(ang + 2.55) * 24);
  ctx.lineTo(ex, ey);
  ctx.lineTo(ex + Math.cos(ang - 2.55) * 24, ey + Math.sin(ang - 2.55) * 24);
  ctx.stroke();
  ctx.restore();
}

function adattaTesto(ctx: CanvasRenderingContext2D, testo: string, font: string, massimo: number, larghezza: number) {
  let s = massimo;
  ctx.font = font.replace("{s}", String(s));
  while (s > 20 && ctx.measureText(testo).width > larghezza) {
    s -= 2;
    ctx.font = font.replace("{s}", String(s));
  }
  return s;
}

// Il titolo, tutto centrato. Gerarchia: gruppo piccolo → "Questa è la mia bacheca" grande → "del secretfanta"
// (colore d'accento) → totem piccolo. Restituisce dove finisce.
function titolo(ctx: CanvasRenderingContext2D, p: Pezzi, testo: string, accento: string) {
  const x = LARGHEZZA / 2;
  const larghezza = LARGHEZZA - 180;
  let y = 128;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = testo;
  ctx.globalAlpha = 0.75;
  adattaTesto(ctx, p.gruppo, `600 {s}px ${p.fontTesto}`, 34, larghezza);
  ctx.fillText(p.gruppo, x, y);
  ctx.globalAlpha = 1;
  const s1 = adattaTesto(ctx, "Questa è la mia bacheca", `700 {s}px ${p.fontTitoli}`, 84, larghezza);
  y += s1 * 1.2;
  ctx.fillText("Questa è la mia bacheca", x, y);
  // "del" nel colore del testo, solo "secretfanta" nel colore d'accento (staccato dallo sfondo)
  const s2 = adattaTesto(ctx, "del secretfanta", `700 {s}px ${p.fontTitoli}`, 64, larghezza);
  y += s2 * 1.1;
  const wDel = ctx.measureText("del ").width;
  const wTutto = ctx.measureText("del secretfanta").width;
  ctx.textAlign = "left";
  ctx.fillText("del ", x - wTutto / 2, y);
  ctx.fillStyle = accento;
  ctx.fillText("secretfanta", x - wTutto / 2 + wDel, y);
  ctx.textAlign = "center";
  if (p.nomeTotem) {
    ctx.fillStyle = testo;
    ctx.globalAlpha = 0.85;
    adattaTesto(ctx, `${p.nome} · ${p.nomeTotem}`, `600 {s}px ${p.fontTesto}`, 32, larghezza);
    y += 52;
    ctx.fillText(`${p.nome} · ${p.nomeTotem}`, x, y);
  }
  ctx.restore();
  return y + 44;
}

// La toppa col sito, in fondo al centro: pillola cucita di un colore staccato dallo sfondo
const ALTEZZA_TOPPA = 116;
function toppaSito(ctx: CanvasRenderingContext2D, p: Pezzi, colore: string) {
  const testo = piuLeggibile(colore, [CREMA, INCHIOSTRO]);
  const riga1 = "ricamata su";
  ctx.save();
  ctx.font = `700 40px ${p.fontTitoli}`;
  const w = Math.max(ctx.measureText(SITO).width, 300) + 96;
  const h = ALTEZZA_TOPPA;
  const x = (LARGHEZZA - w) / 2;
  const y = ALTEZZA - 70 - h;
  ombra(ctx, 0.5);
  ctx.fillStyle = colore;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.setLineDash([12, 9]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = testo;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.roundRect(x + 9, y + 9, w - 18, h - 18, h / 2 - 9);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = testo;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 26px ${p.fontTesto}`;
  ctx.fillText(riga1, LARGHEZZA / 2, y + 38);
  ctx.font = `700 40px ${p.fontTitoli}`;
  ctx.fillText(SITO, LARGHEZZA / 2, y + 76);
  ctx.restore();
}

const SOTTO = ALTEZZA - 70 - ALTEZZA_TOPPA - 40; // sopra la toppa del sito

export function componi(canvas: HTMLCanvasElement, p: Pezzi, scelte: Scelte, conPersonaggio: boolean, seme: number) {
  canvas.width = LARGHEZZA;
  canvas.height = ALTEZZA;
  const ctx = canvas.getContext("2d")!;
  const r = casuale(seme * 7919 + 13);
  const tra = (a: number, b: number) => a + r() * (b - a);
  fondo(ctx, scelte.sfondo, scelte.neve, r);
  const testo = piuLeggibile(scelte.sfondo, [CREMA, INCHIOSTRO]);
  // colore d'accento ("del secretfanta" e la nota): il più leggibile tra quelli vivaci, mai uguale allo sfondo
  const accento = piuLeggibile(scelte.sfondo, [SENAPE, COLORI.rosa, COLORI.ghiaccio, COLORI.vermiglio, COLORI.abete, COLORI.notte].filter((c) => c !== scelte.sfondo));
  const inizio = titolo(ctx, p, testo, accento);
  toppaSito(ctx, p, scelte.toppaSito);

  if (!conPersonaggio) {
    // solo la bacheca: più grande possibile, centrata nello spazio libero, appena storta
    const w = Math.min(LARGHEZZA - 2 * (BORDO + 80), ((SOTTO - inizio - 2 * BORDO) * 3) / 4);
    telaIncorniciata(ctx, p, LARGHEZZA / 2, (inizio + SOTTO) / 2, w, tra(-2, 2));
    return;
  }

  // con te: tela dalla parte opposta, personaggio sull'angolo un po' fuori dalla tela, nota accanto
  const sinistra = scelte.angolo.endsWith("sinistra");
  const alto = scelte.angolo.startsWith("alto");
  const segno = sinistra ? -1 : 1; // da che parte sta il personaggio
  const d = tra(410, 460);
  const w = tra(580, 610);
  const h = (w * 4) / 3;
  const sporge = d * 0.62;
  const altezzaGruppo = h + 2 * BORDO + sporge;
  const y0 = inizio + Math.max(0, (SOTTO - inizio - altezzaGruppo) / 2);
  const telaCx = LARGHEZZA / 2 - segno * tra(80, 110);
  const telaCy = (alto ? y0 + sporge : y0) + BORDO + h / 2;
  telaIncorniciata(ctx, p, telaCx, telaCy, w, tra(1.5, 3.5) * -segno * (alto ? 1 : -1));
  const cx = LARGHEZZA / 2 + segno * (LARGHEZZA / 2 - d / 2 - tra(30, 60));
  const cy = alto ? telaCy - h / 2 - BORDO - sporge + d / 2 : telaCy + h / 2 + BORDO + sporge - d / 2;
  personaggio(ctx, p, cx, cy, d, tra(-6, 6), tra(4, 14));
  // la nota sta nello spazio libero accanto al personaggio, dalla parte della tela (sopra o sotto la tela)
  const zonaY = alto ? (cy - d / 2 + telaCy - h / 2 - BORDO) / 2 : (cy + d / 2 + telaCy + h / 2 + BORDO) / 2;
  // scritta lontana dal personaggio (la freccia deve avere spazio), punta sul bordo della toppa verso il centro
  const nx = LARGHEZZA / 2 - segno * 210;
  notaIo(ctx, p, nx, zonaY, cx - segno * (d / 2 + 16), cy + (alto ? -1 : 1) * d * 0.08, accento, tra(-5, 5));
}
