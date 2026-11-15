"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { controllaPremi } from "@/components/avviso-premi";
import { FrancobolloTotem } from "@/components/totem";
import { Errore, Feltro, Tasto, TitoloRiquadro } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";
import { suoni } from "@/lib/suoni";
import { DOMANDE_PREDEFINITE, PROFILI, TOTEM_PREDEFINITI, descrizioneDi, profiloDa, type Profilo, type TotemGruppo } from "@/lib/totem";

type Risposta = { id: string; testo: string };
type Domanda = { id: string; testo: string; risposte: Risposta[] };

const mescola = <T,>(l: T[]) => [...l].sort(() => Math.random() - 0.5);

// Il sondaggio totem per chi risponde: una domanda per schermata, risposte mescolate,
// mai punti o profili visibili. Il totem lo calcola il database (submit_quiz).
// In "prova" (sala prove) usa le domande predefinite e calcola qui, senza salvare.
export function SondaggioTotem({
  groupId,
  prova = false,
  rifiutato = false,
  onFinito,
}: {
  groupId: string;
  prova?: boolean;
  rifiutato?: boolean;
  onFinito: () => void;
}) {
  const supabase = clientSoloBrowser();
  const ridotto = useReducedMotion();
  const [fase, setFase] = useState<"invito" | "chiusa" | "domande" | "calcolo" | "totem">(rifiutato ? "chiusa" : "invito");
  const [domande, setDomande] = useState<Domanda[]>([]);
  const [totem, setTotem] = useState<TotemGruppo[]>([]);
  const [n, setN] = useState(0);
  const [scelte, setScelte] = useState<string[]>([]);
  const [risultato, setRisultato] = useState<Profilo | null>(null);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    (async () => {
      if (prova) {
        // nella sala prove l'id della risposta porta con sé il parametro e i punti (qui non c'è niente da nascondere)
        setDomande(
          DOMANDE_PREDEFINITE.map((d, i) => ({
            id: String(i),
            testo: d.testo,
            risposte: mescola(Object.entries(d.risposte).map(([p, t]) => ({ id: `${d.parametro}:${p}`, testo: t }))),
          })),
        );
        setTotem(PROFILI.map((p) => ({ profilo: p, nome: TOTEM_PREDEFINITI[p].nome, descrizione: null })));
        return;
      }
      const [{ data: righe }, { data: t }] = await Promise.all([
        supabase.rpc("get_quiz", { p_group_id: groupId }),
        supabase.from("quiz_totems").select("profilo, nome, descrizione, immagine").eq("group_id", groupId),
      ]);
      const mappa = new Map<string, Domanda & { ordine: number }>();
      for (const r of (righe ?? []) as { question_id: string; ordine: number; domanda: string; answer_id: string; risposta: string }[]) {
        if (!mappa.has(r.question_id)) mappa.set(r.question_id, { id: r.question_id, ordine: r.ordine, testo: r.domanda, risposte: [] });
        mappa.get(r.question_id)!.risposte.push({ id: r.answer_id, testo: r.risposta });
      }
      setDomande([...mappa.values()].sort((a, b) => a.ordine - b.ordine));
      setTotem((t ?? []) as TotemGruppo[]);
    })();
  }, [supabase, groupId, prova]);

  async function adessoNo() {
    if (!prova) await supabase.rpc("rifiuta_quiz", { p_group_id: groupId });
    setFase("chiusa");
  }

  async function scegli(id: string) {
    const nuove = [...scelte, id];
    setScelte(nuove);
    if (nuove.length < domande.length) {
      setTimeout(() => setN(nuove.length), ridotto ? 0 : 220);
      return;
    }
    setFase("calcolo");
    let profilo: Profilo;
    if (prova) {
      const somma = (par: string) => nuove.filter((x) => x.startsWith(par)).reduce((t, x) => t + Number(x.split(":")[1]), 0);
      profilo = profiloDa(somma("impegno"), somma("esigenza"));
    } else {
      const { data, error } = await supabase.rpc("submit_quiz", { p_group_id: groupId, p_answer_ids: nuove });
      if (error) {
        setErrore(error.message);
        setFase("domande");
        return;
      }
      profilo = data as Profilo;
    }
    setTimeout(
      () => {
        setRisultato(profilo);
        setFase("totem");
        suoni.fanfara();
        if (!ridotto) confetti({ particleCount: 110, spread: 90, origin: { y: 0.45 }, colors: ["#e5481e", "#e9a81c", "#f3e8cf", "#2c4a32"] });
      },
      ridotto ? 0 : 1600,
    );
  }

  // ---------- la bacheca è chiusa (ha detto "Adesso no"): si può sempre fare ----------
  if (fase === "chiusa") {
    return (
      <Feltro>
        <TitoloRiquadro>La tua bacheca è chiusa</TitoloRiquadro>
        <p className="mt-2">
          Senza il sondaggio il gioco non ti conosce, e non può darti le toppe giuste. Quando vuoi, sono poche domande veloci.
        </p>
        <Tasto className="mt-5" onClick={() => setFase("domande")} disabled={!domande.length}>
          Fai il sondaggio
        </Tasto>
      </Feltro>
    );
  }

  if (fase === "invito") {
    return (
      <Feltro>
        <TitoloRiquadro>Prima di cominciare…</TitoloRiquadro>
        <p className="mt-2">
          Qualche domanda veloce su di te: niente di serio, rispondi di pancia. Alla fine scopri il tuo totem, e la bacheca si apre.
        </p>
        <Tasto className="mt-5" onClick={() => setFase("domande")} disabled={!domande.length}>
          {domande.length ? "Iniziamo" : "Un momento…"}
        </Tasto>
        <Tasto tipo="secondario" className="mt-3" onClick={adessoNo}>
          Adesso no
        </Tasto>
      </Feltro>
    );
  }

  if (fase === "totem" && risultato) {
    const t = totem.find((x) => x.profilo === risultato) ?? { profilo: risultato, nome: TOTEM_PREDEFINITI[risultato].nome, descrizione: null };
    return (
      <div className="flex flex-col items-center text-center">
        <p className="font-titolo text-2xl">Il tuo totem è…</p>
        <motion.div
          className="mt-6 w-48 [perspective:800px]"
          initial={ridotto ? false : { y: -260, rotate: -25, scale: 0.6, opacity: 0 }}
          animate={{ y: 0, rotate: -4, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 110, damping: 11 }}
        >
          <FrancobolloTotem profilo={t.profilo} immagine={t.immagine} className="w-full drop-shadow-[0_12px_18px_rgba(0,0,0,.45)]" titolo={t.nome} />
        </motion.div>
        <motion.div initial={ridotto ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}>
          <p className="mt-6 font-titolo text-[32px] leading-none text-senape">{t.nome}</p>
          <p className="mt-3 text-crema/90">{descrizioneDi(t)}</p>
          <Tasto className="mt-6" onClick={onFinito}>
            {prova ? "Rifai la prova" : "Apri la bacheca"}
          </Tasto>
        </motion.div>
      </div>
    );
  }

  if (fase === "calcolo") {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <motion.span
          className="flex size-20 items-center justify-center rounded-full bg-crema font-titolo text-4xl text-vermiglio"
          animate={ridotto ? {} : { rotate: [0, -10, 10, -10, 0], scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 0.9 }}
        >
          ?
        </motion.span>
        <p className="mt-6 font-titolo text-2xl">Sto studiando le tue risposte…</p>
      </div>
    );
  }

  // ---------- una domanda per schermata ----------
  const d = domande[n];
  return (
    <div>
      <div className="h-3 overflow-hidden rounded-full bg-crema/20" aria-label={`Domanda ${n + 1} di ${domande.length}`}>
        <motion.div className="h-full rounded-full bg-senape" initial={{ width: 0 }} animate={{ width: `${((n + 1) / domande.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
      <p className="mt-2 text-sm text-crema/75">
        {n + 1} di {domande.length}
      </p>
      <AnimatePresence mode="wait">
        {d && (
          <motion.div
            key={d.id}
            initial={ridotto ? false : { x: 60, opacity: 0, rotate: 2 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            exit={ridotto ? undefined : { x: -60, opacity: 0, rotate: -2 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="mt-4 font-titolo text-2xl leading-tight text-balance">{d.testo}</h2>
            <div className="mt-6 flex flex-col gap-3">
              {d.risposte.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => scegli(r.id)}
                  disabled={scelte.length > n}
                  className={`cucitura cliccabile stoffa-chiara relative [--raggio:28px] rounded-[28px] px-6 py-4 text-left text-inchiostro ${scelte[n] === r.id ? "outline-3 outline-offset-2 outline-senape" : ""}`}
                >
                  {r.testo}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-4">
        <Errore>{errore}</Errore>
      </div>
    </div>
  );
}

// Nella bacheca: finito il sondaggio, ricarico la pagina (si apre la bacheca col totem)
export function SondaggioPerBacheca({ groupId, rifiutato }: { groupId: string; rifiutato: boolean }) {
  const router = useRouter();
  return (
    <SondaggioTotem
      groupId={groupId}
      rifiutato={rifiutato}
      onFinito={() => {
        router.refresh();
        controllaPremi(); // il premio del sondaggio
      }}
    />
  );
}
