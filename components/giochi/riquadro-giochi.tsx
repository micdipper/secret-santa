"use client";

import { useEffect, useState } from "react";
import { Feltro, TastoLink, TitoloRiquadro } from "@/components/ui";
import { aperturaCalendario, regaliScartati } from "@/lib/giochi/avvento";
import { caricaGiochi, type DatiGiochi } from "@/lib/giochi/dati";
import { GIOCHI } from "@/lib/giochi/elenco";
import { durataBreve, scartoDa, statoDa, useOraServer } from "@/lib/giochi/ora";
import { clientSoloBrowser } from "@/lib/supabase/client";

// Riquadro "Mini giochi dell'avvento" nella pagina del gruppo (solo se il gruppo ha i giochi).
// Il nome del gioco di oggi resta una sorpresa finché il regalo non è stato scartato nel calendario.
export function RiquadroGiochi({ groupId }: { groupId: string }) {
  const [dati, setDati] = useState<{ giochi: DatiGiochi; scarto: number; scartati: number[] } | null>(null);
  useEffect(() => {
    caricaGiochi(clientSoloBrowser(), groupId).then((g) => g?.attivi && g.giochi.length === 5 && setDati({ giochi: g, scarto: scartoDa(g.ora_server), scartati: regaliScartati(groupId) }));
  }, [groupId]);
  const ora = useOraServer(dati?.scarto ?? 0);
  if (!dati || !ora) return null;

  const finestre = dati.giochi.giochi.map((g) => ({ ...g, apre: new Date(g.apre_alle).getTime(), chiude: new Date(g.chiude_alle).getTime() }));
  const oggi = finestre.find((f) => statoDa(f.apre, f.chiude, ora) === "aperto");
  const apertura = aperturaCalendario(finestre[0].apre);
  const calendario = `/gruppo/${groupId}/giochi`;

  // prima dei 5 giorni: solo un'informazione (piatta)
  if (ora < apertura) {
    return (
      <Feltro className="mt-4">
        <TitoloRiquadro>Mini giochi dell&apos;avvento</TitoloRiquadro>
        <p className="mt-2">Il calendario si sblocca tra {durataBreve(apertura - ora)}, 5 giorni prima dello scambio.</p>
      </Feltro>
    );
  }

  if (oggi) {
    const info = GIOCHI[oggi.n - 1];
    const scartato = dati.scartati.includes(oggi.n);
    const rimasti = 3 - oggi.miei_tentativi;
    return (
      <Feltro className="mt-4">
        <p className="text-sm text-inchiostro/70">Mini giochi dell&apos;avvento · regalo {oggi.n} di 5</p>
        <TitoloRiquadro className="mt-1">{scartato ? info.nome : "C'è un regalo da scartare!"}</TitoloRiquadro>
        <p className="mt-2">
          Chiude tra {durataBreve(oggi.chiude - ora)}. Il premio? <em>{info.indizio}</em>
        </p>
        {scartato ? (
          <>
            <TastoLink href={`${calendario}/${oggi.n}`} className="mt-5">
              {rimasti === 3 ? "Gioca" : rimasti > 0 ? `Riprova (${rimasti} ${rimasti === 1 ? "rimasto" : "rimasti"})` : "Guarda la classifica"}
            </TastoLink>
            <TastoLink href={calendario} tipo="secondario" className="mt-3">
              Tutto il calendario
            </TastoLink>
          </>
        ) : (
          <TastoLink href={calendario} className="mt-5">
            Scarta il regalo di oggi
          </TastoLink>
        )}
      </Feltro>
    );
  }

  const finiti = ora >= finestre[4].chiude;
  return (
    <Feltro className="mt-4">
      <TitoloRiquadro>Mini giochi dell&apos;avvento</TitoloRiquadro>
      <p className="mt-2">{finiti ? "I mini giochi sono finiti: guarda chi ha vinto." : "Il calendario è aperto: il primo regalo si scarta domani."}</p>
      <TastoLink href={calendario} tipo="secondario" className="mt-5">
        Apri il calendario
      </TastoLink>
    </Feltro>
  );
}
