// GIOCO PROVVISORIO "Stelline" (blocco 2): serve solo a provare motore, partita e classifica.
// Verrà sostituito dai 5 giochi veri (blocchi 3-5). Sta dentro i limiti del server di tutti e 5.
import { casuale, curve, type Evento, type Gioco, type Mondo } from "./base.ts";

// ----- costanti (taratura) -----
const DURATA = 20; // secondi
const RAGGIO = 30; // px
const MARGINE_TOCCO = 12; // px in più intorno alla stella
const VITA_INIZIO = 1.4; // quanto resta una stella (s)…
const VITA_FINE = 0.8; // …alla fine della partita
const OGNI_INIZIO = 0.7; // ogni quanto ne nasce una (s)…
const OGNI_FINE = 0.42; // …alla fine (mai sotto 0.4: max 50 stelle = 500 punti)
const PUNTI = 10;

type Stella = { x: number; y: number; nata: number; vita: number; viva: boolean };
export type StatoStelline = {
  caso: () => number;
  t: number;
  prossima: number;
  stelle: Stella[];
  punti: number;
  prese: number;
  perse: number;
  tocchi: number;
  combo: number;
  fine: boolean;
  eventi: Evento[];
};

function nasce(s: StatoStelline, m: Mondo) {
  const k = s.t / DURATA;
  const x = RAGGIO + 16 + s.caso() * Math.max(1, m.w - 2 * (RAGGIO + 16));
  const y = m.sopra + RAGGIO + s.caso() * Math.max(1, m.h - m.sopra - m.sotto - 2 * RAGGIO);
  const libera = s.stelle.find((x) => !x.viva);
  const nuova = { x, y, nata: s.t, vita: VITA_INIZIO + (VITA_FINE - VITA_INIZIO) * k, viva: true };
  if (libera) Object.assign(libera, nuova);
  else s.stelle.push(nuova);
  s.prossima = s.t + OGNI_INIZIO + (OGNI_FINE - OGNI_INIZIO) * k;
}

export const stelline: Gioco<StatoStelline> = {
  crea(seme) {
    return { caso: casuale(seme), t: 0, prossima: 0.3, stelle: [], punti: 0, prese: 0, perse: 0, tocchi: 0, combo: 0, fine: false, eventi: [] };
  },

  aggiorna(s, dt, tocchi, m) {
    if (s.fine) return;
    s.t += dt;
    if (s.t >= s.prossima && s.t < DURATA - 0.5) nasce(s, m);

    for (const tc of tocchi) {
      if (tc.tipo !== "giu") continue;
      s.tocchi++;
      // la stella più vicina al dito, se è abbastanza vicina
      let presa: Stella | null = null;
      let meglio = (RAGGIO + MARGINE_TOCCO) ** 2;
      for (const st of s.stelle) {
        if (!st.viva) continue;
        const d = (st.x - tc.x) ** 2 + (st.y - tc.y) ** 2;
        if (d <= meglio) {
          meglio = d;
          presa = st;
        }
      }
      if (presa) {
        presa.viva = false;
        s.prese++;
        s.combo++;
        s.punti += PUNTI;
        s.eventi.push({ tipo: "presa", x: presa.x, y: presa.y, testo: `+${PUNTI}`, livello: s.combo });
      } else {
        s.combo = 0;
        s.eventi.push({ tipo: "vuoto", x: tc.x, y: tc.y });
      }
    }

    for (const st of s.stelle) {
      if (st.viva && s.t - st.nata > st.vita) {
        st.viva = false;
        s.perse++;
        s.combo = 0;
        s.eventi.push({ tipo: "persa", x: st.x, y: st.y });
      }
    }
    if (s.t >= DURATA) s.fine = true;
  },

  finito: (s) => s.fine,
  hud: (s) => ({ punteggio: s.punti, tempo: Math.max(0, DURATA - s.t) }),
  eventi: (s) => s.eventi,
  stats: (s) => ({ prese: s.prese, perse: s.perse, tocchi: s.tocchi }),

  disegna(ctx, s, m) {
    ctx.clearRect(-20, -20, m.w + 40, m.h + 40);
    for (const st of s.stelle) {
      if (!st.viva) continue;
      const eta = s.t - st.nata;
      const entra = curve.rimbalzo(Math.min(1, eta / 0.25));
      const resta = 1 - eta / st.vita;
      // cucitura tratteggiata che si accorcia: quanto tempo resta
      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.strokeStyle = "rgba(243,232,207,.7)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, RAGGIO + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * resta);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.scale(entra, entra);
      ctx.rotate(eta * 0.8);
      ctx.fillStyle = "#e9a81c";
      ctx.strokeStyle = "#fbf6ea";
      ctx.lineWidth = 2.5;
      ctx.fill(STELLA!);
      ctx.stroke(STELLA!);
      ctx.restore();
    }
  },

  effetto(e, fx) {
    if (e.tipo === "presa") {
      fx.scoppio(e.x!, e.y!, ["#e9a81c", "#fbf6ea", "#f3e8cf"], 16);
      fx.testo(e.x!, e.y! - 34, e.testo!);
      fx.suono("colpo", e.livello ?? 0);
    } else if (e.tipo === "vuoto") {
      fx.scoppio(e.x!, e.y!, ["rgba(243,232,207,.6)"], 5, { velocita: 80, gravita: 0, dimensione: 2.5, durata: 0.35 });
    } else if (e.tipo === "persa") {
      fx.scoppio(e.x!, e.y!, ["#cdb48a"], 6, { velocita: 60, gravita: 200, dimensione: 3 });
      fx.suono("puff");
    }
  },
};

// stella a 4 punte (come le stelline del sito)
const STELLA: Path2D | null =
  typeof Path2D === "undefined"
    ? null
    : new Path2D(`M0 ${-RAGGIO} C${RAGGIO * 0.12} ${-RAGGIO * 0.12} ${RAGGIO * 0.12} ${-RAGGIO * 0.12} ${RAGGIO} 0 C${RAGGIO * 0.12} ${RAGGIO * 0.12} ${RAGGIO * 0.12} ${RAGGIO * 0.12} 0 ${RAGGIO} C${-RAGGIO * 0.12} ${RAGGIO * 0.12} ${-RAGGIO * 0.12} ${RAGGIO * 0.12} ${-RAGGIO} 0 C${-RAGGIO * 0.12} ${-RAGGIO * 0.12} ${-RAGGIO * 0.12} ${-RAGGIO * 0.12} 0 ${-RAGGIO} Z`);
