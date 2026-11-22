"use client";

// Condividi la tua bacheca (Marzia, 22/11): tasto con l'icona "classica" del condividi del telefono
// (quadrato con la freccia su iPhone, tre pallini su Android). Apre un'anteprima dell'immagine 1080×1920
// (bacheca + personaggio in grande, lib/immagine-bacheca.ts) con "Rimescola" per cambiare composizione.
// - "Condividi" usa il pannello del telefono (Instagram, WhatsApp, Salva immagine…): l'immagine è già pronta
//   prima del tocco, perché Safari e Chrome accettano la condivisione solo SUBITO dopo un tocco.
// - Dove il telefono non sa condividere file (alcuni browser Android, computer) o su Android, dove il pannello
//   spesso non ha "Salva nella galleria", c'è anche "Scarica l'immagine".

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ToppaAvatar, type Look } from "@/components/avatar";
import { FrancobolloTotem } from "@/components/totem";
import { Errore, Icone, Tasto, TastoTondo, TitoloRiquadro } from "@/components/ui";
import { componi, scelta, type Pezzi } from "@/lib/immagine-bacheca";
import type { Profilo } from "@/lib/totem";

export type DatiCondivisione = {
  look: Look | null;
  nome: string;
  gruppo: string;
  totem: { profilo: Profilo; nome: string; immagine?: string | null } | null;
  apri?: boolean; // si apre da sola (arrivando dalla scheda di fine Secret Santa)
};

const DIAMETRO = 520; // il personaggio "fotografato" (px CSS, poi ×2)

const dueFotogrammi = () => new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())));

function famiglia(variabile: string, riserva: string) {
  return getComputedStyle(document.body).getPropertyValue(variabile).trim() || riserva;
}

