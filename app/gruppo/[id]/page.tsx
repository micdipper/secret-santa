import Link from "next/link";
import { BustaSigillata } from "@/components/ornamenti";
import { PallinaCheDondola } from "@/components/pallina-che-dondola";
import { Profondita } from "@/components/profondita";
import { ToppaAvatar, lookDi } from "@/components/avatar";
import { FeedGruppo } from "@/components/feed-gruppo";
import { MenuGruppo } from "@/components/menu-gruppo";
import type { Profilo } from "@/lib/totem";
import { EtichettaStoffa, Feltro, TastoLink, TitoloRiquadro } from "@/components/ui";
import { dataBreve, giorniMancanti } from "@/lib/date";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Membro = { id: string; display_name: string; user_id: string | null; envelope_opened_at: string | null };

export default async function PaginaGruppo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) return null; // il layout del gruppo pensa all'accesso

  const [{ data: gruppo }, { data: membriDati }] = await Promise.all([
    supabase.from("groups").select("id, name, budget_eur, exchange_date, theme, status, organizer_id, quiz_salvato_at, giochi_attivi").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("id, display_name, user_id, envelope_opened_at").eq("group_id", id).order("display_name"),
  ]);
  if (!gruppo) return null; // non è un mio gruppo: ci pensa il layout

  const membri = (membriDati as Membro[]) ?? [];
  // I personaggi di chi è entrato (le regole del database mostrano solo quelli dei miei gruppi)
  const { data: profili } = await supabase
    .from("profiles")
    .select("user_id, look")
    .in("user_id", membri.flatMap((m) => (m.user_id ? [m.user_id] : [])));
  const look = (m: Membro) => lookDi(profili, m.user_id);
  // i totem di chi ha fatto il sondaggio (badge accanto al personaggio)
  const [{ data: risultati }, { data: nomiTotem }] = await Promise.all([
    supabase.from("quiz_results").select("user_id, profilo").eq("group_id", id),
    supabase.from("quiz_totems").select("profilo, nome, immagine").eq("group_id", id),
  ]);
  const totemDi = (m: Membro) => {
    const r = risultati?.find((x) => x.user_id === m.user_id);
    if (!r) return null;
    const t = nomiTotem?.find((x) => x.profilo === r.profilo);
    return { profilo: r.profilo as Profilo, nome: t?.nome ?? "", immagine: t?.immagine };
  };
  const io = membri.find((m) => m.user_id === userId);
  const organizzatore = gruppo.organizer_id === userId;
  const entrati = membri.filter((m) => m.user_id).length;
  const giorni = giorniMancanti(gruppo.exchange_date);
  // Santa Chat: si apre quando TUTTI hanno aperto la busta. Giochi: dal giorno T−4, se il gruppo li ha.
  const chatAperta = gruppo.status !== "aperto" && membri.every((m) => m.envelope_opened_at);
  const giochiAperti = gruppo.giochi_attivi && giorni !== null && giorni <= 4 && giorni >= -1;

  // A che punto è il gruppo (riquadro dell'organizzatore, in alto)
  const mancanti = membri.filter((m) => !m.user_id);
  const daAprire = membri.filter((m) => !m.envelope_opened_at).length;
  const statoOrganizzatore = !gruppo.quiz_salvato_at
    ? "Prima crea il sondaggio: poi arriva il link d'invito da mandare agli amici."
    : gruppo.status === "aperto"
      ? mancanti.length > 0
        ? `Sono entrati ${entrati} su ${membri.length}: manda il link a chi manca. Quando ci sono tutti fai l'estrazione.`
        : "Ci sono tutti: puoi fare l'estrazione!"
      : daAprire > 0
        ? `Estrazione fatta. ${daAprire === 1 ? "Manca 1 persona" : `Mancano ${daAprire} persone`} ad aprire la busta.`
        : "Estrazione fatta e buste aperte da tutti. Puoi sempre cambiare data, budget e tema.";

  // Se ho già aperto la busta, mostro a chi faccio il regalo (le regole del database mi danno solo il mio abbinamento).
  let destinatario: Membro | undefined;
  if (gruppo.status !== "aperto" && io?.envelope_opened_at) {
    const { data: abbinamento } = await supabase.from("assignments").select("receiver_member_id").eq("group_id", id).maybeSingle();
    destinatario = membri.find((m) => m.id === abbinamento?.receiver_member_id);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-36">
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

      {organizzatore && (
        <Feltro className="mt-6">
          <p className="text-sm text-inchiostro/70">Sei l&apos;organizzatore</p>
          <TitoloRiquadro className="mt-1">Organizza il gruppo</TitoloRiquadro>
          <p className="mt-2">{statoOrganizzatore}</p>
          <TastoLink href={`/gruppo/${id}/organizza`} className="mt-5">
            {!gruppo.quiz_salvato_at ? "Crea il sondaggio" : gruppo.status === "aperto" ? "Invito ed estrazione" : "Data, budget e tema"}
          </TastoLink>
        </Feltro>
      )}

      {gruppo.status === "aperto" ? (
        // l'organizzatore lo legge già nel suo riquadro qui sopra
        !organizzatore && (
        <Feltro className="mt-6">
          <TitoloRiquadro>In attesa dell&apos;estrazione</TitoloRiquadro>
          <p className="mt-2">
            Sono entrati {entrati} su {membri.length}. Quando ci sono tutti, l&apos;organizzatore fa l&apos;estrazione e qui troverai la tua busta.
          </p>
        </Feltro>
        )
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
          <TastoLink href={`/gruppo/${id}/biglietto`} tipo="secondario" className="mt-3">
            Ricorda chi hai pescato
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
        <section className="mt-8">
          <h2 className="font-titolo text-2xl">Novità</h2>
          <div className="mt-4">
            <FeedGruppo
              groupId={id}
              io={io.id}
              persone={Object.fromEntries(membri.map((m) => [m.id, { nome: m.display_name, look: look(m) }]))}
              totem={Object.fromEntries((nomiTotem ?? []).map((t) => [t.profilo, { nome: t.nome, immagine: t.immagine }]))}
              limite={3}
            />
          </div>
        </section>
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
                  <ToppaAvatar look={look(m)} cliccabile totem={totemDi(m)} />
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

      {io && <MenuGruppo groupId={id} mioMembro={io.id} chatBloccata={!chatAperta} giochiBloccati={!giochiAperti} />}
    </main>
  );
}
