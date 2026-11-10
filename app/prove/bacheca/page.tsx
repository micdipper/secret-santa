import { Bacheca } from "@/components/bacheca";
import { TestataInterna } from "@/components/ui";

export default function ProvaBacheca() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-56">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove"
        titolo="Bacheca di prova"
        sottotitolo="Attacca, sposta, ricama: non si salva niente."
      />
      <div className="mt-6">
        <Bacheca groupId="prova" memberId="prova" modificabile iniziali={[]} prova />
      </div>
    </main>
  );
}
