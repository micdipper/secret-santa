import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

// Client Supabase per le pagine lette sul server (usa solo la chiave pubblica).
export async function creaClientServer() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chiamato da una pagina: ci pensa proxy.ts ad aggiornare la sessione.
          }
        },
      },
    },
  );
}

// Id dell'utente collegato (o null), verificato tramite i claims della sessione.
export async function utenteCollegato() {
  const supabase = await creaClientServer();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: (data?.claims?.sub as string | undefined) ?? null };
}
