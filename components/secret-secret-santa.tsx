"use client";
// Easter egg "Secret secret Santa" (7 tocchi sulla pallina): minigioco "Prendi il cappello".
// Il cappello di Natale vola via col vento, rimbalza sui bordi e gira su se stesso all'impazzata:
// va toccato 10 volte in 5 secondi, è velocissimo, cambia direzione di continuo e non si ferma mai.
// UNA SOLA POSSIBILITÀ: il database segna il tentativo appena parte la partita (inizia_secret_secret_santa),
// quindi ricaricando la pagina o rifacendo cadere la pallina non si rigioca. Solo la sala prove è infinita.
import { useEffect, useRef, useState } from "react";
import { CappelloNatale } from "@/components/avatar";
import { controllaPremi } from "@/components/avviso-premi";
import { Feltro, Tasto, TastoLink, TitoloRiquadro } from "@/components/ui";
import { suoni } from "@/lib/suoni";
import { clientSoloBrowser } from "@/lib/supabase/client";

const PRESE = 10; // tocchi per vincere
const DURATA = 5; // secondi
const LATO = 56; // lato del cappello in px (area toccabile)
const VELOCITA = 650; // px al secondo all'inizio
const ACCELERA = 0.12; // +12% di velocità a ogni presa
const VENTO = 4; // strattoni di vento al secondo (in media)
const GIRA = 900; // gradi al secondo di rotazione

type Stato = "pronto" | "gioco" | "perso" | "vinto" | "bruciato";

export function SecretSecretSanta({
  groupId,
  prova = false,
  giaVinto = false,
  giaTentato = false,
}: {
  groupId: string;
  prova?: boolean;
  giaVinto?: boolean;
  giaTentato?: boolean;
}) {
  const [stato, setStato] = useState<Stato>(giaVinto ? "vinto" : giaTentato ? "bruciato" : "pronto");
  const [prese, setPrese] = useState(0);
  const [resto, setResto] = useState(DURATA);
  const [pos, setPos] = useState({ x: 40, y: 40, r: 0 });
  const [errore, setErrore] = useState("");
  const campo = useRef<HTMLDivElement>(null);
  const moto = useRef({ x: 40, y: 40, vx: VELOCITA, vy: VELOCITA, r: 0, pausa: 0, inizio: 0, prese: 0 });

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
        m.pausa -= dt; // solo all'inizio, per vedere da dove parte
      } else {
        const vel = 1 + m.prese * ACCELERA; // a ogni presa scappa più veloce
        if (Math.random() < dt * VENTO) {
          // strattone di vento: direzione nuova all'improvviso
          const a = Math.random() * Math.PI * 2;
          const v = Math.hypot(m.vx, m.vy);
          m.vx = Math.cos(a) * v;
          m.vy = Math.sin(a) * v;
        }
        m.x += m.vx * vel * dt;
        m.y += m.vy * vel * dt;
        if (m.x < 0 || m.x > w) { m.vx *= -1; m.x = Math.max(0, Math.min(w, m.x)); }
        if (m.y < 0 || m.y > h) { m.vy *= -1; m.y = Math.max(0, Math.min(h, m.y)); }
        m.r += Math.sign(m.vx) * GIRA * vel * dt;
      }
      setPos({ x: m.x, y: m.y, r: m.r });
      const r = Math.min(DURATA, Math.max(0, DURATA - (ora - m.inizio) / 1000)); // il tempo parte dopo la pausa iniziale
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

  async function inizia() {
    if (!prova) {
      // si segna il tentativo PRIMA di giocare: da qui in poi non si torna indietro
      const { error } = await clientSoloBrowser().rpc("inizia_secret_secret_santa", { p_group_id: groupId });
      if (error) {
        if (error.message.includes("GIA_TENTATO")) return setStato("bruciato");
        return setErrore("Non riesco a partire: controlla la connessione e riprova.");
      }
    }
    const m = moto.current;
    const a = Math.random() * Math.PI * 2;
    Object.assign(m, { x: 40, y: 40, vx: Math.cos(a) * VELOCITA, vy: Math.sin(a) * VELOCITA, r: 0, pausa: 0.3, inizio: performance.now() + 300, prese: 0 });
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
    if (error) return setErrore("Il dono non si è salvato: controlla la connessione e riprova a vincere.");
    controllaPremi();
  }

  if (stato === "bruciato") {
    return (
      <Feltro className="mt-6 text-center">
        <TitoloRiquadro>Il vento se l&apos;è portato via</TitoloRiquadro>
        <p className="mt-2">Il Secret secret Santa dà una sola possibilità, e l&apos;hai già avuta. Il cappello non torna più.</p>
        <TastoLink href={`/gruppo/${groupId}`} tipo="secondario" className="mt-5">
          Torna al gruppo
        </TastoLink>
      </Feltro>
    );
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
            style={{ width: LATO, height: LATO, transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.r}deg)` }}
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
                ? `L'hai preso ${prese} ${prese === 1 ? "volta" : "volte"} su ${PRESE}. ${prova ? "Qui in sala prove puoi riprovare." : "Era la tua unica possibilità: il cappello è andato."}`
                : `Toccalo ${PRESE} volte in ${DURATA} secondi. Va all'impazzata e ogni volta che lo prendi scappa ancora più veloce. Hai una sola possibilità: niente seconde occasioni.`}
            </p>
            {errore && <p className="text-sm text-vermiglio-scuro">{errore}</p>}
            {stato === "perso" && !prova ? (
              <TastoLink href={`/gruppo/${groupId}`} tipo="secondario">
                Torna al gruppo
              </TastoLink>
            ) : (
              <Tasto onClick={inizia}>{stato === "perso" ? "Riprova" : "Via!"}</Tasto>
            )}
          </div>
        )}
      </div>
      <p className="mt-4 text-center text-sm text-crema/70">
        Hai trovato il Secret secret Santa. Acqua in bocca.
      </p>
    </>
  );
}
