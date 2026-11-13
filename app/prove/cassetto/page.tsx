"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Cassettiera, oggettoDaToppa, type OggettoCassetto } from "@/components/cassettiera";
import { CATALOGO } from "@/components/toppe";
import { TestataInterna } from "@/components/ui";
import { suoni } from "@/lib/suoni";

// PROVA della cassettiera (non ancora nella bacheca vera)
const base = (tipo: "simbolo" | "parola" | "palette") =>
  CATALOGO.filter((t) => t.tipo === tipo && !t.ritirata && !t.totem).map((t) => oggettoDaToppa(t, tipo !== "parola"));

export default function ProvaCassetto() {
  const router = useRouter();
  const [ultima, setUltima] = useState("");
  const [foto, setFoto] = useState<OggettoCassetto[]>([]);
  const [contenuto] = useState(() => ({ simbolo: base("simbolo"), parola: base("parola"), palette: base("palette") }));

  function prendi(o: OggettoCassetto) {
    suoni.toppa();
    setUltima(o.nome);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove"
        titolo="La cassettiera"
        sottotitolo="Prova. Tocca un cassetto (o trascinalo giù) per aprirlo, su per chiuderlo. Dentro trascini le toppe dove vuoi; un tocco le prende."
      />
      <div className="mt-6">
        <Cassettiera
          contenuto={contenuto}
          onPrendi={prendi}
          onPuntoCroce={() => router.push("/prove/bacheca?ricamo=1")}
          fotoCassetto={{
            oggetti: foto,
            scegli: (
              <label className="tasto cucitura cliccabile stoffa-chiara cursor-pointer">
                <span>Scegli una foto</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    const url = URL.createObjectURL(f);
                    const img = new Image();
                    img.onload = () => {
                      const rapporto = img.naturalWidth / img.naturalHeight;
                      setFoto((l) => [
                        ...l,
                        {
                          id: url,
                          nome: "Foto",
                          rapporto: 0.85,
                          larghezza: 30,
                          conNome: false,
                          // polaroid: la foto dentro una cornice bianca
                          disegno: () => (
                            <span className="block h-full w-full bg-white p-[7%] pb-[18%]">
                              {/* eslint-disable-next-line @next/next/no-img-element -- foto locale di prova */}
                              <img src={url} alt="" draggable={false} className="h-full w-full object-cover" style={{ aspectRatio: String(rapporto) }} />
                            </span>
                          ),
                        },
                      ]);
                    };
                    img.src = url;
                  }}
                />
              </label>
            ),
          }}
        />
      </div>
      <p className="mt-6 min-h-6 text-center text-crema/85" aria-live="polite">
        {ultima ? `Presa: ${ultima}` : "Qui ci sono le toppe per tutti."}
      </p>
    </main>
  );
}
