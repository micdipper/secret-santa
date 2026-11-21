import { CambiaAccesso, RegistraAccesso } from "@/components/accesso-gruppo";
import { FineSanta, type FineGruppo } from "@/components/fine-santa";
import { FotoInPiu } from "@/components/foto-in-piu";
import { MAX_FOTO_BACHECA } from "@/lib/foto";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Ogni gruppo ha un accesso suo: se la sessione di adesso non è di questo gruppo,
// le pagine non si mostrano e si passa (o si chiede di passare) all'accesso giusto.
export default async function LayoutGruppo({ children, params }: LayoutProps<"/gruppo/[id]">) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  const [{ data: gruppo }, { data: io }, { data: fine }] = userId
    ? await Promise.all([
        supabase.from("groups").select("name, invite_code").eq("id", id).maybeSingle(),
        // insieme al mio posto nel gruppo, quante foto ho in bacheca (per il popup delle foto in più)
        supabase
          .from("group_members")
          .select("id, moodboard_items(count)")
          .eq("group_id", id)
          .eq("user_id", userId)
          .in("moodboard_items.kind", ["foto", "immagine_link"])
          .maybeSingle(),
        // giorno della cancellazione del gruppo (fine del Secret Santa), calcolato dal database
        supabase.rpc("fine_gruppo", { p_group: id }),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  if (!gruppo || !io) return <CambiaAccesso key={userId ?? "nessuno"} groupId={id} />;
  // più di 2 foto in bacheca (caricate prima del limite del 21/11): popup che non si chiude, in ogni pagina del gruppo
  const mieFoto = (io.moodboard_items as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
  return (
    <>
      <RegistraAccesso groupId={id} nome={gruppo.name} invito={gruppo.invite_code} />
      {children}
      {mieFoto > MAX_FOTO_BACHECA && <FotoInPiu memberId={io.id} />}
      {fine && <FineSanta groupId={id} fine={fine as FineGruppo} />}
    </>
  );
}
