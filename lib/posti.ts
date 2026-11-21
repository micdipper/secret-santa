// Posti del sito e dei gruppi (controllati anche dal database: private.controlla_posti e tetto_accessi).
// Si chiedono PRIMA di creare un accesso nuovo, così non restano accessi senza gruppo.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Posti = { posti_liberi: number; persone_per_gruppo: number; accessi_pieni: boolean };

export async function leggiPosti(supabase: SupabaseClient): Promise<Posti | null> {
  const { data } = await supabase.rpc("posti_sito");
  return (data as Posti | null) ?? null;
}

export const SITO_PIENO_ACCESSI = "Siamo al completo, riprova più tardi.";
export const SITO_QUASI_PIENO =
  "Il sito è quasi al completo: non c'è posto per un'altra persona, quindi non potrebbe entrare nel gruppo. Puoi creare il gruppo con le persone già inserite.";
export const SITO_PIENO_GRUPPI = "Il sito è al completo: per ora non si possono creare gruppi nuovi. Riprova più tardi.";
export const gruppoAlCompleto = (max: number) => `Il gruppo è al completo: al massimo ${max} persone, te compreso.`;
export const AVVISO_POSTI_SOTTO = 50; // il numero di posti rimasti si mostra solo quando ne restano pochi
