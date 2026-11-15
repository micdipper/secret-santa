"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icone } from "@/components/ui";
import { leggiPortachiavi } from "@/lib/portachiavi";

type Gruppo = { id: string; nome: string; stato?: string };

// I gruppi di questo telefono: quelli dell'accesso di adesso più quelli nel portachiavi
// (ogni gruppo ha un accesso suo; aprendolo il sito passa da solo a quello giusto).
export function ElencoGruppi({ attuali }: { attuali: Gruppo[] }) {
  const [gruppi, setGruppi] = useState<Gruppo[]>(attuali);

  useEffect(() => {
    const altri = leggiPortachiavi()
      .filter((c) => !attuali.some((g) => g.id === c.groupId))
      .map((c) => ({ id: c.groupId, nome: c.nome }));
    // il portachiavi sta nel telefono: si legge solo dopo l'apertura della pagina
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (altri.length) setGruppi([...attuali, ...altri]);
  }, [attuali]);

  if (gruppi.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="font-titolo text-2xl">I tuoi gruppi</h2>
      <ul className="mt-4 flex flex-col gap-4">
        {gruppi.map((g) => (
          <li key={g.id}>
            <Link href={`/gruppo/${g.id}`} className="feltro cliccabile flex items-center gap-4 p-4 pl-5">
              <span className="relative min-w-0 flex-1">
                <span className="block truncate font-titolo text-lg text-abete">{g.nome}</span>
                <span className="block text-sm text-inchiostro/70">
                  {g.stato === undefined ? "Tocca per entrare" : g.stato === "aperto" ? "In attesa dell'estrazione" : "Estrazione fatta"}
                </span>
              </span>
              <span className="relative mr-2 text-abete [&_svg]:size-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.4]">{Icone.avanti}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
