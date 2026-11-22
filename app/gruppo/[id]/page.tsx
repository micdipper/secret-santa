import { CardRegalo } from "@/components/card-regalo";
import Link from "next/link";
import { PallinaCheDondola } from "@/components/pallina-che-dondola";
import { Profondita } from "@/components/profondita";
import { ToppaAvatar, lookDi } from "@/components/avatar";
import { SceltaDestinatario } from "@/components/scelta-destinatario";
import { Countdown, KnitBand, RubberStamp, Scribble, Segno } from "@/components/carta";
import { FeedGruppo } from "@/components/feed-gruppo";
import { AvvisoSblocchi } from "@/components/avviso-sblocchi";
import type { Profilo } from "@/lib/totem";
import { EtichettaStoffa, Feltro, FrecciaAvanti, Icone, TastoLink, TitoloRiquadro } from "@/components/ui";
import { dataBreve, giornoPrima, giorniMancanti } from "@/lib/date";
import { conteggi, dataLunga } from "@/lib/disponibilita";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Membro = { id: string; display_name: string; user_id: string | null; envelope_opened_at: string | null };

export default async function PaginaGruppo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) return null; // il layout del gruppo pensa all'accesso

  // Tutto in una volta sola: le regole del database mostrano solo i dati dei miei gruppi
  // (i personaggi di chi è entrato, i totem del sondaggio, la disponibilità e SOLO il mio abbinamento).
  const [{ data: gruppo }, { data: membriDati }, { data: profili }, { data: risultati }, { data: nomiTotem }, { data: disp }, { data: abbinamento }] = await Promise.all([
    supabase.from("groups").select("id, name, budget_eur, exchange_date, theme, status, organizer_id, quiz_salvato_at, giochi_attivi, giorni_proposti, estrazione_fatta").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("id, display_name, user_id, envelope_opened_at").eq("group_id", id).order("display_name"),
    supabase.from("profiles").select("user_id, look"),
    supabase.from("quiz_results").select("user_id, profilo").eq("group_id", id),
    supabase.from("quiz_totems").select("profilo, nome, immagine").eq("group_id", id),
    supabase.from("disponibilita").select("member_id, giorni").eq("group_id", id),
    supabase.from("assignments").select("receiver_member_id").eq("group_id", id).maybeSingle(),
  ]);
  if (!gruppo) return null; // non è un mio gruppo: ci pensa il layout

  const membri = (membriDati as Membro[]) ?? [];
  const look = (m: Membro) => lookDi(profili, m.user_id);
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
  // Santa Chat: si apre quando TUTTI hanno aperto la busta. Giochi: il calendario si apre a T−5, se il gruppo li ha.
  const chatAperta = gruppo.status !== "aperto" && membri.every((m) => m.envelope_opened_at);
  const giochiAperti = gruppo.giochi_attivi && giorni !== null && giorni <= 5 && giorni >= -1; // il calendario si apre a T−5

  // A che punto è il gruppo (riquadro dell'organizzatore, in alto)
  const mancanti = membri.filter((m) => !m.user_id);
  const daAprire = membri.filter((m) => !m.envelope_opened_at).length;
  const statoOrganizzatore = !gruppo.quiz_salvato_at
    ? "Prima crea il sondaggio: poi arriva il link d'invito da mandare agli amici."
    : gruppo.status === "aperto"
      ? mancanti.length > 0
        ? `Sono entrati ${entrati} su ${membri.length}: manda il link a chi manca.${gruppo.estrazione_fatta ? "" : " Quando ci sono tutti fai l'estrazione."}`
        : gruppo.estrazione_fatta
          ? "Ci sono tutti: aspettiamo che ognuno indichi la sua persona."
          : "Ci sono tutti: puoi fare l'estrazione!"
      : daAprire > 0
        ? `Estrazione fatta. ${daAprire === 1 ? "Manca 1 persona" : `Mancano ${daAprire} persone`} ad aprire la busta.`
        : "Estrazione fatta e buste aperte da tutti. Puoi sempre cambiare data, budget e tema.";

  const testoChat = gruppo.status === "aperto"
    ? "Si apre dopo l'estrazione"
    : !chatAperta
      ? `Si apre quando tutti avranno aperto la busta (${daAprire === 1 ? "manca 1" : `mancano ${daAprire}`})`
      : "Messaggi segreti col tuo pescato e col tuo Babbo";
  const testoGiochi = !gruppo.exchange_date
    ? "Si sbloccano quando c'è la data dello scambio"
    : !gruppo.giochi_attivi
      ? "Niente giochi: lo scambio è troppo vicino"
      : giorni! > 5
        ? `Il calendario si apre ${dataBreve(giornoPrima(gruppo.exchange_date, 5))}`
        : giorni! < 0
          ? "Finiti: guarda chi ha vinto"
          : giorni === 5
            ? "Il calendario è aperto!"
            : "Oggi c'è un regalo da scartare";

  const riquadroOrganizzatore = (
    <Feltro className="mt-6">
      <p className="text-sm text-inchiostro/70">Sei l&apos;organizzatore</p>
      <TitoloRiquadro className="mt-1">Organizza il gruppo</TitoloRiquadro>
      <p className="mt-2">{statoOrganizzatore}</p>
      <TastoLink href={`/gruppo/${id}/organizza`} tipo={gruppo.status === "aperto" ? "primario" : "secondario"} className="mt-5">
        {!gruppo.quiz_salvato_at ? "Crea il sondaggio" : gruppo.status === "aperto" ? "Invito ed estrazione" : "Data, budget e tema"}
      </TastoLink>
    </Feltro>
  );

  // Sondaggio della disponibilità aperto: chi ha risposto e il giorno più probabile
  let sondaggio: { risposto: boolean; risposte: number; migliori: string[]; max: number } | null = null;
  if (gruppo.giorni_proposti) {
    const risposte = Object.fromEntries((disp ?? []).map((r) => [r.member_id as string, r.giorni as string[]]));
    const { migliori, max } = conteggi([...(gruppo.giorni_proposti as string[])].sort(), risposte);
    sondaggio = { risposto: !!io && !!risposte[io.id], risposte: Object.keys(risposte).length, migliori, max };
  }

  // "Abbiamo già fatto l'estrazione": la mia scelta (le regole mi danno solo la mia) e quanti hanno scelto
  let sceltaDestinatario: React.ReactNode = null;
  if (gruppo.estrazione_fatta && gruppo.status === "aperto" && io) {
    const { data: quanti } = await supabase.rpc("quanti_hanno_scelto", { p_group_id: id });
    sceltaDestinatario = (
      <SceltaDestinatario
        groupId={id}
        persone={membri.filter((m) => m.id !== io.id).map((m) => ({ id: m.id, nome: m.display_name, look: look(m) }))}
        scelta={abbinamento?.receiver_member_id ?? null}
        hannoScelto={quanti ?? 0}
        totale={membri.length}
      />
    );
  }

  // Se ho già aperto la busta, mostro a chi faccio il regalo (le regole del database mi danno solo il mio abbinamento).
  let destinatario: Membro | undefined;
  if (gruppo.status !== "aperto" && io?.envelope_opened_at) {
    destinatario = membri.find((m) => m.id === abbinamento?.receiver_member_id);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <KnitBand className="relative z-20 mt-[calc(env(safe-area-inset-top)+96px)]" />
      <header className="relative pt-8">
        {/* (in alto a destra c'è il tasto dell'audio, uguale in ogni schermata) */}
        {/* la pallina pende sotto la banda a maglia: il filo sparisce dietro, ma la pallina si vede tutta */}
        <Profondita intensita={8} className="absolute -top-4 right-0 z-10 w-16">
          <PallinaCheDondola className="w-16" groupId={id} />
        </Profondita>
        <h1 className="pr-20 font-titolo text-[32px] leading-none">{gruppo.name}</h1>
        <div className="mt-4 flex flex-wrap gap-2 pr-20">
          {gruppo.exchange_date && <EtichettaStoffa colore="vermiglio">Scambio {dataBreve(gruppo.exchange_date)}</EtichettaStoffa>}
          {gruppo.budget_eur !== null && <EtichettaStoffa>budget {gruppo.budget_eur} €</EtichettaStoffa>}
        </div>
        {gruppo.theme && <p className="mt-3 text-crema/80">Tema: {gruppo.theme}</p>}
        {giorni !== null && giorni > 0 && gruppo.exchange_date && (
          <div className="mt-6">
            <Countdown data={gruppo.exchange_date} />
          </div>
        )}
        {giorni === 0 && <p className="mt-6 font-titolo text-[28px] leading-tight">“È il giorno dello scambio!”</p>}
      </header>

      {/* 1. Il fulcro: busta, abbinamento o attesa (per l'organizzatore, prima dell'estrazione, è il suo riquadro) */}
      {gruppo.status === "aperto" ? (
        sceltaDestinatario ? (
          <>
            {organizzatore && riquadroOrganizzatore}
            {sceltaDestinatario}
          </>
        ) : organizzatore ? (
          riquadroOrganizzatore
        ) : (
          <Feltro className="mt-6">
            <TitoloRiquadro>In attesa dell&apos;estrazione</TitoloRiquadro>
            <p className="mt-2">
              Sono entrati {entrati} su {membri.length}. Quando ci sono tutti, l&apos;organizzatore fa l&apos;estrazione e qui troverai la tua busta.
            </p>
          </Feltro>
        )
      ) : destinatario ? (
        <CardRegalo
          groupId={id}
          fronte={
            <>
              <RubberStamp giro="Busta aperta ✦ acqua in bocca ✦" parola="Aperta" className="timbro-entra absolute -top-8 -right-3 !size-24" />
              <p className="text-sm text-inchiostro/70">Il tuo regalo è per</p>
              <div className="mt-3 flex items-center gap-4 pr-12">
                <ToppaAvatar look={look(destinatario)} nome={destinatario.display_name} />
                <TitoloRiquadro>
                  <Scribble tipo="sottolineato">{destinatario.display_name}</Scribble>
                </TitoloRiquadro>
              </div>
            </>
          }
          nota={
            <>
              <p>
                Acqua in bocca!
                {gruppo.budget_eur !== null && ` Budget ${gruppo.budget_eur} €`}
                {gruppo.exchange_date && `, scambio ${dataBreve(gruppo.exchange_date)}`}
                {gruppo.budget_eur !== null || gruppo.exchange_date ? "." : ""}
              </p>
            </>
          }
          azioni={
            <>
              <TastoLink href={`/gruppo/${id}/bacheca/${destinatario.id}`} className="mt-5">
                Guarda la sua bacheca
              </TastoLink>
              <TastoLink href={`/gruppo/${id}/biglietto`} tipo="secondario" className="mt-3">
                Rivedi la sua card
              </TastoLink>
            </>
          }
        />
      ) : (
        <Feltro className="mt-6">
          <RubberStamp giro="Estrazione fatta ✦ top secret ✦" parola="Fatto" className="timbro-entra absolute -top-8 -right-3 !size-24" />
          <TitoloRiquadro className="pr-20">
            La tua <Scribble tipo="cerchio">busta</Scribble> è pronta
          </TitoloRiquadro>
          <p className="mt-2 pr-16">Scopri a chi farai il regalo. Lo vedrai solo tu.</p>
          <TastoLink href={`/gruppo/${id}/busta`} className="mt-5">
            Apri la busta
          </TastoLink>
        </Feltro>
      )}
      {/* dopo l'estrazione l'organizzatore ha ancora il suo riquadro, subito sotto */}
      {organizzatore && gruppo.status !== "aperto" && riquadroOrganizzatore}

      {/* Quando facciamo lo scambio? (finché l'organizzatore non fissa la data) */}
      {io && sondaggio && (
        <Feltro className="mt-4">
          <TitoloRiquadro>Quando facciamo lo scambio?</TitoloRiquadro>
          <p className="mt-2">
            {sondaggio.migliori.length === 0
              ? "Nessuno ha ancora detto quando c'è."
              : sondaggio.migliori.length === 1
                ? `Per ora il più probabile è ${dataLunga(sondaggio.migliori[0])} (${sondaggio.max} ${sondaggio.max === 1 ? "persona" : "persone"}).`
                : `Per ora pari merito: ${sondaggio.migliori.map(dataLunga).join(", ")}.`}{" "}
            Hanno risposto {sondaggio.risposte} su {membri.length}.
          </p>
          <TastoLink href={`/gruppo/${id}/disponibilita`} tipo={sondaggio.risposto ? "secondario" : "primario"} className="mt-5">
            {organizzatore ? "Risposte e data" : sondaggio.risposto ? "Cambia i tuoi giorni" : "Dimmi quando ci sei"}
          </TastoLink>
        </Feltro>
      )}

      {io && (
        <>
          {/* 2. Il tuo personaggio, in grande (un po' fuori scala: esce dal riquadro) */}
          <Link href={`/gruppo/${id}/guardaroba`} className="feltro cliccabile relative mt-24 flex min-h-[136px] items-end p-6 pl-[156px]">
            <span className="pointer-events-none absolute -top-20 -left-3 rounded-full shadow-[0_10px_20px_-10px_rgba(0,0,0,.6)]">
              <ToppaAvatar look={look(io)} dimensione={168} totem={totemDi(io)} />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="block text-sm text-inchiostro/70">Il tuo personaggio</span>
              <span className="block font-titolo text-2xl leading-tight text-abete">Guardaroba</span>
              <span className="mt-1 block text-sm text-inchiostro/70">Vestilo e indossa i doni che ricevi</span>
            </span>
          </Link>

          {/* 3. La tua bacheca: più piccola, ma sempre in vista */}
          <Link href={`/gruppo/${id}/bacheca/${io.id}`} className="feltro cliccabile mt-4 flex items-center gap-4 p-4 pl-5">
            <span className="toppa tela-aida size-14 flex-none text-vermiglio [&_svg]:relative [&_svg]:size-7 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.2]">{Icone.ago}</span>
            <span className="relative min-w-0 flex-1">
              <span className="block font-titolo text-lg leading-tight text-abete">La tua bacheca</span>
              <span className="block text-sm text-inchiostro/70">Fai capire al tuo Babbo Natale cosa ti piace</span>
            </span>
            <FrecciaAvanti />
          </Link>

          {/* 4. Santa Chat e mini giochi, affiancati: quelli non ancora sbloccati sono spenti col lucchetto
                (si aprono comunque e spiegano quando si sbloccano; allo sblocco compare un avviso) */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <Sezione href={`/gruppo/${id}/santa-chat`} titolo="Santa Chat" icona={Icone.fumetto} bloccata={!chatAperta} testo={testoChat} />
            <Sezione href={`/gruppo/${id}/giochi`} titolo="Mini giochi" icona={Icone.calendario} bloccata={!giochiAperti} testo={testoGiochi} />
          </div>

          {/* 5. Novità del gruppo */}
          <section className="mt-8">
            <h2 className="font-titolo text-2xl">
              Novità <Segno tipo="asterisco" className="!bg-senape" />
            </h2>
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

          <AvvisoSblocchi groupId={id} chatAperta={chatAperta} giochiAperti={giochiAperti} />
        </>
      )}

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-titolo text-2xl">Chi c&apos;è</h2>
          <span className="text-sm text-crema/75">{membri.length} persone</span>
        </div>
        <ul className="-mx-5 mt-4 flex gap-3 overflow-x-auto px-5 pt-2 pb-2">
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

    </main>
  );
}

