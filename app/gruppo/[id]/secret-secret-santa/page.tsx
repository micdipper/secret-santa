import { SecretSecretSanta } from "@/components/secret-secret-santa";
import { TestataInterna } from "@/components/ui";

// Easter egg: si arriva qui solo toccando 7 volte di fila la pallina della pagina del gruppo.
export default async function PaginaSecretSecretSanta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro={`/gruppo/${id}`} etichettaIndietro="Torna al gruppo" contesto="Shhh…" titolo="Secret secret Santa" />
      <SecretSecretSanta groupId={id} />
    </main>
  );
}
