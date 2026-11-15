"use client";

import { AvvisoDataVicina, dataTroppoVicina } from "@/components/avviso-data";
import { RiquadroEsclusioni, type Esclusione } from "@/components/esclusioni";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ToppaAvatar, lookDi } from "@/components/avatar";
import {
  Campo,
  Errore,
  Feltro,
  Icone,
  Tasto,
  TastoLink,
  TastoTondo,
  TestataInterna,
  TitoloRiquadro,
} from "@/components/ui";
import { dataBreve, giornoPrima, giorniMancanti } from "@/lib/date";
import { clientSoloBrowser } from "@/lib/supabase/client";

type Gruppo = {
  id: string;
  name: string;
  budget_eur: number | null;
  exchange_date: string | null;
  theme: string | null;
  status: string;
  invite_code: string;
  organizer_id: string;
  quiz_salvato_at: string | null;
  giochi_attivi: boolean;
};
type Membro = { id: string; display_name: string; user_id: string | null };
type Coppia = Esclusione;

export default function PaginaOrganizza() {
  return (
    <Suspense>
      <Organizza />
    </Suspense>
  );
}

function Organizza() {
  const { id } = useParams<{ id: string }>();
  const appenaCreato = useSearchParams().get("nuovo") === "1";
  const router = useRouter();
  const supabase = clientSoloBrowser();

  const [mioId, setMioId] = useState<string | null>(null);
  const [gruppo, setGruppo] = useState<Gruppo | null>(null);
  const [membri, setMembri] = useState<Membro[]>([]);
  const [coppie, setCoppie] = useState<Coppia[]>([]);
  const [profili, setProfili] = useState<{ user_id: string; look: unknown }[]>(
    [],
  );
  const [errore, setErrore] = useState("");
  const [avviso, setAvviso] = useState("");
  const [salvataggio, setSalvataggio] = useState<"" | "salvo" | "salvato">("");

  const [aperto, setAperto] = useState<string | null>(null); // membro con le opzioni aperte
  const [linkReset, setLinkReset] = useState<{
    membro: string;
    url: string;
  } | null>(null);
  const [nuovoNome, setNuovoNome] = useState("");
  const [estrazioneInCorso, setEstrazioneInCorso] = useState(false);
  // data e tema si scrivono qui e si salvano con il tasto (la data) o uscendo dal campo (il tema)
  const [nuovaData, setNuovaData] = useState("");
  const [nuovoTema, setNuovoTema] = useState("");
  const [avvisoData, setAvvisoData] = useState(false);

  const carica = useCallback(async () => {
    const [{ data: s }, { data: g }, { data: m }, { data: c }] =
      await Promise.all([
        supabase.auth.getSession(),
        supabase
          .from("groups")
          .select(
            "id, name, budget_eur, exchange_date, theme, status, invite_code, organizer_id, quiz_salvato_at, giochi_attivi",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("group_members")
          .select("id, display_name, user_id")
          .eq("group_id", id)
          .order("display_name"),
        supabase
          .from("exclusions")
          .select("member_a, member_b, reason")
          .eq("group_id", id),
      ]);
    setMioId(s.session?.user.id ?? null);
    setGruppo(g as Gruppo | null);
    setNuovaData((g as Gruppo | null)?.exchange_date ?? "");
    setNuovoTema((g as Gruppo | null)?.theme ?? "");
    setMembri((m as Membro[]) ?? []);
    setCoppie((c as Coppia[]) ?? []);
    const ids = ((m as Membro[]) ?? []).flatMap((x) =>
      x.user_id ? [x.user_id] : [],
    );
    const { data: p } = await supabase
      .from("profiles")
      .select("user_id, look")
      .in("user_id", ids);
    setProfili(p ?? []);
  }, [supabase, id]);

  useEffect(() => {
    // Carico i dati da Supabase all'apertura: lo stato si aggiorna dopo la risposta (non subito).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carica();
  }, [carica]);

  useEffect(() => {
    if (gruppo && mioId && gruppo.organizer_id !== mioId)
      router.replace(`/gruppo/${id}`);
  }, [gruppo, mioId, router, id]);

  if (!gruppo)
    return (
      <main className="mx-auto w-full max-w-md px-5 pt-16 text-crema/80">
        Carico il gruppo…
      </main>
    );

  const modificabile = gruppo.status === "aperto";
  // Calendario dei giochi: servono almeno 6 giorni; da 5 giorni prima la data non si tocca più
  const giorniAlloScambio = giorniMancanti(gruppo.exchange_date);
  const dataBloccata = gruppo.giochi_attivi && giorniAlloScambio !== null && giorniAlloScambio <= 5;
  const notaGiochi = !gruppo.exchange_date
    ? "Con una data lontana almeno 6 giorni partono anche i mini giochi dell'avvento."
    : dataBloccata
      ? "La data è bloccata: i giochi stanno per iniziare."
      : gruppo.giochi_attivi
        ? `Dal ${dataBreve(giornoPrima(gruppo.exchange_date, 5))} la data si blocca: iniziano i giochi.`
        : "Mancano meno di 6 giorni: niente giochi per questo gruppo.";
  const mancanti = membri.filter((m) => !m.user_id);
  const puoEstrarre =
    modificabile && mancanti.length === 0 && membri.length >= 3;

  async function salva(
    campi: Partial<Pick<Gruppo, "budget_eur" | "exchange_date" | "theme">>,
  ) {
    setGruppo((g) => (g ? { ...g, ...campi } : g));
    setSalvataggio("salvo");
    // il database ricalcola "giochi_attivi" a ogni cambio di data, e blocca la data quando i giochi stanno per iniziare
    const { data, error } = await supabase.from("groups").update(campi).eq("id", id).select("giochi_attivi").single();
    if (data) setGruppo((g) => (g ? { ...g, giochi_attivi: data.giochi_attivi } : g));
    if (error) carica();
    setErrore(error ? (error.message.includes("bloccata") ? error.message : "Non sono riuscito a salvare. Riprova.") : "");
    setSalvataggio(error ? "" : "salvato");
  }

  // Salva la data: se è a meno di 6 giorni prima si avvisa che i minigiochi non partirebbero
  function salvaData(senzaGiochi = false) {
    const g = giorniMancanti(nuovaData || null);
    if (g !== null && g < 0) return setErrore("Il giorno dello scambio è già passato: scegline un altro.");
    if (dataTroppoVicina(nuovaData) && !senzaGiochi) return setAvvisoData(true);
    setAvvisoData(false);
    salva({ exchange_date: nuovaData || null });
  }

  async function aggiungiPersona() {
    const n = nuovoNome.trim();
    if (!n) return;
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: id, display_name: n });
    if (error)
      return setErrore(
        error.message.includes("group_members_group_name_uidx")
          ? `"${n}" è già nella lista.`
          : "Non sono riuscito ad aggiungerlo.",
      );
    setNuovoNome("");
    setErrore("");
    carica();
  }

  async function creaLinkReset(m: Membro) {
    const { data, error } = await supabase.rpc("create_password_reset", {
      p_member_id: m.id,
    });
    if (error || !data)
      return setErrore(error?.message ?? "Non sono riuscito a creare il link.");
    setErrore("");
    setLinkReset({
      membro: m.id,
      url: `${window.location.origin}/reimposta/${data}`,
    });
  }

  async function condividiLinkReset(m: Membro, url: string) {
    const testo = `${m.display_name.split(" ")[0]}, ecco il link per scegliere una nuova password per "${gruppo!.name}". Vale 24 ore e si usa una volta sola.`;
    try {
      if (navigator.share)
        await navigator.share({ title: "Nuova password", text: testo, url });
      else {
        await navigator.clipboard.writeText(url);
        setAvviso("Link copiato.");
      }
    } catch {
      // condivisione annullata
    }
  }

  async function liberaNome(m: Membro) {
    const { error } = await supabase.rpc("release_member", {
      p_member_id: m.id,
    });
    setErrore(error ? error.message : "");
    setAperto(null);
    carica();
  }

  async function togliPersona(m: Membro) {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("id", m.id);
    setErrore(error ? "Non sono riuscito a toglierlo." : "");
    setAperto(null);
    carica();
  }

  async function condividi() {
    const link = `${window.location.origin}/invito/${gruppo!.invite_code}`;
    const testo = `Entra nel Secret Santa "${gruppo!.name}": tocca il tuo nome e scegli una password.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: gruppo!.name, text: testo, url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setAvviso("Link copiato.");
      }
    } catch {
      // condivisione annullata: niente da fare
    }
  }

  async function estrai() {
    if (
      !window.confirm(
        "Fare l'estrazione adesso? Si fa una volta sola e dopo nessuno potrà più entrare.",
      )
    )
      return;
    setEstrazioneInCorso(true);
    const { error } = await supabase.rpc("run_draw", { p_group_id: id });
    setEstrazioneInCorso(false);
    if (error) return setErrore(error.message);
    router.push(`/gruppo/${id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro={`/gruppo/${id}`}
        etichettaIndietro={`Torna a ${gruppo.name}`}
        contesto={gruppo.name}
        titolo="Organizza"
        sottotitolo="Solo tu vedi questa pagina."
      />

      {appenaCreato && (
        <p className="mt-4 rounded-2xl bg-crema/10 px-4 py-3 text-sm">
          Gruppo creato! Ora condividi il link d&apos;invito qui sotto.
        </p>
      )}

      {!gruppo.quiz_salvato_at ? (
        <Feltro className="mt-6">
          <TitoloRiquadro>Prima il sondaggio</TitoloRiquadro>
          <p className="mt-2">
            Il link d&apos;invito arriva appena salvi il sondaggio totem: chi
            entra lo deve trovare già pronto.
          </p>
          <TastoLink href={`/gruppo/${id}/sondaggio?nuovo=1`} className="mt-5">
            Crea il sondaggio
          </TastoLink>
        </Feltro>
      ) : (
        <Feltro className="mt-6">
          <TitoloRiquadro>Link d&apos;invito</TitoloRiquadro>
          <p className="mt-2 text-sm text-inchiostro/70">
            {modificabile
              ? "Mandalo nel gruppo: ognuno tocca il proprio nome. Sul computer il link viene copiato."
              : "Dopo l'estrazione il link serve solo per rientrare da un altro telefono."}
          </p>
          <Tasto tipo="secondario" className="mt-5" onClick={condividi}>
            Condividi il link
          </Tasto>
          {avviso && (
            <p className="mt-3 text-center text-sm text-abete">{avviso}</p>
          )}
          <TastoLink
            href={`/gruppo/${id}/sondaggio`}
            tipo="secondario"
            className="mt-3"
          >
            Rivedi il sondaggio
          </TastoLink>
        </Feltro>
      )}

      <Feltro className="mt-4">
        <TitoloRiquadro>Toppe del gruppo</TitoloRiquadro>
        <p className="mt-2">
          Oltre alle toppe di base e a quelle dei totem, puoi aggiungere fino a 4 simboli e 4 parole solo vostri, anche più avanti: li troveranno tutti nel doppio fondo dei cassetti, e nelle Novità comparirà un avviso.
        </p>
        <TastoLink href={`/gruppo/${id}/toppe`} tipo="secondario" className="mt-5">
          Crea le toppe del gruppo
        </TastoLink>
      </Feltro>

      <Feltro className="mt-4">
        <TitoloRiquadro>Quando e quanto</TitoloRiquadro>
        <div className="mt-5 flex flex-col gap-5">
          <Campo
            id="data"
            type="date"
            etichetta="Giorno dello scambio"
            value={nuovaData}
            disabled={dataBloccata}
            aiuto={notaGiochi}
            onChange={(e) => setNuovaData(e.target.value)}
          />
          {!dataBloccata && (
            <Tasto
              tipo="secondario"
              disabled={nuovaData === (gruppo.exchange_date ?? "")}
              onClick={() => salvaData()}
            >
              {gruppo.exchange_date ? "Cambia la data" : "Salva la data"}
            </Tasto>
          )}
          <div className="flex flex-col gap-2">
            <span className="font-medium">Budget a persona</span>
            <div className="flex items-center justify-between gap-3">
              <TastoTondo
                etichetta="Diminuisci il budget"
                icona={Icone.meno}
                disabled={(gruppo.budget_eur ?? 0) <= 5}
                onClick={() =>
                  salva({ budget_eur: (gruppo.budget_eur ?? 0) - 5 })
                }
              />
              <span className="font-titolo text-[32px] leading-none text-vermiglio">
                {gruppo.budget_eur ?? 0} €
              </span>
              <TastoTondo
                etichetta="Aumenta il budget"
                icona={Icone.piu}
                onClick={() =>
                  salva({ budget_eur: (gruppo.budget_eur ?? 0) + 5 })
                }
              />
            </div>
          </div>
          <Campo
            id="tema"
            etichetta="Tema (facoltativo)"
            placeholder="Regali fatti a mano"
            value={nuovoTema}
            maxLength={200}
            onChange={(e) => setNuovoTema(e.target.value)}
            onBlur={() => nuovoTema.trim() !== (gruppo.theme ?? "") && salva({ theme: nuovoTema.trim() || null })}
          />
          <p className="text-sm text-inchiostro/70" aria-live="polite">
            {salvataggio === "salvo"
              ? "Salvo…"
              : salvataggio === "salvato"
                ? "Salvato ✓ Tutti lo vedono nella pagina del gruppo."
                : "Budget e tema si salvano da soli, la data con il suo tasto. Puoi cambiarli anche dopo l'estrazione."}
          </p>
        </div>
      </Feltro>

      <Feltro className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <TitoloRiquadro>Chi partecipa</TitoloRiquadro>
          <span className="flex-none text-sm text-inchiostro/70">
            {membri.length - mancanti.length} su {membri.length} entrati
          </span>
        </div>
        <ul className="mt-3 divide-y-2 divide-dashed divide-abete/15">
          {membri.map((m) => {
            const sonoIo = m.user_id === mioId;
            const puoLiberare = modificabile && !!m.user_id && !sonoIo;
            const puoTogliere = modificabile && !m.user_id;
            const puoReimpostare = !!m.user_id && !sonoIo;
            return (
              <li key={m.id} className="py-3">
                <div className="flex items-center gap-3">
                  <ToppaAvatar
                    look={lookDi(profili, m.user_id)}
                    dimensione={40}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {m.display_name}
                      {sonoIo && " (tu)"}
                    </span>
                    <span
                      className={`block text-sm ${m.user_id ? "text-abete" : "text-inchiostro/60"}`}
                    >
                      {m.user_id ? "è entrato" : "non è ancora entrato"}
                    </span>
                  </span>
                  <TastoTondo
                    etichetta={`Opzioni per ${m.display_name}`}
                    icona={Icone.altro}
                    disabled={!puoLiberare && !puoTogliere && !puoReimpostare}
                    aria-expanded={aperto === m.id}
                    onClick={() => {
                      setAperto(aperto === m.id ? null : m.id);
                      setLinkReset(null);
                    }}
                  />
                </div>
                {aperto === m.id && (
                  <div className="mt-3 flex flex-col gap-2">
                    {puoReimpostare &&
                      (linkReset?.membro === m.id ? (
                        <>
                          <p className="text-sm text-inchiostro/70">
                            Link pronto: mandalo <b>in privato</b> a{" "}
                            {m.display_name.split(" ")[0]}. Vale 24 ore e si usa
                            una volta sola; tu non vedrai la nuova password.
                          </p>
                          <Tasto
                            onClick={() => condividiLinkReset(m, linkReset.url)}
                          >
                            Manda il link
                          </Tasto>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-inchiostro/70">
                            Ha dimenticato la password? Crea un link con cui
                            sceglierne una nuova da solo.
                          </p>
                          <Tasto
                            tipo="secondario"
                            onClick={() => creaLinkReset(m)}
                          >
                            Reimposta password
                          </Tasto>
                        </>
                      ))}
                    {puoLiberare && (
                      <>
                        <p className="text-sm text-inchiostro/70">
                          Se qualcuno ha preso questo nome per sbaglio,
                          liberalo: tornerà libero nella lista dell&apos;invito.
                        </p>
                        <Tasto tipo="secondario" onClick={() => liberaNome(m)}>
                          Libera il nome
                        </Tasto>
                      </>
                    )}
                    {puoTogliere && (
                      <Tasto tipo="secondario" onClick={() => togliPersona(m)}>
                        Togli dalla lista
                      </Tasto>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {modificabile && (
          <div className="mt-4 flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <Campo
                id="nuovo-nome"
                etichetta="Aggiungi una persona"
                placeholder="Nome e cognome"
                value={nuovoNome}
                maxLength={60}
                onChange={(e) => setNuovoNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") aggiungiPersona();
                }}
              />
            </div>
            <TastoTondo
              etichetta="Aggiungi la persona"
              icona={Icone.piu}
              disabled={!nuovoNome.trim()}
              onClick={aggiungiPersona}
            />
          </div>
        )}
      </Feltro>

      <RiquadroEsclusioni
        className="mt-4"
        persone={membri.map((m) => ({ id: m.id, nome: m.display_name }))}
        esclusioni={coppie}
        modificabile={modificabile}
        onAggiungi={async (e) => {
          const { error } = await supabase.from("exclusions").insert({ group_id: id, ...e });
          if (error) return error.code === "23505" ? "C'è già." : "Non sono riuscito a salvarla.";
          carica();
          return null;
        }}
        onTogli={async (c) => {
          await supabase.from("exclusions").delete().eq("group_id", id).eq("member_a", c.member_a).eq("member_b", c.member_b).eq("reason", c.reason);
          carica();
        }}
      />

      <Feltro className="mt-4">
        <TitoloRiquadro>Estrazione</TitoloRiquadro>
        <p className="mt-2">
          {!modificabile
            ? "Fatta! Ognuno trova la sua busta nella pagina del gruppo."
            : membri.length < 3
              ? "Servono almeno 3 persone."
              : mancanti.length > 0
                ? `Manca${mancanti.length > 1 ? "no" : ""} ${mancanti.map((m) => m.display_name.split(" ")[0]).join(", ")}. Quando entrano tutti potrai fare l'estrazione: si fa una volta sola.`
                : "Ci sono tutti! Si fa una volta sola e dopo nessuno potrà più entrare."}
        </p>
        {modificabile && (
          <Tasto
            className="mt-5"
            disabled={!puoEstrarre || estrazioneInCorso}
            onClick={estrai}
          >
            {estrazioneInCorso ? "Estraggo…" : "Fai l'estrazione"}
          </Tasto>
        )}
      </Feltro>

      {errore && (
        <div className="mt-4">
          <Errore>{errore}</Errore>
        </div>
      )}

      <AvvisoDataVicina
        aperto={avvisoData}
        onAltraData={() => {
          setAvvisoData(false);
          document.getElementById("data")?.focus();
        }}
        onContinua={() => salvaData(true)}
      />

      {/* Per andare alla pagina del gruppo (la tua bacheca, il tuo personaggio…) anche prima dell'estrazione */}
      <TastoLink href={`/gruppo/${id}`} tipo="secondario" className="mt-8">
        Vai alla pagina del gruppo
      </TastoLink>
    </main>
  );
}
