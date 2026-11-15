"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Calendario, type Finestra } from "@/components/giochi/calendario";
import { Feltro, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { caricaGiochi, caricaPersone, finestreDa } from "@/lib/giochi/dati";
import { scartoDa, statoDa, useOraServer } from "@/lib/giochi/ora";
import { clientSoloBrowser } from "@/lib/supabase/client";

// Calendario dei giochi del gruppo: 5 finestrelle, una al giorno da 4 giorni prima dello scambio.
export default function PaginaCalendario() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [nomeGruppo, setNomeGruppo] = useState("");
  const [dati, setDati] = useState<{ attivi: boolean; finestre: Finestra[]; scarto: number } | null>(null);

  const carica = useCallback(async () => {
    const supabase = clientSoloBrowser();
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return router.replace("/");
    const [g, giochi, persone] = await Promise.all([
      supabase.from("groups").select("name").eq("id", id).maybeSingle(),
      caricaGiochi(supabase, id),
      caricaPersone(supabase, id),
    ]);
    if (!g.data || !giochi) return router.replace(`/gruppo/${id}`);
    setNomeGruppo(g.data.name);
    setDati({ attivi: giochi.attivi, finestre: finestreDa(giochi, persone), scarto: scartoDa(giochi.ora_server) });
  }, [id, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dati dal database (asincrono)
    carica();
    const torna = () => document.visibilityState === "visible" && carica();
    document.addEventListener("visibilitychange", torna);
    return () => document.removeEventListener("visibilitychange", torna);
  }, [carica]);

  const ora = useOraServer(dati?.scarto ?? 0);
  // a mezzanotte una finestrella si apre o si chiude: ricarico. Finché un vincitore non è deciso, ricarico ogni 8 s.
  const stati = dati?.finestre.map((f) => statoDa(f.apre, f.chiude, ora)).join() ?? "";
  const statiPrima = useRef(stati);
  useEffect(() => {
    if (statiPrima.current && stati !== statiPrima.current) carica();
    statiPrima.current = stati;
  }, [stati, carica]);
  const inAttesa = dati?.finestre.some((f) => statoDa(f.apre, f.chiude, ora) === "chiuso" && !f.deciso);
  useEffect(() => {
    if (!inAttesa) return;
    const t = setInterval(carica, 8000);
    return () => clearInterval(t);
  }, [inAttesa, carica]);

  if (!dati || !ora) return <main className="flex-1" />;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro={`/gruppo/${id}`}
        etichettaIndietro="Torna al gruppo"
        contesto={nomeGruppo}
        titolo="Calendario dei giochi"
        sottotitolo="Un gioco al giorno fino allo scambio. 3 tentativi a testa: vince il punteggio migliore."
      />
      <div className="mt-6">
        {dati.attivi ? (
          <Calendario finestre={dati.finestre} ora={ora} href={(n) => `/gruppo/${id}/giochi/${n}`} />
        ) : (
          <Feltro>
            <TitoloRiquadro>Niente giochi per questo gruppo</TitoloRiquadro>
            <p className="mt-2">I giochi partono solo se, quando si fissa la data dello scambio, mancano almeno 6 giorni.</p>
          </Feltro>
        )}
      </div>
    </main>
  );
}
