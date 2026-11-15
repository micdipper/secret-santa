"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Feltro, TastoLink, TitoloRiquadro } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";
import { leggiPortachiavi, passaAlGruppo, salvaAccessoCorrente } from "@/lib/portachiavi";

// Dentro un gruppo: tiene aggiornato il portachiavi del telefono con l'accesso di questo gruppo.
export function RegistraAccesso({ groupId, nome, invito }: { groupId: string; nome: string; invito?: string }) {
  useEffect(() => {
    const supabase = clientSoloBrowser();
    salvaAccessoCorrente(supabase, { groupId, nome, invito });
    // quando la sessione si rinnova, il gettone cambia: lo rimetto nel portachiavi
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "TOKEN_REFRESHED") salvaAccessoCorrente(supabase);
    });
    return () => data.subscription.unsubscribe();
  }, [groupId, nome, invito]);
  return null;
}

// Gruppo aperto con l'accesso di un altro gruppo (o senza accesso): se il telefono ha già la chiave
// di questo gruppo ci passo da solo, altrimenti spiego come entrare.
export function CambiaAccesso({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [stato, setStato] = useState<"provo" | "manca">("provo");
  const [invito, setInvito] = useState<string | undefined>();

  useEffect(() => {
    const supabase = clientSoloBrowser();
    // il portachiavi sta nel telefono: si legge solo qui, dopo l'apertura della pagina
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvito(leggiPortachiavi().find((c) => c.groupId === groupId)?.invito);
    passaAlGruppo(supabase, groupId).then((ok) => (ok ? router.refresh() : setStato("manca")));
  }, [groupId, router]);

  if (stato === "provo") return <main className="mx-auto w-full max-w-md px-5 pt-16 text-crema/80">Apro il gruppo…</main>;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-16 pb-16">
      <h1 className="font-titolo text-[32px] leading-none">Entra nel gruppo</h1>
      <Feltro className="mt-6">
        <TitoloRiquadro>Su questo telefono non sei ancora entrato</TitoloRiquadro>
        <p className="mt-2">
          Ogni gruppo ha un accesso suo, con la sua password. Apri il link d&apos;invito che ti ha mandato l&apos;organizzatore, tocca il tuo nome e
          scrivi la password che hai scelto per questo gruppo.
        </p>
        {invito && (
          <TastoLink href={`/invito/${invito}`} className="mt-5">
            Apri l&apos;invito
          </TastoLink>
        )}
      </Feltro>
      <TastoLink href="/" tipo="secondario" className="mt-4">
        Vai ai tuoi gruppi
      </TastoLink>
    </main>
  );
}
