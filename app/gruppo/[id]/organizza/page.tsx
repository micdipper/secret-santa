"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ToppaAvatar, lookDi } from "@/components/avatar";
import {
  Campo,
  Errore,
  EtichettaStoffa,
  Feltro,
  Icone,
  Tasto,
  TastoLink,
  TastoTondo,
  TestataInterna,
  TitoloRiquadro,
} from "@/components/ui";
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
};
type Membro = { id: string; display_name: string; user_id: string | null };
type Coppia = {
  member_a: string;
  member_b: string;
  reason: "coppia" | "anno_scorso";
};

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
  const [nuovaCoppia, setNuovaCoppia] = useState(false);
  const [coppiaA, setCoppiaA] = useState("");
  const [coppiaB, setCoppiaB] = useState("");
  const [motivo, setMotivo] = useState<Coppia["reason"]>("coppia");
  const [togliCoppie, setTogliCoppie] = useState(false);
  const [estrazioneInCorso, setEstrazioneInCorso] = useState(false);

  const carica = useCallback(async () => {
    const [{ data: s }, { data: g }, { data: m }, { data: c }] =
      await Promise.all([
        supabase.auth.getSession(),
        supabase
          .from("groups")
          .select(
            "id, name, budget_eur, exchange_date, theme, status, invite_code, organizer_id, quiz_salvato_at",
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
  const nome = (mid: string) =>
    membri.find((m) => m.id === mid)?.display_name ?? "?";
  const mancanti = membri.filter((m) => !m.user_id);
  const puoEstrarre =
    modificabile && mancanti.length === 0 && membri.length >= 3;

  async function salva(
    campi: Partial<Pick<Gruppo, "budget_eur" | "exchange_date" | "theme">>,
  ) {
    setGruppo((g) => (g ? { ...g, ...campi } : g));
    setSalvataggio("salvo");
    const { error } = await supabase.from("groups").update(campi).eq("id", id);
    setErrore(error ? "Non sono riuscito a salvare. Riprova." : "");
    setSalvataggio(error ? "" : "salvato");
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

  async function salvaCoppia() {
    if (!coppiaA || !coppiaB || coppiaA === coppiaB)
      return setErrore("Scegli due persone diverse.");
    // Coppia: vale nei due versi, la salvo in ordine. Anno scorso: A ha regalato a B, conta solo quel verso.
    const [a, b] =
      motivo === "coppia" ? [coppiaA, coppiaB].sort() : [coppiaA, coppiaB];
    const { error } = await supabase
      .from("exclusions")
      .insert({ group_id: id, member_a: a, member_b: b, reason: motivo });
    if (error)
      return setErrore(
        error.code === "23505" ? "C'è già." : "Non sono riuscito a salvarla.",
      );
    setNuovaCoppia(false);
    setCoppiaA("");
    setCoppiaB("");
    setErrore("");
    carica();
  }

  async function togliCoppia(c: Coppia) {
    await supabase
      .from("exclusions")
      .delete()
      .eq("group_id", id)
      .eq("member_a", c.member_a)
      .eq("member_b", c.member_b)
      .eq("reason", c.reason);
    if (coppie.length <= 1) setTogliCoppie(false);
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
        <TitoloRiquadro>Quando e quanto</TitoloRiquadro>
        <div className="mt-5 flex flex-col gap-5">
          <Campo
            id="data"
            type="date"
            etichetta="Giorno dello scambio"
            value={gruppo.exchange_date ?? ""}
            disabled={!modificabile}
            onChange={(e) => salva({ exchange_date: e.target.value || null })}
          />
          <div className="flex flex-col gap-2">
            <span className="font-medium">Budget a persona</span>
            <div className="flex items-center justify-between gap-3">
              <TastoTondo
                etichetta="Diminuisci il budget"
                icona={Icone.meno}
                disabled={!modificabile || (gruppo.budget_eur ?? 0) <= 5}
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
                disabled={!modificabile}
                onClick={() =>
                  salva({ budget_eur: (gruppo.budget_eur ?? 0) + 5 })
                }
              />
            </div>
          </div>
          {modificabile && (
            <p className="text-sm text-inchiostro/70" aria-live="polite">
              {salvataggio === "salvo"
                ? "Salvo…"
                : salvataggio === "salvato"
                  ? "Salvato ✓"
                  : "Si salva da solo appena cambi qualcosa."}
            </p>
          )}
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

      <Feltro className="mt-4">
        <TitoloRiquadro>Chi non deve pescarsi</TitoloRiquadro>
        <p className="mt-2 text-sm text-inchiostro/70">
          {togliCoppie
            ? "Tocca quella da togliere."
            : "L'estrazione è una catena: nessuno pesca se stesso o chi gli fa il regalo. Qui aggiungi chi altro non deve pescarsi."}
        </p>
        {coppie.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {coppie.map((c) => {
              const a = nome(c.member_a).split(" ")[0];
              const b = nome(c.member_b).split(" ")[0];
              const testo =
                c.reason === "coppia"
                  ? `💞 ${a} e ${b}`
                  : `🎁 ${a} → ${b}, anno scorso`;
              return (
                <li key={c.member_a + c.member_b + c.reason}>
                  {togliCoppie ? (
                    <button
                      type="button"
                      onClick={() => togliCoppia(c)}
                      className="cucitura cliccabile stoffa-chiara relative rounded-full px-4 py-2 text-sm"
                    >
                      Togli {testo}
                    </button>
                  ) : (
                    <EtichettaStoffa
                      colore={c.reason === "coppia" ? "verde" : "crema"}
                    >
                      {testo}
                    </EtichettaStoffa>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {nuovaCoppia && (
          <div className="mt-5 flex flex-col gap-4">
            <div
              role="radiogroup"
              aria-label="Perché non devono pescarsi?"
              className="grid grid-cols-2 gap-3"
            >
              {(
                [
                  [
                    "coppia",
                    "💞",
                    "Sono una coppia",
                    "Non si pescano a vicenda",
                  ],
                  [
                    "anno_scorso",
                    "🎁",
                    "Già fatto l'anno scorso",
                    "Chi ha regalato non ripesca la stessa persona",
                  ],
                ] as const
              ).map(([v, emoji, titolo, spiegazione]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={motivo === v}
                  onClick={() => {
                    setMotivo(v);
                    setCoppiaB("");
                  }}
                  className={`cucitura cliccabile stoffa-chiara relative flex flex-col items-center gap-1 rounded-[20px] px-3 pt-4 pb-3 text-center ${
                    motivo === v
                      ? "outline-3 outline-offset-2 outline-vermiglio"
                      : ""
                  }`}
                >
                  <span className="text-3xl" aria-hidden>
                    {emoji}
                  </span>
                  <span className="font-titolo text-[17px] leading-tight text-abete">
                    {titolo}
                  </span>
                  <span className="text-[13px] leading-snug text-inchiostro/70">
                    {spiegazione}
                  </span>
                </button>
              ))}
            </div>
            {[
              {
                v: coppiaA,
                set: setCoppiaA,
                seconda: false,
                et:
                  motivo === "coppia"
                    ? "Prima persona"
                    : "Chi ha fatto il regalo",
                opzioni: membri,
              },
              {
                v: coppiaB,
                set: setCoppiaB,
                seconda: true,
                et:
                  motivo === "coppia" ? "Seconda persona" : "A chi l'ha fatto",
                // senza la prima persona e senza chi è già escluso con lei per lo stesso motivo (e verso)
                opzioni: membri.filter(
                  (m) =>
                    m.id !== coppiaA &&
                    !coppie.some((c) =>
                      motivo === "coppia"
                        ? c.reason === "coppia" &&
                          ((c.member_a === coppiaA && c.member_b === m.id) ||
                            (c.member_b === coppiaA && c.member_a === m.id))
                        : c.reason === "anno_scorso" &&
                          c.member_a === coppiaA &&
                          c.member_b === m.id,
                    ),
                ),
              },
            ].map((s) => (
              <label key={s.et} className="flex flex-col gap-2">
                <span className="font-medium">{s.et}</span>
                <span className="campo-cucito block">
                  <select
                    value={s.v}
                    disabled={s.seconda && !coppiaA}
                    onChange={(e) => {
                      s.set(e.target.value);
                      if (!s.seconda) setCoppiaB("");
                    }}
                    className="h-14 w-full appearance-none bg-transparent px-5 text-inchiostro outline-none"
                  >
                    <option value="">
                      {s.seconda && !coppiaA
                        ? "Prima scegli la persona sopra"
                        : "Scegli…"}
                    </option>
                    {s.opzioni.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            ))}
            <Tasto onClick={salvaCoppia} disabled={!coppiaA || !coppiaB}>
              Salva
            </Tasto>
          </div>
        )}
        {modificabile && !nuovaCoppia && (
          <div className="mt-5 flex items-center gap-3">
            <Tasto
              tipo="secondario"
              className="flex-1"
              onClick={() => setNuovaCoppia(true)}
            >
              Aggiungi
            </Tasto>
            <TastoTondo
              etichetta={togliCoppie ? "Fine" : "Togli una coppia"}
              icona={Icone.meno}
              disabled={coppie.length === 0}
              aria-pressed={togliCoppie}
              onClick={() => setTogliCoppie(!togliCoppie)}
            />
          </div>
        )}
      </Feltro>

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

      {/* Per andare alla pagina del gruppo (la tua bacheca, il tuo personaggio…) anche prima dell'estrazione */}
      <TastoLink href={`/gruppo/${id}`} tipo="secondario" className="mt-8">
        Vai alla pagina del gruppo
      </TastoLink>
    </main>
  );
}
