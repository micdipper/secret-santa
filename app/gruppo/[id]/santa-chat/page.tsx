import Link from "next/link";
import { ToppaAvatar, lookDi } from "@/components/avatar";
import { PallinoChat } from "@/components/pallino-chat";
import { ToppaBabbo } from "@/components/santa-chat";
import { Feltro, Icone, TastoLink, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
  Santa Chat: si apre solo quando TUTTI hanno aperto la busta (lo controlla anche il database),
  così nessuno scrive o riceve messaggi prima che l'altro abbia scoperto il suo abbinamento.
*/
export default async function PaginaSantaChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) return null; // il layout del gruppo pensa all'accesso

  const [{ data: gruppo }, { data: membri }] = await Promise.all([
    supabase.from("groups").select("name, status").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("id, display_name, user_id, envelope_opened_at").eq("group_id", id).order("display_name"),
  ]);
  if (!gruppo || !membri) return null; // non è un mio gruppo: ci pensa il layout
  const io = membri.find((m) => m.user_id === userId);
  if (!io) return null;

  const estratto = gruppo.status !== "aperto";
  const daAprire = membri.filter((m) => !m.envelope_opened_at);
  const aperta = estratto && daAprire.length === 0;

  let destinatario: (typeof membri)[number] | undefined;
  let profili: { user_id: string; look: unknown }[] | null = null;
  if (aperta) {
    const { data: a } = await supabase.from("assignments").select("receiver_member_id").eq("group_id", id).maybeSingle();
    destinatario = membri.find((m) => m.id === a?.receiver_member_id);
    if (destinatario?.user_id) ({ data: profili } = await supabase.from("profiles").select("user_id, look").eq("user_id", destinatario.user_id));
  }

  const freccia = <span className="relative mr-2 text-abete [&_svg]:size-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.4]">{Icone.avanti}</span>;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro={`/gruppo/${id}`}
        etichettaIndietro={`Torna a ${gruppo.name}`}
        contesto={gruppo.name}
        titolo="Santa Chat"
        sottotitolo="Messaggi segreti: chi regala non si rivela mai."
      />

      {!aperta ? (
        <Feltro className="mt-6">
          <span className="absolute -top-1 right-0 flex size-12 items-center justify-center rounded-full bg-vermiglio text-crema [&>svg]:size-6 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[2.2]">
            {Icone.lucchetto}
          </span>
          <TitoloRiquadro className="pr-16">Non è ancora il momento</TitoloRiquadro>
          <p className="mt-2 pr-4">
            {!estratto
              ? "La Santa Chat si apre dopo l'estrazione, quando tutti avranno aperto la propria busta."
              : !io.envelope_opened_at
                ? "Prima apri la tua busta: la Santa Chat si apre quando tutti avranno scoperto a chi fare il regalo."
                : `Si apre quando tutti avranno aperto la busta. ${daAprire.length === 1 ? "Manca solo" : "Mancano"}: ${daAprire.map((m) => m.display_name.split(" ")[0]).join(", ")}.`}
          </p>
          {estratto && !io.envelope_opened_at && (
            <TastoLink href={`/gruppo/${id}/busta`} className="mt-5">
              Apri la busta
            </TastoLink>
          )}
        </Feltro>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {destinatario && (
            <Link href={`/gruppo/${id}/chat?con=pescato`} className="feltro cliccabile flex items-center gap-4 p-4 pl-5">
              <ToppaAvatar look={lookDi(profili, destinatario.user_id)} dimensione={44} />
              <span className="relative min-w-0 flex-1">
                <span className="block font-titolo text-lg leading-tight text-abete">Scrivi a {destinatario.display_name.split(" ")[0]}</span>
                <span className="block text-sm text-inchiostro/70">Non saprà che sei tu</span>
              </span>
              <PallinoChat receiverId={destinatario.id} ruolo="babbo" />
              {freccia}
            </Link>
          )}
          <Link href={`/gruppo/${id}/chat?con=babbo`} className="feltro cliccabile flex items-center gap-4 p-4 pl-5">
            <ToppaBabbo dimensione={44} />
            <span className="relative min-w-0 flex-1">
              <span className="block font-titolo text-lg leading-tight text-abete">Il tuo Babbo Natale</span>
              <span className="block text-sm text-inchiostro/70">Lui sa chi sei, tu no</span>
            </span>
            <PallinoChat receiverId={io.id} ruolo="pescato" />
            {freccia}
          </Link>
          <p className="text-sm text-crema/75">5 messaggi a testa al giorno, 50 caratteri l&apos;uno. I nomi del gruppo diventano asterischi.</p>
        </div>
      )}
    </main>
  );
}
