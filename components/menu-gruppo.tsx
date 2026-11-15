import Link from "next/link";
import type { ReactNode } from "react";
import { Icone } from "@/components/ui";

/*
  Menu della pagina del gruppo: un nastro di feltro cucito che galleggia in basso
  (rispetta la safe area dell'iPhone), con 5 bottoni-toppa in rilievo.
  Le sezioni bloccate si aprono comunque (spiegano perché sono bloccate) e hanno un lucchetto cucito sopra.
*/
type Voce = { href: string; nome: string; icona: ReactNode; bloccata?: boolean };

export function MenuGruppo({ groupId, mioMembro, chatBloccata, giochiBloccati }: { groupId: string; mioMembro: string; chatBloccata: boolean; giochiBloccati: boolean }) {
  const voci: Voce[] = [
    { href: `/gruppo/${groupId}/bacheca/${mioMembro}`, nome: "Bacheca", icona: Icone.ago },
    { href: `/gruppo/${groupId}/guardaroba`, nome: "Guardaroba", icona: Icone.gruccia },
    { href: `/gruppo/${groupId}/santa-chat`, nome: "Santa Chat", icona: Icone.fumetto, bloccata: chatBloccata },
    { href: `/gruppo/${groupId}/novita`, nome: "Novità", icona: Icone.campanella },
    { href: `/gruppo/${groupId}/giochi`, nome: "Giochi", icona: Icone.calendario, bloccata: giochiBloccati },
  ];
  return (
    <nav
      aria-label="Sezioni del gruppo"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-2 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <div className="feltro pointer-events-auto rounded-[36px] px-1 pt-3.5 pb-5 before:rounded-[28px] shadow-[0_10px_24px_-8px_rgba(0,0,0,.6)]">
        <ul className="relative flex items-start justify-between">
          {voci.map((v) => (
            <li key={v.nome} className="min-w-0 flex-1">
              <Link href={v.href} className="group flex w-full flex-col items-center gap-1.5 text-center" aria-label={v.bloccata ? `${v.nome} (ancora bloccata)` : v.nome}>
                <span className="cucitura cliccabile stoffa-chiara relative flex size-11 items-center justify-center rounded-full text-abete group-active:translate-y-[3px] [&>svg]:size-[22px] [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[2.2] [&>svg]:[stroke-linecap:round] [&>svg]:[stroke-linejoin:round]">
                  {v.icona}
                  {v.bloccata && (
                    <span className="absolute -top-1 -right-1.5 flex size-5 items-center justify-center rounded-full bg-vermiglio text-crema shadow-[0_1px_2px_rgba(0,0,0,.4)] [&>svg]:size-3 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[2.6]">
                      {Icone.lucchetto}
                    </span>
                  )}
                </span>
                <span className="text-[clamp(10px,3.2vw,12px)] leading-4 font-semibold tracking-[-0.01em] whitespace-nowrap text-abete">{v.nome}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
