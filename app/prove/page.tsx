import type { Metadata } from "next";
import { Feltro, TastoLink, TitoloRiquadro } from "@/components/ui";

export const metadata: Metadata = { title: "Sala prove · Secret Santa", robots: { index: false } };

// Sala prove: si prova tutto senza accesso, senza gruppi e senza scrivere nel database.
// (Non è collegata dal sito: si apre scrivendo /prove nell'indirizzo.)
const PROVE = [
  { titolo: "Apertura della busta", testo: "Slot machine, neve, sigillo, lembo e biglietto, con amici inventati.", href: "/prova-busta" },
  { titolo: "Estrazione", testo: "Scrivi i nomi, aggiungi coppie e “anno scorso”, ed estrai quante volte vuoi. Stessa regola dell'estrazione vera.", href: "/prove/estrazione" },
  { titolo: "Sondaggio totem", testo: "Rispondi alle domande predefinite e scopri il tuo totem. Si rifà quante volte vuoi.", href: "/prove/sondaggio" },
  { titolo: "Bacheca", testo: "Toppe, ricamo e foto su una tela libera. Non si salva niente.", href: "/prove/bacheca" },
  { titolo: "Santa Chat", testo: "Scrivi come Babbo Natale o come chi riceve: dall'altra parte risponde un amico inventato.", href: "/prove/chat" },
  { titolo: "Personaggio", testo: "L'editor completo con tutti i premi già sbloccati.", href: "/prove/personaggio" },
  { titolo: "Galleria dello stile", testo: "Personaggi, premi, olografie, tasti e colori del sito.", href: "/stile" },
];
const IN_ARRIVO = ["Feed del gruppo", "Rivelazione finale"];

export default function SalaProve() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-24 pb-16">
      <h1 className="font-titolo text-[32px] leading-none">Sala prove</h1>
      <p className="mt-2 text-crema/80">Qui si prova tutto senza creare gruppi. Niente viene salvato.</p>
      <div className="mt-6 flex flex-col gap-4">
        {PROVE.map((p) => (
          <Feltro key={p.href}>
            <TitoloRiquadro>{p.titolo}</TitoloRiquadro>
            <p className="mt-2">{p.testo}</p>
            <TastoLink href={p.href} tipo="secondario" className="mt-5">
              Prova
            </TastoLink>
          </Feltro>
        ))}
        <Feltro>
          <TitoloRiquadro>In arrivo</TitoloRiquadro>
          <ul className="mt-2 list-inside list-disc text-inchiostro/80">
            {IN_ARRIVO.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Feltro>
      </div>
    </main>
  );
}
