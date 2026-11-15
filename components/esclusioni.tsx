"use client";

// Riquadro "Chi non deve pescarsi": lo stesso nella pagina Organizza e nella sala prove.
// Chi lo usa decide dove salvare (database o solo memoria) con onAggiungi / onTogli.

import { useState } from "react";
import { EtichettaStoffa, Feltro, Icone, Tasto, TastoTondo, TitoloRiquadro } from "@/components/ui";

// coppia = "si amano", odio = "si odiano" (valgono nei due versi); anno_scorso = A ha regalato a B (solo quel verso)
export type Esclusione = { member_a: string; member_b: string; reason: "coppia" | "odio" | "anno_scorso" };
const DUE_VERSI = (r: Esclusione["reason"]) => r !== "anno_scorso";
export type Persona = { id: string; nome: string };

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
  const [coppiaB, setCoppiaB] = useState("");
  const [motivo, setMotivo] = useState<Esclusione["reason"]>("coppia");
  const [togli, setTogli] = useState(false);
  const [errore, setErrore] = useState("");
  const nome = (id: string) => persone.find((p) => p.id === id)?.nome ?? "?";

  async function salva() {
    if (!coppiaA || !coppiaB || coppiaA === coppiaB) return setErrore("Scegli due persone diverse.");
    // Coppia: vale nei due versi, la salvo in ordine. Anno scorso: A ha regalato a B, conta solo quel verso.
    const [a, b] = DUE_VERSI(motivo) ? [coppiaA, coppiaB].sort() : [coppiaA, coppiaB];
    const e = await onAggiungi({ member_a: a, member_b: b, reason: motivo });
    if (e) return setErrore(e);
    setNuova(false);
    setCoppiaA("");
    setCoppiaB("");
    setErrore("");
  }

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
            const testo = c.reason === "coppia" ? `💞 ${a} e ${b} si amano` : c.reason === "odio" ? `😤 ${a} e ${b} si odiano` : `🎁 ${a} → ${b}, anno scorso`;
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
      {nuova && (
        <div className="mt-5 flex flex-col gap-4">
          <div role="radiogroup" aria-label="Perché non devono pescarsi?" className="grid grid-cols-3 gap-2">
            {(
              [
                ["coppia", "💞", "Si amano", "Non si pescano a vicenda"],
                ["odio", "😤", "Si odiano", "Non si pescano a vicenda"],
                ["anno_scorso", "🎁", "Già fatto l'anno scorso", "Chi ha regalato non ripesca la stessa persona"],
              ] as const
            ).map(([v, emoji, titolo, spiegazione]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={motivo === v}
                onClick={() => {
                  setMotivo(v);
                  setCoppiaB("");
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
          {[
            { v: coppiaA, set: setCoppiaA, seconda: false, et: DUE_VERSI(motivo) ? "Prima persona" : "Chi ha fatto il regalo", opzioni: persone },
            {
              v: coppiaB,
              set: setCoppiaB,
              seconda: true,
              et: DUE_VERSI(motivo) ? "Seconda persona" : "A chi l'ha fatto",
              // senza la prima persona e senza chi è già escluso con lei per lo stesso motivo (e verso)
              opzioni: persone.filter(
                (m) =>
                  m.id !== coppiaA &&
                  !esclusioni.some((c) =>
                    DUE_VERSI(motivo)
                      ? c.reason === motivo && ((c.member_a === coppiaA && c.member_b === m.id) || (c.member_b === coppiaA && c.member_a === m.id))
                      : c.reason === "anno_scorso" && c.member_a === coppiaA && c.member_b === m.id,
                  ),
              ),
            },
          ].map((s) => (
            <label key={s.et} className="flex flex-col gap-2">
              <span className="font-medium">{s.et}</span>
              <span className="campo-cucito block">
                <select
                  value={s.v}
                  disabled={s.seconda && !coppiaA}
                  onChange={(e) => {
                    s.set(e.target.value);
                    if (!s.seconda) setCoppiaB("");
                  }}
                  className="h-14 w-full appearance-none bg-transparent px-5 text-inchiostro outline-none"
                >
                  <option value="">{s.seconda && !coppiaA ? "Prima scegli la persona sopra" : "Scegli…"}</option>
                  {s.opzioni.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          ))}
          {errore && <p className="text-sm text-vermiglio-scuro">{errore}</p>}
          <Tasto onClick={salva} disabled={!coppiaA || !coppiaB}>
            Salva
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
