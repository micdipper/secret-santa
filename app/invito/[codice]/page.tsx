"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ToppaAvatar, normalizzaLook } from "@/components/avatar";
import { CampoPassword } from "@/components/scelte";
import { Errore, Feltro, Tasto, TitoloRiquadro } from "@/components/ui";
import { nuovaEmailFinta, passwordValida } from "@/lib/accesso";
import { passaAlGruppo, salvaAccessoCorrente } from "@/lib/portachiavi";
import { SITO_PIENO_ACCESSI, leggiPosti } from "@/lib/posti";
import { clientSoloBrowser } from "@/lib/supabase/client";

type Posto = {
  group_id: string;
  group_name: string;
  group_status: string;
  member_id: string;
  display_name: string;
  look: unknown;
  claimed: boolean;
  login_email: string | null;
};

export default function Invito() {
  const { codice } = useParams<{ codice: string }>();
  const router = useRouter();
  const supabase = clientSoloBrowser();

  const [posti, setPosti] = useState<Posto[] | null>(null);
  const [mioId, setMioId] = useState<string | null>(null);
  const [scelto, setScelto] = useState<Posto | null>(null);
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [invio, setInvio] = useState(false);

  const carica = useCallback(async () => {
    const [{ data: sessione }, { data }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.rpc("get_lobby", { p_invite_code: codice }),
    ]);
    setMioId(sessione.session?.user.id ?? null);
    setPosti((data as Posto[]) ?? []);
  }, [supabase, codice]);

  useEffect(() => {
    // Carico i dati da Supabase all'apertura: lo stato si aggiorna dopo la risposta (non subito).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carica();
  }, [carica]);

  // Se sono già dentro questo gruppo (con l'accesso di adesso o con uno nel portachiavi del telefono),
  // vado direttamente alla sua pagina.
  useEffect(() => {
    if (!posti?.length) return;
    const gruppo = posti[0].group_id;
    (async () => {
      const { data } = mioId
        ? await supabase.from("group_members").select("id").eq("group_id", gruppo).eq("user_id", mioId).maybeSingle()
        : { data: null };
      if (data || (await passaAlGruppo(supabase, gruppo))) router.replace(`/gruppo/${gruppo}`);
    })();
  }, [posti, mioId, supabase, router]);

  if (posti === null) {
    return <main className="mx-auto w-full max-w-md px-5 pt-16 text-crema/80">Apro l&apos;invito…</main>;
  }
  if (posti.length === 0) {
    return (
      <main className="mx-auto w-full max-w-md px-5 pt-16">
        <h1 className="font-titolo text-[32px] leading-none">Invito non valido</h1>
        <p className="mt-3 text-crema/80">Questo link non porta a nessun gruppo. Chiedi all&apos;organizzatore di mandartelo di nuovo.</p>
      </main>
    );
  }

  const gruppo = posti[0];
  const aperto = gruppo.group_status === "aperto";

  async function entra() {
    if (!scelto) return;
    setErrore("");
    setInvio(true);
    // ogni gruppo ha un accesso suo: metto via quello di adesso (di un altro gruppo) nel portachiavi
    await salvaAccessoCorrente(supabase);

    if (scelto.claimed) {
      // Rientro: nome già preso da me in passato → password
      if (!password || !scelto.login_email) {
        setInvio(false);
        return setErrore("Scrivi la tua password.");
      }
      const { error } = await supabase.auth.signInWithPassword({ email: scelto.login_email, password });
      if (error) {
        setInvio(false);
        return setErrore("Password sbagliata. Se l'hai dimenticata, chiedi all'organizzatore di reimpostarla.");
      }
      return router.replace(`/gruppo/${gruppo.group_id}`);
    }

    // Primo ingresso: sempre un accesso nuovo, solo per questo gruppo, con la sua password
    if (!passwordValida(password)) {
      setInvio(false);
      return setErrore("La password deve avere almeno 8 caratteri.");
    }
    // tetto degli accessi: si controlla prima, così non resta un accesso senza gruppo
    if ((await leggiPosti(supabase))?.accessi_pieni) {
      setInvio(false);
      return setErrore(SITO_PIENO_ACCESSI);
    }
    const { error: errAccesso } = await supabase.auth.signUp({ email: nuovaEmailFinta(), password });
    if (errAccesso) {
      setInvio(false);
      return setErrore("Non riesco a creare il tuo accesso. Riprova tra un momento.");
    }
    const { error } = await supabase.rpc("claim_member", { p_invite_code: codice, p_member_id: scelto.member_id, p_avatar: null });
    if (error) {
      setInvio(false);
      await carica();
      return setErrore(error.message);
    }
    // Appena entrato: prima si veste il personaggio, poi si va al gruppo
    router.replace(`/gruppo/${gruppo.group_id}/guardaroba?nuovo=1`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-10 pb-16">
      <p className="text-sm text-crema/75">Sei stato invitato in</p>
      <h1 className="font-titolo text-[32px] leading-none">{gruppo.group_name}</h1>

      {!scelto ? (
        <Feltro className="mt-6">
          <TitoloRiquadro>Chi sei?</TitoloRiquadro>
          <p className="mt-2 text-sm text-inchiostro/70">
            {aperto ? "Tocca il tuo nome. Chi ha già il personaggio è entrato: se sei tu, ti chiederò la password." : "L'estrazione è già stata fatta: tocca il tuo nome per rientrare."}
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {posti.map((p) => {
              const disponibile = p.claimed || aperto;
              return (
                <li key={p.member_id}>
                  <button
                    type="button"
                    disabled={!disponibile}
                    onClick={() => {
                      setScelto(p);
                      setPassword("");
                      setErrore("");
                    }}
                    className="cucitura cliccabile stoffa-chiara relative flex h-14 w-full items-center gap-3 rounded-full pr-6 pl-2 text-left"
                  >
                    <ToppaAvatar look={p.claimed ? normalizzaLook(p.look, p.member_id) : null} dimensione={40} />
                    <span className="font-titolo text-lg text-abete">{p.display_name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Feltro>
      ) : (
        <Feltro className="mt-6">
          <TitoloRiquadro>{scelto.claimed ? `Bentornato, ${scelto.display_name}` : `Ciao, ${scelto.display_name}!`}</TitoloRiquadro>
          <div className="mt-5 flex flex-col gap-5">
            <CampoPassword
                id="password"
                nuova={!scelto.claimed}
                etichetta={scelto.claimed ? "La tua password" : "Scegli una password"}
                valore={password}
                onCambia={setPassword}
                aiuto={scelto.claimed ? undefined : "Almeno 8 caratteri, solo per questo gruppo. Ti servirà per rientrare da un altro telefono: non dirla a nessuno."}
            />
            <Errore>{errore}</Errore>
            <Tasto onClick={entra} disabled={invio}>
              {invio ? "Un momento…" : "Entra"}
            </Tasto>
          </div>
          <Tasto tipo="secondario" className="mt-3" onClick={() => setScelto(null)}>
            Non sono {scelto.display_name}
          </Tasto>
        </Feltro>
      )}
    </main>
  );
}
