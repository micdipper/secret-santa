"use client";

// Riquadro "Chi non deve pescarsi": lo stesso nella pagina Organizza e nella sala prove.
// Chi lo usa decide dove salvare (database o solo memoria) con onAggiungi / onTogli.

import { useState } from "react";
import { EtichettaStoffa, Feltro, Icone, Tasto, TastoTondo, TitoloRiquadro } from "@/components/ui";

// coppia = "si amano", odio = "si odiano" (valgono nei due versi); anno_scorso = A ha regalato a B (solo quel verso)
export type Esclusione = { member_a: string; member_b: string; reason: "coppia" | "odio" | "anno_scorso" };
const DUE_VERSI = (r: Esclusione["reason"]) => r !== "anno_scorso";
export type Persona = { id: string; nome: string };

// Esiste almeno una catena unica (ognuno regala al successivo, tutti in un solo giro) che rispetta
// le esclusioni? Ricerca completa con un tetto di passi: per gruppi di amici risponde all'istante.
// Serve solo ad avvisare prima: la regola vera la applica il database durante l'estrazione.
export function estrazionePossibile(ids: string[], esclusioni: Esclusione[]) {
  const vietato = new Set<string>();
  for (const c of esclusioni) {
    vietato.add(c.member_a + ">" + c.member_b);
    if (DUE_VERSI(c.reason)) vietato.add(c.member_b + ">" + c.member_a);
  }
  const n = ids.length;
  const usato = new Set([ids[0]]);
  let passi = 0;
  function cerca(da: string, quanti: number): boolean {
    if (++passi > 200000) return true; // troppo lungo da verificare: non allarmo per niente
    if (quanti === n) return !vietato.has(da + ">" + ids[0]);
    for (const x of ids) {
      if (usato.has(x) || vietato.has(da + ">" + x)) continue;
      usato.add(x);
      if (cerca(x, quanti + 1)) return true;
      usato.delete(x);
    }
    return false;
  }
  return cerca(ids[0], 1);
}

