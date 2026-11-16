import { SecretSecretSanta } from "@/components/secret-secret-santa";
import { TestataInterna } from "@/components/ui";

// Sala prove: il minigioco dell'easter egg, senza accesso e senza salvare il premio.
export default function ProvaSecretSecretSanta() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro="/prove" etichettaIndietro="Torna alla sala prove" contesto="Sala prove" titolo="Secret secret Santa" />
      <SecretSecretSanta groupId="" prova />
    </main>
  );
}
