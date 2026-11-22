import type { Metadata } from "next";
import { Feltro, TastoLink, TitoloRiquadro } from "@/components/ui";

export const metadata: Metadata = { title: "Sala prove · Secret Santa", robots: { index: false } };

// Sala prove: si prova tutto senza accesso, senza gruppi e senza scrivere nel database.
// (Non è collegata dal sito: si apre scrivendo /prove nell'indirizzo.)
const PROVE = [
  { titolo: "Apertura della busta", testo: "Slot machine, neve, sigillo, lembo e biglietto, con amici inventati.", href: "/prova-busta" },
  { titolo: "Estrazione", testo: "Scrivi i nomi, aggiungi chi non deve pescarsi, ed estrai quante volte vuoi. Stessa regola dell'estrazione vera.", href: "/prove/estrazione" },
  { titolo: "Sondaggio totem", testo: "Rispondi alle domande predefinite e scopri il tuo totem. Si rifà quante volte vuoi.", href: "/prove/sondaggio" },
  { titolo: "Bacheca", testo: "Tela, cassettiera delle toppe e kit da ricamo. Scegli un totem per vedere le sue toppe nei cassetti. Non si salva niente.", href: "/prove/bacheca" },
  { titolo: "Toppe del gruppo", testo: "Crea simboli ricamati e parole come l'organizzatore: poi li trovi nel cassetto della bacheca di prova.", href: "/prove/toppe" },
  { titolo: "Fine del Secret Santa", testo: "L'avviso che ricorda di fare uno screenshot prima che gli account vengano cancellati, a 7, 2, 1 e 0 giorni.", href: "/prove/fine-santa" },
  { titolo: "Troppe foto in bacheca", testo: "Il popup per chi ha più di 2 foto: non si chiude finché non ne elimini abbastanza. Foto inventate, non si cancella niente.", href: "/prove/foto-in-piu" },
  { titolo: "Santa Chat", testo: "Scrivi come Babbo Natale o come chi riceve: dall'altra parte risponde un amico inventato.", href: "/prove/chat" },
  { titolo: "Novità", testo: "Il feed del gruppo con post, foto e reazioni. Prova a scrivere i nomi degli amici inventati: diventano asterischi.", href: "/prove/novita" },
  { titolo: "Quando facciamo lo scambio?", testo: "La disponibilità per scegliere il giorno: proponi i giorni, rispondi, guarda gli amici inventati che cambiano idea e fissa la data.", href: "/prove/disponibilita" },
  { titolo: "Mini giochi dell'avvento", testo: "Il calendario coi regali da scartare, il benvenuto e la pagina di ogni gioco con la classifica in diretta (amici inventati).", href: "/prove/giochi" },
  { titolo: "Card e novità del sito", testo: "L'occhio che nasconde il nome di chi hai pescato e il pop-up con le novità dell'ultimo aggiornamento.", href: "/prove/aggiornamenti" },
  { titolo: "Personaggio", testo: "L'editor completo con tutti i doni già sbloccati.", href: "/prove/personaggio" },
  { titolo: "Galleria dello stile", testo: "Personaggi, doni, olografie, tasti e colori del sito.", href: "/stile" },
];

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
      </div>
    </main>
  );
}
