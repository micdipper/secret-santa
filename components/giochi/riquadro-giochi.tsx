"use client";

import { useEffect, useState } from "react";
import { Feltro, TastoLink, TitoloRiquadro } from "@/components/ui";
import { caricaGiochi, type DatiGiochi } from "@/lib/giochi/dati";
import { GIOCHI } from "@/lib/giochi/elenco";
import { durataBreve, scartoDa, statoDa, useOraServer } from "@/lib/giochi/ora";
import { clientSoloBrowser } from "@/lib/supabase/client";

// Riquadro "Calendario dei giochi" nella pagina del gruppo (solo se il gruppo ha i giochi).
export function RiquadroGiochi({ groupId }: { groupId: string }) {
  const [dati, setDati] = useState<{ giochi: DatiGiochi; scarto: number } | null>(null);
  useEffect(() => {
    caricaGiochi(clientSoloBrowser(), groupId).then((g) => g?.attivi && g.giochi.length === 5 && setDati({ giochi: g, scarto: scartoDa(g.ora_server) }));
  }, [groupId]);
  const ora = useOraServer(dati?.scarto ?? 0);
  if (!dati || !ora) return null;

  const finestre = dati.giochi.giochi.map((g) => ({ ...g, apre: new Date(g.apre_alle).getTime(), chiude: new Date(g.chiude_alle).getTime() }));
  const oggi = finestre.find((f) => statoDa(f.apre, f.chiude, ora) === "aperto");
  const primo = finestre[0];
  const calendario = `/gruppo/${groupId}/giochi`;

  if (oggi) {
    const info = GIOCHI[oggi.n - 1];
    const rimasti = 3 - oggi.miei_tentativi;
    return (
      <Feltro className="mt-4">
        <p className="text-sm text-inchiostro/70">Calendario dei giochi · gioco {oggi.n} di 5</p>
        <TitoloRiquadro className="mt-1">{info.nome}</TitoloRiquadro>
        <p className="mt-2">
          Chiude tra {durataBreve(oggi.chiude - ora)}. In palio: <strong>{info.nomePremio}</strong>.
        </p>
        <TastoLink href={`${calendario}/${oggi.n}`} className="mt-5">
          {rimasti === 3 ? "Gioca" : rimasti > 0 ? `Riprova (${rimasti} ${rimasti === 1 ? "rimasto" : "rimasti"})` : "Guarda la classifica"}
        </TastoLink>
        <TastoLink href={calendario} tipo="secondario" className="mt-3">
          Tutto il calendario
        </TastoLink>
      </Feltro>
    );
  }

  const giorni = Math.ceil((primo.apre - ora) / 86_400_000);
  return (
    <Feltro className="mt-4">
      <TitoloRiquadro>Calendario dei giochi</TitoloRiquadro>
      <p className="mt-2">
        {ora < primo.apre
          ? `I giochi iniziano ${giorni <= 1 ? "domani" : `tra ${giorni} giorni`}: uno al giorno fino allo scambio, con un premio per chi vince.`
          : "I giochi sono finiti: guarda chi ha vinto i premi."}
      </p>
      <TastoLink href={calendario} tipo="secondario" className="mt-5">
        {ora < primo.apre ? "Guarda il calendario" : "Guarda i vincitori"}
      </TastoLink>
    </Feltro>
  );
}
