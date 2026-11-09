import { notFound, redirect } from "next/navigation";
import { Feltro, TastoLink, TestataInterna, TitoloRiquadro, Toppa } from "@/components/ui";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Versione semplice della busta: la rivelazione animata in 3D arriverà nel suo blocco.
export default async function Busta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) redirect("/");

  const { data: gruppo } = await supabase.from("groups").select("name").eq("id", id).maybeSingle();
  if (!gruppo) notFound();

  // Le regole del database restituiscono solo il MIO abbinamento.
  const { data: abbinamento } = await supabase
    .from("assignments")
    .select("receiver_member_id, group_members!assignments_receiver_member_id_fkey(id, display_name, avatar)")
    .eq("group_id", id)
    .maybeSingle();

  const destinatario = abbinamento?.group_members as unknown as { id: string; display_name: string; avatar: string | null } | undefined;

  // La prima volta che la apro, me lo ricordo: la pagina del gruppo mostrerà il promemoria.
  if (destinatario) {
    await supabase
      .from("group_members")
      .update({ envelope_opened_at: new Date().toISOString() })
      .eq("group_id", id)
      .eq("user_id", userId)
      .is("envelope_opened_at", null);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro={`/gruppo/${id}`} etichettaIndietro={`Torna a ${gruppo.name}`} contesto={gruppo.name} titolo="La tua busta" />
      {destinatario ? (
        <Feltro className="mt-6">
          <p className="text-sm text-inchiostro/70">Farai il regalo a</p>
          <div className="mt-3 flex items-center gap-4">
            <Toppa emoji={destinatario.avatar ?? "🎁"} dimensione={56} />
            <TitoloRiquadro>{destinatario.display_name}</TitoloRiquadro>
          </div>
          <p className="mt-4">Acqua in bocca! Guarda la sua bacheca per farti venire un&apos;idea.</p>
          <TastoLink href={`/gruppo/${id}/bacheca/${destinatario.id}`} className="mt-5">
            Vai alla sua bacheca
          </TastoLink>
        </Feltro>
      ) : (
        <Feltro className="mt-6">
          <TitoloRiquadro>Ancora niente</TitoloRiquadro>
          <p className="mt-2">L&apos;estrazione non è ancora stata fatta.</p>
        </Feltro>
      )}
    </main>
  );
}
