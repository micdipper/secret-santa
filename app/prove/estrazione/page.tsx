"use client";

import { useState } from "react";
import { Campo, Errore, Feltro, Icone, Tasto, TastoTondo, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { creaClientBrowser } from "@/lib/supabase/client";

type Vincolo = { a: number; b: number; tipo: "coppia" | "anno_scorso" };

export default function ProvaEstrazione() {
  const [nomi, setNomi] = useState(["Giulia", "Marco", "Sara", "Luca", "Anna", "Pietro"]);
  const [nuovo, setNuovo] = useState("");
  const [vincoli, setVincoli] = useState<Vincolo[]>([{ a: 0, b: 1, tipo: "coppia" }]);
  const [va, setVa] = useState(0);
  const [vb, setVb] = useState(1);
  const [tipo, setTipo] = useState<Vincolo["tipo"]>("coppia");
  const [cerchio, setCerchio] = useState<number[] | null>(null);
  const [errore, setErrore] = useState("");
  const [estraggo, setEstraggo] = useState(false);

  async function estrai() {
    setErrore("");
    setEstraggo(true);
    // la stessa funzione del database usata dall'estrazione vera, ma non salva niente
    const { data, error } = await creaClientBrowser().rpc("prova_estrazione", {
      p_n: nomi.length,
      p_coppie: vincoli.filter((v) => v.tipo === "coppia").flatMap((v) => [v.a + 1, v.b + 1]),
      p_anno: vincoli.filter((v) => v.tipo === "anno_scorso").flatMap((v) => [v.a + 1, v.b + 1]),
    });
    setEstraggo(false);
    if (error) return setErrore(error.message);
    if (!data) {
      setCerchio(null);
      return setErrore("Con queste esclusioni non si trova una catena valida. Prova a toglierne qualcuna.");
    }
    setCerchio((data as number[]).map((k) => k - 1));
  }

  function cambiaNomi(n: string[]) {
    setNomi(n);
    setVincoli([]);
    setCerchio(null);
    setVa(0);
    setVb(1);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove"
        titolo="Estrazione di prova"
        sottotitolo="Stessa regola dell'estrazione vera: un unico cerchio, nessuno scambio a due, esclusioni rispettate."
      />

      <div className="mt-6 flex flex-col gap-4">
        <Feltro>
          <TitoloRiquadro>Chi partecipa</TitoloRiquadro>
          <ul className="mt-3 divide-y-2 divide-dashed divide-abete/15">
            {nomi.map((n, i) => (
              <li key={n} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate font-medium">{n}</span>
                <TastoTondo etichetta={`Togli ${n}`} icona={Icone.meno} disabled={nomi.length <= 3} onClick={() => cambiaNomi(nomi.filter((_, k) => k !== i))} />
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <Campo id="nuovo" etichetta="Aggiungi una persona" value={nuovo} onChange={(e) => setNuovo(e.target.value)} maxLength={30} />
            </div>
            <TastoTondo
              etichetta="Aggiungi"
              icona={Icone.piu}
              disabled={!nuovo.trim() || nomi.includes(nuovo.trim())}
              onClick={() => {
                cambiaNomi([...nomi, nuovo.trim()]);
                setNuovo("");
              }}
            />
          </div>
          <p className="mt-2 text-sm text-inchiostro/70">Cambiando la lista si azzerano le esclusioni.</p>
        </Feltro>

        <Feltro>
          <TitoloRiquadro>Chi non deve pescarsi</TitoloRiquadro>
          {vincoli.length > 0 && (
            <ul className="mt-3 divide-y-2 divide-dashed divide-abete/15">
              {vincoli.map((v, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    {v.tipo === "coppia" ? `💞 ${nomi[v.a]} e ${nomi[v.b]} (coppia)` : `🎁 ${nomi[v.a]} → ${nomi[v.b]} (anno scorso)`}
                  </span>
                  <TastoTondo etichetta="Togli" icona={Icone.meno} onClick={() => setVincoli(vincoli.filter((_, k) => k !== i))} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <select className="campo-cucito h-14 px-3" value={va} onChange={(e) => setVa(Number(e.target.value))} aria-label="Prima persona">
              {nomi.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
            <select className="campo-cucito h-14 px-3" value={vb} onChange={(e) => setVb(Number(e.target.value))} aria-label="Seconda persona">
              {nomi.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
            <select className="campo-cucito col-span-2 h-14 px-3" value={tipo} onChange={(e) => setTipo(e.target.value as Vincolo["tipo"])} aria-label="Motivo">
              <option value="coppia">Coppia (non si pescano a vicenda)</option>
              <option value="anno_scorso">Anno scorso: la prima ha regalato alla seconda</option>
            </select>
          </div>
          <Tasto tipo="secondario" className="mt-3" disabled={va === vb} onClick={() => setVincoli([...vincoli, { a: va, b: vb, tipo }])}>
            Aggiungi l&apos;esclusione
          </Tasto>
        </Feltro>

        <Feltro>
          <TitoloRiquadro>Risultato</TitoloRiquadro>
          {cerchio ? (
            <ol className="mt-3 flex flex-col gap-1">
              {cerchio.map((g, i) => (
                <li key={g}>
                  🎅 <b>{nomi[g]}</b> regala a <b>{nomi[cerchio[(i + 1) % cerchio.length]]}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-inchiostro/70">Premi “Estrai” per vedere chi regala a chi.</p>
          )}
          <div className="mt-4">
            <Errore>{errore}</Errore>
          </div>
          <Tasto className="mt-4" onClick={estrai} disabled={estraggo}>
            {estraggo ? "Estraggo…" : cerchio ? "Estrai di nuovo" : "Estrai"}
          </Tasto>
        </Feltro>
      </div>
    </main>
  );
}