export function RiquadroEsclusioni({
  persone,
  esclusioni,
  modificabile,
  onAggiungi,
  onTogli,
  className = "",
}: {
  persone: Persona[];
  esclusioni: Esclusione[];
  modificabile: boolean;
  onAggiungi: (e: Esclusione) => Promise<string | null>; // messaggio d'errore, o null se è andata
  onTogli: (e: Esclusione) => Promise<void>;
  className?: string;
}) {
  const [nuova, setNuova] = useState(false);
  const [coppiaA, setCoppiaA] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [motivo, setMotivo] = useState<Esclusione["reason"]>("coppia");
  const [togli, setTogli] = useState(false);
  const [errore, setErrore] = useState("");
  const nome = (id: string) => persone.find((p) => p.id === id)?.nome ?? "?";

  // Si salva da solo al tocco della seconda persona; motivo e prima persona restano scelti
  // per aggiungere di seguito (tranne "si amano": una persona ha un solo partner).
  async function salva(seconda: string) {
    if (!coppiaA || seconda === coppiaA || salvo) return;
    // Due versi: la salvo in ordine. Anni scorsi: A ha regalato a B, conta solo quel verso.
    const [a, b] = DUE_VERSI(motivo) ? [coppiaA, seconda].sort() : [coppiaA, seconda];
    setSalvo(true);
    const e = await onAggiungi({ member_a: a, member_b: b, reason: motivo });
    setSalvo(false);
    if (e) return setErrore(e);
    setErrore("");
    if (motivo === "coppia") setCoppiaA("");
  }

  function chiudi() {
    setNuova(false);
    setCoppiaA("");
    setErrore("");
  }

  // Chi si può toccare: per "si amano" spariscono quelli già in coppia; come seconda persona
  // spariscono la prima e chi è già escluso con lei per lo stesso motivo (e verso).
  const inCoppia = new Set(esclusioni.filter((c) => c.reason === "coppia").flatMap((c) => [c.member_a, c.member_b]));
  const giaFatta = (x: string) =>
    esclusioni.some((c) =>
      DUE_VERSI(motivo)
        ? c.reason === motivo && ((c.member_a === coppiaA && c.member_b === x) || (c.member_b === coppiaA && c.member_a === x))
        : c.reason === "anno_scorso" && c.member_a === coppiaA && c.member_b === x,
    );
  const scelgibili = persone.filter((m) =>
    !coppiaA ? !(motivo === "coppia" && inCoppia.has(m.id)) : m.id !== coppiaA && !(motivo === "coppia" && inCoppia.has(m.id)) && !giaFatta(m.id),
  );
  const impossibile = persone.length >= 3 && !estrazionePossibile(persone.map((p) => p.id), esclusioni);

  async function togliUna(c: Esclusione) {
    await onTogli(c);
    if (esclusioni.length <= 1) setTogli(false);
  }

  return (
    <Feltro className={className}>
      <TitoloRiquadro>Chi non deve pescarsi</TitoloRiquadro>
      <p className="mt-2 text-sm text-inchiostro/70">
        {togli
          ? "Tocca quella da togliere."
          : "L'estrazione è una catena: nessuno pesca se stesso o chi gli fa il regalo. Qui aggiungi chi altro non deve pescarsi."}
      </p>
      {esclusioni.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {esclusioni.map((c) => {
            const a = nome(c.member_a).split(" ")[0];
            const b = nome(c.member_b).split(" ")[0];
            const testo = c.reason === "coppia" ? `💞 ${a} e ${b} si amano` : c.reason === "odio" ? `😤 ${a} e ${b} si odiano` : `🎁 ${a} → ${b}, già regalato`;
            return (
              <li key={c.member_a + c.member_b + c.reason}>
                {togli ? (
                  <button type="button" onClick={() => togliUna(c)} className="cucitura cliccabile stoffa-chiara relative rounded-full px-4 py-2 text-sm">
                    Togli {testo}
                  </button>
                ) : (
                  <EtichettaStoffa colore={c.reason === "coppia" ? "verde" : c.reason === "odio" ? "vermiglio" : "crema"}>{testo}</EtichettaStoffa>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {impossibile && (
        <p role="alert" className="mt-4 rounded-2xl bg-vermiglio/12 p-4 text-sm font-medium text-vermiglio-scuro">
          Con queste esclusioni l&apos;estrazione è impossibile: nessun giro riesce a rispettarle tutte. Togline qualcuna.
        </p>
      )}
      {nuova && (
        <div className="mt-5 flex flex-col gap-4">
          <div role="radiogroup" aria-label="Perché non devono pescarsi?" className="grid grid-cols-3 gap-2">
            {(
              [
                ["coppia", "💞", "Si amano", "Non si pescano a vicenda"],
                ["odio", "😤", "Si odiano", "Non si pescano a vicenda"],
                ["anno_scorso", "🎁", "Già regalato negli anni scorsi", "Chi ha regalato non ripesca la stessa persona"],
              ] as const
            ).map(([v, emoji, titolo, spiegazione]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={motivo === v}
                onClick={() => {
                  setMotivo(v);
                  setCoppiaA("");
                  setErrore("");
                }}
                className={`cucitura cliccabile stoffa-chiara relative flex flex-col items-center gap-1 [--raggio:20px] rounded-[20px] px-2 pt-4 pb-3 text-center ${
                  motivo === v ? "outline-3 outline-offset-2 outline-vermiglio" : ""
                }`}
              >
                <span className="text-3xl" aria-hidden>
                  {emoji}
                </span>
                <span className="font-titolo text-base leading-tight text-abete">{titolo}</span>
                <span className="text-xs leading-snug text-inchiostro/70">{spiegazione}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <p className="font-medium">
              {!coppiaA
                ? DUE_VERSI(motivo)
                  ? "Tocca la prima persona"
                  : "Chi ha fatto il regalo?"
                : `${DUE_VERSI(motivo) ? "E l'altra persona?" : `A chi l'ha fatto ${nome(coppiaA).split(" ")[0]}?`} Si salva da sola.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {coppiaA && (
                <button
                  type="button"
                  aria-pressed
                  onClick={() => setCoppiaA("")}
                  className="cucitura cliccabile stoffa-vermiglio relative min-h-11 rounded-full px-4 text-base text-crema"
                  title="Tocca per cambiarla"
                >
                  {nome(coppiaA)} ✕
                </button>
              )}
              {scelgibili.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={salvo}
                  onClick={() => (coppiaA ? salva(m.id) : setCoppiaA(m.id))}
                  className="cucitura cliccabile stoffa-chiara relative min-h-11 rounded-full px-4 text-base text-abete"
                >
                  {nome(m.id)}
                </button>
              ))}
              {scelgibili.length === 0 && (
                <p className="text-sm text-inchiostro/70">
                  {coppiaA ? "Con questa persona le hai già messe tutte." : "Sono già tutti in coppia."}
                </p>
              )}
            </div>
          </div>
          {errore && <p className="text-sm text-vermiglio-scuro">{errore}</p>}
          <Tasto tipo="secondario" onClick={chiudi}>
            Ho finito
          </Tasto>
        </div>
      )}
      {modificabile && !nuova && (
        <div className="mt-5 flex items-center gap-3">
          <Tasto tipo="secondario" className="flex-1" onClick={() => setNuova(true)}>
            Aggiungi
          </Tasto>
          <TastoTondo
            etichetta={togli ? "Fine" : "Togli una coppia"}
            icona={Icone.meno}
            disabled={esclusioni.length === 0}
            aria-pressed={togli}
            onClick={() => setTogli(!togli)}
          />
        </div>
      )}
    </Feltro>
  );
}
