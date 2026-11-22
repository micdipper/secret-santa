"use client";

// Sala prove: l'avviso di fine Secret Santa nei vari giorni (non si salva niente).
import { FineSanta } from "@/components/fine-santa";
import { TestataInterna } from "@/components/ui";

const ESEMPI = [
  { data: "2027-01-08", giorni: 7, visto: 0 },
  { data: "2027-01-08", giorni: 2, visto: 5 },
  { data: "2027-01-08", giorni: 1, visto: 6 },
  { data: "2027-01-08", giorni: 0, visto: 7 },
];

export default function ProvaFineSanta() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove · niente viene salvato"
        titolo="Fine del Secret Santa"
        sottotitolo="La striscia sta fissa in basso nella pagina del gruppo da 7 giorni prima della cancellazione. Toccala per la scheda; la X la chiude fino a domani, e dal 3° giorno offre anche “Non mostrare più” (qui: dalla seconda in giù)."
      />
      <div className="mt-6 flex flex-col gap-6">
        {ESEMPI.map((e) => (
          <FineSanta key={e.giorni} groupId="prova" memberId="prova" fine={{ data: e.data, giorni: e.giorni, avviso: true }} giorniVisto={e.visto} prova />
        ))}
      </div>
    </main>
  );
}
