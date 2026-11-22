"use client";

// Fine del Secret Santa (Marzia, 21-22/11): da 7 giorni prima della cancellazione del gruppo, nella pagina
// principale del gruppo c'è una striscia fissa in basso (resta anche scorrendo) con l'essenziale.
// - toccandola si apre la scheda con tutte le informazioni (e il ricordo da salvare);
// - la X la chiude fino al giorno dopo (chiave `fine-santa-visto:<gruppo>:<giorno>`), così torna insistente;
// - dal 3° giorno da quando questo telefono l'ha vista la prima volta (`fine-santa-dal:<gruppo>`), la X chiede
//   "Chiudi per oggi" oppure "Non mostrare più" (`fine-santa-mai:<gruppo>`).
// Solo nella pagina principale: nelle altre (bacheca, guardaroba…) coprirebbe i loro tasti in basso.
// Testi tutti qui: testoFineSanta (scheda) e quandoStriscia (striscia e titolo della scheda).

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PopUp } from "@/components/pop-up";
import { Icone, Tasto, TastoLink, TastoTondo, TitoloRiquadro } from "@/components/ui";
import { giornoPrima, giorniTra, oggiRoma } from "@/lib/date";
import { leggi, scrivi } from "@/lib/memoria";

export type FineGruppo = { data: string; giorni: number; avviso: boolean };

// dopo quanti giorni dalla prima volta compare "Non mostrare più"
const GIORNI_PRIMA_DI_MAI = 3;

// "8 gennaio", "1° gennaio"
function giornoMese(data: string) {
  const d = new Date(`${data}T12:00:00Z`);
  const mese = d.toLocaleDateString("it-IT", {
    month: "long",
    timeZone: "UTC",
  });
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
  return `A fine Secret Santa gli account vengono eliminati. Salva un ricordo: la tua bacheca col tuo personaggio diventa un'immagine da tenere o condividere. ${quando}`;
}

// La parte grande della striscia (sempre corta, su una riga: al massimo "il 30 dicembre"); sopra c'è "Il gruppo sparisce"
function quandoStriscia(f: Pick<FineGruppo, "data" | "giorni">) {
  if (f.giorni <= 0) return "stanotte";
  if (f.giorni === 1) return "domani";
  return conArticolo(f.data);
}

