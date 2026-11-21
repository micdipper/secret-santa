"use client";

import { useCallback, useEffect, useState } from "react";
import { ComponiPost, ElencoFeed, VoceFeed, type Persona, type Reazione, type Risposta, type TotemNomi, type Voce } from "@/components/feed";
import { TastoLink } from "@/components/ui";
import { oggiRoma } from "@/lib/date";
import { PROFILO_FEED, comprimiFoto, messaggioFoto } from "@/lib/foto";
import { clientSoloBrowser } from "@/lib/supabase/client";

// Ultima novità vista, ricordata nel telefono (per "N nuove" nella pagina del gruppo)
const chiaveVisto = (groupId: string) => `feed-visto:${groupId}`;

// Errore di rete = "controlla la connessione"; altrimenti il messaggio del database (già in italiano)
// stesso testo dell'errore del database (pubblica_post)
const FOTO_GIA_POSTATA = "Hai già postato una foto oggi, riprova domani";

const messaggioErrore = (error: { message: string }, cosa: string) =>
  error.message.includes("fetch") ? `${cosa}: controlla la connessione e riprova.` : error.message;

// Il feed vero: legge voci, reazioni e foto dal database. Con `limite` mostra solo le ultime (pagina del gruppo).
export function FeedGruppo({
  groupId,
  io,
  persone,
  totem,
  limite,
  conComponi = false,
}: {
  groupId: string;
  io: string | null;
  persone: Record<string, Persona>;
  totem: TotemNomi;
  limite?: number;
  conComponi?: boolean;
}) {
  const [voci, setVoci] = useState<Voce[] | null>(null);
  const [reazioni, setReazioni] = useState<Reazione[]>([]);
  const [risposte, setRisposte] = useState<Risposta[]>([]);
  const [foto, setFoto] = useState<Record<string, string>>({});
  const [nuove, setNuove] = useState(0);

  const carica = useCallback(async () => {
    const supabase = clientSoloBrowser();
    const { data } = await supabase
      .from("feed_events")
      .select("id, member_id, tipo, dati, quando")
      .eq("group_id", groupId)
      .order("quando", { ascending: false })
      .limit(limite ?? 200);
    const elenco = (data as Voce[]) ?? [];
    const ids = elenco.map((v) => v.id);
    const post = elenco.filter((v) => v.tipo === "post").map((v) => v.id);
    const percorsi = elenco.flatMap((v) => (v.dati.foto ? [v.dati.foto] : []));
    const [{ data: r }, { data: risp }, firmati] = await Promise.all([
      ids.length ? supabase.from("feed_reactions").select("event_id, member_id, emoji").in("event_id", ids) : Promise.resolve({ data: [] }),
      post.length
        ? supabase.from("feed_replies").select("event_id, member_id, testo").in("event_id", post).order("created_at")
        : Promise.resolve({ data: [] }),
      percorsi.length ? supabase.storage.from("moodboard").createSignedUrls(percorsi, 60 * 60) : Promise.resolve({ data: [] }),
    ]);
    setVoci(elenco);
    setReazioni((r as Reazione[]) ?? []);
    setRisposte((risp as Risposta[]) ?? []);
    setFoto(Object.fromEntries((firmati.data ?? []).flatMap((f) => (f.path && f.signedUrl ? [[f.path, f.signedUrl]] : []))));

    let visto = "1970-01-01T00:00:00Z";
    try {
      visto = localStorage.getItem(chiaveVisto(groupId)) ?? visto;
      if (!limite && elenco[0]) localStorage.setItem(chiaveVisto(groupId), elenco[0].quando); // pagina completa = tutto visto
    } catch {}
    if (limite) {
      const { count } = await supabase
        .from("feed_events")
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId)
        .gt("quando", visto)
        .or(`member_id.is.null,member_id.neq.${io ?? "00000000-0000-0000-0000-000000000000"}`);
      setNuove(count ?? 0);
    }
  }, [groupId, io, limite]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dati dal database (asincrono)
    carica();
  }, [carica]);

  async function reagisci(eventId: string, emoji: string) {
    if (!io) return;
    // subito sullo schermo, poi nel database
    setReazioni((prima) => {
      const senza = prima.filter((r) => !(r.event_id === eventId && r.member_id === io));
      const mia = prima.find((r) => r.event_id === eventId && r.member_id === io);
      return mia?.emoji === emoji ? senza : [...senza, { event_id: eventId, member_id: io, emoji }];
    });
    const { error } = await clientSoloBrowser().rpc("reagisci", { p_event: eventId, p_emoji: emoji });
    if (error) carica();
  }

  async function rispondi(eventId: string, testo: string) {
    const { data, error } = await clientSoloBrowser().rpc("rispondi_post", { p_event: eventId, p_testo: testo });
    if (error) {
      carica(); // es. risposta già data da un altro telefono: la si mostra, col suo cestino
      return messaggioErrore(error, "Risposta non inviata");
    }
    setRisposte((prima) => [...prima, data as Risposta]);
  }

  // prima si cancella nel database, poi sparisce: così il campo per riscrivere torna solo a cancellazione fatta
  async function eliminaRisposta(eventId: string) {
    const { error } = await clientSoloBrowser().rpc("elimina_risposta", { p_event: eventId });
    if (error) return carica();
    setRisposte((prima) => prima.filter((r) => !(r.event_id === eventId && r.member_id === io)));
  }

  async function elimina(v: Voce) {
    if (!window.confirm("Vuoi cancellare questo post?")) return;
    const supabase = clientSoloBrowser();
    setVoci((prima) => prima?.filter((x) => x.id !== v.id) ?? null);
    const { error } = await supabase.rpc("elimina_post", { p_event: v.id });
    if (error) return carica();
    if (v.dati.foto) await supabase.storage.from("moodboard").remove([v.dati.foto]);
  }

  async function pubblica(testo: string, file: File | null) {
    if (!io) return { errore: "Devi essere nel gruppo per scrivere." };
    const supabase = clientSoloBrowser();
    let path: string | null = null;
    if (file) {
      // una foto al giorno (ora italiana): lo controlla anche il database, qui si evita di caricarla per niente
      const giornoRoma = (quando: string) => new Date(quando).toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
      if (voci?.some((v) => v.member_id === io && v.tipo === "post" && v.dati.foto && giornoRoma(v.quando) === oggiRoma()))
        return { errore: FOTO_GIA_POSTATA };
      let blob: Blob;
      try {
        blob = (await comprimiFoto(file, PROFILO_FEED)).blob;
      } catch (e) {
        return { errore: messaggioFoto(e) };
      }
      path = `${groupId}/${io}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from("moodboard").upload(path, blob, { contentType: "image/jpeg" });
      if (error) return { errore: "Non riesco a caricare la foto. Riprova." };
    }
    const { data, error } = await supabase.rpc("pubblica_post", { p_group: groupId, p_testo: testo, p_foto: path });
    if (error) {
      if (path) await supabase.storage.from("moodboard").remove([path]);
      return { errore: messaggioErrore(error, "Post non pubblicato") };
    }
    await carica();
    const salvato = (data as Voce | null)?.dati.testo ?? "";
    return salvato !== testo && testo ? { nota: "Pubblicato. Alcuni nomi sono diventati asterischi, per evitare spoiler." } : {};
  }

  if (!voci) return <div className="h-24" />;
  return (
    <div className="flex flex-col gap-4">
      {conComponi && io && <ComponiPost onPubblica={pubblica} />}
      {voci.length === 0 && <p className="text-crema/75">Ancora niente: le novità del gruppo compariranno qui.</p>}
      <ElencoFeed
        voci={voci}
        render={(v) => (
          <VoceFeed
            voce={v}
            persone={persone}
            totem={totem}
            reazioni={reazioni.filter((r) => r.event_id === v.id)}
            risposte={risposte.filter((r) => r.event_id === v.id)}
            io={io}
            fotoUrl={v.dati.foto ? foto[v.dati.foto] : undefined}
            linkBacheca={v.member_id ? `/gruppo/${groupId}/bacheca/${v.member_id}` : undefined}
            onReagisci={(e) => reagisci(v.id, e)}
            onElimina={v.tipo === "post" && v.member_id === io ? () => elimina(v) : undefined}
            onRispondi={io ? (t) => rispondi(v.id, t) : undefined}
            onEliminaRisposta={io ? () => eliminaRisposta(v.id) : undefined}
          />
        )}
      />
      {limite && (
        <TastoLink href={`/gruppo/${groupId}/novita`} tipo="secondario">
          {nuove > 0 ? `Tutte le novità (${nuove > 9 ? "9+" : nuove} nuove)` : "Tutte le novità e i post"}
        </TastoLink>
      )}
    </div>
  );
}
