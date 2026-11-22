"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { Look } from "@/components/avatar";
import { Pacchetto } from "@/components/giochi/pacchetto";
import { StellaNordica } from "@/components/ornamenti";
import { Tasto, TitoloRiquadro } from "@/components/ui";
import { GIORNO, aperturaCalendario, regaliScartati, segnaScartato } from "@/lib/giochi/avvento";
import { GIOCHI } from "@/lib/giochi/elenco";
import { durataBreve, statoDa } from "@/lib/giochi/ora";
import { suoni } from "@/lib/suoni";

export type Finestra = {
  n: number;
  apre: number;
  chiude: number;
  deciso: boolean;
  vincitore: { nome: string; look: Look | null; mio?: boolean } | null;
  mieiTentativi: number;
};

const ROMA = { timeZone: "Europe/Rome" } as const;
const giornoSettimana = (t: number) => new Date(t + GIORNO / 2).toLocaleDateString("it-IT", { ...ROMA, weekday: "short" });
const numeroGiorno = (t: number) => new Date(t + GIORNO / 2).toLocaleDateString("it-IT", { ...ROMA, day: "numeric" });
const mese = (t: number) => new Date(t + GIORNO / 2).toLocaleDateString("it-IT", { ...ROMA, month: "long", year: "numeric" });

/*
  Mini giochi dell'avvento: un foglio di calendario da parete (anelli in alto, mese, 6 caselle-giorno
  da 5 giorni prima dello scambio al giorno dello scambio). Nelle caselle dei giochi c'è un pacchetto:
  - giorno che deve ancora arrivare: pacchetto piatto (non si tocca) col conto alla rovescia;
  - oggi, da scartare: pacchetto in rilievo che ogni tanto si muove; al tocco trema e il fiocco vola via;
  - oggi, già scartato: pacchetto aperto col numero, in rilievo: porta al gioco (il nome si scopre qui);
  - giorno passato: pacchetto aperto spento, come un tasto disattivato, con chi ha vinto.
  `gruppo` = chiave della memoria del telefono (null in sala prove: non si ricorda niente).
  In sala prove (`sempreAperte`) si scartano e si aprono tutti.
*/
export function Calendario({ finestre, ora, href, gruppo, sempreAperte = false }: { finestre: Finestra[]; ora: number; href: (n: number) => string; gruppo: string | null; sempreAperte?: boolean }) {
  const [scartati, setScartati] = useState<number[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- memoria del telefono (solo nel browser)
    if (gruppo) setScartati(regaliScartati(gruppo));
  }, [gruppo]);
  const scarta = (n: number) => {
    setScartati((s) => [...s, n]);
    if (gruppo) segnaScartato(gruppo, n);
  };

  const apertura = aperturaCalendario(finestre[0].apre);
  const scambio = finestre[4].apre;
  const mesi = [...new Set([mese(apertura), mese(scambio)])].join(" – ");

  return (
    <div className="feltro px-4 pt-11 pb-4">
      {/* gli anelli della rilegatura, a cavallo del bordo in alto */}
      <div className="pointer-events-none absolute inset-x-8 -top-3 flex justify-between" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="relative h-8 w-3">
            <span className="absolute bottom-0 left-1/2 size-3 -translate-x-1/2 rounded-full bg-abete-scuro/70" />
            <span className="absolute inset-x-0 top-0 h-6 rounded-full border-[2.5px] border-[#b59a6a] bg-transparent" />
          </span>
        ))}
      </div>
      <div className="relative">
        <TitoloRiquadro className="text-center capitalize">{mesi}</TitoloRiquadro>
        <ol className="mt-4 grid grid-cols-3 gap-2">
          <Casella giorno={apertura} piedino={ora >= apertura ? "Il calendario è aperto!" : `si apre tra ${durataBreve(apertura - ora)}`}>
            <StellaNordica className="size-full p-2 text-vermiglio" title="Si apre il calendario" />
          </Casella>
          {finestre.map((f) => (
            <GiornoGioco key={f.n} f={f} ora={ora} href={href(f.n)} scartato={scartati.includes(f.n)} onScarta={() => scarta(f.n)} sempreAperte={sempreAperte} scambio={f.n === 5} />
          ))}
        </ol>
      </div>
    </div>
  );
}

// Una casella-giorno (piatta: si tocca solo il pacchetto dentro). Raggio 28 − 16 = 12.
function Casella({ giorno, scambio = false, piedino, children }: { giorno: number; scambio?: boolean; piedino: ReactNode; children: ReactNode }) {
  return (
    <li className={`flex flex-col items-center rounded-[12px] border-[1.5px] border-dashed px-1 pt-2 pb-2 ${scambio ? "border-vermiglio/60 bg-[#fbf6ea]" : "border-abete/25 bg-[#fbf6ea]/60"}`}>
      <span className={`text-sm leading-tight ${scambio ? "font-medium text-vermiglio-scuro" : "text-inchiostro/70"}`}>{scambio ? "scambio!" : giornoSettimana(giorno)}</span>
      <span className={`font-titolo text-2xl leading-tight ${scambio ? "text-vermiglio" : "text-abete"}`}>{numeroGiorno(giorno)}</span>
      <div className="mt-1 aspect-square w-full max-w-[76px]">{children}</div>
      <span className="mt-2 min-h-[2.5em] text-center text-sm leading-tight text-inchiostro/80">{piedino}</span>
    </li>
  );
}

