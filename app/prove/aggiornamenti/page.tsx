"use client";

// Sala prove: la card "Il tuo regalo è per…" con l'occhio e il pop-up delle novità del sito (non si salva niente).
import { useState } from "react";
import { CardRegalo } from "@/components/card-regalo";
import { NovitaSito } from "@/components/novita-sito";
import { Tasto, TastoLink, TestataInterna, TitoloRiquadro } from "@/components/ui";

export default function ProvaAggiornamenti() {
  const [giro, setGiro] = useState(0);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove · niente viene salvato"
        titolo="Card e novità"
        sottotitolo="L'occhio sulla card di chi hai pescato e il pop-up con le novità dell'ultimo aggiornamento."
      />
      <CardRegalo
        groupId="prova"
        fronte={
          <>
            <p className="text-sm text-inchiostro/70">Il tuo regalo è per</p>
            <TitoloRiquadro className="mt-3">Giulia Rossi</TitoloRiquadro>
          </>
        }
        nota={<p>Acqua in bocca! Budget 20 €.</p>}
        azioni={
          <TastoLink href="/prova-busta" tipo="secondario" className="mt-5">
            La carta che brilla
          </TastoLink>
        }
      />
      <Tasto tipo="secondario" className="mt-6" onClick={() => setGiro((g) => g + 1)}>
        Rivedi le novità
      </Tasto>
      <NovitaSito key={giro} prova />
    </main>
  );
}
