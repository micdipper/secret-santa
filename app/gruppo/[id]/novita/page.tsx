import { redirect } from "next/navigation";
import { lookDi } from "@/components/avatar";
import { FeedGruppo } from "@/components/feed-gruppo";
import { TestataInterna } from "@/components/ui";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Tutte le novità del gruppo, con il riquadro per scrivere un post.
export default async function PaginaNovita({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) return null; // il layout del gruppo pensa all'accesso

  const [{ data: gruppo }, { data: membri }, { data: nomiTotem }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("id, display_name, user_id").eq("group_id", id),
    supabase.from("quiz_totems").select("profilo, nome, immagine").eq("group_id", id),
  ]);
  if (!gruppo || !membri) return null; // non è un mio gruppo: ci pensa il layout
  const io = membri.find((m) => m.user_id === userId);
  if (!io) redirect(`/gruppo/${id}`);
  const { data: profili } = await supabase
    .from("profiles")
    .select("user_id, look")
    .in("user_id", membri.flatMap((m) => (m.user_id ? [m.user_id] : [])));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro={`/gruppo/${id}`} etichettaIndietro="Torna al gruppo" contesto={gruppo.name} titolo="Novità" sottotitolo="Cosa succede nel gruppo. Tieni premuto un post per reagire." />
      <div className="mt-6">
        <FeedGruppo
          groupId={id}
          io={io.id}
          persone={Object.fromEntries(membri.map((m) => [m.id, { nome: m.display_name, look: lookDi(profili, m.user_id) }]))}
          totem={Object.fromEntries((nomiTotem ?? []).map((t) => [t.profilo, { nome: t.nome, immagine: t.immagine }]))}
          conComponi
        />
      </div>
    </main>
  );
}
