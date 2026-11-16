"use client";
// Easter egg "Secret secret Santa" (7 tocchi sulla pallina): minigioco "Prendi il cappello".
// Il cappello di Natale vola via col vento e rimbalza sui bordi, ogni tanto si ferma a riprendere fiato:
// va toccato 5 volte in 20 secondi. Si riprova quante volte si vuole; vincendo si sblocca il cappello.
import { useEffect, useRef, useState } from "react";
import { CappelloNatale } from "@/components/avatar";
import { controllaPremi } from "@/components/avviso-premi";
import { Feltro, Tasto, TastoLink, TitoloRiquadro } from "@/components/ui";
import { suoni } from "@/lib/suoni";
import { clientSoloBrowser } from "@/lib/supabase/client";

const PRESE = 5; // tocchi per vincere
const DURATA = 20; // secondi
const LATO = 84; // lato del cappello in px (area toccabile)

type Stato = "pronto" | "gioco" | "perso" | "vinto";

export function SecretSecretSanta({ groupId, prova = false }: { groupId: string; prova?: boolean }) {
  const [stato, setStato] = useState<Stato>("pronto");
  const [prese, setPrese] = useState(0);
  const [resto, setResto] = useState(DURATA);
  const [pos, setPos] = useState({ x: 40, y: 40, r: 0 });
  const [errore, setErrore] = useState("");
  const campo = useRef<HTMLDivElement>(null);
  const moto = useRef({ x: 40, y: 40, vx: 160, vy: 120, r: 0, pausa: 0, inizio: 0, prese: 0 });

  useEffect(() => {
    if (stato !== "gioco") return;
    let raf = 0;
    let prima = performance.now();
    const m = moto.current;
    const passo = (ora: number) => {
      const dt = Math.min(0.05, (ora - prima) / 1000);
      prima = ora;
      const box = campo.current?.getBoundingClientRect();
      const w = (box?.width ?? 320) - LATO;
      const h = (box?.height ?? 420) - LATO;
      if (m.pausa > 0) {
        m.pausa -= dt; // si ferma un attimo: il momento buono per prenderlo
      } else {
        const vel = 1 + m.prese * 0.28; // a ogni presa scappa più veloce
        m.x += m.vx * vel * dt;
        m.y += m.vy * vel * dt;
        if (m.x < 0 || m.x > w) { m.vx *= -1; m.x = Math.max(0, Math.min(w, m.x)); }
        if (m.y < 0 || m.y > h) { m.vy *= -1; m.y = Math.max(0, Math.min(h, m.y)); }
        m.r += m.vx * dt * 0.4;
        if (Math.random() < dt * 0.5) m.pausa = 0.35 + Math.random() * 0.35;
      }
      setPos({ x: m.x, y: m.y, r: m.r });
      const r = Math.max(0, DURATA - (ora - m.inizio) / 1000);
      setResto(Math.ceil(r));
      if (r <= 0) {
        setStato("perso");
        suoni.fineGioco();
        return;
      }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [stato]);

  function inizia() {
    const m = moto.current;
    Object.assign(m, { x: 40, y: 40, vx: 150 + Math.random() * 40, vy: 110 + Math.random() * 40, r: 0, pausa: 0.6, inizio: performance.now(), prese: 0 });
    setPrese(0);
    setResto(DURATA);
    setErrore("");
    setStato("gioco");
    suoni.via();
  }

  async function preso() {
    if (stato !== "gioco") return;
    const m = moto.current;
    m.prese += 1;
    setPrese(m.prese);
    navigator.vibrate?.(15);
    if (m.prese < PRESE) {
      suoni.colpo(m.prese);
      // scappa in una direzione nuova
      const a = Math.random() * Math.PI * 2;
      const v = Math.hypot(m.vx, m.vy);
      m.vx = Math.cos(a) * v;
      m.vy = Math.sin(a) * v;
      m.pausa = 0;
      return;
    }
    setStato("vinto");
    suoni.fanfara();
    if (prova) return;
    const { error } = await clientSoloBrowser().rpc("vinci_secret_secret_santa", { p_group_id: groupId });
    if (error) return setErrore("Il premio non si è salvato: controlla la connessione e riprova a vincere.");
    controllaPremi();
  }

  if (stato === "vinto") {
    return (
      <Feltro className="mt-6 text-center">
        <svg viewBox="25 4 64 36" className="mx-auto w-40" aria-hidden>
          <CappelloNatale />
        </svg>
        <TitoloRiquadro className="mt-4">Preso!</TitoloRiquadro>
        <p className="mt-2">Il cappello di Natale è tuo. Non dirlo a nessuno: è il segreto del Secret Santa.</p>
        {errore && <p className="mt-3 text-sm text-vermiglio-scuro">{errore}</p>}
        <TastoLink href={prova ? "/prove" : `/gruppo/${groupId}/guardaroba`} className="mt-5">
          Indossalo nel guardaroba
        </TastoLink>
      </Feltro>
    );
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between font-titolo text-lg">
        <span>
          Prese {prese}/{PRESE}
        </span>
        <span aria-live="polite">{stato === "gioco" ? `${resto} s` : `${DURATA} s`}</span>
      </div>
      <div ref={campo} className="feltro relative mt-3 h-[min(60dvh,460px)] touch-none overflow-hidden select-none">
        {stato === "gioco" && (
          <button
            type="button"
            aria-label="Prendi il cappello"
            onPointerDown={preso}
            className="absolute top-0 left-0"
            style={{ width: LATO, height: LATO, transform: `translate(${pos.x}px, ${pos.y}px) rotate(${Math.sin(pos.r / 30) * 18}deg)` }}
          >
            <svg viewBox="25 4 64 36" className="w-full" aria-hidden>
              <CappelloNatale />
            </svg>
          </button>
        )}
        {stato !== "gioco" && (
          <div className="relative flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <TitoloRiquadro>{stato === "perso" ? "Ti è scappato!" : "Il vento si è preso il cappello"}</TitoloRiquadro>
            <p>
              {stato === "perso"
                ? `L'hai preso ${prese} ${prese === 1 ? "volta" : "volte"}. Riprova: ogni tanto si ferma a riprendere fiato.`
                : `Toccalo ${PRESE} volte in ${DURATA} secondi. Ogni volta che lo prendi scappa più veloce.`}
            </p>
            <Tasto onClick={inizia}>{stato === "perso" ? "Riprova" : "Via!"}</Tasto>
          </div>
        )}
      </div>
      <p className="mt-4 text-center text-sm text-crema/70">
        Hai trovato il Secret secret Santa. Acqua in bocca.
      </p>
    </>
  );
}
