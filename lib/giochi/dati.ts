// Lettura dei dati dei giochi dal database (pagine vere).
import type { SupabaseClient } from "@supabase/supabase-js";
import { lookDi } from "@/components/avatar";
import type { Persona } from "@/components/giochi/classifica";
import type { Finestra } from "@/components/giochi/calendario";

type GiocoServer = {
  n: number;
  apre_alle: string;
  chiude_alle: string;
  miei_tentativi: number;
  deciso: boolean;
  vincitore_member_id: string | null;
};
export type DatiGiochi = { attivi: boolean; ora_server: string; mio_member_id: string; giochi: GiocoServer[] };

// get_giochi: stato dei 5 giochi, i miei tentativi, i vincitori e l'ora del server
export async function caricaGiochi(supabase: SupabaseClient, groupId: string) {
  const { data, error } = await supabase.rpc("get_giochi", { p_group_id: groupId });
  if (error || !data) return null;
  return data as DatiGiochi;
}

// Chi gioca: i membri entrati nel gruppo, con il loro personaggio
export async function caricaPersone(supabase: SupabaseClient, groupId: string): Promise<Persona[]> {
  const { data: membri } = await supabase.from("group_members").select("id, display_name, user_id").eq("group_id", groupId).not("user_id", "is", null);
  const elenco = membri ?? [];
  const { data: profili } = elenco.length
    ? await supabase.from("profiles").select("user_id, look").in("user_id", elenco.map((m) => m.user_id))
    : { data: [] };
  return elenco.map((m) => ({ memberId: m.id, nome: m.display_name, look: lookDi(profili, m.user_id) }));
}

export function finestreDa(dati: DatiGiochi, persone: Persona[]): Finestra[] {
  return dati.giochi.map((g) => {
    const v = persone.find((p) => p.memberId === g.vincitore_member_id);
    return {
      n: g.n,
      apre: new Date(g.apre_alle).getTime(),
      chiude: new Date(g.chiude_alle).getTime(),
      deciso: g.deciso,
      vincitore: v ? { nome: v.nome, look: v.look } : null,
      mieiTentativi: g.miei_tentativi,
    };
  });
}
