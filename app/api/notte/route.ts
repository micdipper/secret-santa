// Lavoro notturno (cron di Vercel, una volta al giorno: vercel.json). Gira SOLO sul server.
// Vercel chiama questo indirizzo con "Authorization: Bearer <CRON_SECRET>": senza la parola giusta non fa niente.
// Usa la chiave segreta di Supabase (SUPABASE_SECRET_KEY, solo nelle impostazioni di Vercel): i file dello
// Storage e gli accessi si cancellano solo così, non da SQL.
// 1) gruppi finiti (giorno della cancellazione passato: scambio + 10 giorni, oppure 8 gennaio) con i loro accessi;
//    in PROVA finché l'impostazione "fine_cancella" è 0 (scrive solo quali cancellerebbe)
// 2) file dello Storage che nessuno usa più (caricati da più di 1 ora): anche quelli dei gruppi appena cancellati
// 3) accessi senza nessun gruppo (invito fallito a metà, nome liberato), creati da più di 24 ore
// 2 e 3 sono in PROVA finché l'impostazione "notte_cancella" è 0 (private.impostazioni).
// Ogni notte scrive un rapporto in private.registro_notte.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const A_GRUPPI = 100; // file cancellati per richiesta

export async function GET(richiesta: Request) {
  const segreto = process.env.CRON_SECRET;
  if (!segreto || richiesta.headers.get("authorization") !== `Bearer ${segreto}`) {
    return new Response("Non autorizzato", { status: 401 });
  }
  const chiave = process.env.SUPABASE_SECRET_KEY;
  if (!chiave) return new Response("Manca SUPABASE_SECRET_KEY", { status: 500 });
  const supabase = createClient(SUPABASE_URL, chiave, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: davvero } = await supabase.rpc("notte_cancella");
  const rapporto: Record<string, unknown> = { prova: davvero !== true };

  // 1) gruppi finiti
  const { data: fineDavvero } = await supabase.rpc("notte_fine_cancella");
  const { data: finiti, error: eFiniti } = await supabase.rpc("notte_gruppi_finiti");
  if (eFiniti) rapporto.errore_gruppi = eFiniti.message;
  rapporto.gruppi_prova = fineDavvero !== true;
  rapporto.gruppi_finiti = finiti ?? [];
  if (fineDavvero === true) {
    const cancellati = [];
    for (const g of (finiti as { id: string }[] | null) ?? []) {
      const { data, error } = await supabase.rpc("notte_cancella_gruppo", { p_group: g.id });
      cancellati.push(error ? { gruppo: g.id, errore: error.message } : data);
    }
    rapporto.gruppi_cancellati = cancellati;
  }

  // 2) file orfani
  const { data: file, error: eFile } = await supabase.rpc("notte_file_orfani");
  if (eFile) rapporto.errore_file = eFile.message;
  const elenco = (file as string[] | null) ?? [];
  let fileTolti = 0;
  if (davvero !== true) rapporto.file_da_togliere = elenco;
  else for (let i = 0; i < elenco.length; i += A_GRUPPI) {
    const { data, error } = await supabase.storage.from("moodboard").remove(elenco.slice(i, i + A_GRUPPI));
    if (error) rapporto.errore_rimozione = error.message;
    fileTolti += data?.length ?? 0;
  }
  rapporto.file_orfani = elenco.length;
  rapporto.file_tolti = fileTolti;

  // 3) accessi orfani
  const { data: accessi, error: eAccessi } = await supabase.rpc("notte_accessi_orfani");
  if (eAccessi) rapporto.errore_accessi = eAccessi.message;
  let accessiTolti = 0;
  if (davvero !== true) rapporto.accessi_da_togliere = accessi;
  else for (const id of (accessi as string[] | null) ?? []) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) rapporto.errore_cancella_accesso = error.message;
    else accessiTolti++;
  }
  rapporto.accessi_orfani = (accessi as string[] | null)?.length ?? 0;
  rapporto.accessi_tolti = accessiTolti;

  await supabase.rpc("notte_registra", { p_rapporto: rapporto });
  return Response.json(rapporto);
}
