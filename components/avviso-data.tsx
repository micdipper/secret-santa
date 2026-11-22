"use client";

import { PopUp } from "@/components/pop-up";
import { GIORNI_MINIMI_GIOCHI, NUMERO_GIOCHI } from "@/lib/giochi/avvento";
import { Tasto, TitoloRiquadro } from "@/components/ui";
import { dataBreve, giornoPrima, giorniMancanti, oggiRoma } from "@/lib/date";

export function dataTroppoVicina(data: string | null) {
  const g = giorniMancanti(data || null);
  return g !== null && g >= 0 && g < GIORNI_MINIMI_GIOCHI;
}

// Il primo giorno che va bene per avere tutti i giochi
function primaDataBuona() {
  return giornoPrima(oggiRoma(), -GIORNI_MINIMI_GIOCHI);
}

// Quanti mini giochi si perdono con questa data (stessa regola del database).
// Oggi è "tutti o niente"; con i giochi in più (blocco E) diventerà quelli dei giorni già passati.
function giochiPersi(data: string | null): number {
  return dataTroppoVicina(data) ? NUMERO_GIOCHI : 0;
}

// Pop-up: con la data scelta si perdono dei mini giochi (e i doni che si vincono). Si conferma o si cambia.
export function AvvisoDataVicina({
  aperto,
  data,
  onAltraData,
  onContinua,
}: {
  aperto: boolean;
  data: string | null;
  onAltraData: () => void;
  onContinua: () => void;
}) {
  const persi = giochiPersi(data);
  const tutti = persi >= NUMERO_GIOCHI;
  return (
    <PopUp aperto={aperto} etichetta="avviso-data-titolo" tipo="alertdialog">
      <TitoloRiquadro>
        <span id="avviso-data-titolo">
          {tutti ? "Con questa data niente mini giochi" : `Con questa data perdete ${persi} ${persi === 1 ? "gioco" : "giochi"}`}
        </span>
      </TitoloRiquadro>
      <p className="mt-3">
        I mini giochi dell&apos;avvento sono {NUMERO_GIOCHI}, uno al giorno fino allo scambio.{" "}
        {tutti
          ? "Con questa data non si potrà giocare a nessuno, e nessuno riceverà i doni che ci sono in palio."
          : `Con questa data i primi ${persi} non si potranno giocare, e con loro i doni che si ricevono vincendoli.`}
      </p>
      <Tasto className="mt-6" onClick={onAltraData}>
        Scegli un altro giorno
      </Tasto>
      <Tasto tipo="secondario" className="mt-3" onClick={onContinua}>
        Confermo questa data
      </Tasto>
      <p className="mt-4 text-sm text-inchiostro/70">
        Consiglio: se lo scambio è davvero così vicino, imposta comunque una data più in là (dal {dataBreve(primaDataBuona())} in poi), così giocate a tutti e{" "}
        {NUMERO_GIOCHI}. Tanto chettefrega.
      </p>
    </PopUp>
  );
}
