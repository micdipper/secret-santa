"use client";

// Popup che non si chiude per chi ha più di 2 foto in bacheca (limite dal 21/11).
// Sta nel layout del gruppo: compare in ogni pagina del gruppo finché non ne restano al massimo 2,
// così qualsiasi uscita (link, tasto indietro, cronologia) porta comunque a una pagina col popup.
// Sceglie la persona quali tenere; ogni eliminazione chiede conferma e toglie anche il file dallo Storage.

import { useEffect, useState } from "react";
import { Errore, Icone, Tasto, TastoTondo, TitoloRiquadro } from "@/components/ui";
import { MAX_FOTO_BACHECA } from "@/lib/foto";
import { urlFirmati } from "@/lib/foto-url";
import { clientSoloBrowser } from "@/lib/supabase/client";

export type FotoBacheca = { id: string; kind: "foto" | "immagine_link"; content: { path?: string; url?: string } };

export function FotoInPiu({ memberId, prova }: { memberId: string; prova?: FotoBacheca[] }) {
  const [foto, setFoto] = useState<FotoBacheca[] | null>(prova ?? null);
  const [url, setUrl] = useState<Record<string, string>>({});
  const [daEliminare, setDaEliminare] = useState<FotoBacheca | null>(null);
  const [elimino, setElimino] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    if (prova) return;
    clientSoloBrowser()
      .from("moodboard_items")
      .select("id, kind, content")
      .eq("member_id", memberId)
      .in("kind", ["foto", "immagine_link"])
      .order("z")
      .then(({ data }) => setFoto((data as FotoBacheca[]) ?? []));
  }, [memberId, prova]);

  useEffect(() => {
    const percorsi = (foto ?? []).flatMap((f) => (f.kind === "foto" && f.content.path ? [f.content.path] : []));
    if (percorsi.length) urlFirmati(percorsi).then(setUrl);
  }, [foto]);

  // appena sono 2 o meno si torna al sito (ricaricando, così bacheca e pagine si aggiornano)
  const sbloccato = foto !== null && foto.length <= MAX_FOTO_BACHECA;
  useEffect(() => {
    if (sbloccato && !prova) window.location.reload();
  }, [sbloccato, prova]);

  async function elimina(f: FotoBacheca) {
    setElimino(true);
    setErrore("");
    if (!prova) {
      const supabase = clientSoloBrowser();
      const { error } = await supabase.from("moodboard_items").delete().eq("id", f.id);
      if (error) {
        setElimino(false);
        return setErrore("Non sono riuscito a eliminarla. Riprova.");
      }
      if (f.kind === "foto" && f.content.path) await supabase.storage.from("moodboard").remove([f.content.path]);
    }
    setFoto((l) => l?.filter((x) => x.id !== f.id) ?? null);
    setDaEliminare(null);
    setElimino(false);
  }

  if (!foto || sbloccato) return null;
  const inPiu = foto.length - MAX_FOTO_BACHECA;
  const src = (f: FotoBacheca) => (f.kind === "foto" ? url[f.content.path ?? ""] : f.content.url);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/65 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]">
      <div role="alertdialog" aria-modal="true" aria-label="Troppe foto in bacheca" className="feltro max-h-full w-full max-w-sm overflow-y-auto p-6 text-center">
        <div className="relative">
          {daEliminare ? (
            <>
              <TitoloRiquadro>Eliminare questa foto?</TitoloRiquadro>
              <Miniatura src={src(daEliminare)} className="mx-auto mt-4 w-40" />
              <p className="mt-4">Questa foto verrà eliminata per sempre.</p>
              <Errore>{errore}</Errore>
              <Tasto className="mt-6" disabled={elimino} onClick={() => elimina(daEliminare)}>
                {elimino ? "Elimino…" : "Elimina"}
              </Tasto>
              <Tasto tipo="secondario" className="mt-3" disabled={elimino} onClick={() => setDaEliminare(null)}>
                Tienila
              </Tasto>
            </>
          ) : (
            <>
              <TitoloRiquadro>Troppe foto in bacheca</TitoloRiquadro>
              <p className="mt-3">Da ora in bacheca si possono caricare solo 2 foto per tenere il sito leggero per tutti. Elimina quelle in più per continuare.</p>
              <p className="mt-3 font-semibold text-vermiglio">
                Hai {foto.length} foto: {inPiu === 1 ? "ne devi eliminare 1" : `ne devi eliminare ${inPiu}`}
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-4">
                {foto.map((f) => (
                  <li key={f.id} className="flex flex-col items-center gap-3">
                    <Miniatura src={src(f)} className="w-full" />
                    <TastoTondo etichetta="Elimina questa foto" icona={Icone.cestino} onClick={() => setDaEliminare(f)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// riquadro della foto (non cliccabile, piatto); raggio = 28 del feltro − 24 di margine
function Miniatura({ src, className = "" }: { src?: string; className?: string }) {
  return (
    <div className={`aspect-square overflow-hidden rounded-[4px] bg-kraft/40 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" className="h-full w-full object-cover" decoding="async" />}
    </div>
  );
}
