"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Icone } from "@/components/ui";

/*
  Menu della pagina del gruppo (solo lì): un nastro di feltro cucito che galleggia in basso
  (rispetta la safe area dell'iPhone) con 4 bottoni-toppa in rilievo, senza etichette:
  Home (la pagina in cui sei, a sinistra) · Novità · Santa Chat · Giochi.
  Tenendo premuto un bottone il suo nome compare al centro, sopra il menu.
  Le sezioni bloccate si aprono comunque (spiegano perché) e hanno un lucchetto cucito sopra.
  Bacheca e Guardaroba stanno in evidenza nella pagina del gruppo.
*/
type Voce = { href: string; nome: string; icona: ReactNode; bloccata?: boolean; qui?: boolean };

const PRESSIONE_LUNGA = 380; // ms

export function MenuGruppo({ groupId, chatBloccata, giochiBloccati }: { groupId: string; chatBloccata: boolean; giochiBloccati: boolean }) {
  const voci: Voce[] = [
    { href: `/gruppo/${groupId}`, nome: "Home del gruppo", icona: Icone.casa, qui: true },
    { href: `/gruppo/${groupId}/novita`, nome: "Novità", icona: Icone.campanella },
    { href: `/gruppo/${groupId}/santa-chat`, nome: chatBloccata ? "Santa Chat (ancora chiusa)" : "Santa Chat", icona: Icone.fumetto, bloccata: chatBloccata },
    { href: `/gruppo/${groupId}/giochi`, nome: giochiBloccati ? "Mini giochi (non ancora)" : "Mini giochi dell'avvento", icona: Icone.calendario, bloccata: giochiBloccati },
  ];
  const [etichetta, setEtichetta] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lunga = useRef(false); // dopo una pressione lunga il tocco non apre la sezione

  function inizio(nome: string) {
    lunga.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lunga.current = true;
      setEtichetta(nome);
      navigator.vibrate?.(8);
    }, PRESSIONE_LUNGA);
  }
  function fine() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = lunga.current ? setTimeout(() => setEtichetta(null), 900) : null;
  }

  return (
    <nav
      aria-label="Sezioni del gruppo"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-3 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      {/* nome della sezione: al centro, sopra il menu */}
      <AnimatePresence>
        {etichetta && (
          <motion.p
            key={etichetta}
            role="status"
            className="absolute inset-x-0 -top-12 mx-auto w-fit rounded-full bg-crema px-4 py-2 font-titolo text-base text-abete shadow-[0_6px_16px_-6px_rgba(0,0,0,.6)]"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {etichetta}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="feltro pointer-events-auto rounded-[44px] px-5 py-4 before:rounded-[36px] shadow-[0_10px_24px_-8px_rgba(0,0,0,.6)]">
        <ul className="relative flex items-center justify-between">
          {voci.map((v) => (
            <li key={v.href}>
              <Link
                href={v.href}
                aria-label={v.nome}
                aria-current={v.qui ? "page" : undefined}
                draggable={false}
                onPointerDown={() => inizio(v.nome)}
                onPointerUp={fine}
                onPointerLeave={fine}
                onPointerCancel={fine}
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => {
                  if (lunga.current) return e.preventDefault();
                  if (v.qui) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={`tasto-tondo cucitura cliccabile relative select-none [-webkit-touch-callout:none] ${v.qui ? "stoffa-vermiglio" : "stoffa-chiara"}`}
              >
                {v.icona}
                {v.bloccata && (
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-vermiglio text-crema shadow-[0_1px_2px_rgba(0,0,0,.4)] [&>svg]:!size-3 [&>svg]:!stroke-[2.6]">
                    {Icone.lucchetto}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
