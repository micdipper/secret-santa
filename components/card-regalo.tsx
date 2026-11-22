"use client";

// "Il tuo regalo è per…" con l'occhio: un tocco e la card si gira mostrando il retro senza nome
// (per quando la persona pescata è lì vicino), un altro tocco e torna. Il telefono ricorda come l'hai lasciata.
// Finché non si sa (prima del montaggio) la card resta invisibile: niente nome che lampeggia a chi l'aveva nascosto.

import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { Icone, TastoTondo, TitoloRiquadro } from "@/components/ui";
import { leggi, scrivi } from "@/lib/memoria";
import { useRiduciMovimento } from "@/lib/movimento";
import { suoni } from "@/lib/suoni";

export function CardRegalo({ groupId, fronte, nota, azioni }: { groupId: string; fronte: ReactNode; nota: ReactNode; azioni: ReactNode }) {
  const chiave = `card-nascosta:${groupId}`;
  const [nascosta, setNascosta] = useState<boolean | null>(null);
  const riduci = useRiduciMovimento();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la memoria è solo nel telefono
    setNascosta(leggi(chiave, false));
  }, [chiave]);

  const gira = () => {
    const nuova = !nascosta;
    setNascosta(nuova);
    scrivi(chiave, nuova);
    suoni.carta();
  };

  const occhio = (
    <TastoTondo
      etichetta={nascosta ? "Mostra il nome" : "Nascondi il nome"}
      icona={nascosta ? Icone.occhio : Icone.occhioChiuso}
      onClick={gira}
      className="shrink-0"
    />
  );

  return (
    <div className={`mt-6 [perspective:1200px] ${nascosta === null ? "invisible" : ""}`}>
      <motion.div
        className="grid [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: nascosta ? 180 : 0 }}
        transition={riduci ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 17 }}
      >
        {/* davanti: il nome */}
        <div className={`feltro p-6 [grid-area:1/1] [backface-visibility:hidden] ${nascosta ? "pointer-events-none" : ""}`} aria-hidden={!!nascosta}>
          <div className="relative">
            {fronte}
            <div className="mt-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">{nota}</div>
              {!nascosta && occhio}
            </div>
            {azioni}
          </div>
        </div>
        {/* dietro: niente nome */}
        <div
          className={`feltro flex flex-col p-6 [grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)] ${nascosta ? "" : "pointer-events-none"}`}
          aria-hidden={!nascosta}
        >
          {/* tutto centrato, in verticale e in orizzontale: riempie l'altezza del davanti senza buchi */}
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-inchiostro/70">Il tuo regalo è per</p>
            <span className="toppa size-20 shrink-0 font-titolo text-[44px] leading-none text-vermiglio" aria-hidden>
              {/* il punto interrogativo di Basteleur sta un po' in alto: lo abbasso per centrarlo nel cerchio */}
              <span className="translate-y-[0.06em]">?</span>
            </span>
            <TitoloRiquadro>Top secret</TitoloRiquadro>
            <p className="max-w-[16rem] text-sm text-inchiostro/80">Nome nascosto. Tocca l&apos;occhio quando nessuno guarda.</p>
            {nascosta && occhio}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
