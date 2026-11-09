import { notFound, redirect } from "next/navigation";
import { Bacheca, type Elemento } from "@/components/bacheca";
import { TestataInterna } from "@/components/ui";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PaginaBacheca({ params }: { params: Promise<{ id: string; membro: string }> }) {
  const { id, membro } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) redirect("/");

  const [{ data: gruppo }, { data: persona }, { data: elementi }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("display_name, user_id").eq("id", membro).eq("group_id", id).maybeSingle(),
    supabase.from("moodboard_items").select("id, kind, content, x, y, width, rotation, z").eq("member_id", membro),
  ]);
  if (!gruppo || !persona) notFound();
  const mia = persona.user_id === userId;
  const nome = persona.display_name.split(" ")[0];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-56">
      <TestataInterna
        indietro={`/gruppo/${id}`}
        etichettaIndietro={`Torna a ${gruppo.name}`}
        contesto={gruppo.name}
        titolo={mia ? "La tua bacheca" : `La bacheca di ${nome}`}
        sottotitolo={
          mia
            ? "Toppe, colori, foto e ricami che raccontano il tuo mood. La vede tutto il gruppo."
            : `Il mood di ${nome}: cerca qui l'ispirazione per il regalo.`
        }
      />
      <div className="mt-6">
        <Bacheca groupId={id} memberId={membro} modificabile={mia} iniziali={(elementi as Elemento[]) ?? []} />
      </div>
    </main>
  );
}
