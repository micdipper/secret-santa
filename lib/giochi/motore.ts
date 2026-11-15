// Motore comune dei giochi (solo nel browser): canvas a tutto schermo, passo fisso a 60 Hz,
// tocchi, pausa quando si esce dall'app, particelle, testi che volano e tremolio.
import { suoni } from "@/lib/suoni";
import { PASSO, stile, type Gioco, type Hud, type Mondo, type Tocco } from "./base.ts";

const MAX_PASSI = 5; // al massimo 5 passi di logica per fotogramma (telefono lento = gioco più lento, non a scatti)

// ---------------- effetti (particelle, testi, tremolio) ----------------
type Particella = { x: number; y: number; vx: number; vy: number; vita: number; durata: number; r: number; colore: string; g: number; viva: boolean };
type TestoVolante = { x: number; y: number; testo: string; colore: string; vita: number; durata: number; dimensione: number; vivo: boolean };

export class Effetti {
  private particelle: Particella[] = Array.from({ length: 320 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, vita: 0, durata: 1, r: 2, colore: "#fff", g: 0, viva: false }));
  private testi: TestoVolante[] = Array.from({ length: 24 }, () => ({ x: 0, y: 0, testo: "", colore: "#fff", vita: 0, durata: 1, dimensione: 20, vivo: false }));
  private tremore = 0;
  private prossima = 0;
  constructor(private riduci: boolean) {}

  // brillantini che schizzano fuori da un punto
  scoppio(x: number, y: number, colori: string[], n = 14, { velocita = 220, gravita = 520, dimensione = 3.5, durata = 0.7 } = {}) {
    const quante = this.riduci ? Math.ceil(n / 3) : n;
    for (let k = 0; k < quante; k++) {
      const p = this.particelle[this.prossima];
      this.prossima = (this.prossima + 1) % this.particelle.length;
      const angolo = Math.random() * Math.PI * 2;
      const v = velocita * (0.35 + Math.random() * 0.65);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angolo) * v;
      p.vy = Math.sin(angolo) * v - velocita * 0.3;
      p.vita = 0;
      p.durata = durata * (0.6 + Math.random() * 0.4);
      p.r = dimensione * (0.6 + Math.random() * 0.6);
      p.colore = colori[k % colori.length];
      p.g = gravita;
      p.viva = true;
    }
  }

  // "+10" che sale e sfuma
  testo(x: number, y: number, testo: string, colore = "#f3e8cf", dimensione = 22) {
    const t = this.testi.find((x) => !x.vivo) ?? this.testi[0];
    Object.assign(t, { x, y, testo, colore, dimensione, vita: 0, durata: 0.9, vivo: true });
  }

  trema(forza: number) {
    this.tremore = Math.max(this.tremore, this.riduci ? forza * 0.2 : forza);
  }

  suono(nome: keyof typeof suoni, ...arg: number[]) {
    (suoni[nome] as (...a: number[]) => void)(...arg);
  }

  aggiorna(dt: number) {
    for (const p of this.particelle) {
      if (!p.viva) continue;
      p.vita += dt;
      if (p.vita >= p.durata) {
        p.viva = false;
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (const t of this.testi) {
      if (!t.vivo) continue;
      t.vita += dt;
      t.y -= 60 * dt;
      if (t.vita >= t.durata) t.vivo = false;
    }
    this.tremore = Math.max(0, this.tremore - dt * 40);
  }

  spostamento() {
    if (this.tremore <= 0) return [0, 0];
    return [(Math.random() * 2 - 1) * this.tremore, (Math.random() * 2 - 1) * this.tremore];
  }

  disegna(ctx: CanvasRenderingContext2D) {
    for (const p of this.particelle) {
      if (!p.viva) continue;
      ctx.globalAlpha = 1 - p.vita / p.durata;
      ctx.fillStyle = p.colore;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of this.testi) {
      if (!t.vivo) continue;
      const k = t.vita / t.durata;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const scala = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, (k - 0.15) * 0.3);
      ctx.font = `700 ${Math.round(t.dimensione * scala)}px ${stile.fontTitoli}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(30,56,38,.85)";
      ctx.strokeText(t.testo, t.x, t.y);
      ctx.fillStyle = t.colore;
      ctx.fillText(t.testo, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------- motore ----------------
export type Controllo = {
  via(): void; // dopo il 3-2-1
  riprendi(): void;
  ferma(): void;
};

export function avviaMotore<S>(
  canvas: HTMLCanvasElement,
  gioco: Gioco<S>,
  seme: number,
  op: {
    riduci: boolean;
    onHud: (h: Hud) => void;
    onPausa: () => void;
    onFine: (punteggio: number, stats: Record<string, number> | null) => void;
  },
): Controllo {
  const ctx = canvas.getContext("2d")!;
  const fx = new Effetti(op.riduci);
  const famiglia = getComputedStyle(document.body).getPropertyValue("--font-basteleur").trim();
  if (famiglia) stile.fontTitoli = `${famiglia}, Georgia, serif`; // il font dei titoli caricato da Next

  // margini sicuri (notch, barra home) letti dal CSS
  const sonda = document.createElement("div");
  sonda.style.cssText = "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
  document.body.appendChild(sonda);
  const cs = getComputedStyle(sonda);
  const mondo: Mondo = { w: 1, h: 1, sopra: parseFloat(cs.paddingTop) || 0, sotto: parseFloat(cs.paddingBottom) || 0 };
  sonda.remove();
  // spazio per i numeri in alto e per il tasto audio
  mondo.sopra += 88;
  mondo.sotto += 16;

  let dpr = 1;
  const misura = () => {
    const r = canvas.getBoundingClientRect();
    // risoluzione vera del telefono (gli iPhone sono 3x: a 2x il disegno veniva ingrandito e sembrava sfocato)
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    mondo.w = Math.max(1, r.width);
    mondo.h = Math.max(1, r.height);
    canvas.width = Math.round(mondo.w * dpr);
    canvas.height = Math.round(mondo.h * dpr);
  };
  misura();
  const ro = new ResizeObserver(misura); // la barra di Safari cambia l'altezza
  ro.observe(canvas);

  const s = gioco.crea(seme, { ...mondo });
  let stato: "attesa" | "gioco" | "pausa" | "fine" = "attesa";
  let tocchi: Tocco[] = [];
  let accumulo = 0;
  let ultimo = performance.now();
  let raf = 0;

  // tocchi: Pointer Events con cattura (il dito resta "nostro" anche se esce dal canvas)
  const punto = (e: PointerEvent, tipo: Tocco["tipo"]) => {
    if (stato !== "gioco") return;
    const r = canvas.getBoundingClientRect();
    tocchi.push({ tipo, id: e.pointerId, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const giu = (e: PointerEvent) => {
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    punto(e, "giu");
  };
  const muovi = (e: PointerEvent) => punto(e, "muovi");
  const su = (e: PointerEvent) => punto(e, "su");
  const niente = (e: Event) => e.preventDefault();
  canvas.addEventListener("pointerdown", giu);
  canvas.addEventListener("pointermove", muovi);
  canvas.addEventListener("pointerup", su);
  canvas.addEventListener("pointercancel", su);
  canvas.addEventListener("contextmenu", niente);

  const pausa = () => {
    if (stato !== "gioco") return;
    stato = "pausa";
    tocchi = [];
    op.onPausa();
  };
  const visibilita = () => document.visibilityState === "hidden" && pausa();
  document.addEventListener("visibilitychange", visibilita);
  window.addEventListener("pagehide", pausa);

  let hudPrima = "";
  const fotogramma = (ora: number) => {
    raf = requestAnimationFrame(fotogramma);
    const dt = Math.min(0.1, (ora - ultimo) / 1000);
    ultimo = ora;

    if (stato === "gioco") {
      accumulo += dt;
      let passi = 0;
      while (accumulo >= PASSO && passi < MAX_PASSI) {
        gioco.aggiorna(s, PASSO, passi === 0 ? tocchi : [], mondo);
        if (passi === 0) tocchi = [];
        const ev = gioco.eventi(s);
        for (const e of ev) gioco.effetto?.(e, fx);
        ev.length = 0;
        accumulo -= PASSO;
        passi++;
        if (gioco.finito(s)) {
          stato = "fine";
          op.onFine(Math.max(0, Math.round(gioco.hud(s).punteggio)), gioco.stats?.(s) ?? null);
          break;
        }
      }
      if (passi === MAX_PASSI) accumulo = 0;
    }
    fx.aggiorna(dt);

    const h = gioco.hud(s);
    const chiave = `${h.punteggio}|${h.tempo === undefined ? "" : Math.ceil(h.tempo)}|${h.vite}|${h.molt}|${h.etichetta}|${h.etichetta2}`;
    if (chiave !== hudPrima) {
      hudPrima = chiave;
      op.onHud(h);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [dx, dy] = fx.spostamento();
    ctx.translate(dx, dy);
    gioco.disegna(ctx, s, mondo, op.riduci, stato === "gioco" ? Math.min(1, accumulo / PASSO) : 0);
    fx.disegna(ctx);
  };
  raf = requestAnimationFrame(fotogramma);

  return {
    via() {
      if (stato !== "attesa") return;
      stato = "gioco";
      ultimo = performance.now();
      accumulo = 0;
    },
    riprendi() {
      if (stato !== "pausa") return;
      stato = "gioco";
      ultimo = performance.now(); // il tempo passato fuori dall'app non conta
      accumulo = 0;
    },
    ferma() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", giu);
      canvas.removeEventListener("pointermove", muovi);
      canvas.removeEventListener("pointerup", su);
      canvas.removeEventListener("pointercancel", su);
      canvas.removeEventListener("contextmenu", niente);
      document.removeEventListener("visibilitychange", visibilita);
      window.removeEventListener("pagehide", pausa);
    },
  };
}

