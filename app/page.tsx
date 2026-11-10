import Link from "next/link";
import { Stellina } from "@/components/ornamenti";
import { Feltro, Icone, TastoLink, TitoloRiquadro } from "@/components/ui";
import { utenteCollegato } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Riga = { id: string; groups: { id: string; name: string; status: string } | null };

export default async function Home() {
  const { supabase, userId } = await utenteCollegato();

  let gruppi: Riga[] = [];
  if (userId) {
    const { data } = await supabase.from("group_members").select("id, groups(id, name, status)").eq("user_id", userId).order("joined_at", { ascending: false });
    gruppi = (data as unknown as Riga[]) ?? [];
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-10 pb-16">
      <header className="relative">
        <Stellina className="absolute -top-2 right-2 size-8 text-senape" />
        <h1 className="pr-16 font-titolo text-[32px] leading-none">Secret Santa</h1>
        <p className="mt-2 pr-16 text-crema/80">Il Babbo Natale segreto tra amici, con la bacheca di ognuno.</p>
      </header>

      {gruppi.length > 0 && (
        <section className="mt-8">
          <h2 className="font-titolo text-2xl">I tuoi gruppi</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {gruppi.map((g) =>
              g.groups ? (
                <li key={g.id}>
                  <Link href={`/gruppo/${g.groups.id}`} className="feltro cliccabile flex items-center gap-4 p-4 pl-5">
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate font-titolo text-lg text-abete">{g.groups.name}</span>
                      <span className="block text-sm text-inchiostro/70">
                        {g.groups.status === "aperto" ? "In attesa dell'estrazione" : "Estrazione fatta"}
                      </span>
                    </span>
                    <span className="relative mr-2 text-abete [&_svg]:size-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.4]">
                      {Icone.avanti}
                    </span>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}

      <Feltro className="mt-8">
        <TitoloRiquadro>{gruppi.length > 0 ? "Un nuovo gruppo?" : "Organizza il tuo"}</TitoloRiquadro>
        <p className="mt-2">Scegli data e budget, scrivi i nomi degli amici e mandagli il link.</p>
        <TastoLink href="/nuovo" className="mt-5">
          Crea un gruppo
        </TastoLink>
      </Feltro>

      {gruppi.length === 0 && (
        <p className="mt-6 text-sm text-crema/75">Hai ricevuto un link da un amico? Aprilo per entrare nel suo gruppo.</p>
      )}
    </main>
  );
}
