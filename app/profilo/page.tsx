"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Avatar, CAPELLI_SUPER, COLORE_OLOGRAFICO, normalizzaLook, type Look } from "@/components/avatar";
import { EditorPersonaggio } from "@/components/editor-personaggio";
import { Errore, TestataInterna } from "@/components/ui";
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
      setLook({
        ...l,
        capelli: l.capelli === CAPELLI_SUPER && !ok.includes("super") ? 0 : l.capelli,
        coloreCapelli: l.coloreCapelli === COLORE_OLOGRAFICO && !ok.includes("olografico") ? 0 : l.coloreCapelli,
        accessori: l.accessori.filter((a) => ok.includes(a)),
      });
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
          <div className="sticky top-[calc(env(safe-area-inset-top)+8px)] z-10 mt-6 flex flex-col items-center">
            <span className="toppa size-32 overflow-hidden shadow-[0_8px_16px_-8px_rgba(0,0,0,.5)]">
              <Avatar look={look} className="relative top-[8%] h-full w-full" titolo="Il tuo personaggio" />
            </span>
            <p className="mt-2 h-5 rounded-full bg-abete-scuro/80 px-3 text-sm text-crema/90 empty:invisible" aria-live="polite">
              {stato === "salvo" ? "Salvo…" : stato === "salvato" ? "Salvato" : ""}
            </p>
          </div>
          <Errore>{errore}</Errore>

          <div className="mt-4">
            <EditorPersonaggio look={look} sbloccati={sbloccati} onCambia={cambia} riquadri />
          </div>
        </>
      )}
    </main>
  );
}
