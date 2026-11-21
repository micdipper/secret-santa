"use client";

// Indirizzi delle foto (l'archivio "moodboard" è privato: servono indirizzi firmati).
// Ogni indirizzo vale 7 giorni e il telefono lo riusa per 6: stesso indirizzo = il browser non riscarica
// la foto (meno egress su Supabase, che nel piano gratuito ne dà 5 GB al mese).
// Ricordati nel telefono con la chiave "foto-firmate" (percorso → { url, fino }).

import { useEffect, useState } from "react";
import { leggi, scrivi } from "@/lib/memoria";
import { clientSoloBrowser } from "@/lib/supabase/client";

const CHIAVE = "foto-firmate";
const VALIDITA_S = 7 * 24 * 3600; // quanto vale l'indirizzo per Supabase
const RIUSO_MS = 6 * 24 * 3600 * 1000; // per quanto lo riusa il telefono (un giorno di margine)
export const CACHE_CONTROL = "31536000"; // il file non cambia mai: il browser lo tiene un anno

type Ricordo = Record<string, { url: string; fino: number }>;

// percorsi già chiesti in questa pagina: più foto insieme non fanno più richieste uguali
const inCorso = new Map<string, Promise<string | null>>();

const validi = (r: Ricordo, ora: number) => Object.fromEntries(Object.entries(r).filter(([, x]) => x.fino > ora));

export async function urlFirmati(percorsi: string[]): Promise<Record<string, string>> {
  const ora = Date.now();
  const ricordo = validi(leggi<Ricordo>(CHIAVE, {}), ora);
  const risultato: Record<string, string> = {};
  const mancanti: string[] = [];
  for (const p of new Set(percorsi)) {
    if (ricordo[p]) risultato[p] = ricordo[p].url;
    else if (!inCorso.has(p)) mancanti.push(p);
  }
  if (mancanti.length) {
    const richiesta = clientSoloBrowser().storage.from("moodboard").createSignedUrls(mancanti, VALIDITA_S);
    for (const p of mancanti) {
      const una = richiesta.then(({ data }) => data?.find((d) => d.path === p)?.signedUrl ?? null);
      inCorso.set(p, una);
      una.finally(() => inCorso.delete(p));
    }
    const { data } = await richiesta;
    const nuovi: Ricordo = {};
    for (const d of data ?? []) if (d.path && d.signedUrl) nuovi[d.path] = { url: d.signedUrl, fino: ora + RIUSO_MS };
    // si rilegge prima di scrivere: un'altra parte della pagina può aver salvato intanto
    scrivi(CHIAVE, { ...validi(leggi<Ricordo>(CHIAVE, {}), ora), ...nuovi });
    for (const [p, x] of Object.entries(nuovi)) risultato[p] = x.url;
  }
  // quelli già chiesti nello stesso momento da un'altra parte della pagina
  for (const p of percorsi) {
    if (risultato[p] || !inCorso.has(p)) continue;
    const u = await inCorso.get(p);
    if (u) risultato[p] = u;
  }
  return risultato;
}

// Una sola foto: data URL (foto vecchie salvate nel database) e indirizzi web passano così come sono
export function useUrlFoto(immagine: string | null | undefined) {
  const diretta = !immagine || /^(data:|https?:|blob:)/.test(immagine);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (diretta) return;
    let vivo = true;
    urlFirmati([immagine!]).then((u) => vivo && setUrl(u[immagine!] ?? null));
    return () => {
      vivo = false;
    };
  }, [immagine, diretta]);
  return diretta ? (immagine ?? null) : url;
}
