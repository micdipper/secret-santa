"use client";

import { useEffect, useState } from "react";
import { normalizzaLook } from "@/components/avatar";
import { AvvisoDataVicina, dataTroppoVicina } from "@/components/avviso-data";
import { Disponibilita, ProponiGiorni, type PersonaDisp } from "@/components/disponibilita";
import { Feltro, Tasto, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { dataLunga } from "@/lib/disponibilita";
import { NOMI_PROVA } from "@/lib/prove";

/*
  Sala prove della disponibilità: tu sei l'organizzatore, gli amici inventati rispondono e ogni tanto
  cambiano idea (così si vede la diretta). Si propongono i giorni, si risponde e si fissa la data. Non si salva niente.
*/
const IO = "io";
const PERSONE: PersonaDisp[] = [
  { memberId: IO, nome: "Tu", look: normalizzaLook(null, "tu-prova"), entrato: true },
  ...NOMI_PROVA.map((nome, i) => ({ memberId: `p${i}`, nome, look: i === 4 ? null : normalizzaLook(null, nome), entrato: i !== 4 })),
];
const traGiorni = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
const PROPOSTI = [9, 12, 13, 16].map(traGiorni);

export default function ProvaDisponibilita() {
  const [giorni, setGiorni] = useState<string[] | null>(PROPOSTI);
  const [risposte, setRisposte] = useState<Record<string, string[]>>({ p0: [PROPOSTI[1], PROPOSTI[2]], p1: [PROPOSTI[2]], p2: [] });
  const [salvataggio, setSalvataggio] = useState<"" | "salvo" | "salvato">("");
  const [fissata, setFissata] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);

  // ogni tanto un amico (non Anna, che non è ancora entrata) risponde o cambia idea
  useEffect(() => {
    if (!giorni) return;
    const t = setInterval(() => {
      const chi = `p${Math.floor(Math.random() * 4)}`;
      setRisposte((r) => ({ ...r, [chi]: giorni.filter(() => Math.random() < 0.5) }));
    }, 6000);
    return () => clearInterval(t);
  }, [giorni]);

  function fissa(g: string, senzaGiochi = false) {
    if (dataTroppoVicina(g) && !senzaGiochi) return setAvviso(g);
    setAvviso(null);
    setFissata(g);
    setGiorni(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna
        indietro="/prove"
        etichettaIndietro="Torna alla sala prove"
        contesto="Sala prove · sei l'organizzatore · niente viene salvato"
        titolo="Quando facciamo lo scambio?"
        sottotitolo="L'organizzatore ha proposto alcuni giorni: dite in quali ci siete."
      />
      <div className="mt-6 flex flex-col gap-4">
        {giorni ? (
          <>
            <Disponibilita
              giorni={giorni}
              persone={PERSONE}
              risposte={risposte}
              io={IO}
              organizzatore
              salvataggio={salvataggio}
              errore=""
              onCambia={(g) => {
                setRisposte((r) => ({ ...r, [IO]: g }));
                setSalvataggio("salvo");
                setTimeout(() => setSalvataggio("salvato"), 300);
              }}
              onFissa={(g) => fissa(g)}
            />
            <Feltro>
              <p className="text-sm text-inchiostro/70">Come in Organizza</p>
              <TitoloRiquadro className="mt-1">Giorni proposti</TitoloRiquadro>
              <div className="mt-4">
                <ProponiGiorni key={giorni.join()} iniziali={giorni} testoTasto="Aggiorna i giorni proposti" onSalva={setGiorni} />
              </div>
            </Feltro>
          </>
        ) : (
          <Feltro>
            <TitoloRiquadro>La data è fissata!</TitoloRiquadro>
            <p className="mt-2">Lo scambio è {fissata && dataLunga(fissata)}. Nel gruppo vero il sondaggio ora è chiuso e la data compare a tutti.</p>
            <Tasto
              className="mt-5"
              onClick={() => {
                setGiorni(PROPOSTI);
                setRisposte({});
              }}
            >
              Ricomincia la prova
            </Tasto>
          </Feltro>
        )}
      </div>
      <AvvisoDataVicina aperto={avviso !== null} onAltraData={() => setAvviso(null)} onContinua={() => avviso && fissa(avviso, true)} />
    </main>
  );
}