export function FineSanta({
  groupId,
  memberId,
  fine,
  prova = false,
  giorniVisto = 0,
}: {
  groupId: string;
  memberId?: string;
  fine: FineGruppo;
  prova?: boolean;
  giorniVisto?: number; // solo sala prove: da quanti giorni la si vede
}) {
  const percorso = usePathname();
  const paginaPrincipale = prova || percorso === `/gruppo/${groupId}`;
  const oggi = oggiRoma();
  const chiaveOggi = `fine-santa-visto:${groupId}:${oggi}`;
  const chiaveDal = `fine-santa-dal:${groupId}`;
  const chiaveMai = `fine-santa-mai:${groupId}`;

  const [visibile, setVisibile] = useState(false); // si decide dopo il montaggio (la memoria è solo nel telefono)
  const [dal, setDal] = useState(oggi);
  const [scheda, setScheda] = useState(false);
  const [scelta, setScelta] = useState(false); // "Chiudi per oggi" / "Non mostrare più"

  useEffect(() => {
    if (!fine.avviso || !paginaPrincipale) return;
    if (prova) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- in sala prove si vede sempre
      setDal(giornoPrima(oggi, giorniVisto));
      setVisibile(true);
      return;
    }
    const primaVolta = leggi<string | null>(chiaveDal, null) ?? oggi;
    scrivi(chiaveDal, primaVolta);
    setDal(primaVolta);
    // dopo un attimo, come gli altri avvisi: non si sovrappone al caricamento della pagina
    const t = setTimeout(() => setVisibile(!leggi(chiaveOggi, false) && !leggi(chiaveMai, false)), 600);
    return () => clearTimeout(t);
  }, [fine.avviso, paginaPrincipale, prova, giorniVisto, oggi, chiaveDal, chiaveOggi, chiaveMai]);

  const puoiDireMai = giorniTra(dal, oggi) >= GIORNI_PRIMA_DI_MAI;

  // chiude la striscia: per oggi (chiaveOggi) o per sempre (chiaveMai)
  function chiudi(chiave: string) {
    if (!prova) scrivi(chiave, true);
    setScelta(false);
    setVisibile(false);
  }

  if (!fine.avviso || !paginaPrincipale) return null;
  return (
    <>
      <AnimatePresence>
        {visibile && (
          <>
            {/* spazio in fondo alla pagina, così la striscia non copre le ultime cose */}
            {!prova && <div aria-hidden className="h-24 shrink-0" />}
            <motion.aside
              aria-label="Fine del Secret Santa"
              className={`${prova ? "" : "fixed inset-x-0 bottom-0 z-[400] px-4 pb-[max(16px,env(safe-area-inset-bottom))]"} mx-auto flex w-full max-w-md items-center gap-3`}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <button
                type="button"
                onClick={() => setScheda(true)}
                aria-label={`${`Il gruppo sparisce ${quandoStriscia(fine)}`}. Tocca per sapere di più`}
                className="cliccabile cucitura stoffa-vermiglio relative flex min-h-[72px] min-w-0 flex-1 items-center gap-3 rounded-full py-4 pr-5 pl-4"
              >
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-crema text-vermiglio max-[379px]:hidden [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-2"
                >
                  {Icone.calendario}
                </span>
                <span className="min-w-0 flex-1 text-left max-[379px]:pl-3">
                  <span className="block truncate text-sm leading-tight opacity-90">Il gruppo sparisce</span>
                  <span data-quando className="block truncate font-titolo text-[18px] leading-tight">
                    {quandoStriscia(fine)}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 max-[359px]:hidden [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.5]">
                  {Icone.avanti}
                </span>
              </button>
              <TastoTondo
                etichetta={puoiDireMai ? "Chiudi l'avviso" : "Chiudi l'avviso (torna domani)"}
                icona={Icone.chiudi}
                className="shrink-0 shadow-[0_8px_20px_rgba(0,0,0,.35)]"
                onClick={() => (puoiDireMai ? setScelta(true) : chiudi(chiaveOggi))}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* La scheda con tutto */}
      <PopUp aperto={scheda} etichetta="fine-santa-titolo">
        <p className="text-sm text-inchiostro/70">Fine del Secret Santa</p>
        <TitoloRiquadro className="mt-1">
          <span id="fine-santa-titolo">{`Il gruppo sparisce ${quandoStriscia(fine)}`}</span>
        </TitoloRiquadro>
        <p className="mt-3">{testoFineSanta(fine)}</p>
        <p className="mt-3 text-sm text-inchiostro/80">
          Spariscono il gruppo, le bacheche, la Santa Chat, le Novità e gli accessi di tutti. Il sito è gratis e lo spazio è poco: facciamo posto ai prossimi
          Secret Santa.
        </p>
        {memberId && (
          <TastoLink href={prova ? "/prove/bacheca" : `/gruppo/${groupId}/bacheca/${memberId}?condividi=1`} className="mt-6">
            Salva un ricordo
          </TastoLink>
        )}
        <Tasto tipo={memberId ? "secondario" : "primario"} className={memberId ? "mt-3" : "mt-6"} onClick={() => setScheda(false)}>
          Ho capito
        </Tasto>
      </PopUp>

      {/* Dal 3° giorno: la X chiede come chiudere */}
      <PopUp aperto={scelta} etichetta="fine-santa-scelta">
        <TitoloRiquadro>
          <span id="fine-santa-scelta">Chiudere l&apos;avviso?</span>
        </TitoloRiquadro>
        <p className="mt-3">Puoi toglierlo solo per oggi (domani torna) oppure non vederlo più su questo telefono.</p>
        <Tasto className="mt-6" onClick={() => chiudi(chiaveOggi)}>
          Chiudi per oggi
        </Tasto>
        <Tasto tipo="secondario" className="mt-3" onClick={() => chiudi(chiaveMai)}>
          Non mostrare più
        </Tasto>
      </PopUp>
    </>
  );
}
