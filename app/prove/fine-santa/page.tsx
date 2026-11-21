"use client";

// Sala prove: l'avviso di fine Secret Santa nei vari giorni (non si salva niente).
import { FineSanta } from "@/components/fine-santa";
import { TestataInterna } from "@/components/ui";

const ESEMPI = [
  { data: "2027-01-08", giorni: 7 },
  { data: "2027-01-08", giorni: 2 },
  { data: "2027-01-08", giorni: 1 },
  { data: "2027-01-08", giorni: 0 },
];

export default function ProvaFineSanta() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove · niente viene salvato"
        titolo="Fine del Secret Santa"
        sottotitolo="L'avviso compare in basso in ogni pagina del gruppo da 7 giorni prima della cancellazione; si chiude e ricompare il giorno dopo. Qui tutti i casi insieme."
      />
      <div className="mt-6 flex flex-col gap-4">
        {ESEMPI.map((e) => (
          <FineSanta key={e.giorni} groupId="prova" fine={{ ...e, avviso: true }} prova />
        ))}
      </div>
    </main>
  );
}