export function CondividiBacheca({ tela, prima, dati }: { tela: () => HTMLElement | null; prima?: () => void; dati: DatiCondivisione }) {
  const [android, setAndroid] = useState(false);
  const [aperto, setAperto] = useState(false);
  const [seme] = useState(() => Math.floor(Math.random() * 100000)); // ordine delle combinazioni (e posizione della neve)
  const [giro, setGiro] = useState(0); // "Rimescola" = combinazione successiva
  const [conPersonaggio, setConPersonaggio] = useState(true);
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errore, setErrore] = useState("");
  const pezzi = useRef<Pezzi | null>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const totemRef = useRef<HTMLDivElement>(null);
  const puoCondividereFile = useRef(false);
  // tela e prima cambiano a ogni disegno della bacheca: li tengo da parte, così la foto non riparte da capo
  const funzioni = useRef({ tela, prima });
  useEffect(() => {
    funzioni.current = { tela, prima };
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- il telefono si sa solo nel browser
    setAndroid(/android/i.test(navigator.userAgent));
    if (dati.apri) setAperto(true);
  }, [dati.apri]);

  // all'apertura: si "fotografano" tela, personaggio e totem (una volta), poi si compone
  useEffect(() => {
    if (!aperto) return;
    let annullato = false;
    (async () => {
      try {
        setErrore("");
        if (!pezzi.current) {
          funzioni.current.prima?.(); // niente toppa selezionata (col bordo tratteggiato) nella foto
          await dueFotogrammi();
          const el = funzioni.current.tela();
          if (!el || !avatarRef.current) throw new Error("niente tela");
          const fontTitoli = famiglia("--font-basteleur", "serif");
          const fontTesto = famiglia("--font-bricolage", "sans-serif");
          await Promise.all([document.fonts.load(`700 60px ${fontTitoli}`), document.fonts.load(`500 40px ${fontTesto}`)]).catch(() => {});
          const { domToCanvas } = await import("modern-screenshot"); // caricata solo qui
          const [telaC, avatarC, totemC] = await Promise.all([
            domToCanvas(el, { scale: 900 / Math.max(1, el.clientWidth), timeout: 15000 }),
            domToCanvas(avatarRef.current, { scale: 2, timeout: 15000 }),
            totemRef.current ? domToCanvas(totemRef.current, { scale: 2, timeout: 15000 }) : Promise.resolve(null),
          ]);
          const stile = getComputedStyle(el);
          const involucro = avatarRef.current;
          pezzi.current = {
            tela: telaC,
            raggioTela: (parseFloat(stile.borderTopLeftRadius) || 28) / Math.max(1, el.clientWidth),
            coloreTela: stile.backgroundColor,
            avatar: avatarC,
            margineAvatar: (involucro.offsetWidth - DIAMETRO) / 2 / involucro.offsetWidth,
            totem: totemC,
            nome: dati.nome,
            gruppo: dati.gruppo,
            nomeTotem: dati.totem?.nome ?? null,
            sito: window.location.host,
            fontTitoli,
            fontTesto,
          };
        }
        const c = document.createElement("canvas");
        componi(c, pezzi.current, scelta(pezzi.current.coloreTela, seme, giro), conPersonaggio, seme + giro);
        const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.92));
        if (!blob) throw new Error("niente immagine");
        if (annullato) return;
        const f = new File([blob], `bacheca-${dati.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`, { type: "image/jpeg" });
        puoCondividereFile.current = !!navigator.canShare?.({ files: [f] });
        setFile(f);
        setAnteprima((vecchia) => {
          if (vecchia) URL.revokeObjectURL(vecchia);
          return URL.createObjectURL(blob);
        });
      } catch {
        if (!annullato) setErrore("Non riesco a preparare l'immagine. Riprova tra un attimo.");
      }
    })();
    return () => {
      annullato = true;
    };
  }, [aperto, seme, giro, conPersonaggio, dati.nome, dati.gruppo, dati.totem?.nome]);

  function chiudi() {
    setAperto(false);
    pezzi.current = null; // la prossima volta si rifotografa (la bacheca può essere cambiata)
    setFile(null);
    setAnteprima((vecchia) => {
      if (vecchia) URL.revokeObjectURL(vecchia);
      return null;
    });
  }

  async function condividi() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: `La bacheca di ${dati.nome}` });
    } catch (e) {
      if ((e as Error).name !== "AbortError") scarica();
    }
  }

  function scarica() {
    if (!file || !anteprima) return;
    const a = document.createElement("a");
    a.href = anteprima;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const pronta = !!file && !!anteprima;
  const condivisibile = pronta && puoCondividereFile.current;

  return (
    <>
      <TastoTondo etichetta="Condividi la bacheca" icona={android ? Icone.condividiAndroid : Icone.condividiIos} onClick={() => setAperto(true)} />

      <AnimatePresence>
        {aperto && (
          <motion.div
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/65 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="condividi-titolo"
              className="feltro relative flex max-h-full w-full max-w-sm flex-col p-6"
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <TastoTondo etichetta="Chiudi" icona={Icone.chiudi} onClick={chiudi} className="!absolute top-4 left-4 z-10" />
              <div className="relative flex min-h-0 flex-col">
                <TitoloRiquadro className="px-14 text-center text-balance">
                  <span id="condividi-titolo">Condividi la bacheca</span>
                </TitoloRiquadro>

                {/* con il personaggio oppure solo la bacheca (tutta visibile) */}
                <div role="radiogroup" aria-label="Cosa mettere nell'immagine: con il tuo personaggio o solo la bacheca" className="mt-4 grid shrink-0 grid-cols-2 gap-3">
                  {[
                    { si: true, testo: "Con te" },
                    { si: false, testo: "Solo bacheca" },
                  ].map((o) => (
                    <button
                      key={o.testo}
                      type="button"
                      role="radio"
                      aria-checked={conPersonaggio === o.si}
                      onClick={() => setConPersonaggio(o.si)}
                      className={`cliccabile cucitura relative min-h-14 rounded-full px-3 font-titolo text-[13px] leading-tight whitespace-nowrap min-[360px]:text-[15px] ${conPersonaggio === o.si ? "stoffa-vermiglio" : "stoffa-chiara"}`}
                    >
                      {o.testo}
                    </button>
                  ))}
                </div>

                {/* anteprima 9:16 */}
                <div className="relative mx-auto mt-4 aspect-[9/16] min-h-0 w-full max-w-[min(100%,calc((100dvh-420px)*9/16))] shrink overflow-hidden rounded-2xl bg-black/15 shadow-[0_6px_16px_-6px_rgba(0,0,0,.5)]">
                  {anteprima ? (
                    // eslint-disable-next-line @next/next/no-img-element -- immagine appena creata nel telefono
                    <img src={anteprima} alt={`Anteprima: la bacheca di ${dati.nome} col personaggio`} className="block size-full object-cover" />
                  ) : (
                    !errore && <p className="absolute inset-0 grid place-items-center text-sm text-inchiostro/70">Preparo l&apos;immagine…</p>
                  )}
                </div>

                {/* sotto l'anteprima, così non copre niente dell'immagine */}
                <div className="mt-3 flex shrink-0 flex-col items-center gap-1">
                  <TastoTondo
                    etichetta="Rimescola: un'altra composizione"
                    icona={Icone.rimescola}
                    disabled={!pronta}
                    onClick={() => setGiro((g) => g + 1)}
                  />
                  <span aria-hidden className="text-center text-sm text-inchiostro/80">Rimescola</span>
                </div>

                {errore && (
                  <div className="mt-4">
                    <Errore>{errore}</Errore>
                  </div>
                )}

                {condivisibile ? (
                  <>
                    <Tasto className="mt-5 shrink-0" onClick={condividi}>
                      Condividi
                    </Tasto>
                    {android && (
                      <Tasto tipo="secondario" className="mt-3 shrink-0" onClick={scarica}>
                        Salva nel telefono
                      </Tasto>
                    )}
                  </>
                ) : (
                  <Tasto className="mt-5 shrink-0" disabled={!pronta} onClick={scarica}>
                    Salva l&apos;immagine
                  </Tasto>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* il personaggio e il totem da "fotografare", fuori dallo schermo (solo mentre l'anteprima è aperta) */}
      {aperto && (
        <div aria-hidden className="pointer-events-none fixed top-0 left-[-10000px]">
          <div ref={avatarRef} className="inline-block p-4">
            <ToppaAvatar look={dati.look} dimensione={DIAMETRO} nome={dati.nome} />
          </div>
          {dati.totem && (
            <div ref={totemRef} className="w-[200px] p-3">
              <FrancobolloTotem profilo={dati.totem.profilo} immagine={dati.totem.immagine} className="block w-full" titolo={dati.totem.nome} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
