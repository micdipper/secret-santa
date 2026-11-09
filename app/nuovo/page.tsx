"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CampoPassword, ScegliEmoji } from "@/components/scelte";
import { Campo, Errore, Feltro, Icone, Tasto, TastoTondo, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { nuovaEmailFinta, passwordValida } from "@/lib/accesso";
import { clientSoloBrowser } from "@/lib/supabase/client";

export default function NuovoGruppo() {
  const router = useRouter();
  const supabase = clientSoloBrowser();

  const [collegato, setCollegato] = useState(false);
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [budget, setBudget] = useState(30);
  const [tema, setTema] = useState("");
  const [mioNome, setMioNome] = useState("");
  const [emoji, setEmoji] = useState("🦊");
  const [altri, setAltri] = useState<string[]>([]);
  const [nuovoNome, setNuovoNome] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [invio, setInvio] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCollegato(!!data.session));
  }, [supabase]);

  function aggiungiNome() {
    const n = nuovoNome.trim();
    if (!n) return;
    const tutti = [mioNome, ...altri].map((x) => x.trim().toLowerCase());
    if (tutti.includes(n.toLowerCase())) {
      setErrore(`"${n}" è già nella lista.`);
      return;
    }
    setAltri([...altri, n]);
    setNuovoNome("");
    setErrore("");
  }

  async function crea(ev: React.FormEvent) {
    ev.preventDefault();
    setErrore("");
    if (!nome.trim()) return setErrore("Dai un nome al gruppo.");
    if (!mioNome.trim()) return setErrore("Scrivi il tuo nome.");
    if (altri.length < 2) return setErrore("Servono almeno altre 2 persone oltre a te.");
    if (!collegato && !passwordValida(password)) return setErrore("La password deve avere almeno 8 caratteri.");

    setInvio(true);
    if (!collegato) {
      const { error } = await supabase.auth.signUp({ email: nuovaEmailFinta(), password });
      if (error) {
        setInvio(false);
        return setErrore("Non riesco a creare il tuo accesso. Riprova tra un momento.");
      }
    }
    const { data: risultato, error } = await supabase.rpc("create_group", {
      p_name: nome,
      p_budget_eur: budget,
      p_exchange_date: data || null,
      p_theme: tema,
      p_my_name: mioNome,
      p_my_avatar: emoji,
      p_other_names: altri,
    });
    if (error || !risultato?.[0]) {
      setInvio(false);
      return setErrore(
        error?.message?.includes("group_members_group_name_uidx")
          ? "Ci sono due nomi uguali nella lista: rendili diversi (es. con l'iniziale del cognome)."
          : "Non sono riuscito a creare il gruppo. Riprova.",
      );
    }
    router.push(`/gruppo/${risultato[0].group_id}/organizza?nuovo=1`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro="/" etichettaIndietro="Torna alla pagina iniziale" titolo="Crea un gruppo" />

      <form onSubmit={crea} className="mt-6 flex flex-col gap-4">
        <Feltro>
          <TitoloRiquadro>Il gruppo</TitoloRiquadro>
          <div className="mt-5 flex flex-col gap-5">
            <Campo id="nome" etichetta="Come si chiama?" placeholder="Natale tra amici" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} />
            <Campo id="data" type="date" etichetta="Giorno dello scambio" value={data} onChange={(e) => setData(e.target.value)} />
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
            <ScegliEmoji valore={emoji} onCambia={setEmoji} />
            {!collegato && (
              <CampoPassword id="password" nuova etichetta="Scegli una password" valore={password} onCambia={setPassword} aiuto="Almeno 8 caratteri. Ti servirà per rientrare da un altro telefono: non dirla a nessuno." />
            )}
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
        </Feltro>

        <Errore>{errore}</Errore>
        <Tasto type="submit" disabled={invio}>
          {invio ? "Un momento…" : "Crea il gruppo"}
        </Tasto>
      </form>
    </main>
  );
}
