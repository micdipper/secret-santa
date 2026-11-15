"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ToppaAvatar, type Look } from "@/components/avatar";
import { Pallini } from "@/components/giochi/classifica";
import { GIOCHI, TENTATIVI } from "@/lib/giochi/elenco";
import { durataBreve, giornoGioco, statoDa } from "@/lib/giochi/ora";

export type Finestra = {
  n: number;
  apre: number;
  chiude: number;
  deciso: boolean;
  vincitore: { nome: string; look: Look | null } | null;
  mieiTentativi: number;
};

/*
  Calendario dell'avvento dei giochi: 5 finestrelle di feltro numerate.
  - chiusa: piatta, cucita con una X, giorno e conto alla rovescia (il nome del gioco è una sorpresa);
  - aperta: in rilievo vermiglio, si tocca per giocare;
  - finita: in rilievo chiaro, con il vincitore e il suo premio.
  In sala prove (`sempreAperte`) si toccano tutte.
*/
export function Calendario({ finestre, ora, href, sempreAperte = false }: { finestre: Finestra[]; ora: number; href: (n: number) => string; sempreAperte?: boolean }) {
  return (
    <ol className="grid grid-cols-2 gap-4">
      {finestre.map((f) => {
        const info = GIOCHI[f.n - 1];
        const stato = statoDa(f.apre, f.chiude, ora);
        const finale = f.n === 5;
        const classe = "relative flex h-full min-h-[156px] flex-col rounded-[24px] p-4";
        const numero = (colore: string) => (
          <span className={`relative font-titolo text-[44px] leading-none ${colore}`}>
            {f.n}
            {finale && <span className="ml-2 align-middle text-lg">· gran finale</span>}
          </span>
        );

        let contenuto: ReactNode;
        if (stato === "bloccato") {
          contenuto = (
            <>
              <CuciturX />
              {numero("text-abete")}
              <span className="relative mt-auto text-sm text-inchiostro/80">{giornoGioco(f.apre)}</span>
              <span className="relative font-medium text-abete">tra {durataBreve(f.apre - ora)}</span>
              <span className="relative mt-1 text-sm text-inchiostro/70">In palio: {info.nomePremio}</span>
            </>
          );
        } else if (stato === "aperto") {
          contenuto = (
            <>
              <div className="flex items-start justify-between">
                {numero("text-crema")}
                <span className="etichetta-stoffa bg-senape text-sm text-inchiostro">Oggi!</span>
              </div>
              <span className="mt-auto font-titolo text-lg leading-tight">{info.nome}</span>
              <span className="text-sm text-crema/90">chiude tra {durataBreve(f.chiude - ora)}</span>
              {!sempreAperte && <Pallini usati={f.mieiTentativi} totale={TENTATIVI} className="mt-2" />}
            </>
          );
        } else {
          contenuto = (
            <>
              <div className="flex items-start justify-between gap-2">
                {numero("text-abete/60")}
                <span className="text-right text-sm text-inchiostro/70">{info.nome}</span>
              </div>
              {f.vincitore ? (
                <div className="mt-auto flex items-center gap-2">
                  <ToppaAvatar look={f.vincitore.look} dimensione={44} nome={f.vincitore.nome} />
                  <span className="min-w-0">
                    <span className="block truncate font-titolo text-lg leading-tight text-abete">{f.vincitore.nome.split(" ")[0]}</span>
                    <span className="block text-sm leading-tight text-inchiostro/75">{info.nomePremio}</span>
                  </span>
                </div>
              ) : (
                <span className="mt-auto text-sm text-inchiostro/80">{f.deciso ? "Nessun vincitore" : "Si decide il vincitore…"}</span>
              )}
            </>
          );
        }

        const cliccabile = sempreAperte || stato !== "bloccato";
        const stoffa = stato === "aperto" ? "stoffa-vermiglio" : "stoffa-chiara";
        return (
          <li key={f.n} className={finale ? "col-span-2" : ""}>
            {cliccabile ? (
              <Link href={href(f.n)} className={`${classe} cucitura cliccabile ${stoffa}`} aria-label={`Gioco ${f.n}`}>
                {contenuto}
              </Link>
            ) : (
              <div className={`${classe} bg-[#e8d9b6] text-inchiostro`}>{contenuto}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// finestrella ancora cucita: una X di filo vermiglio
function CuciturX() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
      <rect x="4" y="4" width="92" height="92" rx="14" fill="none" stroke="rgb(229 72 30 / .55)" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
      <path d="M14 14L86 86M86 14L14 86" stroke="rgb(229 72 30 / .3)" strokeWidth="2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
