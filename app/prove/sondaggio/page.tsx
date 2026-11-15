"use client";

import { useState } from "react";
import { SondaggioTotem } from "@/components/sondaggio-totem";
import { TestataInterna } from "@/components/ui";

export default function ProvaSondaggio() {
  const [giro, setGiro] = useState(0);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove"
        titolo="Sondaggio di prova"
        sottotitolo="Con le domande predefinite. Non si salva niente."
      />
      <div className="mt-6">
        <SondaggioTotem key={giro} groupId="prova" prova onFinito={() => setGiro((g) => g + 1)} />
      </div>
    </main>
  );
}
