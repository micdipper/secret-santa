"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CampoPassword } from "@/components/scelte";
import { Errore, Feltro, Tasto, TitoloRiquadro } from "@/components/ui";
import { passwordValida } from "@/lib/accesso";
import { clientSoloBrowser } from "@/lib/supabase/client";

// Pagina aperta dal link usa-e-getta: la persona sceglie da sola la nuova password.
export default function Reimposta() {
  const { codice } = useParams<{ codice: string }>();
  const router = useRouter();
  const supabase = clientSoloBrowser();
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [invio, setInvio] = useState(false);

  async function salva() {
    setErrore("");
    if (!passwordValida(password)) return setErrore("La password deve avere almeno 8 caratteri.");
    setInvio(true);
    const { data, error } = await supabase.rpc("use_password_reset", { p_token: codice, p_password: password });
    if (error || !data?.[0]) {
      setInvio(false);
      return setErrore(error?.message ?? "Questo link non è più valido.");
    }
    // Entro subito con la nuova password
    await supabase.auth.signOut();
    const { error: errAccesso } = await supabase.auth.signInWithPassword({ email: data[0].login_email, password });
    if (errAccesso) {
      setInvio(false);
      return setErrore("Password cambiata, ma non sono riuscito a farti entrare: riprova dal link d'invito.");
    }
    router.replace(`/gruppo/${data[0].group_id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-10 pb-16">
      <h1 className="font-titolo text-[32px] leading-none">Nuova password</h1>
      <p className="mt-2 text-crema/80">L&apos;organizzatore ti ha mandato questo link: sceglila tu, nessun altro la vedrà.</p>
      <Feltro className="mt-6">
        <TitoloRiquadro>Scegli la nuova password</TitoloRiquadro>
        <div className="mt-5 flex flex-col gap-5">
          <CampoPassword id="password" nuova etichetta="Nuova password" valore={password} onCambia={setPassword} aiuto="Almeno 8 caratteri." />
          <Errore>{errore}</Errore>
          <Tasto onClick={salva} disabled={invio}>
            {invio ? "Un momento…" : "Salva ed entra"}
          </Tasto>
        </div>
      </Feltro>
    </main>
  );
}
