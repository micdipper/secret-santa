"use client";

import { useState } from "react";
import { normalizzaLook } from "@/components/avatar";
import { Calendario, type Finestra } from "@/components/giochi/calendario";
import { TestataInterna } from "@/components/ui";
import { useOraServer } from "@/lib/giochi/ora";
import { NOMI_PROVA } from "@/lib/prove";

// Sala prove del calendario: come se oggi fosse il giorno del gioco 3.
// Le finestrelle si aprono tutte (anche quelle chiuse), si gioca senza limiti e non si salva niente.
const GIORNO = 86_400_000;

function finestreFinte(): Finestra[] {
  const mezzanotte = new Date();
  mezzanotte.setHours(0, 0, 0, 0);
  return [1, 2, 3, 4, 5].map((n) => {
    const apre = mezzanotte.getTime() + (n - 3) * GIORNO;
    const nome = NOMI_PROVA[n - 1];
    return { n, apre, chiude: apre + GIORNO, deciso: n < 3, vincitore: n < 3 ? { nome, look: normalizzaLook(null, nome) } : null, mieiTentativi: 0 };
  });
}

export default function ProvaCalendario() {
  const [finestre] = useState(finestreFinte);
  const ora = useOraServer(0);
  if (!ora) return <main className="flex-1" />;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove · come se oggi fosse il giorno del gioco 3"
        titolo="Calendario dei giochi"
        sottotitolo="Qui tutte le finestrelle si aprono, anche quelle ancora cucite. Niente viene salvato."
      />
      <div className="mt-6">
        <Calendario finestre={finestre} ora={ora} href={(n) => `/prove/giochi/${n}`} sempreAperte />
      </div>
    </main>
  );
}
