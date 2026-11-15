import { Feltro, Icone, TastoLink, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { dataBreve, giornoPrima, giorniMancanti } from "@/lib/date";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Minigiochi dell'avvento: uno al giorno nei 4 giorni prima dello scambio e il giorno stesso (PIANO-GIOCHI.md).
// Finché non è il momento, la pagina spiega quando si sbloccano.
export default async function PaginaGiochi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) return null; // il layout del gruppo pensa all'accesso

  const { data: gruppo } = await supabase.from("groups").select("name, exchange_date, giochi_attivi, organizer_id").eq("id", id).maybeSingle();
  if (!gruppo) return null;
  const organizzatore = gruppo.organizer_id === userId;
  const giorni = giorniMancanti(gruppo.exchange_date);

  let titolo = "Non è ancora il momento";
  let testo: string;
  if (!gruppo.exchange_date) {
    testo = organizzatore
      ? "I minigiochi si sbloccano quando scegli il giorno dello scambio (almeno 6 giorni da oggi)."
      : "I minigiochi si sbloccano quando l'organizzatore sceglie il giorno dello scambio. Ripassa tra qualche giorno!";
  } else if (!gruppo.giochi_attivi) {
    titolo = "Niente minigiochi per questo gruppo";
    testo = organizzatore
      ? "Il giorno dello scambio è troppo vicino: i giochi hanno bisogno di almeno 6 giorni di anticipo. Puoi scegliere una data più lontana in Organizza."
      : "Il giorno dello scambio è troppo vicino: i giochi hanno bisogno di almeno 6 giorni di anticipo.";
  } else if (giorni !== null && giorni > 4) {
    testo = `Non è ancora il momento di questo: ripassa tra qualche giorno! Il primo gioco si apre ${dataBreve(giornoPrima(gruppo.exchange_date, 4))} a mezzanotte, poi uno al giorno fino allo scambio.`;
  } else if (giorni !== null && giorni >= -1) {
    titolo = "Ci siamo quasi";
    testo = "Il calendario dei giochi si sta cucendo: ripassa tra poco!";
  } else {
    titolo = "I giochi sono finiti";
    testo = "Lo scambio è passato: alla prossima!";
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro={`/gruppo/${id}`} etichettaIndietro={`Torna a ${gruppo.name}`} contesto={gruppo.name} titolo="Minigiochi dell'avvento" />
      <Feltro className="mt-6">
        <span className="absolute -top-1 right-0 flex size-12 items-center justify-center rounded-full bg-vermiglio text-crema [&>svg]:size-6 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[2.2]">
          {Icone.calendario}
        </span>
        <TitoloRiquadro className="pr-16">{titolo}</TitoloRiquadro>
        <p className="mt-2">{testo}</p>
        <p className="mt-3 text-sm text-inchiostro/70">5 giochi, uno al giorno, 3 tentativi a testa e classifica in diretta. Chi vince si porta a casa un premio unico per il suo personaggio.</p>
        {organizzatore && (!gruppo.exchange_date || !gruppo.giochi_attivi) && (
          <TastoLink href={`/gruppo/${id}/organizza`} className="mt-5">
            Scegli la data
          </TastoLink>
        )}
      </Feltro>
    </main>
  );
}
