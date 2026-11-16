import { redirect } from "next/navigation";
import { lookDi } from "@/components/avatar";
import { BigliettoOlografico } from "@/components/biglietto-olografico";
import { TastoLink, TestataInterna } from "@/components/ui";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// "Ricorda chi hai pescato": rivedere la card olografica dopo aver aperto la busta.
// Il database dà a ognuno solo il proprio abbinamento.
export default async function PaginaBiglietto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) return null; // il layout del gruppo pensa all'accesso

  // le regole del database danno solo il mio abbinamento e i personaggi dei miei gruppi
  const [{ data: gruppo }, { data: membri }, { data: abbinamento }, { data: profili }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("id, display_name, user_id, envelope_opened_at").eq("group_id", id),
    supabase.from("assignments").select("receiver_member_id").eq("group_id", id).maybeSingle(),
    supabase.from("profiles").select("user_id, look"),
  ]);
  const io = membri?.find((m) => m.user_id === userId);
  if (!gruppo || !io) return null; // non è un mio gruppo: ci pensa il layout
  if (!io.envelope_opened_at) redirect(`/gruppo/${id}/busta`); // prima si apre la busta

  const lui = membri?.find((m) => m.id === abbinamento?.receiver_member_id);
  if (!lui) redirect(`/gruppo/${id}`);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro={`/gruppo/${id}`} etichettaIndietro={`Torna a ${gruppo.name}`} contesto={gruppo.name} titolo="Chi hai pescato" />
      <div className="mt-8">
        <BigliettoOlografico nome={lui.display_name} look={lookDi(profili, lui.user_id)} olografiaDopo={0.2} />
      </div>
      <p className="mt-4 text-center text-sm text-crema/85">Inclinalo col dito o muovendo il telefono.</p>
      <TastoLink href={`/gruppo/${id}/bacheca/${lui.id}`} className="mt-6">
        Guarda la bacheca di {lui.display_name.split(" ")[0]}
      </TastoLink>
    </main>
  );
}
