"use client";
// "Abbiamo già fatto l'estrazione": ognuno indica a chi fa il regalo. Lo sa solo il sito
// (stessa segretezza dell'estrazione). Si può cambiare finché non hanno scelto tutti.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ToppaAvatar, type Look } from "@/components/avatar";
import { Errore, Feltro, Tasto, TitoloRiquadro } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";

type Persona = { id: string; nome: string; look: Look | null };

export function SceltaDestinatario({
  groupId,
  persone,
  scelta,
  hannoScelto,
  totale,
}: {
  groupId: string;
  persone: Persona[]; // tutti tranne me
  scelta: string | null;
  hannoScelto: number;
  totale: number;
}) {
  const router = useRouter();
  const [toccata, setToccata] = useState<string | null>(scelta);
  const [cambio, setCambio] = useState(!scelta);
  const [salvo, setSalvo] = useState(false);
  const [errore, setErrore] = useState("");
  const nome = (id: string | null) => persone.find((p) => p.id === id)?.nome ?? "";

  async function conferma() {
    if (!toccata) return;
    setSalvo(true);
    setErrore("");
    const { error } = await clientSoloBrowser().rpc("scegli_destinatario", { p_group_id: groupId, p_receiver: toccata });
    setSalvo(false);
    if (error) {
      return setErrore(
        error.message.includes("GIA_SCELTA")
          ? "Questa persona è già stata scelta da qualcun altro: controlla con l'organizzatore."
          : error.message.includes("fetch")
            ? "Non salvato: controlla la connessione e riprova."
            : error.message,
      );
    }
    setCambio(false);
    router.refresh();
  }

  const attesa = `Hanno indicato la loro persona in ${hannoScelto} su ${totale}. Quando ci sono tutti, si aprono le buste.`;

  if (!cambio && scelta) {
    return (
      <Feltro className="mt-6">
        <TitoloRiquadro>Fatto, acqua in bocca!</TitoloRiquadro>
        <p className="mt-2">
          Hai indicato <strong className="font-semibold">{nome(scelta)}</strong>. {attesa}
        </p>
        <Tasto tipo="secondario" className="mt-5 w-full" onClick={() => setCambio(true)}>
          Ho sbagliato, cambia
        </Tasto>
      </Feltro>
    );
  }

  return (
    <Feltro className="mt-6">
      <TitoloRiquadro>A chi fai il regalo?</TitoloRiquadro>
      <p className="mt-2">Avete già fatto l&apos;estrazione: tocca la persona che hai pescato. Lo saprà solo il sito, nessun altro.</p>
      <ul className="mt-5 grid grid-cols-3 gap-3">
        {persone.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={toccata === p.id}
              onClick={() => setToccata(p.id)}
              className={`cliccabile flex w-full flex-col items-center gap-1 rounded-[20px] p-2 ${
                toccata === p.id ? "outline-3 outline-offset-2 outline-vermiglio" : ""
              }`}
            >
              <ToppaAvatar look={p.look} nome={p.nome} dimensione={64} />
              <span className="line-clamp-2 text-center text-sm leading-tight font-medium">{p.nome}</span>
            </button>
          </li>
        ))}
      </ul>
      {errore && (
        <div className="mt-4">
          <Errore>{errore}</Errore>
        </div>
      )}
      <Tasto className="mt-5 w-full" disabled={!toccata || salvo || toccata === scelta} onClick={conferma}>
        {salvo ? "Salvo…" : toccata ? `Faccio il regalo a ${nome(toccata).split(" ")[0]}` : "Scegli una persona"}
      </Tasto>
      {scelta && <p className="mt-3 text-center text-sm text-inchiostro/70">{attesa}</p>}
    </Feltro>
  );
}
