import { createBrowserClient } from "@supabase/ssr";

// Client Supabase per il browser (usa solo la chiave pubblica).
export function creaClientBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
