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
        const classe = "finestrella flex h-full min-h-[156px] flex-col p-4";
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
              <span className="relative mt-auto text-sm text-inchiostro">{giornoGioco(f.apre)}</span>
              <span className="relative font-medium text-abete">tra {durataBreve(f.apre - ora)}</span>
              <span className="relative mt-1 text-sm text-inchiostro/85">In palio: {info.nomePremio}</span>
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
                {numero("text-abete")}
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
        const stoffa = stato === "bloccato" ? "finestrella-chiusa" : stato === "aperto" ? "stoffa-vermiglio" : "stoffa-chiara";
        return (
          <li key={f.n} className={finale ? "col-span-2" : ""}>
            {cliccabile ? (
              <Link href={href(f.n)} className={`${classe} cliccabile ${stoffa}`} aria-label={`Gioco ${f.n}`}>
                {contenuto}
              </Link>
            ) : (
              <div className={`${classe} ${stoffa}`}>{contenuto}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// finestrella ancora cucita: una X di filo vermiglio (la cornice è la cucitura di .finestrella-chiusa)
function CuciturX() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
      <path d="M12 12L88 88M88 12L12 88" stroke="var(--color-vermiglio)" strokeOpacity=".5" strokeWidth="2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
