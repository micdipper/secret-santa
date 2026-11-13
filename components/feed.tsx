"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ToppaAvatar, type Look } from "@/components/avatar";
import { BustaSigillata } from "@/components/ornamenti";
import { FrancobolloTotem } from "@/components/totem";
import { Errore, Feltro, Icone, Tasto, TastoTondo, TitoloRiquadro } from "@/components/ui";
import { suoni } from "@/lib/suoni";
import type { Profilo } from "@/lib/totem";

/*
  Novità del gruppo: voci scritte dal database (ingressi, estrazione, buste, bacheche, totem) e post.
  Ai post e alle voci si può solo reagire, una emoji a testa.
  Questo file disegna e basta: i dati arrivano da FeedGruppo (vero) o dalla sala prove.
*/

export const EMOJI = ["🎄", "❤️", "😂", "🔥", "👀", "🇮🇱"] as const;
export const MAX_POST = 100;

export type Persona = { nome: string; look: Look | null };
export type Voce = {
  id: string;
  member_id: string | null;
  tipo: "creato" | "entrato" | "estrazione" | "busta" | "bacheca" | "totem" | "post";
  dati: { testo?: string; foto?: string; profilo?: Profilo };
  quando: string;
};
export type Reazione = { event_id: string; member_id: string; emoji: string };
export type TotemNomi = Partial<Record<Profilo, { nome: string; immagine?: string | null }>>;

export function quandoBreve(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "adesso";
  if (s < 3600) return `${Math.floor(s / 60)} min fa`;
  if (s < 86400) return `${Math.floor(s / 3600)} ${Math.floor(s / 3600) === 1 ? "ora" : "ore"} fa`;
  if (s < 2 * 86400) return "ieri";
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long" });
}

function frase(v: Voce, totem: TotemNomi) {
  switch (v.tipo) {
    case "creato":
      return " ha creato il gruppo";
    case "entrato":
      return " è nel gruppo!";
    case "busta":
      return " ha aperto la busta";
    case "bacheca":
      return " ha aggiornato la bacheca";
    case "totem":
      return ` ha fatto il sondaggio: è «${(v.dati.profilo && totem[v.dati.profilo]?.nome) || "un mistero"}»`;
    default:
      return "";
  }
}


