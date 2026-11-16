import { SecretSecretSanta } from "@/components/secret-secret-santa";
import { TestataInterna } from "@/components/ui";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Easter egg: si arriva qui solo toccando 7 volte di fila la pallina della pagina del gruppo.
// Una sola possibilità: se il tentativo è già segnato nel database, la partita non riparte.
export default async function PaginaSecretSecretSanta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) return null; // il layout del gruppo pensa all'accesso
  const { data: io } = await supabase
    .from("group_members")
    .select("secret_tentato_at, cappello_natale_at")
    .eq("group_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro={`/gruppo/${id}`} etichettaIndietro="Torna al gruppo" contesto="Shhh…" titolo="Secret secret Santa" />
      <SecretSecretSanta groupId={id} giaVinto={!!io?.cappello_natale_at} giaTentato={!!io?.secret_tentato_at} />
    </main>
  );
}
