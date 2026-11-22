"use client";

import { useRef, useState } from "react";
import { RifaiEstrazione } from "@/components/rifai-estrazione";
import { RiquadroEsclusioni, type Esclusione } from "@/components/esclusioni";
import { Errore, Feltro, Icone, Tasto, TastoTondo, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { creaClientBrowser } from "@/lib/supabase/client";

// Sala prove: estrazione con persone inventate (nomi modificabili) e lo stesso riquadro
// "Chi non deve pescarsi" della pagina Organizza. Usa la stessa regola dell'estrazione vera, non salva niente.
type Persona = { id: string; nome: string };

export default function ProvaEstrazione() {
  const prossimo = useRef(7);
  const [persone, setPersone] = useState<Persona[]>(
    ["Giulia", "Marco", "Sara", "Luca", "Anna", "Pietro"].map((nome, i) => ({ id: `p${i + 1}`, nome })),
  );
  const [esclusioni, setEsclusioni] = useState<Esclusione[]>([{ member_a: "p1", member_b: "p2", reason: "coppia" }]);
  const [cerchio, setCerchio] = useState<string[] | null>(null);
  const [errore, setErrore] = useState("");
  const [estraggo, setEstraggo] = useState(false);
  const nome = (id: string) => persone.find((p) => p.id === id)?.nome.trim() || "?";

  async function estrai() {
    setErrore("");
    if (persone.some((p) => !p.nome.trim())) return setErrore("C'è una persona senza nome.");
    setEstraggo(true);
    // la stessa funzione del database usata dall'estrazione vera (persone numerate da 1), ma non salva niente
    const numero = (id: string) => persone.findIndex((p) => p.id === id) + 1;
    const { data, error } = await creaClientBrowser().rpc("prova_estrazione", {
      p_n: persone.length,
      p_coppie: esclusioni.filter((v) => v.reason !== "anno_scorso").flatMap((v) => [numero(v.member_a), numero(v.member_b)]),
      p_anno: esclusioni.filter((v) => v.reason === "anno_scorso").flatMap((v) => [numero(v.member_a), numero(v.member_b)]),
    });
    setEstraggo(false);
    if (error) return setErrore(error.message);
    if (!data) {
      setCerchio(null);
      return setErrore("Con queste esclusioni non si trova una catena valida. Prova a toglierne qualcuna.");
    }
    setCerchio((data as number[]).map((k) => persone[k - 1].id));
  }

  function togliPersona(id: string) {
    setPersone(persone.filter((p) => p.id !== id));
    setEsclusioni(esclusioni.filter((e) => e.member_a !== id && e.member_b !== id));
    setCerchio(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove"
        titolo="Estrazione di prova"
        sottotitolo="Stessa regola dell'estrazione vera: un unico cerchio, nessuno scambio a due, esclusioni rispettate. Non si salva niente."
      />

      <div className="mt-6 flex flex-col gap-4">
        <Feltro>
          <TitoloRiquadro>Chi partecipa</TitoloRiquadro>
          <p className="mt-2 text-sm text-inchiostro/70">Tocca un nome per cambiarlo.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {persone.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="campo-cucito block min-w-0 flex-1">
                  <input
                    aria-label={`Nome della persona ${i + 1}`}
                    value={p.nome}
                    maxLength={30}
                    onChange={(e) => {
                      setPersone(persone.map((x) => (x.id === p.id ? { ...x, nome: e.target.value } : x)));
                      setCerchio(null);
                    }}
                  />
                </span>
                <TastoTondo etichetta={`Togli ${p.nome || "questa persona"}`} icona={Icone.meno} disabled={persone.length <= 3} onClick={() => togliPersona(p.id)} />
              </li>
            ))}
          </ul>
          <Tasto
            tipo="secondario"
            className="mt-4"
            disabled={persone.length >= 30}
            onClick={() => {
              setPersone([...persone, { id: `p${prossimo.current++}`, nome: "" }]);
              setCerchio(null);
            }}
          >
            + Aggiungi una persona
          </Tasto>
        </Feltro>

        <RiquadroEsclusioni
          persone={persone.map((p) => ({ id: p.id, nome: p.nome.trim() || "(senza nome)" }))}
          esclusioni={esclusioni}
          modificabile
          onAggiungi={async (e) => {
            if (esclusioni.some((x) => x.member_a === e.member_a && x.member_b === e.member_b && x.reason === e.reason)) return "C'è già.";
            setEsclusioni([...esclusioni, e]);
            setCerchio(null);
            return null;
          }}
          onTogli={async (c) => {
            setEsclusioni(esclusioni.filter((x) => !(x.member_a === c.member_a && x.member_b === c.member_b && x.reason === c.reason)));
            setCerchio(null);
          }}
        />

        <Feltro>
          <TitoloRiquadro>Risultato</TitoloRiquadro>
          {cerchio ? (
            <ol className="mt-3 flex flex-col gap-1">
              {cerchio.map((g, i) => (
                <li key={g}>
                  🎅 <b>{nome(g)}</b> regala a <b>{nome(cerchio[(i + 1) % cerchio.length])}</b>
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
          {/* come in Organizza dopo l'estrazione vera: il pop-up che spiega cosa succede rifacendola */}
          {cerchio && (
            <RifaiEstrazione
              onRifai={async () => {
                setCerchio(null);
                return null;
              }}
            />
          )}
        </Feltro>
      </div>
    </main>
  );
}
