"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { controllaPremi } from "@/components/avviso-premi";
import { lookDi, type Look } from "@/components/avatar";
import { SantaChat, chiaveLetto, type Messaggio, type Ruolo } from "@/components/santa-chat";
import { clientSoloBrowser } from "@/lib/supabase/client";
import { suoni } from "@/lib/suoni";

/*
  Santa Chat vera.
  ?con=pescato → scrivo alla persona che ho pescato (io sono il Babbo; serve aver aperto la busta)
  ?con=babbo   → scrivo al mio Babbo Natale (non so chi è: il database non lo dice mai)
*/
export default function PaginaSantaChat() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}

type Conversazione = { ruolo: Ruolo; receiverId: string; nomeAltro: string; lookAltro: Look | null; nomeGruppo: string };

function Chat() {
  const { id } = useParams<{ id: string }>();
  const con = useSearchParams().get("con") === "pescato" ? "pescato" : "babbo";
  const router = useRouter();
  const supabase = clientSoloBrowser();
  const [conv, setConv] = useState<Conversazione | null>(null);
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const giaInviato = useRef(false);

  // chi sono e con chi parlo
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) return;
      const [{ data: g }, { data: membri }] = await Promise.all([
        supabase.from("groups").select("name, status").eq("id", id).maybeSingle(),
        supabase.from("group_members").select("id, user_id, envelope_opened_at").eq("group_id", id),
      ]);
      const io = membri?.find((m) => m.user_id === uid);
      // la Santa Chat si apre solo quando tutti hanno aperto la busta: prima la sua pagina spiega perché
      if (!g || !io || g.status === "aperto" || membri!.some((m) => !m.envelope_opened_at)) return router.replace(`/gruppo/${id}/santa-chat`);

      if (con === "babbo") {
        setConv({ ruolo: "pescato", receiverId: io.id, nomeAltro: "Babbo Natale", lookAltro: null, nomeGruppo: g.name });
        return;
      }
      // scrivo a chi ho pescato: solo dopo aver aperto la busta (prima il nome è una sorpresa)
      if (!io.envelope_opened_at) return router.replace(`/gruppo/${id}/busta`);
      const { data: a } = await supabase.from("assignments").select("receiver_member_id").eq("group_id", id).maybeSingle();
      if (!a) return router.replace(`/gruppo/${id}`);
      const { data: dest } = await supabase.from("group_members").select("display_name, user_id").eq("id", a.receiver_member_id).maybeSingle();
      const { data: profili } = dest?.user_id ? await supabase.from("profiles").select("user_id, look").eq("user_id", dest.user_id) : { data: null };
      setConv({
        ruolo: "babbo",
        receiverId: a.receiver_member_id,
        nomeAltro: dest?.display_name ?? "",
        lookAltro: lookDi(profili, dest?.user_id ?? null),
        nomeGruppo: g.name,
      });
    })();
  }, [con, id, router, supabase]);

  const carica = useCallback(async () => {
    if (!conv) return;
    const { data } = await supabase
      .from("santa_messages")
      .select("id, dal_babbo, testo, created_at")
      .eq("receiver_member_id", conv.receiverId)
      .order("created_at")
      .limit(1000);
    if (data) setMessaggi((prima) => [...data, ...prima.filter((m) => m.inAttesa)]);
  }, [conv, supabase]);

  // messaggi + tempo reale (e ricarica quando si torna sull'app: il telefono chiude la connessione)
  useEffect(() => {
    if (!conv) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- i messaggi arrivano dal database (asincrono)
    carica();
    const canale = supabase
      .channel(`santa-chat:${conv.receiverId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "santa_messages", filter: `receiver_member_id=eq.${conv.receiverId}` },
        (p) => {
          const m = p.new as Messaggio;
          setMessaggi((prima) => (prima.some((x) => x.id === m.id) ? prima : [...prima, m]));
          if (m.dal_babbo !== (conv.ruolo === "babbo")) suoni.arrivato();
        },
      )
      .subscribe();
    const torna = () => document.visibilityState === "visible" && carica();
    document.addEventListener("visibilitychange", torna);
    return () => {
      document.removeEventListener("visibilitychange", torna);
      supabase.removeChannel(canale);
    };
  }, [conv, carica, supabase]);

  // ricorda nel telefono l'ultimo messaggio letto (per il pallino nella pagina del gruppo)
  useEffect(() => {
    if (!conv) return;
    const ultimo = messaggi.filter((m) => !m.inAttesa).at(-1);
    if (!ultimo) return;
    try {
      localStorage.setItem(chiaveLetto(conv.receiverId, conv.ruolo), ultimo.created_at);
    } catch {}
  }, [conv, messaggi]);

  async function invia(testo: string) {
    if (!conv) return { errore: "Un attimo, sto ancora caricando." };
    const provvisorio: Messaggio = {
      id: `attesa-${Date.now()}`,
      dal_babbo: conv.ruolo === "babbo",
      testo,
      created_at: new Date().toISOString(),
      inAttesa: true,
    };
    setMessaggi((prima) => [...prima, provvisorio]);
    const { data, error } = await supabase.rpc("invia_santa_message", { p_group: id, p_dal_babbo: conv.ruolo === "babbo", p_testo: testo });
    setMessaggi((prima) => {
      const senza = prima.filter((m) => m.id !== provvisorio.id);
      const vero = data as Messaggio | null;
      if (error || !vero || senza.some((m) => m.id === vero.id)) return senza;
      return [...senza, vero];
    });
    if (error) return { errore: error.message.includes("fetch") ? "Messaggio non inviato: controlla la connessione e riprova." : error.message };
    if (!giaInviato.current) {
      giaInviato.current = true;
      controllaPremi(); // il primo messaggio sblocca il Taglio Super
    }
    // regola anti-spoiler: il database copre i nomi del gruppo con asterischi
    return (data as Messaggio | null)?.testo !== testo ? { nota: "Alcuni nomi sono diventati asterischi, per evitare spoiler." } : {};
  }

  if (!conv) return <main className="flex-1" />;
  return (
    <SantaChat
      ruolo={conv.ruolo}
      nomeAltro={conv.nomeAltro}
      lookAltro={conv.lookAltro}
      messaggi={messaggi}
      onInvia={invia}
      indietro={`/gruppo/${id}/santa-chat`}
      etichettaIndietro="Torna alla Santa Chat"
      contesto={conv.nomeGruppo}
    />
  );
}