export function VoceFeed({
  voce,
  persone,
  totem,
  reazioni,
  io,
  fotoUrl,
  linkBacheca,
  onReagisci,
  onElimina,
}: {
  voce: Voce;
  persone: Record<string, Persona>;
  totem: TotemNomi;
  reazioni: Reazione[];
  io: string | null;
  fotoUrl?: string;
  linkBacheca?: string;
  onReagisci: (emoji: string) => void;
  onElimina?: () => void;
}) {
  const [scegli, setScegli] = useState(false);
  const riduci = useReducedMotion();
  const p = voce.member_id ? persone[voce.member_id] : null;
  const mia = reazioni.find((r) => r.member_id === io)?.emoji;
  const conteggi = EMOJI.map((e) => ({ e, n: reazioni.filter((r) => r.emoji === e).length })).filter((x) => x.n > 0);

  function reagisci(e: string) {
    suoni.reazione();
    setScegli(false);
    onReagisci(e);
  }

  return (
    <Feltro className="!p-5">
      <div className="flex items-start gap-3">
        {voce.tipo === "estrazione" ? (
          <span className="toppa size-11 flex-none">
            <BustaSigillata className="relative w-8" />
          </span>
        ) : (
          <ToppaAvatar look={p?.look ?? null} nome={p?.nome} dimensione={44} />
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="leading-snug">
            {voce.tipo === "estrazione" ? (
              <strong className="font-semibold">Estrazione fatta! Le buste sono pronte</strong>
            ) : (
              <>
                <strong className="font-semibold">{p?.nome ?? "Qualcuno"}</strong>
                {frase(voce, totem)}
              </>
            )}
          </p>
          <p className="text-sm text-inchiostro/65">{quandoBreve(voce.quando)}</p>
        </div>
        {voce.tipo === "totem" && voce.dati.profilo && (
          <FrancobolloTotem profilo={voce.dati.profilo} immagine={totem[voce.dati.profilo]?.immagine} className="relative w-12 flex-none rotate-[4deg]" />
        )}
        {voce.tipo === "bacheca" && linkBacheca && (
          <Link href={linkBacheca} aria-label={`Guarda la bacheca di ${p?.nome ?? ""}`} title="Guarda la bacheca" className="tasto-tondo cucitura cliccabile stoffa-chiara flex-none">
            {Icone.avanti}
          </Link>
        )}
      </div>

      {voce.tipo === "post" && (
        <div className="mt-3 flex flex-col gap-3">
          {voce.dati.testo && <p className="text-lg leading-snug break-words whitespace-pre-wrap">{voce.dati.testo}</p>}
          {voce.dati.foto && (
            <div className="relative overflow-hidden rounded-2xl bg-kraft/30 shadow-[0_1px_0_rgba(0,0,0,.2)]">
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- foto privata con link firmato a tempo
                <img src={fotoUrl} alt={`Foto di ${p?.nome ?? ""}`} className="block max-h-[420px] w-full object-cover" loading="lazy" />
              ) : (
                <div className="aspect-[4/3]" />
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {conteggi.map(({ e, n }) => (
          <button
            key={e}
            type="button"
            onClick={() => reagisci(e)}
            aria-pressed={mia === e}
            aria-label={`${e} ${n}${mia === e ? ", c'è anche la tua: tocca per toglierla" : ""}`}
            className={`cliccabile flex h-11 items-center gap-1.5 rounded-full px-3.5 ${mia === e ? "stoffa-vermiglio" : "stoffa-chiara text-abete"}`}
          >
            <span className="text-xl leading-none">{e}</span>
            <span className="text-base font-semibold tabular-nums">{n}</span>
          </button>
        ))}
        <TastoTondo
          type="button"
          etichetta={scegli ? "Chiudi le reazioni" : "Reagisci"}
          icona={Icone.reazione}
          aria-expanded={scegli}
          onClick={() => setScegli(!scegli)}
          className="!size-11"
        />
        {onElimina && <TastoTondo type="button" etichetta="Cancella il post" icona={Icone.cestino} onClick={onElimina} className="ml-auto !size-11" />}
      </div>
      <AnimatePresence initial={false}>
        {scegli && (
          <motion.div
            initial={riduci ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 pt-3 pb-3">
              {EMOJI.map((e, i) => (
                <motion.button
                  key={e}
                  type="button"
                  initial={riduci ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22, delay: i * 0.03 }}
                  onClick={() => reagisci(e)}
                  aria-label={`Reagisci con ${e}`}
                  className={`cliccabile flex size-11 items-center justify-center rounded-full text-xl ${mia === e ? "stoffa-vermiglio" : "stoffa-chiara"}`}
                >
                  {e}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Feltro>
  );
}

// Riquadro per scrivere un post: max 100 caratteri e/o una foto.
export function ComponiPost({ onPubblica }: { onPubblica: (testo: string, foto: File | null) => Promise<{ errore?: string; nota?: string }> }) {
  const [testo, setTesto] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState("");
  const [nota, setNota] = useState("");
  const scegliFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!foto) return;
    const u = URL.createObjectURL(foto);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- anteprima della foto scelta (risorsa del browser da liberare)
    setAnteprima(u);
    return () => URL.revokeObjectURL(u);
  }, [foto]);

  const vuoto = !testo.trim() && !foto;

  async function pubblica() {
    if (vuoto || invio) return;
    setInvio(true);
    setErrore("");
    setNota("");
    const r = await onPubblica(testo.trim(), foto);
    setInvio(false);
    if (r.errore) return setErrore(r.errore);
    suoni.inviato();
    setTesto("");
    setFoto(null);
    setAnteprima(null);
    if (r.nota) setNota(r.nota);
  }

  return (
    <Feltro>
      <TitoloRiquadro>Scrivi un post</TitoloRiquadro>
      <p className="mt-1 text-sm text-inchiostro/70">Niente nomi del gruppo: diventano asterischi, per non fare spoiler.</p>
      <div className="mt-4 flex flex-col gap-2">
        <label htmlFor="post" className="sr-only">
          Testo del post
        </label>
        <div className="campo-cucito">
          <textarea
            id="post"
            rows={2}
            maxLength={MAX_POST}
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Cosa vuoi dire al gruppo?"
            className="placeholder:text-inchiostro/40"
          />
        </div>
        <p className="text-right text-sm text-inchiostro/60 tabular-nums">
          {testo.length}/{MAX_POST}
        </p>
      </div>

      {anteprima ? (
        <div className="relative mt-1 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- anteprima locale */}
          <img src={anteprima} alt="La foto scelta" className="block max-h-64 w-full object-cover" />
          <TastoTondo type="button" etichetta="Togli la foto" icona={Icone.cestino} onClick={() => setFoto(null)} className="absolute top-3 right-3" />
        </div>
      ) : (
        <Tasto tipo="secondario" type="button" className="mt-1" onClick={() => scegliFoto.current?.click()}>
          Aggiungi una foto
        </Tasto>
      )}
      <input
        ref={scegliFoto}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          setFoto(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      {errore && (
        <div className="mt-4">
          <Errore>{errore}</Errore>
        </div>
      )}
      <Tasto type="button" className="mt-5" disabled={vuoto || invio} onClick={pubblica}>
        {invio ? "Pubblico…" : "Pubblica"}
      </Tasto>
      {nota && (
        <p role="status" className="mt-3 text-center text-sm text-inchiostro/75">
          {nota}
        </p>
      )}
    </Feltro>
  );
}

// Elenco delle voci con l'animazione d'ingresso
export function ElencoFeed({
  voci,
  render,
}: {
  voci: Voce[];
  render: (v: Voce) => React.ReactNode;
}) {
  const riduci = useReducedMotion();
  return (
    <ol className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {voci.map((v) => (
          <motion.li
            key={v.id}
            layout={riduci ? false : "position"}
            initial={riduci ? false : { opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            {render(v)}
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}
