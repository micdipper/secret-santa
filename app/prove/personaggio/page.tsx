"use client";

import { useState } from "react";
import { ACCESSORI, LOOK_BASE, ToppaAvatar, type Look } from "@/components/avatar";
import { EditorPersonaggio } from "@/components/editor-personaggio";
import { TestataInterna } from "@/components/ui";

// tutti i premi sbloccati, per vederli tutti
const TUTTI = [...ACCESSORI.map((a) => a.id), "super", "olografico", "cuciture", "cornici", "neon", "pazzo", "godo"];

export default function ProvaPersonaggio() {
  const [look, setLook] = useState<Look>(LOOK_BASE);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove"
        titolo="Personaggio di prova"
        sottotitolo="Tutti i doni sono sbloccati. Non si salva niente."
      />
      <div className="sticky top-[calc(env(safe-area-inset-top)+8px)] z-10 mt-6 flex justify-center">
        <span className="rounded-full shadow-[0_8px_16px_-8px_rgba(0,0,0,.5)]">
              <ToppaAvatar look={look} dimensione={128} nome="Personaggio di prova" />
            </span>
      </div>
      <div className="mt-6">
        <EditorPersonaggio look={look} sbloccati={TUTTI} onCambia={(c) => setLook({ ...look, ...c })} riquadri />
      </div>
    </main>
  );
}
