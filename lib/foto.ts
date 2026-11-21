// Compressione delle immagini: TUTTE le immagini salvate dal sito passano da qui e restano sotto MAX_KB.
// Solo JPEG (Safari non sa creare WebP dal canvas). La rotazione delle foto dell'iPhone (EXIF) viene
// rispettata perché la foto si decodifica con <img>, che la applica in tutti i browser recenti.

export const MAX_KB = 50; // limite di ogni immagine salvata (anche nel database: 50 KB ≈ 68.300 caratteri base64)
const QUALITA = [0.7, 0.6, 0.5, 0.4, 0.35]; // si scende a passi
const PASSO_LATO = 0.8; // se non basta, il lato lungo si riduce del 20% e si riprova

// Profili: lato lungo di partenza e lato minimo sotto cui non si scende
export const PROFILO_FEED = { latoMax: 800, latoMin: 480, maxKB: 35 }; // mostrate larghe ~343 punti
export const PROFILO_BACHECA = { latoMax: 640, latoMin: 320, maxKB: MAX_KB }; // in bacheca sono piccole
export const PROFILO_FRANCOBOLLO = { larghezza: 336, altezza: 416, maxKB: MAX_KB }; // foto dei totem

// Errori con un messaggio già pronto da mostrare
export class ErroreFoto extends Error {}
export const FOTO_ILLEGGIBILE = "Non riesco a leggere questa foto. Prova con un'altra.";
export const FOTO_TROPPO_PESANTE = "Questa foto resta troppo pesante anche ridotta: prova con un'altra.";

async function decodifica(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new ErroreFoto(FOTO_ILLEGGIBILE);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const jpeg = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new ErroreFoto(FOTO_ILLEGGIBILE))), "image/jpeg", q));

// Prova le qualità in ordine; restituisce il primo JPEG che sta sotto il limite, oppure null
async function primaSottoLimite(c: HTMLCanvasElement, maxKB: number) {
  for (const q of QUALITA) {
    const b = await jpeg(c, q);
    if (b.size <= maxKB * 1024) return b;
  }
  return null;
}

// Foto intera (bacheca, feed): lato lungo da latoMax in giù fino a latoMin
export async function comprimiFoto(file: Blob, profilo: { latoMax: number; latoMin: number; maxKB: number }) {
  const img = await decodifica(file);
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  const c = document.createElement("canvas");
  const inizio = Math.min(profilo.latoMax, Math.max(w0, h0)); // le foto piccole non si ingrandiscono
  for (let lato = inizio; lato >= Math.min(profilo.latoMin, inizio); lato = Math.floor(lato * PASSO_LATO)) {
    const scala = lato / Math.max(w0, h0);
    c.width = Math.max(1, Math.round(w0 * scala));
    c.height = Math.max(1, Math.round(h0 * scala));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const blob = await primaSottoLimite(c, profilo.maxKB);
    if (blob) return { blob, rapporto: w0 / h0 };
  }
  throw new ErroreFoto(FOTO_TROPPO_PESANTE);
}

// Foto ritagliata a misura fissa (totem): riempie tutto e taglia quello che avanza.
// Restituisce un data URL JPEG (si salva nel database).
export async function comprimiRitaglio(file: Blob, profilo: { larghezza: number; altezza: number; maxKB: number }) {
  const img = await decodifica(file);
  const c = document.createElement("canvas");
  c.width = profilo.larghezza;
  c.height = profilo.altezza;
  const scala = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
  const w = img.naturalWidth * scala;
  const h = img.naturalHeight * scala;
  c.getContext("2d")!.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
  const blob = await primaSottoLimite(c, profilo.maxKB);
  if (!blob) throw new ErroreFoto(FOTO_TROPPO_PESANTE);
  return await new Promise<string>((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as string);
    r.onerror = () => no(new ErroreFoto(FOTO_ILLEGGIBILE));
    r.readAsDataURL(blob);
  });
}

// Messaggio da mostrare per un errore qualsiasi durante la compressione
export const messaggioFoto = (e: unknown) => (e instanceof ErroreFoto ? e.message : FOTO_ILLEGGIBILE);
