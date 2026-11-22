"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ToppaAvatar, PREMI_COLORI, PREMI_MAGLIONI, PREMI_TAGLI, normalizzaLook, premioCucitura, type Look } from "@/components/avatar";
import { EditorPersonaggio } from "@/components/editor-personaggio";
import { Errore, Tasto, TestataInterna } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";

export default function PaginaGuardaroba() {
  return (
    <Suspense>
      <Profilo />
    </Suspense>
  );
}

function Profilo() {
  const { id: gruppo } = useParams<{ id: string }>();
  const appenaEntrato = useSearchParams().get("nuovo") === "1"; // arrivo dall'invito: dopo si va al gruppo
  const router = useRouter();
  const supabase = clientSoloBrowser();

  const [look, setLook] = useState<Look | null>(null);
  const [sbloccati, setSbloccati] = useState<string[]>([]);
  const [salvo, setSalvo] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) return;
      const [{ data: p }, { data: acc }] = await Promise.all([
        supabase.from("profiles").select("look").eq("user_id", uid).maybeSingle(),
        supabase.rpc("my_unlocked_accessories"),
      ]);
      const ok = (acc as string[] | null) ?? [];
      const l = normalizzaLook(p?.look, uid);
      setSbloccati(ok);
      setLook({
        ...l,
        capelli: PREMI_TAGLI[l.capelli] && !ok.includes(PREMI_TAGLI[l.capelli]) ? 0 : l.capelli,
        coloreCapelli: PREMI_COLORI[l.coloreCapelli] && !ok.includes(PREMI_COLORI[l.coloreCapelli]) ? 0 : l.coloreCapelli,
        maglione: PREMI_MAGLIONI[l.maglione] && !ok.includes(PREMI_MAGLIONI[l.maglione]) ? 0 : l.maglione,
        cucitura: premioCucitura(l.cucitura ?? 0) && !ok.includes(premioCucitura(l.cucitura ?? 0)!) ? 0 : l.cucitura,
        accessori: l.accessori.filter((a) => ok.includes(a)),
      });
    })();
  }, [supabase]);

  function cambia(campi: Partial<Look>) {
    if (look) setLook({ ...look, ...campi });
  }

  const indietro = `/gruppo/${gruppo}`;

  // Si salva col tasto in fondo, poi si torna da dove si era venuti
  async function salva() {
    setSalvo(true);
    const { error } = await supabase.rpc("save_avatar", { p_look: look });
    if (error) {
      setSalvo(false);
      return setErrore("Non sono riuscito a salvare. Riprova.");
    }
    router.push(indietro);
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
      <TestataInterna
        indietro={indietro}
        etichettaIndietro="Torna al gruppo"
        titolo="Guardaroba"
        sottotitolo="Vesti il tuo personaggio: lo vedranno gli amici di questo gruppo. Usando il sito sbloccherai dei doni a sorpresa."
      />

      {!look ? (
        <p className="mt-8 text-crema/80">Carico il tuo personaggio…</p>
      ) : (
        <>
          <div className="sticky top-[calc(env(safe-area-inset-top)+8px)] z-10 mt-6 flex flex-col items-center">
            <span className="rounded-full shadow-[0_8px_16px_-8px_rgba(0,0,0,.5)]">
              <ToppaAvatar look={look} dimensione={128} nome="Il tuo personaggio" />
            </span>
          </div>
          <div className="mt-6">
            <EditorPersonaggio look={look} sbloccati={sbloccati} onCambia={cambia} riquadri />
          </div>

          {/* Tasto Salva sempre a portata di pollice */}
          <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex flex-col gap-3 bg-gradient-to-t from-abete-scuro via-abete-scuro/90 to-transparent px-5 pt-8 pb-[max(16px,env(safe-area-inset-bottom))]">
            <Errore>{errore}</Errore>
            <Tasto onClick={salva} disabled={salvo}>
              {salvo ? "Salvo…" : appenaEntrato ? "Salva e vai al gruppo" : "Salva"}
            </Tasto>
          </div>
        </>
      )}
    </main>
  );
}
