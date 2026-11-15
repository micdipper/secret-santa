import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

// Rinnova la sessione ad ogni richiesta (schema ufficiale Supabase per Next.js).
export async function aggiornaSessione(request: NextRequest) {
  let risposta = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          risposta = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => risposta.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => risposta.headers.set(k, v as string));
        },
      },
    },
  );

  // Non mettere altro codice tra la creazione del client e getClaims().
  await supabase.auth.getClaims();
  return risposta;
}
