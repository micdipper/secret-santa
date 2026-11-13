"use client";

import { useEffect, useState } from "react";
import { chiaveLetto, type Ruolo } from "@/components/santa-chat";
import { clientSoloBrowser } from "@/lib/supabase/client";

// Pallino con il numero di messaggi nuovi della Santa Chat (l'ultimo letto è ricordato nel telefono).
export function PallinoChat({ receiverId, ruolo }: { receiverId: string; ruolo: Ruolo }) {
  const [nuovi, setNuovi] = useState(0);
  useEffect(() => {
    const supabase = clientSoloBrowser();
    let letto = "1970-01-01T00:00:00Z";
    try {
      letto = localStorage.getItem(chiaveLetto(receiverId, ruolo)) ?? letto;
    } catch {}
    supabase
      .from("santa_messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_member_id", receiverId)
      .eq("dal_babbo", ruolo === "pescato") // solo quelli scritti dall'altro
      .gt("created_at", letto)
      .then(({ count }) => setNuovi(count ?? 0));
  }, [receiverId, ruolo]);
  if (!nuovi) return null;
  return (
    <span className="relative flex h-7 min-w-7 flex-none items-center justify-center rounded-full bg-senape px-2 text-sm font-semibold text-inchiostro shadow-[0_1px_0_rgba(0,0,0,.25)]">
      <span className="sr-only">Messaggi nuovi: </span>
      {nuovi > 9 ? "9+" : nuovi}
    </span>
  );
}
