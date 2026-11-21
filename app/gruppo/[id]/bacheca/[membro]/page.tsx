import { notFound } from "next/navigation";
import { Bacheca, type Elemento } from "@/components/bacheca";
import { SondaggioPerBacheca } from "@/components/sondaggio-totem";
import { FrancobolloTotem } from "@/components/totem";
import type { RigaPersonalizzata } from "@/components/toppe";
import { Feltro, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { utenteCollegato } from "@/lib/supabase/server";
import { descrizioneDi, type Profilo } from "@/lib/totem";

export const dynamic = "force-dynamic";

export default async function PaginaBacheca({ params }: { params: Promise<{ id: string; membro: string }> }) {
  const { id, membro } = await params;
  const { supabase, userId } = await utenteCollegato();
  if (!userId) return null; // il layout del gruppo pensa all'accesso

  const [{ data: gruppo }, { data: persona }, { data: elementi }, { data: toppeGruppo }, { data: risultati }, { data: totemGruppo }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("display_name, user_id, quiz_rifiutato_at").eq("id", membro).eq("group_id", id).maybeSingle(),
    supabase.from("moodboard_items").select("id, kind, content, x, y, width, rotation, z").eq("member_id", membro),
    supabase.from("group_toppe").select("id, tipo, ordine, contenuto, member_id").eq("group_id", id).order("ordine"),
    supabase.from("quiz_results").select("user_id, profilo").eq("group_id", id),
    supabase.from("quiz_totems").select("profilo, nome, descrizione, immagine").eq("group_id", id),
  ]);
  if (!gruppo) return null; // non è un mio gruppo: ci pensa il layout
  if (!persona) notFound();
  const mia = persona.user_id === userId;
  const nome = persona.display_name.split(" ")[0];

  // il totem di questa persona (se ha fatto il sondaggio)
  const risultato = persona.user_id ? risultati?.find((r) => r.user_id === persona.user_id) : undefined;
  const totem = (risultato && totemGruppo?.find((t) => t.profilo === risultato.profilo)) || null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-56">
      <TestataInterna
        indietro={`/gruppo/${id}`}
        etichettaIndietro={`Torna a ${gruppo.name}`}
        contesto={gruppo.name}
        titolo={mia ? "La tua bacheca" : `La bacheca di ${nome}`}
        sottotitolo={
          mia
            ? "Toppe, colori, foto e ricami che raccontano il tuo mood. La vede tutto il gruppo."
            : `Il mood di ${nome}: cerca qui l'ispirazione per il regalo.`
        }
      />

      {/* il totem, appuntato in cima alla bacheca */}
      {totem && (
        <div className="mt-6 flex items-center gap-4">
          <FrancobolloTotem profilo={totem.profilo as Profilo} immagine={totem.immagine} className="w-16 flex-none -rotate-3 drop-shadow-[0_4px_6px_rgba(0,0,0,.35)]" titolo={totem.nome} />
          <div>
            <p className="text-sm text-crema/75">{mia ? "Il tuo totem" : `Il totem di ${nome}`}</p>
            <p className="font-titolo text-2xl leading-tight text-senape">{totem.nome}</p>
            <p className="text-sm text-crema/85">{descrizioneDi({ profilo: totem.profilo as Profilo, descrizione: totem.descrizione })}</p>
          </div>
        </div>
      )}

      <div className="mt-6">
        {risultato ? (
          <Bacheca
            groupId={id}
            memberId={membro}
            modificabile={mia}
            iniziali={(elementi as Elemento[]) ?? []}
            totem={totem ? { profilo: totem.profilo as Profilo, nome: totem.nome, immagine: totem.immagine } : null}
            personalizzate={(toppeGruppo as RigaPersonalizzata[]) ?? []}
          />
        ) : mia ? (
          <SondaggioPerBacheca groupId={id} rifiutato={!!persona.quiz_rifiutato_at} />
        ) : (
          <Feltro>
            {persona.quiz_rifiutato_at ? (
              <>
                <TitoloRiquadro>Niente bacheca</TitoloRiquadro>
                <p className="mt-2">
                  {nome} si è rifiutat* di fare il sondaggio. Legittimo, non vuole essere profilat*.
                </p>
              </>
            ) : (
              <>
                <TitoloRiquadro>Ancora niente</TitoloRiquadro>
                <p className="mt-2">{nome} non ha ancora iniziato la sua bacheca.</p>
              </>
            )}
          </Feltro>
        )}
      </div>
    </main>
  );
}
