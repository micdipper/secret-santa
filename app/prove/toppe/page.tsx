import { EditorToppeGruppo } from "@/components/editor-toppe";
import { TestataInterna } from "@/components/ui";

export default function ProvaToppe() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove"
        titolo="Toppe del gruppo"
        sottotitolo="Crea simboli e parole come farebbe l'organizzatore: restano solo in questo telefono e le trovi nella bacheca di prova."
      />
      <EditorToppeGruppo groupId="prova" prova dopo="/prove/bacheca" />
    </main>
  );
}
