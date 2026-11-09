"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ACCESSORI, Avatar, COLORI_CAPELLI, MAGLIONI, NOMI_CAPELLI, PELLI, normalizzaLook, type Look } from "@/components/avatar";
import { Errore, Feltro, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";

export default function PaginaProfilo() {
  return (
    <Suspense>
      <Profilo />
    </Suspense>
  );
}

function Profilo() {
  const gruppo = useSearchParams().get("gruppo");
  const router = useRouter();
  const supabase = clientSoloBrowser();

  const [look, setLook] = useState<Look | null>(null);
  const [sbloccati, setSbloccati] = useState<string[]>([]);
  const [stato, setStato] = useState<"" | "salvo" | "salvato">("");
  const [errore, setErrore] = useState("");
  const attesa = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) return router.replace("/");
      const [{ data: p }, { data: acc }] = await Promise.all([
        supabase.from("profiles").select("look").eq("user_id", uid).maybeSingle(),
        supabase.rpc("my_unlocked_accessories"),
      ]);
      const ok = (acc as string[] | null) ?? [];
      const l = normalizzaLook(p?.look, uid);
      setSbloccati(ok);
      setLook({ ...l, accessori: l.accessori.filter((a) => ok.includes(a)) });
    })();
  }, [supabase, router]);

  // Salvataggio automatico, poco dopo l'ultima modifica
  function cambia(campi: Partial<Look>) {
    if (!look) return;
    const nuovo = { ...look, ...campi };
    setLook(nuovo);
    setStato("salvo");
    if (attesa.current) clearTimeout(attesa.current);
    attesa.current = setTimeout(async () => {
      const { error } = await supabase.rpc("save_avatar", { p_look: nuovo });
      setErrore(error ? "Non sono riuscito a salvare. Riprova." : "");
      setStato(error ? "" : "salvato");
    }, 500);
  }

  const indietro = gruppo ? `/gruppo/${gruppo}` : "/";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro={indietro}
        etichettaIndietro={gruppo ? "Torna al gruppo" : "Torna alla home"}
        titolo="Il tuo personaggio"
        sottotitolo="Lo vedranno gli amici in tutti i tuoi gruppi. Gli accessori si guadagnano."
      />

      {!look ? (
        <p className="mt-8 text-crema/80">Carico il tuo personaggio…</p>
      ) : (
        <>
          <div className="mt-6 flex flex-col items-center">
            <span className="toppa size-44 overflow-hidden">
              <Avatar look={look} className="relative top-[8%] h-full w-full" titolo="Il tuo personaggio" />
            </span>
            <p className="mt-3 h-5 text-sm text-crema/75" aria-live="polite">
              {stato === "salvo" ? "Salvo…" : stato === "salvato" ? "Salvato" : ""}
            </p>
          </div>
          <Errore>{errore}</Errore>

          <div className="mt-4 flex flex-col gap-4">
            <Feltro>
              <TitoloRiquadro>Pelle</TitoloRiquadro>
              <Campioni colori={PELLI} scelto={look.pelle} nome="Pelle" onScegli={(pelle) => cambia({ pelle })} />
            </Feltro>

            <Feltro>
              <TitoloRiquadro>Capelli</TitoloRiquadro>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {NOMI_CAPELLI.map((n, i) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={look.capelli === i}
                    onClick={() => cambia({ capelli: i })}
                    className={`cliccabile stoffa-chiara flex flex-col items-center gap-1 rounded-[20px] pt-2 pb-2 ${
                      look.capelli === i ? "outline-3 outline-offset-2 outline-vermiglio" : ""
                    }`}
                  >
                    <span className="toppa size-14 overflow-hidden">
                      <Avatar look={{ ...look, capelli: i, accessori: [] }} className="relative top-[8%] h-full w-full" />
                    </span>
                    <span className="text-sm">{n}</span>
                  </button>
                ))}
              </div>
              <p className="mt-5 font-medium">Colore</p>
              <Campioni colori={COLORI_CAPELLI} scelto={look.coloreCapelli} nome="Colore dei capelli" onScegli={(coloreCapelli) => cambia({ coloreCapelli })} />
            </Feltro>

            <Feltro>
              <TitoloRiquadro>Maglione</TitoloRiquadro>
              <Campioni colori={MAGLIONI} scelto={look.maglione} nome="Maglione" onScegli={(maglione) => cambia({ maglione })} />
            </Feltro>

            <Feltro>
              <TitoloRiquadro>Accessori</TitoloRiquadro>
              <p className="mt-2 text-sm text-inchiostro/70">Si sbloccano solo facendo le cose. Tocca quelli sbloccati per indossarli.</p>
              <ul className="mt-4 flex flex-col gap-3">
                {ACCESSORI.map((a) => {
                  const ok = sbloccati.includes(a.id);
                  const indossato = look.accessori.includes(a.id);
                  const anteprima = (
                    <span className={`toppa size-14 flex-none overflow-hidden ${ok ? "" : "opacity-40 grayscale"}`}>
                      <Avatar look={{ ...look, accessori: [a.id] }} className="relative top-[8%] h-full w-full" />
                    </span>
                  );
                  return (
                    <li key={a.id}>
                      {ok ? (
                        <button
                          type="button"
                          aria-pressed={indossato}
                          onClick={() =>
                            cambia({ accessori: indossato ? look.accessori.filter((x) => x !== a.id) : [...look.accessori, a.id] })
                          }
                          className={`cliccabile stoffa-chiara flex w-full items-center gap-3 rounded-[20px] p-2 pr-4 text-left ${
                            indossato ? "outline-3 outline-offset-2 outline-vermiglio" : ""
                          }`}
                        >
                          {anteprima}
                          <span className="min-w-0 flex-1">
                            <span className="block font-titolo text-lg leading-tight">{a.nome}</span>
                            <span className="block text-sm text-inchiostro/70">{indossato ? "Lo indossi" : "Tocca per indossarlo"}</span>
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 rounded-[20px] border-2 border-dashed border-abete/20 p-2 pr-4">
                          {anteprima}
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-inchiostro/70">{a.nome} · bloccato</span>
                            <span className="block text-sm text-inchiostro/70">{a.comeSbloccarlo}</span>
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
                <li className="flex items-center gap-3 rounded-[20px] border-2 border-dashed border-abete/20 p-2 pr-4">
                  <span className="toppa size-14 flex-none text-2xl text-inchiostro/40">?</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-inchiostro/70">Cappello misterioso · bloccato</span>
                    <span className="block text-sm text-inchiostro/70">Arriverà con il quiz: dipende dal tuo verdetto.</span>
                  </span>
                </li>
              </ul>
            </Feltro>
          </div>
        </>
      )}
    </main>
  );
}

// Campioni di colore: ognuno è un bottone tondo di stoffa; quello scelto è cerchiato.
function Campioni({ colori, scelto, nome, onScegli }: { colori: string[]; scelto: number; nome: string; onScegli: (i: number) => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {colori.map((c, i) => (
        <button
          key={c}
          type="button"
          aria-label={`${nome} ${i + 1}`}
          aria-pressed={scelto === i}
          onClick={() => onScegli(i)}
          className={`cliccabile size-12 rounded-full ${scelto === i ? "outline-3 outline-offset-2 outline-vermiglio" : ""}`}
          style={{ backgroundColor: c, ["--spessore" as string]: "rgb(0 0 0 / 0.3)" }}
        />
      ))}
    </div>
  );
}
