"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ToppaAvatar, LOOK_BASE, type Look } from "@/components/avatar";
import { AvvisoDataVicina, dataTroppoVicina } from "@/components/avviso-data";
import { EditorPersonaggio } from "@/components/editor-personaggio";
import { CampoPassword } from "@/components/scelte";
import { Campo, Errore, Feltro, Icone, Tasto, TastoTondo, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { nuovaEmailFinta, passwordValida } from "@/lib/accesso";
import { giorniMancanti } from "@/lib/date";
import { salvaAccessoCorrente } from "@/lib/portachiavi";
import { AVVISO_POSTI_SOTTO, SITO_PIENO_ACCESSI, SITO_PIENO_GRUPPI, SITO_QUASI_PIENO, gruppoAlCompleto, leggiPosti, type Posti } from "@/lib/posti";
import { clientSoloBrowser } from "@/lib/supabase/client";

export default function NuovoGruppo() {
  const router = useRouter();
  const supabase = clientSoloBrowser();

  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [budget, setBudget] = useState(30);
  const [tema, setTema] = useState("");
  const [mioNome, setMioNome] = useState("");
  const [altri, setAltri] = useState<string[]>([]);
  const [nuovoNome, setNuovoNome] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [invio, setInvio] = useState(false);
  // ogni gruppo è a sé: personaggio nuovo, nessun premio, password nuova
  const [look, setLook] = useState<Look>(LOOK_BASE);
  const [avvisoData, setAvvisoData] = useState(false);
  const [giaEstratto, setGiaEstratto] = useState(false);
  const [posti, setPosti] = useState<Posti | null>(null); // posti liberi sul sito (ogni nome scritto ne occupa uno)

  useEffect(() => {
    leggiPosti(supabase).then(setPosti);
  }, [supabase]);

  function aggiungiNome() {
    const n = nuovoNome.trim();
    if (!n) return;
    const tutti = [mioNome, ...altri].map((x) => x.trim().toLowerCase());
    if (tutti.includes(n.toLowerCase())) {
      setErrore(`"${n}" è già nella lista.`);
      return;
    }
    // il gruppo nuovo occupa un posto per ogni nome, organizzatore compreso
    const dopo = altri.length + 2;
    if (posti && dopo > posti.persone_per_gruppo) return setErrore(gruppoAlCompleto(posti.persone_per_gruppo));
    if (posti && dopo > posti.posti_liberi) return setErrore(SITO_QUASI_PIENO);
    setAltri([...altri, n]);
    setNuovoNome("");
    setErrore("");
  }

  async function crea(ev?: React.FormEvent, senzaGiochi = false) {
    ev?.preventDefault();
    setErrore("");
    if (!nome.trim()) return setErrore("Dai un nome al gruppo.");
    if (!mioNome.trim()) return setErrore("Scrivi il tuo nome.");
    if (altri.length < 2) return setErrore("Servono almeno altre 2 persone oltre a te.");
    if (!passwordValida(password)) return setErrore("La password deve avere almeno 8 caratteri.");
    if (data && giorniMancanti(data)! < 0) return setErrore("Il giorno dello scambio è già passato: scegline un altro.");
    // data a meno di 6 giorni: prima si avvisa che i minigiochi non partirebbero
    if (dataTroppoVicina(data) && !senzaGiochi) return setAvvisoData(true);

    setInvio(true);
    // prima di creare l'accesso: c'è posto? (altrimenti resterebbe un accesso senza gruppo)
    const ora = await leggiPosti(supabase);
    setPosti(ora);
    if (ora?.accessi_pieni) {
      setInvio(false);
      return setErrore(SITO_PIENO_ACCESSI);
    }
    if (ora && ora.posti_liberi < altri.length + 1) {
      setInvio(false);
      return setErrore(ora.posti_liberi < 3 ? SITO_PIENO_GRUPPI : `Il sito è quasi al completo: restano ${ora.posti_liberi} posti. Togli qualche persona per creare il gruppo.`);
    }
    // ogni gruppo ha un accesso suo: quello di adesso (di un altro gruppo) resta nel portachiavi del telefono
    await salvaAccessoCorrente(supabase);
    const { error: errAccesso } = await supabase.auth.signUp({ email: nuovaEmailFinta(), password });
    if (errAccesso) {
      setInvio(false);
      return setErrore("Non riesco a creare il tuo accesso. Riprova tra un momento.");
    }
    const { data: risultato, error } = await supabase.rpc("create_group", {
      p_name: nome,
      p_budget_eur: budget,
      p_exchange_date: data || null,
      p_theme: tema,
      p_my_name: mioNome,
      p_my_avatar: null,
      p_other_names: altri,
    });
    if (error || !risultato?.[0]) {
      setInvio(false);
      return setErrore(
        error?.message?.includes("group_members_group_name_uidx")
          ? "Ci sono due nomi uguali nella lista: rendili diversi (es. con l'iniziale del cognome)."
          : error?.message?.includes("al completo")
            ? `${error.message}. Togli qualche persona e riprova.`
            : "Non sono riuscito a creare il gruppo. Riprova.",
      );
    }
    await supabase.rpc("save_avatar", { p_look: look });
    if (giaEstratto) await supabase.rpc("imposta_estrazione_fatta", { p_group_id: risultato[0].group_id, p_attiva: true });
    // prima il sondaggio, poi il link d'invito
    router.push(`/gruppo/${risultato[0].group_id}/sondaggio?nuovo=1`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro="/" etichettaIndietro="Torna alla pagina iniziale" titolo="Crea un gruppo" />

      <form onSubmit={crea} className="mt-6 flex flex-col gap-4">
        <Feltro>
          <TitoloRiquadro>Il gruppo</TitoloRiquadro>
          <div className="mt-5 flex flex-col gap-5">
            <Campo id="nome" etichetta="Come si chiama?" placeholder="Natale tra amici" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} />
            <Campo
              id="data"
              type="date"
              etichetta="Giorno dello scambio"
              value={data}
              onChange={(e) => setData(e.target.value)}
              aiuto="Puoi sceglierlo anche dopo. Con almeno 6 giorni di anticipo partono i minigiochi dell'avvento."
            />
            <div className="flex flex-col gap-2">
              <span className="font-medium">Budget a persona</span>
              <div className="flex items-center justify-between gap-3">
                <TastoTondo type="button" etichetta="Diminuisci il budget" icona={Icone.meno} disabled={budget <= 5} onClick={() => setBudget(budget - 5)} />
                <span className="font-titolo text-[32px] leading-none text-vermiglio">{budget} €</span>
                <TastoTondo type="button" etichetta="Aumenta il budget" icona={Icone.piu} onClick={() => setBudget(budget + 5)} />
              </div>
            </div>
            <Campo id="tema" etichetta="Tema (facoltativo)" placeholder="Regali fatti a mano" value={tema} onChange={(e) => setTema(e.target.value)} maxLength={200} />
          </div>
        </Feltro>

        <Feltro>
          <TitoloRiquadro>Tu</TitoloRiquadro>
          <p className="mt-2 text-sm text-inchiostro/70">Partecipi anche tu all&apos;estrazione, come gli altri.</p>
          <div className="mt-5 flex flex-col gap-5">
            <Campo id="mio-nome" etichetta="Il tuo nome" placeholder="Nome e cognome" value={mioNome} onChange={(e) => setMioNome(e.target.value)} maxLength={60} />
            <div>
              <p className="font-medium">Il tuo personaggio</p>
              <p className="text-sm text-inchiostro/70">Lo vedranno gli amici. Potrai cambiarlo quando vuoi.</p>
            </div>
            {/* resta in vista mentre scorri le scelte */}
            <div className="sticky top-[calc(env(safe-area-inset-top)+8px)] z-10 flex justify-center">
              <span className="rounded-full shadow-[0_8px_16px_-8px_rgba(0,0,0,.5)]">
              <ToppaAvatar look={look} dimensione={128} nome="Il tuo personaggio" />
            </span>
            </div>
            <EditorPersonaggio look={look} sbloccati={[]} onCambia={(campi) => setLook({ ...look, ...campi })} />
            <CampoPassword
              id="password"
              nuova
              etichetta="Scegli una password"
              valore={password}
              onCambia={setPassword}
              aiuto="Almeno 8 caratteri, solo per questo gruppo. Ti servirà per rientrare da un altro telefono: non dirla a nessuno."
            />
          </div>
        </Feltro>

        <Feltro>
          <TitoloRiquadro>Chi partecipa</TitoloRiquadro>
          <p className="mt-2 text-sm text-inchiostro/70">Scrivi i nomi veri: saranno quelli scritti sul biglietto.</p>
          {altri.length > 0 && (
            <ul className="mt-4 divide-y-2 divide-dashed divide-abete/15">
              {altri.map((n) => (
                <li key={n} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-medium">{n}</span>
                  <TastoTondo type="button" etichetta={`Togli ${n}`} icona={Icone.meno} onClick={() => setAltri(altri.filter((x) => x !== n))} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <Campo
                id="nuovo-nome"
                etichetta="Aggiungi una persona"
                placeholder="Nome e cognome"
                value={nuovoNome}
                onChange={(e) => setNuovoNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    aggiungiNome();
                  }
                }}
                maxLength={60}
              />
            </div>
            <TastoTondo type="button" etichetta="Aggiungi la persona" icona={Icone.piu} onClick={aggiungiNome} disabled={!nuovoNome.trim()} />
          </div>
          <p className="mt-3 text-sm text-inchiostro/70">
            {altri.length === 0 ? "Nessuno ancora." : `${altri.length + 1} persone, te compreso. Il − accanto a un nome lo toglie.`}
          </p>
          {posti && posti.posti_liberi - (altri.length + 1) <= AVVISO_POSTI_SOTTO && (
            <p className="mt-2 text-sm font-semibold text-vermiglio">
              Sul sito {posti.posti_liberi - (altri.length + 1) === 1 ? "resta 1 posto" : `restano ${Math.max(0, posti.posti_liberi - (altri.length + 1))} posti`} per altre persone.
            </p>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={giaEstratto}
            onClick={() => setGiaEstratto(!giaEstratto)}
            className="cucitura cliccabile stoffa-chiara relative mt-5 flex min-h-14 w-full items-center gap-4 rounded-[20px] px-5 py-3 text-left [--raggio:20px]"
          >
            <span className={`relative h-7 w-12 flex-none rounded-full transition-colors ${giaEstratto ? "bg-vermiglio" : "bg-abete/25"}`}>
              <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-[left] ${giaEstratto ? "left-6" : "left-1"}`} />
            </span>
            <span className="flex flex-col">
              <span className="font-titolo text-lg leading-tight text-abete">Abbiamo già fatto l&apos;estrazione</span>
              <span className="text-sm text-inchiostro/70">
                {giaEstratto ? "Ognuno, entrando, indicherà a chi fa il regalo. Lo saprà solo il sito." : "Altrimenti la fa il sito, quando ci sono tutti."}
              </span>
            </span>
          </button>
        </Feltro>

        <Errore>{errore}</Errore>
        <Tasto type="submit" disabled={invio}>
          {invio ? "Un momento…" : "Crea il gruppo"}
        </Tasto>
      </form>

      <AvvisoDataVicina
        aperto={avvisoData}
        onAltraData={() => {
          setAvvisoData(false);
          document.getElementById("data")?.focus();
        }}
        onContinua={() => {
          setAvvisoData(false);
          crea(undefined, true);
        }}
      />
    </main>
  );
}
