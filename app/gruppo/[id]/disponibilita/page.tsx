"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { lookDi } from "@/components/avatar";
import { AvvisoDataVicina, dataTroppoVicina } from "@/components/avviso-data";
import { Disponibilita, type PersonaDisp } from "@/components/disponibilita";
import { dataLunga } from "@/lib/disponibilita";
import { Feltro, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";

type Dati = { nome: string; organizzatore: boolean; giorni: string[] | null; data: string | null; persone: PersonaDisp[]; io: string | null };

// Disponibilità per lo scambio: ognuno dice in quali giorni proposti c'è; l'organizzatore fissa la data.
// Le risposte di tutti si aggiornano in diretta (Realtime + ricarica al ritorno sull'app).
export default function PaginaDisponibilita() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dati, setDati] = useState<Dati | null>(null);
  const [risposte, setRisposte] = useState<Record<string, string[]>>({});
  const [salvataggio, setSalvataggio] = useState<"" | "salvo" | "salvato">("");
  const [errore, setErrore] = useState("");
  const [avviso, setAvviso] = useState<string | null>(null); // giorno da fissare, se a meno di 6 giorni
  const ultimoInvio = useRef(0);

  const caricaRisposte = useCallback(async () => {
    const { data } = await clientSoloBrowser().from("disponibilita").select("member_id, giorni").eq("group_id", id);
    if (data) setRisposte(Object.fromEntries(data.map((r) => [r.member_id, r.giorni as string[]])));
  }, [id]);

  const carica = useCallback(async () => {
    const supabase = clientSoloBrowser();
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) return router.replace("/");
    const [{ data: g }, { data: membri }] = await Promise.all([
      supabase.from("groups").select("name, organizer_id, giorni_proposti, exchange_date").eq("id", id).maybeSingle(),
      supabase.from("group_members").select("id, display_name, user_id").eq("group_id", id).order("display_name"),
      caricaRisposte(),
    ]);
    if (!g || !membri) return router.replace(`/gruppo/${id}`);
    const ids = membri.flatMap((m) => (m.user_id ? [m.user_id] : []));
    const { data: profili } = ids.length ? await supabase.from("profiles").select("user_id, look").in("user_id", ids) : { data: [] };
    setDati({
      nome: g.name,
      organizzatore: g.organizer_id === uid,
      giorni: g.giorni_proposti ? [...(g.giorni_proposti as string[])].sort() : null,
      data: g.exchange_date,
      persone: membri.map((m) => ({ memberId: m.id, nome: m.display_name, look: lookDi(profili, m.user_id), entrato: !!m.user_id })),
      io: membri.find((m) => m.user_id === uid)?.id ?? null,
    });
  }, [id, router, caricaRisposte]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dati dal database (asincrono)
    carica();
    const supabase = clientSoloBrowser();
    const canale = supabase
      .channel(`disponibilita:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "disponibilita", filter: `group_id=eq.${id}` }, () => {
        // (le mie modifiche le ho già sullo schermo: non ricarico subito sopra quello che sto toccando)
        if (Date.now() - ultimoInvio.current > 1500) caricaRisposte();
      })
      .subscribe();
    const torna = () => document.visibilityState === "visible" && carica();
    document.addEventListener("visibilitychange", torna);
    const giro = setInterval(() => document.visibilityState === "visible" && Date.now() - ultimoInvio.current > 3000 && carica(), 15000); // anche la data fissata dall'organizzatore
    return () => {
      clearInterval(giro);
      document.removeEventListener("visibilitychange", torna);
      supabase.removeChannel(canale);
    };
  }, [id, carica, caricaRisposte]);

  async function cambia(giorni: string[]) {
    if (!dati?.io) return;
    setRisposte((r) => ({ ...r, [dati.io!]: giorni }));
    setSalvataggio("salvo");
    setErrore("");
    ultimoInvio.current = Date.now();
    const { error } = await clientSoloBrowser().rpc("imposta_disponibilita", { p_group_id: id, p_giorni: giorni });
    ultimoInvio.current = Date.now();
    if (error) {
      setSalvataggio("");
      setErrore(error.message.includes("fetch") ? "Non sono riuscito a salvare: controlla la connessione." : error.message);
      carica();
    } else setSalvataggio("salvato");
  }

  async function fissa(giorno: string, senzaGiochi = false) {
    if (dataTroppoVicina(giorno) && !senzaGiochi) return setAvviso(giorno);
    setAvviso(null);
    setErrore("");
    // la data e la chiusura del sondaggio insieme (il database ricalcola i mini giochi)
    const { error } = await clientSoloBrowser().from("groups").update({ exchange_date: giorno, giorni_proposti: null }).eq("id", id);
    if (error) return setErrore(error.message.includes("bloccata") ? error.message : "Non sono riuscito a fissare la data. Riprova.");
    carica();
  }

  if (!dati) return <main className="flex-1" />;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro={`/gruppo/${id}`}
        etichettaIndietro={`Torna a ${dati.nome}`}
        contesto={dati.nome}
        titolo="Quando facciamo lo scambio?"
        sottotitolo={dati.giorni ? "L'organizzatore ha proposto alcuni giorni: dite in quali ci siete." : undefined}
      />
      <div className="mt-6">
        {dati.giorni ? (
          <Disponibilita
            giorni={dati.giorni}
            persone={dati.persone}
            risposte={risposte}
            io={dati.io}
            organizzatore={dati.organizzatore}
            salvataggio={salvataggio}
            errore={errore}
            onCambia={cambia}
            onFissa={(g) => fissa(g)}
          />
        ) : (
          <Feltro>
            <TitoloRiquadro>{dati.data ? "La data è fissata!" : "Nessun sondaggio in corso"}</TitoloRiquadro>
            <p className="mt-2">{dati.data ? `Lo scambio è ${dataLunga(dati.data)}.` : "L'organizzatore non ha proposto giorni da scegliere."}</p>
          </Feltro>
        )}
      </div>
      <AvvisoDataVicina aperto={avviso !== null} onAltraData={() => setAvviso(null)} onContinua={() => avviso && fissa(avviso, true)} />
    </main>
  );
}
