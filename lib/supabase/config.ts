// Indirizzo del progetto e chiave PUBBLICA (publishable) di Supabase.
// Sono fatti per stare nel browser: la sicurezza è garantita dalle regole
// del database (Row Level Security), non dal nasconderli.
// La chiave SEGRETA invece non va mai qui: vive solo nelle impostazioni di Vercel
// (SUPABASE_SECRET_KEY) e si usa solo sul server.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gesihnbtflnpjxwmpxkd.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
