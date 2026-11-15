"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";
import { ToppaAvatar } from "@/components/avatar";
import { Classifica, Pallini, posizioni, type Riga } from "@/components/giochi/classifica";
import { Partita, type Esito } from "@/components/giochi/partita";
import { Errore, Feltro, Tasto, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { TENTATIVI, type InfoGioco } from "@/lib/giochi/elenco";
import { durataBreve, giornoGioco, statoDa } from "@/lib/giochi/ora";
import { suoni } from "@/lib/suoni";

export type Avvio = { seme: number; fine: (punteggio: number, stats: Record<string, number> | null) => Promise<Esito> } | { errore: string };

/*
  Pagina di un gioco (vera o sala prove): regole, tentativi, "Gioca", partita a tutto schermo,
  classifica in diretta; dopo la chiusura il vincitore.
  I dati arrivano da chi la usa: qui si disegna e basta.
*/
export function PaginaGioco({
  info,
  contesto,
  indietro,
  etichettaIndietro,
  apre,
  chiude,
  ora,
  deciso,
  vincitoreId,
  righe,
  io,
  mieiTentativi,
  illimitati = false,
  avvia,
}: {
  info: InfoGioco;
  contesto: string;
  indietro: string;
  etichettaIndietro: string;
  apre: number;
  chiude: number;
  ora: number; // ora del server
  deciso: boolean; // chiuso e senza partite ancora in corso: il vincitore è definitivo
  vincitoreId?: string | null; // dal database (se manca lo calcolo dalla classifica: sala prove)
  righe: Riga[];
  io: string | null;
  mieiTentativi: number;
  illimitati?: boolean; // sala prove
  avvia: () => Promise<Avvio>;
}) {
  const stato = statoDa(apre, chiude, ora);
  const [partita, setPartita] = useState<{ seme: number; fine: Extract<Avvio, { seme: number }>["fine"]; n: number } | null>(null);
  const [errore, setErrore] = useState("");
  const avviando = useRef(false);
  const rimasti = TENTATIVI - mieiTentativi;

  async function gioca() {
    if (avviando.current) return;
    avviando.current = true;
    setErrore("");
    const r = await avvia().catch(() => ({ errore: "Non riesco a iniziare la partita: controlla la connessione." }));
    avviando.current = false;
    if ("errore" in r) {
      setPartita(null);
      setErrore(r.errore);
      return;
    }
    setPartita((p) => ({ seme: r.seme, fine: r.fine, n: (p?.n ?? 0) + 1 }));
  }

  // coriandoli quando salgo al primo posto
  const pos = io ? posizioni(righe)[io] : null;
  const posPrima = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (posPrima.current !== undefined && pos === 1 && posPrima.current !== 1 && !partita) {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.55 }, colors: ["#e5481e", "#e9a81c", "#f3e8cf", "#2c4a32"] });
      suoni.fanfara();
    }
    if (!partita) posPrima.current = pos;
  }, [pos, partita]);

  const vincitore = !deciso ? undefined : vincitoreId !== undefined ? righe.find((r) => r.memberId === vincitoreId) : righe.find((r) => (r.migliore ?? 0) > 0);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <TestataInterna indietro={indietro} etichettaIndietro={etichettaIndietro} contesto={contesto} titolo={info.nome} />

      <Feltro className="mt-6">
        {stato === "bloccato" && (
          <>
            <TitoloRiquadro>Si apre tra {durataBreve(apre - ora)}</TitoloRiquadro>
            <p className="mt-2">
              Si gioca {giornoGioco(apre)}, da mezzanotte a mezzanotte. In palio: <strong>{info.nomePremio}</strong>.
            </p>
          </>
        )}

        {stato === "aperto" && (
          <>
            <p>{info.storia}</p>
            <p className="mt-4 text-sm text-inchiostro/80">
              In palio per chi vince: <strong>{info.nomePremio}</strong>. Chiude tra {durataBreve(chiude - ora)}.
            </p>
            {!illimitati && (
              <div className="mt-4 flex items-center gap-3 text-abete">
                <Pallini usati={mieiTentativi} />
                <span className="text-sm text-inchiostro/80">Ogni partita iniziata conta come tentativo.</span>
              </div>
            )}
            <div className="mt-5 flex flex-col gap-3">
              <Errore>{errore}</Errore>
              {illimitati || rimasti > 0 ? (
                <Tasto onClick={gioca}>{mieiTentativi === 0 || illimitati ? "Gioca" : `Riprova (${rimasti} ${rimasti === 1 ? "rimasto" : "rimasti"})`}</Tasto>
              ) : (
                <p className="font-medium text-abete">Hai usato i {TENTATIVI} tentativi: ora fai il tifo dalla classifica.</p>
              )}
            </div>
          </>
        )}

        {stato === "chiuso" &&
          (!deciso ? (
            <>
              <TitoloRiquadro>Gioco chiuso</TitoloRiquadro>
              <p className="mt-2">Aspetto che finisca chi sta ancora giocando l&apos;ultima partita…</p>
            </>
          ) : vincitore ? (
            <div className="flex items-center gap-4">
              <ToppaAvatar look={vincitore.look} dimensione={72} nome={vincitore.nome} />
              <div className="min-w-0">
                <p className="text-sm text-inchiostro/70">Ha vinto</p>
                <TitoloRiquadro>{vincitore.nome}</TitoloRiquadro>
                <p className="text-sm text-inchiostro/80">
                  {vincitore.migliore} punti · premio: <strong>{info.nomePremio}</strong>
                </p>
              </div>
            </div>
          ) : (
            <>
              <TitoloRiquadro>Nessun vincitore</TitoloRiquadro>
              <p className="mt-2">Nessuno ha fatto punti: il premio resta nel sacco.</p>
            </>
          ))}
      </Feltro>

      <section className="mt-8">
        <div className="flex items-center gap-2">
          <h2 className="font-titolo text-2xl">Classifica</h2>
          {stato === "aperto" && (
            <span className="ml-auto flex items-center gap-2 text-sm text-crema/80">
              <span className="size-2 animate-pulse rounded-full bg-vermiglio" /> in diretta
            </span>
          )}
        </div>
        <div className="mt-4">
          <Classifica righe={righe} io={io} />
        </div>
      </section>

      {partita && (
        <Partita
          key={partita.n}
          info={info}
          seme={partita.seme}
          onFine={partita.fine}
          onRiprova={gioca}
          onChiudi={() => setPartita(null)}
        />
      )}
    </main>
  );
}
