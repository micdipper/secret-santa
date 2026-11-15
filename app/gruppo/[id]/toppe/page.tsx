import { redirect } from "next/navigation";
import { EditorToppeGruppo } from "@/components/editor-toppe";
import { TestataInterna } from "@/components/ui";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Toppe del gruppo: l'organizzatore aggiunge fino a 4 simboli e 4 parole al cassetto di tutti
export default async function PaginaToppeGruppo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) return null; // il layout del gruppo pensa all'accesso
  const { data: gruppo } = await supabase.from("groups").select("name, organizer_id").eq("id", id).maybeSingle();
  if (!gruppo) return null; // non è un mio gruppo: ci pensa il layout
  if (gruppo.organizer_id !== userId) redirect(`/gruppo/${id}`);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro={`/gruppo/${id}/organizza`}
        etichettaIndietro="Torna a Organizza"
        contesto={gruppo.name}
        titolo="Toppe del gruppo"
        sottotitolo="Fino a 4 simboli e 4 parole in più, solo vostri: finiscono nel cassetto della bacheca di tutti."
      />
      <EditorToppeGruppo groupId={id} dopo={`/gruppo/${id}/organizza`} />
    </main>
  );
}
