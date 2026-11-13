"use client";

import { useState } from "react";
import { ICONE_CASSETTO } from "@/components/bacheca";
import { CassettoIllustrato } from "@/components/cassetto";
import { CATALOGO, NOMI_TIPI, type TipoToppa } from "@/components/toppe";
import { TestataInterna } from "@/components/ui";
import { suoni } from "@/lib/suoni";

// PROVA di come potrebbe essere il cassetto delle toppe disegnato (non ancora nella bacheca vera)
export default function ProvaCassetto() {
  const [tipo, setTipo] = useState<TipoToppa>("simbolo");
  const [ultima, setUltima] = useState("");
  const toppe = CATALOGO.filter((t) => t.tipo === tipo && !t.ritirata && !t.totem);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove"
        titolo="Il cassetto"
        sottotitolo="Prova: il cassetto delle toppe disegnato come un cassetto vero. Tocca una toppa per prenderla."
      />
      <div role="tablist" className="mt-6 flex justify-between px-6">
        {(["simbolo", "parola", "palette"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tipo === t} onClick={() => setTipo(t)} className="tasto-toppa">
            <span className={`tasto-tondo cucitura cliccabile ${tipo === t ? "stoffa-vermiglio" : "stoffa-chiara"}`}>{ICONE_CASSETTO[t]}</span>
            <span className={`font-titolo text-base leading-none ${tipo === t ? "text-senape" : "text-crema"}`}>{NOMI_TIPI[t]}</span>
          </button>
        ))}
      </div>
      <div className="mt-8">
        <CassettoIllustrato
          key={tipo}
          toppe={toppe}
          etichetta={NOMI_TIPI[tipo]}
          onScegli={(t) => {
            suoni.toppa();
            setUltima(t.nome);
          }}
        />
      </div>
      <p className="mt-6 min-h-6 text-center text-crema/85" aria-live="polite">
        {ultima ? `Presa: ${ultima}` : "Qui ci sono le toppe per tutti."}
      </p>
    </main>
  );
}