// Riquadro di una sezione del gruppo (Santa Chat, mini giochi). Se non è ancora sbloccata è spento,
// con il lucchetto, ma si apre lo stesso per spiegare quando si sblocca.
function Sezione({ href, titolo, icona, bloccata, testo }: { href: string; titolo: string; icona: React.ReactNode; bloccata: boolean; testo: string }) {
  return (
    <Link href={href} className={`feltro cliccabile flex flex-col gap-3 p-5 ${bloccata ? "opacity-55" : ""}`} aria-label={`${titolo}${bloccata ? " (ancora bloccata)" : ""}`}>
      <span className="relative flex size-12 items-center justify-center rounded-full bg-abete text-crema [&>svg]:size-6 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[2.2] [&>svg]:[stroke-linecap:round] [&>svg]:[stroke-linejoin:round]">
        {icona}
        {bloccata && (
          <span className="absolute -right-1.5 -bottom-1 flex size-6 items-center justify-center rounded-full bg-vermiglio text-crema shadow-[0_1px_2px_rgba(0,0,0,.4)] [&>svg]:size-3.5 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[2.6]">
            {Icone.lucchetto}
          </span>
        )}
      </span>
      <span className="relative">
        <span className="block font-titolo text-lg leading-tight text-abete">{titolo}</span>
        <span className="mt-1 block text-sm leading-snug text-inchiostro/70">{testo}</span>
      </span>
    </Link>
  );
}
