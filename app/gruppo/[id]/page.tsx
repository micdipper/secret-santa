import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BustaSigillata } from "@/components/ornamenti";
import { PallinaCheDondola } from "@/components/pallina-che-dondola";
import { Profondita } from "@/components/profondita";
import { ToppaAvatar, lookDi } from "@/components/avatar";
import { EtichettaStoffa, Feltro, Icone, TastoLink, TitoloRiquadro } from "@/components/ui";
import { dataBreve, giorniMancanti } from "@/lib/date";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Membro = { id: string; display_name: string; user_id: string | null; envelope_opened_at: string | null };

export default async function PaginaGruppo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) redirect("/");

  const [{ data: gruppo }, { data: membriDati }] = await Promise.all([
    supabase.from("groups").select("id, name, budget_eur, exchange_date, theme, status, organizer_id").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("id, display_name, user_id, envelope_opened_at").eq("group_id", id).order("display_name"),
  ]);
  if (!gruppo) notFound();

  const membri = (membriDati as Membro[]) ?? [];
  // I personaggi di chi è entrato (le regole del database mostrano solo quelli dei miei gruppi)
  const { data: profili } = await supabase
    .from("profiles")
    .select("user_id, look")
    .in("user_id", membri.flatMap((m) => (m.user_id ? [m.user_id] : [])));
  const look = (m: Membro) => lookDi(profili, m.user_id);
  const io = membri.find((m) => m.user_id === userId);
  const organizzatore = gruppo.organizer_id === userId;
  const entrati = membri.filter((m) => m.user_id).length;
  const giorni = giorniMancanti(gruppo.exchange_date);

  // Se ho già aperto la busta, mostro a chi faccio il regalo (le regole del database mi danno solo il mio abbinamento).
  let destinatario: Membro | undefined;
  if (gruppo.status !== "aperto" && io?.envelope_opened_at) {
    const { data: abbinamento } = await supabase.from("assignments").select("receiver_member_id").eq("group_id", id).maybeSingle();
    destinatario = membri.find((m) => m.id === abbinamento?.receiver_member_id);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <header className="relative pt-24">
        {/* (in alto a destra c'è il tasto dell'audio, uguale in ogni schermata) */}
        <Profondita intensita={8} className="absolute top-[88px] right-0 w-16">
          <PallinaCheDondola className="w-16" />
        </Profondita>
        <h1 className="pr-16 font-titolo text-[32px] leading-none">{gruppo.name}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {giorni !== null && giorni >= 0 && (
            <EtichettaStoffa colore="vermiglio">{giorni === 0 ? "Lo scambio è oggi!" : `${giorni} ${giorni === 1 ? "giorno" : "giorni"} allo scambio`}</EtichettaStoffa>
          )}
          {gruppo.exchange_date && <EtichettaStoffa>{dataBreve(gruppo.exchange_date)}</EtichettaStoffa>}
          {gruppo.budget_eur !== null && <EtichettaStoffa>budget {gruppo.budget_eur} €</EtichettaStoffa>}
        </div>
        {gruppo.theme && <p className="mt-3 text-crema/80">Tema: {gruppo.theme}</p>}
      </header>

      {gruppo.status === "aperto" ? (
        <Feltro className="mt-6">
          <TitoloRiquadro>In attesa dell&apos;estrazione</TitoloRiquadro>
          <p className="mt-2">
            Sono entrati {entrati} su {membri.length}. Quando ci sono tutti, l&apos;organizzatore fa l&apos;estrazione e qui troverai la tua busta.
          </p>
        </Feltro>
      ) : destinatario ? (
        <Feltro className="mt-6">
          <p className="text-sm text-inchiostro/70">Il tuo regalo è per</p>
          <div className="mt-3 flex items-center gap-4">
            <ToppaAvatar look={look(destinatario)} nome={destinatario.display_name} />
            <TitoloRiquadro>{destinatario.display_name}</TitoloRiquadro>
          </div>
          <p className="mt-4">
            Acqua in bocca!
            {gruppo.budget_eur !== null && ` Budget ${gruppo.budget_eur} €`}
            {gruppo.exchange_date && `, scambio ${dataBreve(gruppo.exchange_date)}`}
            {gruppo.budget_eur !== null || gruppo.exchange_date ? "." : ""}
          </p>
          <TastoLink href={`/gruppo/${id}/bacheca/${destinatario.id}`} className="mt-5">
            Guarda la sua bacheca
          </TastoLink>
        </Feltro>
      ) : (
        <Feltro className="mt-6">
          <BustaSigillata className="absolute -top-1 right-0 w-16 rotate-[8deg] drop-shadow-[0_3px_4px_rgba(0,0,0,.3)]" />
          <TitoloRiquadro className="pr-20">La tua busta è pronta</TitoloRiquadro>
          <p className="mt-2 pr-16">Scopri a chi farai il regalo. Lo vedrai solo tu.</p>
          <TastoLink href={`/gruppo/${id}/busta`} className="mt-5">
            Apri la busta
          </TastoLink>
        </Feltro>
      )}

      {io && (
        <Link href={`/gruppo/${id}/bacheca/${io.id}`} className="feltro cliccabile mt-4 flex items-center gap-4 p-4 pl-5">
          <span className="toppa tela-aida size-11 flex-none text-vermiglio [&_svg]:relative [&_svg]:size-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.2]">{Icone.ago}</span>
          <span className="relative min-w-0 flex-1">
            <span className="block font-titolo text-lg leading-tight text-abete">La tua bacheca</span>
            <span className="block text-sm text-inchiostro/70">Fai capire cosa ti piace</span>
          </span>
          <span className="relative mr-2 text-abete [&_svg]:size-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.4]">{Icone.avanti}</span>
        </Link>
      )}

      {io && (
        <Link href={`/profilo?gruppo=${id}`} className="feltro cliccabile mt-4 flex items-center gap-4 p-4 pl-5">
          <ToppaAvatar look={look(io)} dimensione={44} />
          <span className="relative min-w-0 flex-1">
            <span className="block font-titolo text-lg leading-tight text-abete">Il tuo personaggio</span>
            <span className="block text-sm text-inchiostro/70">Vestilo e sblocca gli accessori</span>
          </span>
          <span className="relative mr-2 text-abete [&_svg]:size-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.4]">{Icone.avanti}</span>
        </Link>
      )}

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-titolo text-2xl">Chi c&apos;è</h2>
          <span className="text-sm text-crema/75">{membri.length} persone</span>
        </div>
        <ul className="-mx-5 mt-4 flex gap-3 overflow-x-auto px-5 pt-1 pb-2">
          {membri.map((m) =>
            m.user_id ? (
              <li key={m.id} className="flex-none">
                <Link href={`/gruppo/${id}/bacheca/${m.id}`} className="flex w-16 flex-col items-center gap-2 text-center text-sm" aria-label={`Bacheca di ${m.display_name}`}>
                  <ToppaAvatar look={look(m)} cliccabile />
                  <span className="w-full truncate">{m.display_name.split(" ")[0]}</span>
                </Link>
              </li>
            ) : (
              <li key={m.id} className="flex w-16 flex-none flex-col items-center gap-2 text-center text-sm text-crema/60">
                <ToppaAvatar look={null} />
                <span className="w-full truncate">{m.display_name.split(" ")[0]}</span>
              </li>
            ),
          )}
        </ul>
        <p className="mt-2 text-sm text-crema/70">Tocca una persona per vedere la sua bacheca. Chi non è ancora entrato ha la toppa vuota.</p>
      </section>

      {organizzatore && (
        <TastoLink href={`/gruppo/${id}/organizza`} tipo="secondario" className="mt-8">
          Organizza il gruppo
        </TastoLink>
      )}
    </main>
  );
}
