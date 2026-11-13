"use client";

import { useCallback, useEffect, useState } from "react";
import { ComponiPost, ElencoFeed, VoceFeed, type Persona, type Reazione, type TotemNomi, type Voce } from "@/components/feed";
import { TastoLink } from "@/components/ui";
import { riduciFoto } from "@/lib/foto";
import { clientSoloBrowser } from "@/lib/supabase/client";

// Ultima novità vista, ricordata nel telefono (per "N nuove" nella pagina del gruppo)
const chiaveVisto = (groupId: string) => `feed-visto:${groupId}`;

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
  const [foto, setFoto] = useState<Record<string, string>>({});
  const [nuove, setNuove] = useState(0);

  const carica = useCallback(async () => {
    const supabase = clientSoloBrowser();
    let q = supabase.from("feed_events").select("id, member_id, tipo, dati, quando").eq("group_id", groupId).order("quando", { ascending: false });
    q = q.limit(limite ?? 200);
    const { data } = await q;
    const elenco = (data as Voce[]) ?? [];
    const ids = elenco.map((v) => v.id);
    const percorsi = elenco.flatMap((v) => (v.dati.foto ? [v.dati.foto] : []));
    const [{ data: r }, firmati] = await Promise.all([
      ids.length ? supabase.from("feed_reactions").select("event_id, member_id, emoji").in("event_id", ids) : Promise.resolve({ data: [] }),
      percorsi.length ? supabase.storage.from("moodboard").createSignedUrls(percorsi, 60 * 60) : Promise.resolve({ data: [] }),
    ]);
    setVoci(elenco);
    setReazioni((r as Reazione[]) ?? []);
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
      try {
        const { blob } = await riduciFoto(file);
        path = `${groupId}/${io}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("moodboard").upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
      } catch {
        return { errore: "Non riesco a caricare la foto. Riprova." };
      }
    }
    const { data, error } = await supabase.rpc("pubblica_post", { p_group: groupId, p_testo: testo, p_foto: path });
    if (error) {
      if (path) await supabase.storage.from("moodboard").remove([path]);
      return { errore: error.message.includes("fetch") ? "Post non pubblicato: controlla la connessione e riprova." : error.message };
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
            io={io}
            fotoUrl={v.dati.foto ? foto[v.dati.foto] : undefined}
            linkBacheca={v.member_id ? `/gruppo/${groupId}/bacheca/${v.member_id}` : undefined}
            onReagisci={(e) => reagisci(v.id, e)}
            onElimina={v.tipo === "post" && v.member_id === io ? () => elimina(v) : undefined}
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
