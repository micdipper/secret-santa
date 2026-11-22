"use client";

// Pop-up "Novità sotto l'albero": le note dell'ultimo aggiornamento (lib/novita-sito.ts), una volta sola per telefono.
// Solo nella home e nelle pagine dei gruppi. Chi apre il sito per la prima volta non le vede
// (per chi arriva adesso è tutto nuovo): si segna l'ultima versione e basta.

import { PopUp } from "@/components/pop-up";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Tasto, TitoloRiquadro } from "@/components/ui";
import { leggi, scrivi } from "@/lib/memoria";
import { NOVITA_SITO } from "@/lib/novita-sito";

const CHIAVE = "novita-sito-vista";

export function NovitaSito({ prova = false }: { prova?: boolean }) {
  const percorso = usePathname();
  const [aperto, setAperto] = useState(false);
  const ultima = NOVITA_SITO[0];
  const pagineGiuste = percorso === "/" || /^\/gruppo\/[^/]+$/.test(percorso ?? "");

  useEffect(() => {
    if (prova) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- in sala prove si vede sempre
      setAperto(true);
      return;
    }
    if (!ultima || !pagineGiuste) return;
    const vista = leggi<string | null>(CHIAVE, null);
    if (vista === null && leggi<unknown[]>("portachiavi", []).length === 0) {
      scrivi(CHIAVE, ultima.versione); // primo giro sul sito: niente note
      return;
    }
    if (vista !== null && vista >= ultima.versione) return;
    const t = setTimeout(() => setAperto(true), 1200); // dopo gli altri avvisi della pagina
    return () => clearTimeout(t);
  }, [ultima, pagineGiuste, prova]);

  const chiudi = () => {
    if (!prova) scrivi(CHIAVE, ultima.versione);
    setAperto(false);
  };

  return (
    <PopUp aperto={aperto} etichetta="novita-sito-titolo" className="flex max-h-[85dvh] flex-col">
      <div className="relative flex min-h-0 flex-col">
        <p className="text-sm text-inchiostro/70">Il sito si è aggiornato</p>
        <TitoloRiquadro className="mt-1">
          <span id="novita-sito-titolo">Novità sotto l&apos;albero</span>
        </TitoloRiquadro>
        <ul className="mt-4 min-h-0 space-y-4 overflow-y-auto">
          {ultima.voci.map((v) => (
            <li key={v.titolo} className="flex gap-3">
              <span aria-hidden className="mt-0.5 font-titolo text-vermiglio">
                ✦
              </span>
              <p>
                <strong className="text-abete">{/[?!.]$/.test(v.titolo) ? v.titolo : `${v.titolo}.`}</strong> {v.testo}
              </p>
            </li>
          ))}
        </ul>
        <Tasto className="mt-6 shrink-0" onClick={chiudi}>
          Che bello!
        </Tasto>
      </div>
    </PopUp>
  );
}
