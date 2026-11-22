"use client";

import { useState } from "react";
import { normalizzaLook } from "@/components/avatar";
import { ComponiPost, ElencoFeed, VoceFeed, type Persona, type Reazione, type Risposta, type Voce } from "@/components/feed";
import { TestataInterna } from "@/components/ui";
import { NOMI_PROVA, censuraProva } from "@/lib/prove";
import { TOTEM_PREDEFINITI } from "@/lib/totem";

// Sala prove delle Novità: voci inventate, post, reazioni e risposte che non si salvano. La censura dei nomi è quella vera.
const IO = "io";
const PERSONE: Record<string, Persona> = {
  [IO]: { nome: "Tu", look: normalizzaLook(null, "tu-prova") },
  ...Object.fromEntries(NOMI_PROVA.map((n, i) => [`p${i}`, { nome: n.split(" ")[0], look: normalizzaLook(null, n) }])),
};
const fa = (minuti: number) => new Date(Date.now() - minuti * 60000).toISOString();
const VOCI: Voce[] = [
  { id: "v1", member_id: "p1", tipo: "post", dati: { testo: "Chi porta il panettone sabato? Io porto il pandoro, non si discute 🎄" }, quando: fa(4) },
  { id: "v2", member_id: "p0", tipo: "totem", dati: { profilo: "IMPEGNO_ALTO_RICEVE_TUTTO" }, quando: fa(35) },
  { id: "v3", member_id: "p2", tipo: "bacheca", dati: {}, quando: fa(80) },
  { id: "v4", member_id: "p3", tipo: "busta", dati: {}, quando: fa(200) },
  { id: "v5", member_id: null, tipo: "estrazione", dati: {}, quando: fa(60 * 26) },
  { id: "v7", member_id: null, tipo: "rifatta", dati: {}, quando: fa(60 * 28) },
  { id: "v6", member_id: "p4", tipo: "entrato", dati: {}, quando: fa(60 * 50) },
];
const REAZIONI: Reazione[] = [
  { event_id: "v1", member_id: "p0", emoji: "😂" },
  { event_id: "v1", member_id: "p3", emoji: "😂" },
  { event_id: "v1", member_id: "p4", emoji: "🎄" },
  { event_id: "v2", member_id: "p1", emoji: "❤️" },
  { event_id: "v5", member_id: "p2", emoji: "🔥" },
];
const RISPOSTE: Risposta[] = [
  { event_id: "v1", member_id: "p0", testo: "Pandoro forever" },
  { event_id: "v1", member_id: "p3", testo: "io il torrone!" },
];
const TOTEM = Object.fromEntries(Object.entries(TOTEM_PREDEFINITI).map(([k, v]) => [k, { nome: v.nome }]));

export default function ProvaNovita() {
  const [voci, setVoci] = useState(VOCI);
  const [reazioni, setReazioni] = useState(REAZIONI);
  const [foto, setFoto] = useState<Record<string, string>>({});
  const [risposte, setRisposte] = useState(RISPOSTE);

  async function rispondi(eventId: string, testo: string) {
    const coperto = await censuraProva(testo);
    setRisposte((r) => [...r, { event_id: eventId, member_id: IO, testo: coperto }]);
  }

  function reagisci(eventId: string, emoji: string) {
    setReazioni((prima) => {
      const mia = prima.find((r) => r.event_id === eventId && r.member_id === IO);
      const senza = prima.filter((r) => !(r.event_id === eventId && r.member_id === IO));
      return mia?.emoji === emoji ? senza : [...senza, { event_id: eventId, member_id: IO, emoji }];
    });
  }

  async function pubblica(testo: string, file: File | null) {
    const coperto = testo ? await censuraProva(testo) : "";
    const id = `post-${Date.now()}`;
    if (file) setFoto((f) => ({ ...f, [id]: URL.createObjectURL(file) }));
    setVoci((v) => [{ id, member_id: IO, tipo: "post", dati: { testo: coperto || undefined, foto: file ? id : undefined }, quando: new Date().toISOString() }, ...v]);
    return coperto !== testo ? { nota: "Pubblicato. Alcuni nomi sono diventati asterischi, per evitare spoiler." } : {};
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove · niente viene salvato"
        titolo="Novità"
        sottotitolo={`Prova a nominare gli amici inventati (${NOMI_PROVA.map((n) => n.split(" ")[0]).join(", ")}), anche con trucchi: diventano asterischi. Tieni premuto un post per reagire, o rispondi sotto (15 caratteri, una risposta a testa).`}
      />
      <div className="mt-6 flex flex-col gap-4">
        <ComponiPost onPubblica={pubblica} />
        <ElencoFeed
          voci={voci}
          render={(v) => (
            <VoceFeed
              voce={v}
              persone={PERSONE}
              totem={TOTEM}
              reazioni={reazioni.filter((r) => r.event_id === v.id)}
              risposte={risposte.filter((r) => r.event_id === v.id)}
              io={IO}
              fotoUrl={v.dati.foto ? foto[v.dati.foto] : undefined}
              linkBacheca={v.tipo === "bacheca" ? "/prove/bacheca" : undefined}
              onReagisci={(e) => reagisci(v.id, e)}
              onElimina={v.member_id === IO ? () => setVoci((x) => x.filter((y) => y.id !== v.id)) : undefined}
              onRispondi={(t) => rispondi(v.id, t)}
              onEliminaRisposta={() => setRisposte((r) => r.filter((x) => !(x.event_id === v.id && x.member_id === IO)))}
            />
          )}
        />
      </div>
    </main>
  );
}
