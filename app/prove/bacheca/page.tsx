"use client";

import { useState } from "react";
import { Bacheca } from "@/components/bacheca";
import { leggiToppeProva } from "@/components/editor-toppe";
import type { RigaPersonalizzata } from "@/components/toppe";
import { FrancobolloTotem } from "@/components/totem";
import { TestataInterna } from "@/components/ui";
import { PROFILI, TOTEM_PREDEFINITI, type Profilo } from "@/lib/totem";

export default function ProvaBacheca() {
  const [profilo, setProfilo] = useState<Profilo>("IMPEGNO_ALTO_RICEVE_TUTTO");
  // le toppe create in /prove/toppe (solo in questo telefono; servono solo a cassetto aperto)
  const [personalizzate] = useState<RigaPersonalizzata[]>(() => (typeof window === "undefined" ? [] : leggiToppeProva()));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-56">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove"
        titolo="Bacheca di prova"
        sottotitolo="Attacca, sposta, ricama: non si salva niente. Scegli un totem per vedere le sue toppe nel cassetto."
      />
      <div role="radiogroup" aria-label="Totem di prova" className="mt-6 flex justify-between">
        {PROFILI.map((p) => (
          <button
            key={p}
            role="radio"
            aria-checked={profilo === p}
            aria-label={TOTEM_PREDEFINITI[p].nome}
            title={TOTEM_PREDEFINITI[p].nome}
            onClick={() => setProfilo(p)}
            className={`w-14 transition-transform ${profilo === p ? "-translate-y-1 scale-110" : "opacity-60"}`}
          >
            <FrancobolloTotem profilo={p} className="block w-full drop-shadow-[0_3px_3px_rgba(0,0,0,.35)]" />
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-sm text-crema/80">
        Totem: <b className="font-titolo text-base text-senape">{TOTEM_PREDEFINITI[profilo].nome}</b>
      </p>
      <div className="mt-4">
        <Bacheca groupId="prova" memberId="prova" modificabile iniziali={[]} prova totem={{ profilo, nome: TOTEM_PREDEFINITI[profilo].nome }} personalizzate={personalizzate} />
      </div>
    </main>
  );
}
