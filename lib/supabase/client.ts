import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Client Supabase per il browser (usa solo la chiave pubblica).
export function creaClientBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

// Le pagine "use client" vengono preparate anche sul server, dove il client del
// browser non serve: lì restituiamo null. Va usato solo dentro effetti e gestori
// di eventi (che girano soltanto nel browser), mai durante il disegno della pagina.
export function clientSoloBrowser() {
  return (typeof window === "undefined" ? null : creaClientBrowser()) as SupabaseClient;
}
