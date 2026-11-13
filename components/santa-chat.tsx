"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ToppaAvatar, type Look } from "@/components/avatar";
import { Errore, Feltro, Icone, TastoTondo, TestataInterna } from "@/components/ui";
import { suoni } from "@/lib/suoni";

/*
  Santa Chat: chi regala (il "Babbo") scrive alla persona pescata senza rivelarsi.
  Colori fissi per ruolo, uguali da tutte e due le parti:
    Babbo Natale = fumetto vermiglio · chi riceve = fumetto di feltro crema.
  I miei messaggi stanno a destra, quelli dell'altro a sinistra.
  Questo componente disegna e basta: i dati arrivano dalla pagina (vera o sala prove).
*/

export type Ruolo = "babbo" | "pescato"; // chi sono IO in questa conversazione
export type Messaggio = { id: string; dal_babbo: boolean; testo: string; created_at: string; inAttesa?: boolean };

export const MAX_CARATTERI = 500;

// Chiave del telefono che ricorda l'ultimo messaggio letto (per il pallino "nuovi")
export const chiaveLetto = (receiverId: string, ruolo: Ruolo) => `santa-chat-letto:${receiverId}:${ruolo}`;

// Toppa del Babbo Natale segreto: cappello rosso e un punto di domanda (nessuna faccia).
export function ToppaBabbo({ dimensione = 56 }: { dimensione?: number }) {
  return (
    <span className="toppa flex-none overflow-hidden" style={{ width: dimensione, height: dimensione }} role="img" aria-label="Babbo Natale segreto">
      <svg viewBox="0 0 40 40" className="relative h-full w-full" aria-hidden>
        <path d="M9 22 Q12 9 24 7.5 Q31 7.5 33 15.5 L29.5 15 Q25 13.5 23.5 22 Z" fill="var(--color-vermiglio)" />
        <path d="M24 9 Q29 9.5 30.5 14" fill="none" stroke="var(--color-vermiglio-scuro)" strokeWidth="1.2" strokeLinecap="round" />
        <rect x="7.5" y="20.5" width="18" height="5" rx="2.5" fill="#fbf6ea" stroke="var(--color-kraft)" strokeWidth="0.8" />
        <circle cx="32.5" cy="16.5" r="3" fill="#fbf6ea" stroke="var(--color-kraft)" strokeWidth="0.8" />
        <text x="16.5" y="36.5" textAnchor="middle" fontSize="11" fontFamily="var(--font-basteleur), Georgia, serif" fill="var(--color-abete)">
          ?
        </text>
      </svg>
    </span>
  );
}

const ora = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
function giorno(iso: string) {
  const d = new Date(iso);
  const oggi = new Date();
  const ieri = new Date();
  ieri.setDate(oggi.getDate() - 1);
  if (d.toDateString() === oggi.toDateString()) return "Oggi";
  if (d.toDateString() === ieri.toDateString()) return "Ieri";
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
}

