import type { SupabaseClient } from "@supabase/supabase-js";

/*
  Portachiavi del telefono: ogni gruppo ha un accesso suo (personaggio, premi e password separati).
  Il telefono ricorda gli accessi dei gruppi in cui la persona è già entrata, così passando da un
  gruppo all'altro non deve riscrivere la password (che si chiede solo su un telefono nuovo).

  Per ogni gruppo: id dell'accesso, nome del gruppo, codice d'invito e il "gettone" per riaprire la
  sessione (refresh token). Il gettone cambia a ogni rinnovo, quindi si aggiorna sempre con quello
  della sessione in uso prima di passare a un altro accesso.
*/

export type Chiave = { groupId: string; nome: string; userId: string; gettone: string; invito?: string };

const CHIAVE = "portachiavi";

export function leggiPortachiavi(): Chiave[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function scrivi(elenco: Chiave[]) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(elenco));
  } catch {}
}

// Aggiorna il gettone di tutti i gruppi dell'accesso in uso (e, se indicato, registra questo gruppo).
export async function salvaAccessoCorrente(supabase: SupabaseClient, gruppo?: { groupId: string; nome: string; invito?: string }) {
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  if (!s) return;
  let elenco = leggiPortachiavi().map((c) => (c.userId === s.user.id ? { ...c, gettone: s.refresh_token } : c));
  if (gruppo) {
    const prima = elenco.find((c) => c.groupId === gruppo.groupId);
    elenco = elenco.filter((c) => c.groupId !== gruppo.groupId);
    elenco.unshift({ ...gruppo, invito: gruppo.invito ?? prima?.invito, userId: s.user.id, gettone: s.refresh_token });
  }
  scrivi(elenco);
}

// Passa all'accesso di un gruppo già nel portachiavi. Restituisce false se non c'è o non vale più.
export async function passaAlGruppo(supabase: SupabaseClient, groupId: string) {
  const chiave = leggiPortachiavi().find((c) => c.groupId === groupId);
  if (!chiave) return false;
  await salvaAccessoCorrente(supabase); // prima metto via il gettone aggiornato dell'accesso di adesso
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: chiave.gettone });
  if (error || !data.session) {
    scrivi(leggiPortachiavi().filter((c) => c.groupId !== groupId));
    return false;
  }
  await salvaAccessoCorrente(supabase); // il gettone nuovo di questo gruppo
  return true;
}
