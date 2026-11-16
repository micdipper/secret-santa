import { CambiaAccesso, RegistraAccesso } from "@/components/accesso-gruppo";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Ogni gruppo ha un accesso suo: se la sessione di adesso non è di questo gruppo,
// le pagine non si mostrano e si passa (o si chiede di passare) all'accesso giusto.
export default async function LayoutGruppo({ children, params }: LayoutProps<"/gruppo/[id]">) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  const [{ data: gruppo }, { data: io }] = userId
    ? await Promise.all([
        supabase.from("groups").select("name, invite_code").eq("id", id).maybeSingle(),
        supabase.from("group_members").select("id").eq("group_id", id).eq("user_id", userId).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  if (!gruppo || !io) return <CambiaAccesso key={userId ?? "nessuno"} groupId={id} />;
  return (
    <>
      <RegistraAccesso groupId={id} nome={gruppo.name} invito={gruppo.invite_code} />
      {children}
    </>
  );
}
