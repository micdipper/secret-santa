"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CampoPin, ScegliEmoji } from "@/components/scelte";
import { Errore, Feltro, Tasto, TitoloRiquadro, Toppa } from "@/components/ui";
import { nuovaEmailFinta, passwordDaPin, pinValido } from "@/lib/accesso";
import { clientSoloBrowser } from "@/lib/supabase/client";

type Posto = {
  group_id: string;
  group_name: string;
  group_status: string;
  member_id: string;
  display_name: string;
  avatar: string | null;
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
  const [emoji, setEmoji] = useState("🦊");
  const [pin, setPin] = useState("");
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

  // Se sono già dentro questo gruppo, vado direttamente alla sua pagina.
  useEffect(() => {
    if (!posti?.length || !mioId) return;
    supabase
      .from("group_members")
      .select("id")
      .eq("group_id", posti[0].group_id)
      .eq("user_id", mioId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) router.replace(`/gruppo/${posti[0].group_id}`);
      });
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

    if (scelto.claimed) {
      // Rientro: nome già preso da me in passato → PIN
      if (!pinValido(pin) || !scelto.login_email) {
        setInvio(false);
        return setErrore("Scrivi il tuo PIN di 4 cifre.");
      }
      const { error } = await supabase.auth.signInWithPassword({ email: scelto.login_email, password: passwordDaPin(pin) });
      if (error) {
        setInvio(false);
        return setErrore("PIN sbagliato. Se l'hai dimenticato, chiedi all'organizzatore di reimpostarlo.");
      }
      return router.replace(`/gruppo/${gruppo.group_id}`);
    }

    // Primo ingresso: se non ho ancora un accesso, lo creo con il PIN
    if (!mioId) {
      if (!pinValido(pin)) {
        setInvio(false);
        return setErrore("Il PIN deve avere 4 cifre.");
      }
      const { error } = await supabase.auth.signUp({ email: nuovaEmailFinta(), password: passwordDaPin(pin) });
      if (error) {
        setInvio(false);
        return setErrore("Non riesco a creare il tuo accesso. Riprova tra un momento.");
      }
    }
    const { error } = await supabase.rpc("claim_member", { p_invite_code: codice, p_member_id: scelto.member_id, p_avatar: emoji });
    if (error) {
      setInvio(false);
      await carica();
      return setErrore(error.message);
    }
    router.replace(`/gruppo/${gruppo.group_id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-10 pb-16">
      <p className="text-sm text-crema/75">Sei stato invitato in</p>
      <h1 className="font-titolo text-[32px] leading-none">{gruppo.group_name}</h1>

      {!scelto ? (
        <Feltro className="mt-6">
          <TitoloRiquadro>Chi sei?</TitoloRiquadro>
          <p className="mt-2 text-sm text-inchiostro/70">
            {aperto ? "Tocca il tuo nome. Chi ha già l'emoji è entrato: se sei tu, ti chiederò il PIN." : "L'estrazione è già stata fatta: tocca il tuo nome per rientrare."}
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
                      setPin("");
                      setErrore("");
                    }}
                    className="cucitura cliccabile stoffa-chiara relative flex h-14 w-full items-center gap-3 rounded-full pr-6 pl-2 text-left"
                  >
                    <Toppa emoji={p.avatar ?? "·"} dimensione={40} />
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
            {!scelto.claimed && <ScegliEmoji valore={emoji} onCambia={setEmoji} />}
            {(scelto.claimed || !mioId) && (
              <CampoPin
                id="pin"
                etichetta={scelto.claimed ? "Il tuo PIN" : "Scegli un PIN di 4 cifre"}
                valore={pin}
                onCambia={setPin}
                aiuto={scelto.claimed ? undefined : "Ti servirà per rientrare da un altro telefono. Non dirlo a nessuno."}
              />
            )}
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