export function SantaChat({
  ruolo,
  nomeAltro,
  lookAltro,
  messaggi,
  onInvia,
  indietro,
  etichettaIndietro,
  contesto,
  sopra,
}: {
  ruolo: Ruolo;
  nomeAltro: string; // per il Babbo: il nome della persona pescata
  lookAltro: Look | null;
  messaggi: Messaggio[];
  onInvia: (testo: string) => Promise<string | null>; // restituisce l'errore, se c'è
  indietro: string;
  etichettaIndietro: string;
  contesto?: string;
  sopra?: ReactNode; // spazio extra sotto la testata (sala prove)
}) {
  const [testo, setTesto] = useState("");
  const [errore, setErrore] = useState("");
  const campo = useRef<HTMLTextAreaElement>(null);
  const primaVolta = useRef(true);
  const riduci = useReducedMotion();
  const sonoBabbo = ruolo === "babbo";

  // in fondo quando arriva un messaggio (la prima volta senza animazione)
  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: primaVolta.current || riduci ? "auto" : "smooth" });
    if (messaggi.length) primaVolta.current = false;
  }, [messaggi.length, riduci]);

  // il campo cresce con il testo
  useEffect(() => {
    const t = campo.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
  }, [testo]);

  const pulito = testo.trim();
  const troppo = pulito.length > MAX_CARATTERI;

  async function invia() {
    if (!pulito || troppo) return;
    setErrore("");
    const daInviare = pulito;
    setTesto("");
    suoni.inviato();
    campo.current?.focus();
    const e = await onInvia(daInviare);
    if (e) {
      setErrore(e);
      setTesto(daInviare);
    }
  }

  const ultimoMio = [...messaggi].reverse().find((m) => m.dal_babbo === sonoBabbo);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
      <TestataInterna
        indietro={indietro}
        etichettaIndietro={etichettaIndietro}
        contesto={contesto}
        titolo="Santa Chat"
        sottotitolo={sonoBabbo ? `Con ${nomeAltro}. Non sa che sei tu: occhio a come scrivi!` : "Con il tuo Babbo Natale. Lui sa chi sei, tu no."}
      />
      {sopra}

      <ol className="mt-6 flex flex-1 flex-col pb-4" aria-live="polite">
        {messaggi.length === 0 && (
          <li>
            <Feltro>
              <div className="flex items-center gap-4">
                {sonoBabbo ? <ToppaAvatar look={lookAltro} nome={nomeAltro} dimensione={48} /> : <ToppaBabbo dimensione={48} />}
                <p className="min-w-0 flex-1">
                  {sonoBabbo
                    ? `Rompi il ghiaccio con ${nomeAltro}: fai una domanda furba per capire cosa desidera, senza farti scoprire.`
                    : "Il tuo Babbo Natale non ha ancora scritto. Puoi iniziare tu: leggerà solo lui."}
                </p>
              </div>
            </Feltro>
          </li>
        )}
        <AnimatePresence initial={false}>
          {messaggi.map((m, i) => {
            const mio = m.dal_babbo === sonoBabbo;
            const prima = messaggi[i - 1];
            const dopo = messaggi[i + 1];
            const nuovoGiorno = !prima || giorno(prima.created_at) !== giorno(m.created_at);
            const stessoPrima = !nuovoGiorno && prima && prima.dal_babbo === m.dal_babbo;
            const ultimoDelGiro = !dopo || dopo.dal_babbo !== m.dal_babbo || giorno(dopo.created_at) !== giorno(m.created_at);
            return (
              <motion.li
                key={m.id}
                layout={riduci ? false : "position"}
                initial={riduci ? false : { opacity: 0, y: 14, scale: 0.94 }}
                animate={{ opacity: m.inAttesa ? 0.65 : 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={`flex flex-col ${stessoPrima ? "mt-1" : "mt-3"}`}
              >
                {nuovoGiorno && <p className="mt-2 mb-3 self-center text-sm text-crema/70 first-letter:uppercase">{giorno(m.created_at)}</p>}
                <div className={`flex items-end gap-2 ${mio ? "justify-end" : "justify-start"}`}>
                  {!mio &&
                    (ultimoDelGiro ? (
                      sonoBabbo ? <ToppaAvatar look={lookAltro} nome={nomeAltro} dimensione={32} /> : <ToppaBabbo dimensione={32} />
                    ) : (
                      <span className="w-8 flex-none" />
                    ))}
                  <p
                    className={`fumetto ${m.dal_babbo ? "fumetto-babbo" : "fumetto-pescato"} ${ultimoDelGiro ? (mio ? "fumetto-mio" : "fumetto-altro") : ""}`}
                  >
                    <span className="relative">{m.testo}</span>
                  </p>
                </div>
                {ultimoDelGiro && (
                  <p className={`mt-1 text-sm text-crema/65 ${mio ? "self-end" : "ml-10 self-start"}`}>
                    {m.inAttesa ? "Invio…" : ora(m.created_at)}
                    {!m.inAttesa && m.id === ultimoMio?.id && " · inviato ✓"}
                  </p>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      <form
        className="sticky bottom-0 -mx-5 mt-auto bg-gradient-to-t from-abete-scuro via-abete-scuro/95 to-transparent px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+16px)]"
        onSubmit={(e) => {
          e.preventDefault();
          invia();
        }}
      >
        {errore && (
          <div className="mb-3">
            <Errore>{errore}</Errore>
          </div>
        )}
        <div className="flex items-end gap-3">
          <div className="campo-cucito min-w-0 flex-1">
            <label htmlFor="messaggio" className="sr-only">
              {sonoBabbo ? `Messaggio per ${nomeAltro}` : "Messaggio per il tuo Babbo Natale"}
            </label>
            <textarea
              id="messaggio"
              ref={campo}
              rows={1}
              value={testo}
              enterKeyHint="send"
              placeholder={sonoBabbo ? `Scrivi a ${nomeAltro}…` : "Scrivi al tuo Babbo Natale…"}
              className="placeholder:text-inchiostro/40"
              onChange={(e) => setTesto(e.target.value)}
              onKeyDown={(e) => {
                // Invio manda il messaggio; Maiusc+Invio va a capo
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  invia();
                }
              }}
            />
          </div>
          <TastoTondo type="submit" etichetta="Invia" icona={Icone.invia} disabled={!pulito || troppo} />
        </div>
        {pulito.length > MAX_CARATTERI - 100 && (
          <p className={`mt-2 text-right text-sm ${troppo ? "text-senape" : "text-crema/70"}`}>
            {pulito.length}/{MAX_CARATTERI}
          </p>
        )}
      </form>
    </main>
  );
}
