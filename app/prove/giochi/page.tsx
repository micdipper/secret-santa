"use client";

import { useState } from "react";
import { normalizzaLook } from "@/components/avatar";
import { AnnunciVincitori } from "@/components/giochi/annuncio";
import { Benvenuto, Calendario, type Finestra } from "@/components/giochi/calendario";
import { giorniAlloScambio } from "@/lib/giochi/avvento";
import { Tasto, TestataInterna } from "@/components/ui";
import { useOraServer } from "@/lib/giochi/ora";
import { NOMI_PROVA } from "@/lib/prove";

// Sala prove del calendario: come se oggi fosse il giorno del gioco 3.
// Si scartano tutti i regali (anche quelli futuri), si gioca senza limiti e non si salva niente.
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
  const [benvenuto, setBenvenuto] = useState(true); // in sala prove si vede ogni volta
  const [annunci, setAnnunci] = useState(0); // 0 = nessuno; ogni prova rimonta gli annunci
  const ora = useOraServer(0);
  if (!ora) return <main className="flex-1" />;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove · come se oggi fosse il giorno del gioco 3"
        titolo="Mini giochi dell'avvento"
        sottotitolo="Qui si scartano tutti i regali, anche quelli dei giorni che devono ancora arrivare. Niente viene salvato."
      />
      <div className="mt-6">
        <Calendario finestre={finestre} ora={ora} href={(n) => `/prove/giochi/${n}`} gruppo={null} sempreAperte />
      </div>
      <Tasto tipo="secondario" className="mt-6" onClick={() => setAnnunci((a) => a + 1)}>
        Prova l&apos;annuncio dei vincitori
      </Tasto>
      {annunci > 0 && (
        <AnnunciVincitori
          key={annunci}
          gruppo={null}
          vittorie={[
            { n: 1, nome: NOMI_PROVA[0], look: normalizzaLook(null, NOMI_PROVA[0]), mio: false },
            { n: 5, nome: "Tu", look: normalizzaLook(null, "tu-prova"), mio: true },
          ]}
          onFinito={() => setAnnunci(0)}
        />
      )}
      <Benvenuto giorni={giorniAlloScambio(finestre[4].apre, ora)} aperto={benvenuto} onChiudi={() => setBenvenuto(false)} />
    </main>
  );
}
