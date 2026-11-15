"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnnunciVincitori } from "@/components/giochi/annuncio";
import { Benvenuto, Calendario, type Finestra } from "@/components/giochi/calendario";
import { Feltro, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { caricaGiochi, caricaPersone, finestreDa, vittorieDa } from "@/lib/giochi/dati";
import { aperturaCalendario, benvenutoVisto, giorniAlloScambio, segnaBenvenuto } from "@/lib/giochi/avvento";
import { durataBreve, scartoDa, statoDa, useOraServer } from "@/lib/giochi/ora";
import { clientSoloBrowser } from "@/lib/supabase/client";

// Mini giochi dell'avvento del gruppo: il calendario si apre 5 giorni prima dello scambio, poi un regalo (gioco) al giorno.
export default function PaginaCalendario() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [nomeGruppo, setNomeGruppo] = useState("");
  const [conData, setConData] = useState(false);
  const [dati, setDati] = useState<{ attivi: boolean; finestre: Finestra[]; scarto: number } | null>(null);

  const carica = useCallback(async () => {
    const supabase = clientSoloBrowser();
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return router.replace("/");
    const [g, giochi, persone] = await Promise.all([
      supabase.from("groups").select("name, exchange_date").eq("id", id).maybeSingle(),
      caricaGiochi(supabase, id),
      caricaPersone(supabase, id),
    ]);
    if (!g.data || !giochi) return router.replace(`/gruppo/${id}`);
    setNomeGruppo(g.data.name);
    setConData(!!g.data.exchange_date);
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

  // benvenuto: la prima volta che si apre il calendario (una volta per gruppo, ricordato nel telefono)
  const [benvenuto, setBenvenuto] = useState(false);
  const apertura = dati?.attivi && dati.finestre.length === 5 ? aperturaCalendario(dati.finestre[0].apre) : null;
  const aperto = apertura !== null && ora >= apertura;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- memoria del telefono (solo nel browser)
    if (aperto && !benvenutoVisto(id)) setBenvenuto(true);
  }, [aperto, id]);

  if (!dati || !ora) return <main className="flex-1" />;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro={`/gruppo/${id}`}
        etichettaIndietro="Torna al gruppo"
        contesto={nomeGruppo}
        titolo="Mini giochi dell'avvento"
        sottotitolo="Un regalo da scartare ogni giorno fino allo scambio."
      />
      <div className="mt-6">
        {dati.attivi && aperto ? (
          <Calendario finestre={dati.finestre} ora={ora} href={(n) => `/gruppo/${id}/giochi/${n}`} gruppo={id} />
        ) : dati.attivi && apertura !== null ? (
          <Feltro>
            <TitoloRiquadro>Non è ancora il momento</TitoloRiquadro>
            <p className="mt-2">
              Ripassa tra qualche giorno: il calendario si sblocca 5 giorni prima dello scambio, cioè tra {durataBreve(apertura - ora)}.
            </p>
          </Feltro>
        ) : (
          <Feltro>
            <TitoloRiquadro>{conData ? "Niente giochi per questo gruppo" : "Non è ancora il momento"}</TitoloRiquadro>
            <p className="mt-2">
              {conData
                ? "I giochi partono solo se, quando si fissa la data dello scambio, mancano almeno 6 giorni."
                : "Ripassa tra qualche giorno: i giochi si sbloccano quando l'organizzatore sceglie il giorno dello scambio (almeno 6 giorni prima)."}
            </p>
          </Feltro>
        )}
      </div>
      {/* chi ha vinto i giochi chiusi (dopo il benvenuto, se c'è) */}
      {!benvenuto && <AnnunciVincitori gruppo={id} vittorie={vittorieDa(dati.finestre)} />}
      {aperto && (
        <Benvenuto
          giorni={giorniAlloScambio(dati.finestre[4].apre, ora)}
          aperto={benvenuto}
          onChiudi={() => {
            segnaBenvenuto(id);
            setBenvenuto(false);
          }}
        />
      )}
    </main>
  );
}
