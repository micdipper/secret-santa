"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Tasto, TitoloRiquadro } from "@/components/ui";
import type { Hud } from "@/lib/giochi/base";
import { testoPunti, type InfoGioco } from "@/lib/giochi/elenco";
import { avviaMotore, type Controllo } from "@/lib/giochi/motore";
import { musicaBassa, suoni } from "@/lib/suoni";

// Quello che il server (o la sala prove) risponde a fine partita
export type Esito = {
  punteggio: number;
  record: boolean;
  posizione: number | null;
  rimasti: number | null; // null = tentativi illimitati (sala prove)
  valida: boolean;
};

/*
  Una partita a tutto schermo: 3-2-1, gioco, pausa ("Tocca per continuare"),
  fine con punteggio grande, record, posizione e "Riprova".
  Il punteggio lo manda chi la apre (onFine): pagina vera → finish_game_run, sala prove → niente.
*/
export function Partita({
  info,
  seme,
  onFine,
  onRiprova,
  onChiudi,
}: {
  info: InfoGioco;
  seme: number;
  onFine: (punteggio: number, stats: Record<string, number> | null) => Promise<Esito>;
  onRiprova: () => void;
  onChiudi: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const motore = useRef<Controllo | null>(null);
  const punti = useRef<HTMLSpanElement>(null);
  const tempo = useRef<HTMLSpanElement>(null);
  const vite = useRef<HTMLSpanElement>(null);
  const extra = useRef<HTMLSpanElement>(null);
  const riduci = useReducedMotion() ?? false;
  const [fase, setFase] = useState<"conto" | "gioco" | "pausa" | "invio" | "fine" | "errore">("conto");
  const [conto, setConto] = useState(3);
  const [esito, setEsito] = useState<Esito | null>(null);
  const [puntiFinali, setPuntiFinali] = useState(0);
  const finale = useRef<{ punteggio: number; stats: Record<string, number> | null } | null>(null);
  const onFineRef = useRef(onFine);
  useEffect(() => {
    onFineRef.current = onFine;
  });

  async function invia() {
    if (!finale.current) return;
    setFase("invio");
    try {
      const e = await onFineRef.current(finale.current.punteggio, finale.current.stats);
      setEsito(e);
      setFase("fine");
      if (e.record && e.punteggio > 0) suoni.record();
      else suoni.fineGioco();
    } catch {
      setFase("errore");
    }
  }

  // motore + niente scorrimento della pagina sotto
  useEffect(() => {
    const html = document.documentElement;
    const prima = html.style.overflow;
    html.style.overflow = "hidden";
    musicaBassa(true);
    motore.current = avviaMotore(canvas.current!, info.gioco, seme, {
      riduci,
      onHud: (h: Hud) => {
        const [grande, piccolo] = testoPunti(info.n, h.punteggio);
        if (punti.current) punti.current.textContent = piccolo ? `${grande} · ${piccolo}` : grande;
        // (il display dell'etichetta di stoffa vince su "empty:hidden": la nascondo a mano quando è vuota)
        const scrivi = (el: HTMLSpanElement | null, testo: string) => {
          if (!el) return;
          el.textContent = testo;
          el.style.display = testo ? "" : "none";
        };
        scrivi(tempo.current, h.tempo !== undefined ? `${Math.ceil(h.tempo)} s` : "");
        scrivi(vite.current, h.vite !== undefined ? "♥".repeat(Math.max(0, h.vite)) + "♡".repeat(Math.max(0, (h.viteMax ?? h.vite) - h.vite)) : "");
        scrivi(extra.current, h.molt && h.molt > 1 ? `×${h.molt}` : (h.etichetta ?? ""));
      },
      onPausa: () => setFase("pausa"),
      onFine: (punteggio, stats) => {
        finale.current = { punteggio, stats };
        setPuntiFinali(punteggio);
        setTimeout(invia, 700); // un attimo per vedere l'ultimo colpo
      },
    });
    return () => {
      motore.current?.ferma();
      html.style.overflow = prima;
      musicaBassa(false);
    };
    // la partita si crea una volta sola (per riprovare se ne monta una nuova)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3-2-1, via!
  useEffect(() => {
    if (fase !== "conto") return;
    if (conto === 0) {
      suoni.via();
      motore.current?.via();
      const t = setTimeout(() => setFase("gioco"), 450);
      return () => clearTimeout(t);
    }
    suoni.conto();
    const t = setTimeout(() => setConto((c) => c - 1), 750);
    return () => clearTimeout(t);
  }, [fase, conto]);

  const rimasti = esito?.rimasti;
  const puoRiprovare = rimasti === null || (rimasti ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[55] bg-abete-scuro" style={{ touchAction: "none" }}>
      <div
        className="relative mx-auto h-full w-full max-w-md overflow-hidden select-none [-webkit-touch-callout:none]"
        style={{ background: "radial-gradient(120% 70% at 50% 0%, #355a3c 0%, #284530 55%, #1e3826 100%)" }}
      >
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" style={{ touchAction: "none" }} />

        {/* in alto a sinistra: punti e tempo (a destra c'è il tasto dell'audio) */}
        <div className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+24px)] left-5 flex items-center gap-2">
          <span className="etichetta-stoffa bg-feltro font-titolo text-xl text-abete">
            <span ref={punti}>0</span>
          </span>
          <span ref={tempo} className="etichetta-stoffa bg-vermiglio text-crema tabular-nums" style={{ display: "none" }} />
          <span ref={vite} className="etichetta-stoffa bg-feltro tracking-wider text-vermiglio" style={{ display: "none" }} />
          <span ref={extra} className="etichetta-stoffa bg-senape font-titolo text-inchiostro" style={{ display: "none" }} />
        </div>

        <AnimatePresence>
          {fase === "conto" && (
            <motion.div
              key={conto}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { scale: { type: "spring", stiffness: 380, damping: 18 }, opacity: { duration: 0.12 } } }}
              // in uscita niente molla: la trasparenza "rimbalzava" e il numero vecchio ricompariva sotto il nuovo
              exit={{ scale: 1.3, opacity: 0, transition: { duration: 0.14, ease: "easeOut" } }}
            >
              {/* sulla neve (sfondo chiaro) il conto è vermiglio, sul verde è crema */}
              <span className={`font-titolo text-[120px] leading-none ${info.sfondoChiaro ? "text-vermiglio drop-shadow-[0_5px_0_rgba(30,56,38,.35)]" : "text-crema drop-shadow-[0_6px_0_rgba(0,0,0,.25)]"}`}>{conto === 0 ? "Via!" : conto}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {fase === "pausa" && (
          <button
            type="button"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-abete-scuro/80 text-center"
            data-suono="tasto"
            onClick={() => {
              setFase("gioco");
              motore.current?.riprendi();
            }}
          >
            <span className="font-titolo text-[32px] leading-none">In pausa</span>
            <span className="text-crema/80">Tocca per continuare</span>
          </button>
        )}

        <AnimatePresence>
          {(fase === "invio" || fase === "fine" || fase === "errore") && (
            <motion.div className="absolute inset-0 flex items-center justify-center bg-abete-scuro/75 px-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.div className="feltro w-full p-6 text-center" initial={{ y: 40, scale: 0.9 }} animate={{ y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}>
                <div className="relative">
                  <TitoloRiquadro>Fine!</TitoloRiquadro>
                  <p className="mt-2 font-titolo text-[72px] leading-none text-vermiglio tabular-nums">{testoPunti(info.n, esito?.punteggio ?? puntiFinali)[0]}</p>
                  {testoPunti(info.n, esito?.punteggio ?? puntiFinali)[1] && <p className="mt-1 font-titolo text-2xl text-abete">{testoPunti(info.n, esito?.punteggio ?? puntiFinali)[1]}</p>}
                  {fase === "invio" && <p className="mt-3 text-inchiostro/70">Salvo il punteggio…</p>}
                  {fase === "errore" && (
                    <>
                      <p className="mt-3 text-vermiglio-scuro">Non riesco a salvare il punteggio: controlla la connessione.</p>
                      <Tasto className="mt-5" onClick={invia}>
                        Riprova a salvare
                      </Tasto>
                    </>
                  )}
                  {fase === "fine" && esito && (
                    <>
                      {!esito.valida ? (
                        <p className="mt-3 text-vermiglio-scuro">Partita non valida: vale 0 punti.</p>
                      ) : (
                        <div className="mt-3 flex flex-col items-center gap-2">
                          {esito.record && esito.punteggio > 0 && (
                            <motion.span className="etichetta-stoffa bg-senape font-titolo text-lg text-inchiostro" initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: -3 }} transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.2 }}>
                              Nuovo record!
                            </motion.span>
                          )}
                          {esito.posizione !== null && esito.punteggio > 0 && <p className="text-inchiostro/80">{esito.posizione === 1 ? "Sei primo in classifica!" : `Sei ${esito.posizione}° in classifica`}</p>}
                        </div>
                      )}
                      {puoRiprovare && (
                        <Tasto className="mt-5" onClick={onRiprova}>
                          {rimasti === null ? "Riprova" : `Riprova (${rimasti} ${rimasti === 1 ? "rimasto" : "rimasti"})`}
                        </Tasto>
                      )}
                      <Tasto tipo={puoRiprovare ? "secondario" : "primario"} className="mt-3" onClick={onChiudi}>
                        Torna alla classifica
                      </Tasto>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
