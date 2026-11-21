"use client";

// Avviso di fine Secret Santa (regole di Marzia, 21/11): da 7 giorni prima della cancellazione del gruppo
// fino al giorno stesso. Si chiude, ma ricompare il giorno dopo (ricordo nel telefono per gruppo e per giorno).
// Il giorno della cancellazione arriva dal database (public.fine_gruppo), calcolato ogni volta.
// Testi tutti qui (testoFineSanta): quando arriverà la condivisione di bacheca e personaggio come ricordo,
// basta aggiungere il tasto in questo componente.

import { useEffect, useState } from "react";
import { Icone, TastoTondo, TitoloRiquadro } from "@/components/ui";
import { oggiRoma } from "@/lib/date";
import { leggi, scrivi } from "@/lib/memoria";

export type FineGruppo = { data: string; giorni: number; avviso: boolean };

// "8 gennaio", "1° gennaio"
function giornoMese(data: string) {
  const d = new Date(`${data}T12:00:00Z`);
  const mese = d.toLocaleDateString("it-IT", { month: "long", timeZone: "UTC" });
  const giorno = d.getUTCDate();
  return `${giorno === 1 ? "1°" : giorno} ${mese}`;
}
// "l'8 gennaio", "l'11 gennaio", "il 13 dicembre"
const conArticolo = (data: string) => {
  const g = new Date(`${data}T12:00:00Z`).getUTCDate();
  return `${g === 8 || g === 11 ? "l'" : "il "}${giornoMese(data)}`;
};

export function testoFineSanta(f: Pick<FineGruppo, "data" | "giorni">) {
  const quando =
    f.giorni <= 0
      ? "Oggi è l'ultimo giorno: stanotte verranno cancellati."
      : f.giorni === 1
        ? `Manca 1 giorno: verranno cancellati domani, ${giornoMese(f.data)}.`
        : `Mancano ${f.giorni} giorni: verranno cancellati ${conArticolo(f.data)}.`;
  return `A fine Secret Santa gli account vengono eliminati. Fai uno screenshot della tua bacheca e del tuo personaggio per ricordo! ${quando}`;
}

export function FineSanta({ groupId, fine, prova = false }: { groupId: string; fine: FineGruppo; prova?: boolean }) {
  const chiave = `fine-santa-visto:${groupId}:${oggiRoma()}`;
  const [visibile, setVisibile] = useState(false); // si decide dopo il montaggio (la memoria è solo nel telefono)

  useEffect(() => {
    // dopo un attimo, come gli altri avvisi: non si sovrappone al caricamento della pagina
    const t = setTimeout(() => setVisibile(prova || !leggi(chiave, false)), prova ? 0 : 600);
    return () => clearTimeout(t);
  }, [chiave, prova]);

  if (!fine.avviso || !visibile) return null;
  return (
    <aside
      aria-label="Fine del Secret Santa"
      className={`${prova ? "" : "fixed inset-x-0 bottom-0 z-[400] px-4 pb-[max(16px,env(safe-area-inset-bottom))]"} mx-auto w-full max-w-md`}
    >
      <div className="feltro p-6 shadow-[0_-8px_24px_rgba(0,0,0,.35)]">
        <div className="relative flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <TitoloRiquadro>Fine del Secret Santa</TitoloRiquadro>
            <p className="mt-3">{testoFineSanta(fine)}</p>
          </div>
          <TastoTondo
            etichetta="Chiudi l'avviso (torna domani)"
            icona={Icone.chiudi}
            onClick={() => {
              if (!prova) scrivi(chiave, true);
              setVisibile(false);
            }}
          />
        </div>
      </div>
    </aside>
  );
}
