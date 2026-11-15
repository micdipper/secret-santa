"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FrancobolloTotem } from "@/components/totem";
import { VibeTotem } from "@/components/toppe";
import { Errore, Feltro, Icone, Tasto, TastoTondo, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";
import {
  DOMANDE_PREDEFINITE,
  PROFILI,
  SLOT,
  SPIEGA_PROFILO,
  TOTEM_PREDEFINITI,
  fotoPerFrancobollo,
  type Domanda,
  type Parametro,
  type Profilo,
  type Punti,
} from "@/lib/totem";

type Totem = { nome: string; descrizione: string; immagine: string | null };

export default function PaginaSondaggio() {
  return (
    <Suspense>
      <Sondaggio />
    </Suspense>
  );
}

function Sondaggio() {
  const { id } = useParams<{ id: string }>();
  const appenaCreato = useSearchParams().get("nuovo") === "1";
  const router = useRouter();
  const supabase = clientSoloBrowser();

  const [pronto, setPronto] = useState(false);
  const [nomeGruppo, setNomeGruppo] = useState("");
  const [domande, setDomande] = useState<Domanda[]>(DOMANDE_PREDEFINITE);
  const [totem, setTotem] = useState<Record<Profilo, Totem>>(
    Object.fromEntries(PROFILI.map((p) => [p, { ...TOTEM_PREDEFINITI[p], immagine: null }])) as Record<Profilo, Totem>,
  );
  const [bloccate, setBloccate] = useState(false); // qualcuno ha già risposto
  const [errore, setErrore] = useState("");
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      const { data: g } = await supabase.from("groups").select("name, organizer_id, quiz_salvato_at").eq("id", id).maybeSingle();
      if (!g || g.organizer_id !== uid) return router.replace(`/gruppo/${id}`);
      setNomeGruppo(g.name);
      if (g.quiz_salvato_at) {
        const [{ data: q }, { data: t }, { count }] = await Promise.all([
          supabase.from("quiz_questions").select("id, parametro, ordine, testo, quiz_answers(testo, punti)").eq("group_id", id).order("ordine"),
          supabase.from("quiz_totems").select("profilo, nome, descrizione, immagine").eq("group_id", id),
          supabase.from("quiz_results").select("user_id", { count: "exact", head: true }).eq("group_id", id),
        ]);
        if (q?.length) {
          setDomande(
            q.map((d) => ({
              parametro: d.parametro as Parametro,
              testo: d.testo,
              risposte: Object.fromEntries((d.quiz_answers as { testo: string; punti: number }[]).map((a) => [String(a.punti), a.testo])) as Record<Punti, string>,
            })),
          );
        }
        if (t?.length) {
          setTotem((prima) => {
            const nuovo = { ...prima };
            for (const r of t)
              nuovo[r.profilo as Profilo] = { nome: r.nome, descrizione: r.descrizione ?? TOTEM_PREDEFINITI[r.profilo as Profilo].descrizione, immagine: r.immagine };
            return nuovo;
          });
        }
        setBloccate((count ?? 0) > 0);
      }
      setPronto(true);
    })();
  }, [supabase, id, router]);

  const quante = (p: Parametro) => domande.filter((d) => d.parametro === p).length;
  const nImp = quante("impegno");
  const nEsi = quante("esigenza");
  const valide = nImp === nEsi && nImp >= 2 && nImp <= 5;

  function cambiaDomanda(i: number, campi: Partial<Domanda>) {
    setDomande(domande.map((d, k) => (k === i ? { ...d, ...campi } : d)));
  }

  async function salva() {
    setErrore("");
    if (!bloccate && !valide) return setErrore("Servono lo stesso numero di domande per IMPEGNO ed ESIGENZA, da 2 a 5 ciascuno.");
    setSalvo(true);
    const { error } = await supabase.rpc("save_quiz", {
      p_group_id: id,
      p_domande: domande,
      p_totem: PROFILI.map((p) => ({
        profilo: p,
        nome: totem[p].nome,
        // se è uguale a quella predefinita, la salvo vuota (= usa la predefinita)
        descrizione: totem[p].descrizione.trim() === TOTEM_PREDEFINITI[p].descrizione ? "" : totem[p].descrizione,
        immagine: totem[p].immagine ?? "",
      })),
    });
    if (error) {
      setSalvo(false);
      return setErrore(error.message);
    }
    router.push(`/gruppo/${id}/organizza${appenaCreato ? "?nuovo=1" : ""}`);
  }

  if (!pronto) return <main className="mx-auto w-full max-w-md px-5 pt-16 text-crema/80">Carico il sondaggio…</main>;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro={`/gruppo/${id}/organizza`}
        etichettaIndietro="Torna a Organizza"
        contesto={nomeGruppo}
        titolo="Il sondaggio totem"
        sottotitolo="Ognuno lo compila la prima volta che apre la sua bacheca e riceve un totem. È già pronto: puoi confermarlo così o cambiarlo."
      />

      <div className="mt-6 flex flex-col gap-4">
        {/* consigli */}
        <Feltro>
          <TitoloRiquadro>Come funziona</TitoloRiquadro>
          <div className="mt-3 flex flex-col gap-3">
            <p>Le domande servono a descrivere il carattere di ognuno e a crearne un profilo, più o meno realistico.</p>
            <p>
              Ogni domanda misura <b>una sola</b> cosa: <b>IMPEGNO</b> (come regala) oppure <b>ESIGENZA</b> (come riceve). Le 4 risposte vanno
              chiaramente da un estremo all&apos;altro.
            </p>
            <p>
              <b>Importante:</b> niente domande troppo esplicite, altrimenti tutti capiscono dove vuoi arrivare. Meglio partire da situazioni
              quotidiane che sembrano non c&apos;entrare niente.
            </p>
            <div className="rounded-2xl bg-crema/70 p-4 text-sm">
              <p>✗ Troppo esplicita: “Quanto ti impegni quando fai un regalo?”</p>
              <p className="mt-2">✓ Molto meglio: “Come carichi la lavastoviglie?”</p>
              <ul className="mt-1 list-inside list-disc">
                <li>piatti divisi per forma, bicchieri allineati, posate a testa in giù (molto +)</li>
                <li>con un certo ordine, quando ho tempo (poco +)</li>
                <li>dove c&apos;è spazio (poco −)</li>
                <li>butto dentro tutto e premo un tasto a caso (molto −)</li>
              </ul>
              <p className="mt-2">Chi si impegna nelle piccole cose si impegna anche nei regali: si risponde ridendo e nessuno sospetta niente.</p>
            </div>
            <p>I totem sono identikit volutamente diversissimi, per far ridere. Il totem bonus esce quando le risposte su un parametro si annullano (totale esattamente 0).</p>
          </div>
        </Feltro>

        {/* domande */}
        {bloccate ? (
          <Feltro>
            <TitoloRiquadro>Domande</TitoloRiquadro>
            <p className="mt-2 text-sm text-inchiostro/70">Qualcuno ha già risposto: le domande sono bloccate, così i risultati restano confrontabili.</p>
            <ol className="mt-3 list-inside list-decimal">
              {domande.map((d, i) => (
                <li key={i} className="py-1">
                  {d.testo} <span className="text-sm text-inchiostro/60">({d.parametro === "impegno" ? "IMPEGNO" : "ESIGENZA"})</span>
                </li>
              ))}
            </ol>
          </Feltro>
        ) : (
          <>
            {domande.map((d, i) => (
              <Feltro key={i}>
                <div className="flex items-start gap-3">
                  <TitoloRiquadro className="flex-1">Domanda {i + 1}</TitoloRiquadro>
                  <TastoTondo etichetta={`Togli la domanda ${i + 1}`} icona={Icone.meno} disabled={quante(d.parametro) <= 2} onClick={() => setDomande(domande.filter((_, k) => k !== i))} />
                </div>
                <div role="radiogroup" aria-label="Cosa misura" className="mt-4 grid grid-cols-2 gap-3">
                  {(["impegno", "esigenza"] as Parametro[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={d.parametro === p}
                      onClick={() => cambiaDomanda(i, { parametro: p })}
                      className={`cucitura cliccabile relative flex h-14 items-center justify-center [--raggio:28px] rounded-[28px] font-titolo text-lg ${d.parametro === p ? "stoffa-vermiglio" : "stoffa-chiara"}`}
                    >
                      {p === "impegno" ? "Impegno" : "Esigenza"}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-inchiostro/70">{d.parametro === "impegno" ? "Come regala: + = ci mette l'anima, − = la prima cosa che capita." : "Come riceve: + = esigente, − = va bene tutto."}</p>
                <label className="mt-4 block font-medium" htmlFor={`d${i}`}>
                  Domanda
                </label>
                <div className="campo-cucito mt-2">
                  <textarea
                    id={`d${i}`}
                    rows={2}
                    maxLength={300}
                    value={d.testo}
                    onChange={(e) => cambiaDomanda(i, { testo: e.target.value })}
                    className="block w-full resize-none bg-transparent px-5 py-4 text-inchiostro outline-none"
                  />
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {SLOT.map((sl) => (
                    <div key={sl.punti}>
                      <label className="text-sm font-medium" htmlFor={`d${i}r${sl.punti}`}>
                        Risposta “{sl.etichetta}”
                      </label>
                      <div className="campo-cucito mt-1">
                        <input
                          id={`d${i}r${sl.punti}`}
                          maxLength={200}
                          value={d.risposte[sl.punti]}
                          onChange={(e) => cambiaDomanda(i, { risposte: { ...d.risposte, [sl.punti]: e.target.value } })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Feltro>
            ))}
            <Feltro>
              <TitoloRiquadro>Quante domande</TitoloRiquadro>
              <p className="mt-2">
                Impegno: <b>{nImp}</b> · Esigenza: <b>{nEsi}</b>. Servono lo stesso numero, da 2 a 5 ciascuno (consigliato 3).
              </p>
              {!valide && <p className="mt-2 text-sm text-vermiglio-scuro">Così non va ancora: sistema il numero di domande.</p>}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(["impegno", "esigenza"] as Parametro[]).map((p) => (
                  <Tasto
                    key={p}
                    tipo="secondario"
                    disabled={quante(p) >= 5}
                    onClick={() => setDomande([...domande, { parametro: p, testo: "", risposte: { "2": "", "1": "", "-1": "", "-2": "" } }])}
                  >
                    + {p === "impegno" ? "Impegno" : "Esigenza"}
                  </Tasto>
                ))}
              </div>
            </Feltro>
          </>
        )}

        {/* totem */}
        <Feltro>
          <TitoloRiquadro>I 5 totem</TitoloRiquadro>
          <p className="mt-2 text-sm text-inchiostro/70">Puoi cambiare nome e descrizione. Il disegno resta legato al profilo.</p>
          <div className="mt-4 flex flex-col gap-6">
            {PROFILI.map((p) => (
              <div key={p} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <FrancobolloTotem profilo={p} immagine={totem[p].immagine} className="w-16 flex-none" />
                  <p className="text-sm text-inchiostro/70">{SPIEGA_PROFILO[p]}</p>
                </div>
                {/* la vibe del totem: le sue toppe (le vedrà nel cassetto solo chi riceve questo totem) */}
                <div className="rounded-[20px] bg-crema/70 p-3">
                  <p className="mb-3 text-sm text-inchiostro/70">Le sue toppe: le troverà nel cassetto solo chi riceve questo totem.</p>
                  <VibeTotem profilo={p} />
                </div>
                {/* foto dalla galleria al posto del disegno (ritagliata a francobollo) */}
                <label className="tasto cucitura cliccabile stoffa-chiara cursor-pointer">
                  <span>{totem[p].immagine ? "Cambia la foto" : "Usa una tua foto"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        const immagine = await fotoPerFrancobollo(f);
                        setTotem((t) => ({ ...t, [p]: { ...t[p], immagine } }));
                      } catch {
                        setErrore("Non riesco a leggere questa foto. Prova con un'altra.");
                      }
                    }}
                  />
                </label>
                {totem[p].immagine && (
                  <Tasto tipo="secondario" onClick={() => setTotem({ ...totem, [p]: { ...totem[p], immagine: null } })}>
                    Torna al disegno
                  </Tasto>
                )}
                <div className="campo-cucito">
                  <input aria-label="Nome del totem" maxLength={60} value={totem[p].nome} onChange={(e) => setTotem({ ...totem, [p]: { ...totem[p], nome: e.target.value } })} />
                </div>
                <div className="campo-cucito">
                  <textarea
                    aria-label="Descrizione del totem"
                    rows={3}
                    maxLength={400}
                    value={totem[p].descrizione}
                    onChange={(e) => setTotem({ ...totem, [p]: { ...totem[p], descrizione: e.target.value } })}
                    className="block w-full resize-none bg-transparent px-5 py-4 text-inchiostro outline-none"
                  />
                </div>
                <Tasto
                  tipo="secondario"
                  disabled={totem[p].descrizione === TOTEM_PREDEFINITI[p].descrizione}
                  onClick={() => setTotem({ ...totem, [p]: { ...totem[p], descrizione: TOTEM_PREDEFINITI[p].descrizione } })}
                >
                  Usa la predefinita
                </Tasto>
              </div>
            ))}
          </div>
        </Feltro>

        <Errore>{errore}</Errore>
        <Tasto onClick={salva} disabled={salvo || (!bloccate && !valide)}>
          {salvo ? "Salvo…" : "Salva il sondaggio"}
        </Tasto>
      </div>
    </main>
  );
}
