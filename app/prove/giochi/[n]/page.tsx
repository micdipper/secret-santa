"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizzaLook } from "@/components/avatar";
import { calcolaRighe, type Partita, type Persona } from "@/components/giochi/classifica";
import { PaginaGioco, type Avvio } from "@/components/giochi/pagina-gioco";
import { casuale } from "@/lib/giochi/base";
import { GIOCHI } from "@/lib/giochi/elenco";
import { useOraServer } from "@/lib/giochi/ora";
import { NOMI_PROVA } from "@/lib/prove";

/*
  Sala prove di un gioco: tentativi illimitati, nessun salvataggio.
  Classifica finta con 5 amici inventati che ogni tanto giocano "in diretta"
  (così si vede la classifica che si riordina).
*/
const IO = "io";
const PERSONE: Persona[] = [
  { memberId: IO, nome: "Tu", look: normalizzaLook(null, "tu-prova") },
  ...NOMI_PROVA.map((nome, i) => ({ memberId: `p${i}`, nome, look: normalizzaLook(null, nome) })),
];
const fa = (s: number) => new Date(Date.now() - s * 1000).toISOString();

function partiteFinte(n: number): Partita[] {
  const caso = casuale(n * 7919);
  return NOMI_PROVA.flatMap((_, i) => {
    const quante = (i + n) % 4; // 0..3 tentativi
    return Array.from({ length: quante }, (_, k) => ({ member_id: `p${i}`, score: 100 + Math.round(caso() * 22) * 10, started_at: fa(3600 - k * 600), finished_at: fa(3500 - k * 600 - i * 37) }));
  });
}

export default function ProvaGioco() {
  const n = Number(useParams<{ n: string }>().n);
  const info = GIOCHI[n - 1] ?? GIOCHI[0];
  const [partite, setPartite] = useState<Partita[]>(() => partiteFinte(info.n));
  const [aperto] = useState(() => {
    const mezzanotte = new Date();
    mezzanotte.setHours(24, 0, 0, 0);
    return { apre: Date.now() - 3600_000, chiude: mezzanotte.getTime() };
  });
  const ora = useOraServer(0);
  const giro = useRef(0);

  // ogni tanto un amico inventato gioca: "sta giocando…" e poi il punteggio
  useEffect(() => {
    const timer: ReturnType<typeof setTimeout>[] = [];
    const t = setInterval(() => {
      const i = giro.current++ % NOMI_PROVA.length;
      const id = `p${i}`;
      const inizio = new Date().toISOString();
      setPartite((p) => (p.filter((x) => x.member_id === id).length >= 3 ? p : [...p, { member_id: id, score: null, started_at: inizio, finished_at: null }]));
      timer.push(
        setTimeout(() => {
          const punti = 150 + Math.round(Math.random() * 22) * 10;
          setPartite((p) => p.map((x) => (x.member_id === id && x.started_at === inizio ? { ...x, score: punti, finished_at: new Date().toISOString() } : x)));
        }, 6000),
      );
    }, 11000);
    return () => {
      clearInterval(t);
      timer.forEach(clearTimeout);
    };
  }, []);

  const righe = useMemo(() => calcolaRighe(PERSONE, partite, ora, 30), [partite, ora]);
  const mie = partite.filter((p) => p.member_id === IO).length;

  async function avvia(): Promise<Avvio> {
    const inizio = new Date().toISOString();
    setPartite((p) => [...p, { member_id: IO, score: null, started_at: inizio, finished_at: null }]);
    return {
      seme: Math.floor(Math.random() * 2147483646),
      fine: async (punteggio) => {
        let esito = { punteggio, record: false, posizione: null as number | null, rimasti: null, valida: true };
        setPartite((p) => {
          const prima = Math.max(0, ...p.filter((x) => x.member_id === IO && x.score !== null).map((x) => x.score!));
          const dopo = p.map((x) => (x.member_id === IO && x.started_at === inizio ? { ...x, score: punteggio, finished_at: new Date().toISOString() } : x));
          const migliore = Math.max(prima, punteggio);
          const altri = calcolaRighe(PERSONE, dopo, Date.now(), 30).filter((r) => r.memberId !== IO && (r.migliore ?? 0) > migliore).length;
          esito = { ...esito, record: punteggio > prima, posizione: altri + 1 };
          return dopo;
        });
        await new Promise((r) => setTimeout(r, 300)); // come se parlasse col server
        return esito;
      },
    };
  }

  if (!ora) return <main className="flex-1" />;
  return (
    <PaginaGioco
      info={info}
      contesto={`Sala prove · gioco ${info.n} di 5 · tentativi illimitati`}
      indietro="/prove/giochi"
      etichettaIndietro="Torna al calendario di prova"
      apre={aperto.apre}
      chiude={aperto.chiude}
      ora={ora}
      deciso={false}
      righe={righe}
      io={IO}
      mieiTentativi={mie}
      illimitati
      avvia={avvia}
    />
  );
}
