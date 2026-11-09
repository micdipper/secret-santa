import { notFound, redirect } from "next/navigation";
import { Feltro, TestataInterna, TitoloRiquadro, Toppa } from "@/components/ui";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Segnaposto: la bacheca vera (toppe, ricamo, quiz, lista dei desideri) arriva nel suo blocco.
export default async function Bacheca({ params }: { params: Promise<{ id: string; membro: string }> }) {
  const { id, membro } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) redirect("/");

  const [{ data: gruppo }, { data: persona }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("display_name, avatar, user_id").eq("id", membro).eq("group_id", id).maybeSingle(),
  ]);
  if (!gruppo || !persona) notFound();
  const mia = persona.user_id === userId;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro={`/gruppo/${id}`}
        etichettaIndietro={`Torna a ${gruppo.name}`}
        contesto={gruppo.name}
        titolo={mia ? "La tua bacheca" : `La bacheca di ${persona.display_name.split(" ")[0]}`}
      />
      <Feltro className="mt-6">
        <div className="flex items-center gap-4">
          <Toppa emoji={persona.avatar ?? "🎁"} dimensione={56} />
          <TitoloRiquadro>Sta arrivando</TitoloRiquadro>
        </div>
        <p className="mt-4">Qui ci saranno la tela da ricamare, le toppe e la lista dei desideri.</p>
      </Feltro>
    </main>
  );
}