function GiornoGioco({ f, ora, href, scartato, onScarta, sempreAperte, scambio }: { f: Finestra; ora: number; href: string; scartato: boolean; onScarta: () => void; sempreAperte: boolean; scambio: boolean }) {
  const stato = statoDa(f.apre, f.chiude, ora);
  const riduci = useReducedMotion();
  const [fase, setFase] = useState<"ferma" | "trema" | "apre">("ferma");
  const info = GIOCHI[f.n - 1];

  // giorno passato: spento, come un tasto disattivato (in sala prove si apre lo stesso)
  if (stato === "chiuso") {
    const pacchetto = (
      <div className="size-full opacity-45 grayscale" aria-disabled>
        <Pacchetto n={f.n} fase="aperto" className="size-full" />
      </div>
    );
    const vince = f.vincitore ? `vince ${f.vincitore.nome.split(" ")[0]}` : f.deciso ? "nessun vincitore" : "si decide…";
    return (
      <Casella giorno={f.apre} scambio={scambio} piedino={vince}>
        {sempreAperte ? (
          <Link href={href} aria-label={`Gioco ${f.n}`}>
            {pacchetto}
          </Link>
        ) : (
          pacchetto
        )}
      </Casella>
    );
  }

  const sbloccabile = stato === "aperto" || sempreAperte;
  // giorno che deve ancora arrivare: pacchetto piatto
  if (!sbloccabile) {
    return (
      <Casella giorno={f.apre} scambio={scambio} piedino={`tra ${durataBreve(f.apre - ora)}`}>
        <Pacchetto n={f.n} fase="chiuso" className="size-full" />
      </Casella>
    );
  }

  // scartato: pacchetto aperto in rilievo, porta al gioco
  if (scartato) {
    return (
      <Casella giorno={f.apre} scambio={scambio} piedino={<span className="font-medium text-abete">{info.nome}</span>}>
        <motion.div className="size-full" initial={fase === "apre" ? false : { scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Link href={href} className="cliccabile block size-full rounded-[12px]" aria-label={`Gioca: ${info.nome}`} data-suono="tasto">
            <Pacchetto n={f.n} fase="aperto" className="size-full" />
          </Link>
        </motion.div>
      </Casella>
    );
  }

  // da scartare: al tocco trema, poi il fiocco vola via e i nastri scivolano fuori
  function tocca() {
    if (fase !== "ferma") return;
    suoni.carta();
    setFase("trema");
    setTimeout(
      () => {
        setFase("apre");
        suoni.fermo();
        setTimeout(onScarta, riduci ? 50 : 750);
      },
      riduci ? 50 : 520,
    );
  }
  return (
    <Casella giorno={f.apre} scambio={scambio} piedino={<span className="font-medium text-vermiglio-scuro">{fase === "ferma" ? "Oggi! Scartami" : "…"}</span>}>
      <motion.div
        className="size-full"
        animate={
          riduci
            ? undefined
            : fase === "trema"
              ? { rotate: [0, -9, 8, -7, 6, -4, 3, 0], scale: [1, 1.06, 1.06, 1.05, 1.05, 1.03, 1.02, 1] }
              : fase === "ferma"
                ? { rotate: [0, -4, 4, -2, 0] }
                : { rotate: 0 }
        }
        transition={fase === "trema" ? { duration: 0.5, ease: "easeInOut" } : fase === "ferma" ? { duration: 0.6, repeat: Infinity, repeatDelay: 2.2 } : { duration: 0.2 }}
      >
        <button type="button" onClick={tocca} className="cliccabile block size-full rounded-[12px]" aria-label="Scarta il regalo di oggi">
          <Pacchetto n={f.n} fase={fase === "apre" ? "apre" : "chiuso"} className="size-full" />
        </button>
      </motion.div>
    </Casella>
  );
}

// Il benvenuto la prima volta che si apre il calendario
export function Benvenuto({ giorni, aperto, onChiudi }: { giorni: number; aperto: boolean; onChiudi: () => void }) {
  const titolo = giorni === 0 ? "Lo scambio è oggi!" : giorni === 1 ? "Manca solo un giorno!" : `Mancano solo ${giorni} giorni!`;
  return (
    <AnimatePresence>
      {aperto && (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-inchiostro/60 px-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="feltro w-full max-w-sm p-6 text-center"
            initial={{ y: 40, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            role="dialog"
            aria-modal
          >
            <div className="relative">
              <StellaNordica className="mx-auto size-12 text-vermiglio" />
              <TitoloRiquadro className="mt-3">{titolo}</TitoloRiquadro>
              <p className="mt-3">
                Lo so, non stai più nella pelle. Per far passare il tempo puoi doomscrollare, <strong>OPPURE</strong> puoi giocare a questi mini giochi per ingannare l&apos;attesa.
              </p>
              <p className="mt-3">Un regalo da scartare ogni giorno, 3 tentativi a testa e una sorpresa per chi vince. Fai tu.</p>
              <Tasto className="mt-6" onClick={onChiudi}>
                Si gioca!
              </Tasto>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
