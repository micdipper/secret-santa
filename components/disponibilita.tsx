"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ToppaAvatar, type Look } from "@/components/avatar";
import { Errore, Feltro, Icone, Tasto, TastoTondo, TitoloRiquadro } from "@/components/ui";
import { conteggi, dataLunga, mese, numero, settimana } from "@/lib/disponibilita";

export type PersonaDisp = { memberId: string; nome: string; look: Look | null; entrato: boolean };

/*
  Disponibilità per lo scambio (pagina vera e sala prove): ogni giorno proposto è una riga in rilievo
  che si tocca per dire "ci sono" (o toglierlo); nella riga si vede chi c'è e il giorno più probabile.
  Si salva da solo. L'organizzatore, sotto, fissa la data quando vuole: è l'unico modo per chiudere.
*/
export function Disponibilita({
  giorni,
  persone,
  risposte,
  io,
  organizzatore,
  salvataggio,
  errore,
  onCambia,
  onFissa,
}: {
  giorni: string[]; // proposti, in ordine
  persone: PersonaDisp[];
  risposte: Record<string, string[]>; // memberId → giorni in cui c'è (chi non ha risposto non c'è)
  io: string | null;
  organizzatore: boolean;
  salvataggio: "" | "salvo" | "salvato";
  errore: string;
  onCambia: (giorni: string[]) => void;
  onFissa: (giorno: string) => void;
}) {
  const { chi, migliori } = conteggi(giorni, risposte);
  const miei = io ? risposte[io] : undefined;
  const nome = (m: string) => persone.find((p) => p.memberId === m);
  const mancano = persone.filter((p) => !risposte[p.memberId]);
  const hannoRisposto = persone.length - mancano.length;
  const [scelto, setScelto] = useState<string | null>(null);
  const daFissare = scelto ?? migliori[0] ?? giorni[0];

  function tocca(g: string) {
    const ora = miei ?? [];
    onCambia(ora.includes(g) ? ora.filter((x) => x !== g) : [...ora, g].sort());
  }

  return (
    <div className="flex flex-col gap-4">
      <Feltro>
        <TitoloRiquadro>Quando ci sei?</TitoloRiquadro>
        <p className="mt-2">Tocca tutti i giorni in cui puoi. Vedi anche chi c&apos;è negli altri giorni.</p>
        <ul className="mt-5 flex flex-col gap-3">
          {giorni.map((g) => {
            const ci = !!miei?.includes(g);
            const presenti = chi[g];
            const top = migliori.includes(g);
            return (
              <li key={g}>
                <button
                  type="button"
                  aria-pressed={ci}
                  disabled={!io}
                  onClick={() => tocca(g)}
                  className={`cliccabile stoffa-chiara flex w-full items-center gap-3 rounded-[20px] p-3 text-left ${ci ? "outline-3 outline-offset-2 outline-vermiglio" : ""}`}
                >
                  {/* il giorno, come un foglietto di calendario */}
                  <span className={`flex w-14 flex-none flex-col items-center rounded-[12px] py-1 leading-tight ${ci ? "bg-vermiglio text-crema" : "bg-[#fbf6ea] text-abete"}`}>
                    <span className="text-sm">{settimana(g)}</span>
                    <span className="font-titolo text-2xl leading-none">{numero(g)}</span>
                    <span className="text-sm">{mese(g)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-titolo text-lg leading-tight text-abete">
                        {presenti.length === 0 ? "Nessuno" : presenti.length === 1 ? "1 persona" : `${presenti.length} persone`}
                      </span>
                      {top && <span className="etichetta-stoffa bg-senape text-sm text-inchiostro">il più probabile</span>}
                    </span>
                    {presenti.length > 0 && (
                      <span className="mt-2 flex flex-wrap -space-x-2">
                        {presenti.map((m) => (
                          <motion.span key={m} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }} className="inline-flex rounded-full">
                            <ToppaAvatar look={nome(m)?.look ?? null} dimensione={32} nome={nome(m)?.nome} />
                          </motion.span>
                        ))}
                      </span>
                    )}
                  </span>
                  {/* il segno di spunta: pieno se ci sono */}
                  <span className={`flex size-8 flex-none items-center justify-center rounded-full border-2 ${ci ? "border-vermiglio bg-vermiglio text-crema" : "border-abete/40 text-transparent"} [&>svg]:size-5 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[3]`} aria-hidden>
                    <svg viewBox="0 0 24 24">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {io && !miei && (
          <Tasto tipo="secondario" className="mt-5" onClick={() => onCambia([])}>
            Nessuno di questi giorni
          </Tasto>
        )}
        <div className="mt-4">
          <Errore>{errore}</Errore>
        </div>
        <p className="mt-2 text-sm text-inchiostro/70" aria-live="polite">
          {salvataggio === "salvo"
            ? "Salvo…"
            : salvataggio === "salvato"
              ? "Salvato ✓ Puoi cambiare idea finché l'organizzatore non fissa la data."
              : miei
                ? miei.length === 0
                  ? "Hai detto che non ci sei in nessuno di questi giorni. Tocca un giorno se cambi idea."
                  : "Si salva da solo. Puoi cambiare idea finché l'organizzatore non fissa la data."
                : "Non hai ancora risposto."}
        </p>
      </Feltro>

      <Feltro>
        <TitoloRiquadro>{mancano.length === 0 ? "Hanno risposto tutti!" : `Hanno risposto ${hannoRisposto} su ${persone.length}`}</TitoloRiquadro>
        {mancano.length > 0 ? (
          <>
            <p className="mt-2">Mancano ancora:</p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {mancano.map((p) => (
                <li key={p.memberId} className="flex w-16 flex-col items-center gap-1 text-center text-sm">
                  <ToppaAvatar look={p.look} dimensione={40} nome={p.nome} />
                  <span className="w-full truncate">{p.nome.split(" ")[0]}</span>
                </li>
              ))}
            </ul>
            {mancano.some((p) => !p.entrato) && <p className="mt-3 text-sm text-inchiostro/70">Chi ha la toppa vuota non è ancora entrato nel gruppo: potrà rispondere appena entra.</p>}
          </>
        ) : (
          <p className="mt-2">{organizzatore ? "Ora tocca a te: fissa la data qui sotto." : "Ora l'organizzatore fissa la data."}</p>
        )}
      </Feltro>

      {organizzatore && (
        <Feltro>
          <p className="text-sm text-inchiostro/70">Solo tu, come organizzatore</p>
          <TitoloRiquadro className="mt-1">Fissa la data</TitoloRiquadro>
          <p className="mt-2">
            Quando vuoi, scegli il giorno: il sondaggio si chiude e la data compare a tutti.
            {mancano.length > 0 && ` Mancano ancora ${mancano.length === 1 ? "1 risposta" : `${mancano.length} risposte`}.`}
          </p>
          {/* i giorni in fila, come toppe: è scelto quello più probabile, se ne può toccare un altro */}
          <div className="mt-5 flex flex-wrap justify-between gap-y-3">
            {giorni.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={daFissare === g}
                onClick={() => setScelto(g)}
                className={`cliccabile stoffa-chiara flex size-14 flex-col items-center justify-center rounded-full leading-none ${daFissare === g ? "outline-3 outline-offset-2 outline-vermiglio" : ""}`}
                aria-label={dataLunga(g)}
              >
                <span className="text-[12px] text-inchiostro/70">{settimana(g)}</span>
                <span className="font-titolo text-lg text-abete">{numero(g)}</span>
              </button>
            ))}
          </div>
          <Tasto className="mt-6" onClick={() => onFissa(daFissare)}>
            Fissa {dataLunga(daFissare)}
          </Tasto>
        </Feltro>
      )}
    </div>
  );
}

/*
  Organizza: l'organizzatore propone i giorni tra cui scegliere (da 2 a 14, da oggi in poi).
  Un giorno si aggiunge col campo data e "+", si toglie col "−" della sua riga; il tasto in fondo salva.
*/
export function ProponiGiorni({ iniziali, testoTasto, onSalva }: { iniziali: string[]; testoTasto: string; onSalva: (giorni: string[]) => void }) {
  const [giorni, setGiorni] = useState(iniziali);
  const [nuovo, setNuovo] = useState("");
  const [errore, setErrore] = useState("");
  const oggi = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
  const cambiati = giorni.join() !== [...iniziali].sort().join();

  function aggiungi() {
    if (!nuovo) return;
    if (nuovo < oggi) return setErrore("Quel giorno è già passato.");
    if (giorni.includes(nuovo)) return setErrore("Quel giorno c'è già.");
    if (giorni.length >= 14) return setErrore("Al massimo 14 giorni.");
    setErrore("");
    setGiorni([...giorni, nuovo].sort());
    setNuovo("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="giorno-proposto" className="font-medium text-inchiostro">
            Proponi un giorno
          </label>
          <div className="campo-cucito mt-2">
            <input id="giorno-proposto" type="date" min={oggi} value={nuovo} onChange={(e) => setNuovo(e.target.value)} />
          </div>
        </div>
        <TastoTondo etichetta="Aggiungi il giorno" icona={Icone.piu} disabled={!nuovo} onClick={aggiungi} />
      </div>
      <Errore>{errore}</Errore>
      {giorni.length > 0 && (
        <ul className="flex flex-col divide-y-2 divide-dashed divide-abete/15">
          {giorni.map((g) => (
            <li key={g} className="flex items-center justify-between gap-3 py-2">
              <span className="first-letter:uppercase">{dataLunga(g)}</span>
              <TastoTondo etichetta={`Togli ${dataLunga(g)}`} icona={Icone.meno} onClick={() => setGiorni(giorni.filter((x) => x !== g))} />
            </li>
          ))}
        </ul>
      )}
      <Tasto tipo="secondario" className="mt-2" disabled={giorni.length < 2 || !cambiati} onClick={() => onSalva(giorni)}>
        {testoTasto}
      </Tasto>
      <p className="text-sm text-inchiostro/70">
        {giorni.length < 2 ? "Proponi almeno 2 giorni: poi ognuno dirà in quali c'è." : `${giorni.length} giorni proposti.`}
      </p>
    </div>
  );
}

