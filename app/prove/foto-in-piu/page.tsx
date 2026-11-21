"use client";

// Sala prove: il popup per chi ha più di 2 foto in bacheca, con 4 foto inventate (non si cancella niente).
import { useState } from "react";
import { FotoInPiu, type FotoBacheca } from "@/components/foto-in-piu";
import { Feltro, Tasto, TestataInterna } from "@/components/ui";

const colore = (c: string, testo: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${c}"/><text x="50" y="58" font-size="22" text-anchor="middle" fill="#fff" font-family="sans-serif">${testo}</text></svg>`)}`;

const FINTE: FotoBacheca[] = [
  { id: "1", kind: "immagine_link", content: { url: colore("#e5481e", "Foto 1") } },
  { id: "2", kind: "immagine_link", content: { url: colore("#2c4a32", "Foto 2") } },
  { id: "3", kind: "immagine_link", content: { url: colore("#e9a81c", "Foto 3") } },
  { id: "4", kind: "immagine_link", content: { url: colore("#f4a9c4", "Foto 4") } },
];

export default function ProvaFotoInPiu() {
  const [giro, setGiro] = useState(0);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro="/prove" etichettaIndietro="Torna alla sala prove" contesto="Sala prove · niente viene salvato" titolo="Troppe foto in bacheca" />
      <Feltro className="mt-6">
        <p>Il popup compare in ogni pagina del gruppo a chi ha più di 2 foto in bacheca e non si chiude finché non ne restano 2.</p>
        <Tasto className="mt-5" onClick={() => setGiro((g) => g + 1)}>
          Rivedi il popup
        </Tasto>
      </Feltro>
      <FotoInPiu key={giro} memberId="prova" prova={FINTE} />
    </main>
  );
}
