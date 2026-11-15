import { clientSoloBrowser } from "@/lib/supabase/client";

// Amici inventati della sala prove (la censura dei nomi si prova su questi).
export const NOMI_PROVA = ["Giulia Rossi", "Marco Bianchi", "Sara Neri", "Luca Verdi", "Anna Gallo"];

// Stessa censura dei gruppi veri (funzione del database), senza salvare niente.
export async function censuraProva(testo: string) {
  const { data } = await clientSoloBrowser().rpc("prova_censura", { p_nomi: NOMI_PROVA, p_testo: testo });
  return typeof data === "string" ? data : testo;
}
