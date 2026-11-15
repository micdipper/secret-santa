"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calcolaRighe, type Partita, type Persona } from "@/components/giochi/classifica";
import { PaginaGioco, type Avvio } from "@/components/giochi/pagina-gioco";
import type { Esito } from "@/components/giochi/partita";
import { caricaGiochi, caricaPersone, type DatiGiochi } from "@/lib/giochi/dati";
import { GIOCHI } from "@/lib/giochi/elenco";
import { scartoDa, statoDa, useOraServer } from "@/lib/giochi/ora";
import { clientSoloBrowser } from "@/lib/supabase/client";

// Pagina di un gioco del gruppo: regole, "Gioca" e classifica in diretta.
export default function PaginaGiocoVera() {
  const params = useParams<{ id: string; n: string }>();
  const id = params.id;
  const n = Number(params.n);
  const info = GIOCHI[n - 1];
  const router = useRouter();
  const [nomeGruppo, setNomeGruppo] = useState("");
  const [giochi, setGiochi] = useState<DatiGiochi | null>(null);
  const [persone, setPersone] = useState<Persona[]>([]);
  const [partite, setPartite] = useState<Partita[]>([]);
  const [scarto, setScarto] = useState(0); // ora del server − ora del telefono

  const caricaPartite = useCallback(async () => {
    const { data } = await clientSoloBrowser().from("game_runs").select("member_id, score, started_at, finished_at").eq("group_id", id).eq("game", n);
    if (data) setPartite(data as Partita[]);
  }, [id, n]);

  const caricaTutto = useCallback(async () => {
    const supabase = clientSoloBrowser();
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return router.replace("/");
    const [g, dati, gente] = await Promise.all([
      supabase.from("groups").select("name").eq("id", id).maybeSingle(),
      caricaGiochi(supabase, id),
      caricaPersone(supabase, id),
      caricaPartite(),
    ]);
    if (!g.data || !dati || !info || !dati.attivi || !dati.giochi[n - 1]) return router.replace(`/gruppo/${id}/giochi`);
    setNomeGruppo(g.data.name);
    setGiochi(dati);
    setScarto(scartoDa(dati.ora_server));
    setPersone(gente);
  }, [id, n, info, router, caricaPartite]);

  // dati + diretta (Realtime) + rete di sicurezza: ricarico ogni 8 s e al ritorno sull'app (l'iPhone chiude i collegamenti)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dati dal database (asincrono)
    caricaTutto();
    const supabase = clientSoloBrowser();
    const canale = supabase
      .channel(`giochi:${id}:${n}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_runs", filter: `group_id=eq.${id}` }, (p) => {
        const riga = (p.new ?? {}) as { game?: number };
        if (riga.game === n) caricaPartite();
      })
      .subscribe();
    const giro = setInterval(() => document.visibilityState === "visible" && caricaPartite(), 8000);
    const torna = () => document.visibilityState === "visible" && caricaTutto();
    document.addEventListener("visibilitychange", torna);
    return () => {
      clearInterval(giro);
      document.removeEventListener("visibilitychange", torna);
      supabase.removeChannel(canale);
    };
  }, [id, n, caricaTutto, caricaPartite]);

  const ora = useOraServer(scarto);
  const g = giochi?.giochi[n - 1];
  const apre = g ? new Date(g.apre_alle).getTime() : 0;
  const chiude = g ? new Date(g.chiude_alle).getTime() : 0;
  const stato = g ? statoDa(apre, chiude, ora) : null;

  // a mezzanotte il gioco si apre o si chiude: ricarico; da chiuso, finché il vincitore non è deciso, ricarico ogni 8 s
  const statoPrima = useRef(stato);
  useEffect(() => {
    if (statoPrima.current && stato !== statoPrima.current) caricaTutto();
    statoPrima.current = stato;
  }, [stato, caricaTutto]);
  const inAttesa = stato === "chiuso" && g && !g.deciso;
  useEffect(() => {
    if (!inAttesa) return;
    const t = setInterval(caricaTutto, 8000);
    return () => clearInterval(t);
  }, [inAttesa, caricaTutto]);

  const righe = useMemo(() => calcolaRighe(persone, partite, ora, info?.durataMax ?? 60), [persone, partite, ora, info]);
  const io = giochi?.mio_member_id ?? null;
  const mieiTentativi = partite.filter((p) => p.member_id === io).length;

  async function avvia(): Promise<Avvio> {
    const supabase = clientSoloBrowser();
    const { data, error } = await supabase.rpc("start_game_run", { p_group_id: id, p_game: n });
    if (error || !data) {
      caricaTutto();
      return { errore: !error || error.message.includes("fetch") ? "Non riesco a iniziare la partita: controlla la connessione." : error.message };
    }
    const run = data as { id: string; seme: number };
    caricaPartite(); // compaio subito come "sta giocando…"
    return {
      seme: run.seme,
      fine: async (punteggio, stats) => {
        const r = await supabase.rpc("finish_game_run", { p_run_id: run.id, p_score: punteggio, p_stats: stats });
        if (r.error || !r.data) throw new Error(r.error?.message ?? "nessuna risposta");
        caricaPartite();
        const e = r.data as { valida: boolean; score: number; record: boolean; posizione: number; rimasti: number };
        return { punteggio: e.score, record: e.record, posizione: e.posizione, rimasti: e.rimasti, valida: e.valida } satisfies Esito;
      },
    };
  }

  if (!giochi || !g || !info || !ora) return <main className="flex-1" />;
  return (
    <PaginaGioco
      info={info}
      gruppo={id}
      contesto={`${nomeGruppo} · gioco ${n} di 5`}
      indietro={`/gruppo/${id}/giochi`}
      etichettaIndietro="Torna al calendario"
      apre={apre}
      chiude={chiude}
      ora={ora}
      deciso={g.deciso}
      vincitoreId={g.vincitore_member_id}
      righe={righe}
      io={io}
      mieiTentativi={mieiTentativi}
      avvia={avvia}
    />
  );
}
