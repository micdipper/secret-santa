import { notFound, redirect } from "next/navigation";
import { AperturaBusta, type Persona } from "@/components/apertura-busta";
import { lookDi } from "@/components/avatar";
import { Feltro, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Busta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) redirect("/");

  const [{ data: gruppo }, { data: membri }, { data: abbinamento }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("id, display_name, user_id, envelope_opened_at").eq("group_id", id),
    // Le regole del database restituiscono solo il MIO abbinamento.
    supabase.from("assignments").select("receiver_member_id").eq("group_id", id).maybeSingle(),
  ]);
  if (!gruppo || !membri) notFound();

  const io = membri.find((m) => m.user_id === userId);
  const { data: profili } = await supabase
    .from("profiles")
    .select("user_id, look")
    .in("user_id", membri.flatMap((m) => (m.user_id ? [m.user_id] : [])));
  const persona = (m: (typeof membri)[number]): Persona => ({ id: m.id, nome: m.display_name, look: lookDi(profili, m.user_id) });

  const ricevente = membri.find((m) => m.id === abbinamento?.receiver_member_id);
  // Nella slot machine scorrono tutti tranne me
  const candidati = membri.filter((m) => m.user_id && m.user_id !== userId).map(persona);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro={`/gruppo/${id}`} etichettaIndietro={`Torna a ${gruppo.name}`} contesto={gruppo.name} titolo="La tua busta" />
      <div className="mt-6">
        {ricevente ? (
          <AperturaBusta groupId={id} candidati={candidati} destinatario={persona(ricevente)} giaAperta={!!io?.envelope_opened_at} />
        ) : (
          <Feltro>
            <TitoloRiquadro>Ancora niente</TitoloRiquadro>
            <p className="mt-2">L&apos;estrazione non è ancora stata fatta.</p>
          </Feltro>
        )}
      </div>
    </main>
  );
}
