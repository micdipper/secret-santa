"use client";

import type { ReactNode } from "react";
import {
  ACCESSORI,
  Avatar,
  COLORI_CAPELLI,
  ESCLUSIVI,
  OCCHIALI_VELOCI,
  MAGLIONI,
  NOMI_BARBA,
  NOMI_CAPELLI,
  NOMI_CUCITURE,
  premioCucitura,
  NOMI_OCCHIALI,
  PELLI,
  PREMI_COLORI,
  PREMI_MAGLIONI,
  PREMI_TAGLI,
  ToppaAvatar,
  type Look,
} from "@/components/avatar";
import { Feltro, TitoloRiquadro } from "@/components/ui";

/*
  Le scelte del personaggio. Usato in due posti:
  - pagina "Il tuo personaggio" (ogni parte nel suo riquadro, con i premi sbloccati);
  - "Crea un gruppo", dentro il riquadro "Tu" (parti una sotto l'altra).
  I premi (tagli Super ed Esplosione, colori olografico e neon, maglione GODO, accessori) compaiono SOLO quando sono sbloccati.
  Ogni scelta tiene il suo numero (i), anche quando quelle prima sono nascoste.
*/
const visibili = <T,>(lista: T[], premi: Record<number, string>, sbloccati: string[]) =>
  lista.flatMap((v, i) => (premi[i] && !sbloccati.includes(premi[i]) ? [] : [{ v, i }]));
export function EditorPersonaggio({
  look,
  sbloccati,
  onCambia,
  riquadri = false,
}: {
  look: Look;
  sbloccati: string[];
  onCambia: (campi: Partial<Look>) => void;
  riquadri?: boolean;
}) {
  // i tagli premio sempre in fondo (anche se i tagli nuovi hanno un numero più alto)
  const tagli = visibili(NOMI_CAPELLI, PREMI_TAGLI, sbloccati).sort((a, b) => (PREMI_TAGLI[a.i] ? 1 : 0) - (PREMI_TAGLI[b.i] ? 1 : 0));
  const colori = visibili(COLORI_CAPELLI, PREMI_COLORI, sbloccati);
  const maglioni = visibili(MAGLIONI, PREMI_MAGLIONI, sbloccati);
  const premi = ACCESSORI.filter((a) => sbloccati.includes(a.id));

  const parte = ({ titolo, children }: { titolo: string; children: ReactNode }) =>
    riquadri ? (
      <Feltro>
        <TitoloRiquadro>{titolo}</TitoloRiquadro>
        {children}
      </Feltro>
    ) : (
      <div>
        <p className="font-medium">{titolo}</p>
        {children}
      </div>
    );

  // Lupetto, collana e calendario si escludono a vicenda; il resto si somma.
  function indossa(id: string) {
    if (look.accessori.includes(id)) return onCambia({ accessori: look.accessori.filter((a) => a !== id) });
    const gruppo = [ESCLUSIVI, OCCHIALI_VELOCI].find((g) => g.includes(id));
    const altri = gruppo ? look.accessori.filter((a) => !gruppo.includes(a)) : look.accessori;
    onCambia({ accessori: [...altri, id] });
  }

  return (
    <div className="flex flex-col gap-4">
      {parte({
        titolo: "Pelle",
        children: <Campioni colori={PELLI.map((v, i) => ({ v, i }))} scelto={look.pelle} nome="Pelle" onScegli={(pelle) => onCambia({ pelle })} />,
      })}

      {parte({
        titolo: "Capelli",
        children: (
          <>
            <Griglia nomi={tagli} scelto={look.capelli} anteprima={(i) => ({ ...look, capelli: i, accessori: [] })} onScegli={(capelli) => onCambia({ capelli })} />
            <p className="mt-5 font-medium">Colore</p>
            <Campioni colori={colori} scelto={look.coloreCapelli} nome="Colore dei capelli" onScegli={(coloreCapelli) => onCambia({ coloreCapelli })} />
          </>
        ),
      })}

      {parte({
        titolo: "Barba e baffi",
        children: (
          <Griglia nomi={NOMI_BARBA.map((v, i) => ({ v, i }))} scelto={look.barba} anteprima={(i) => ({ ...look, barba: i, accessori: [] })} onScegli={(barba) => onCambia({ barba })} />
        ),
      })}

      {parte({
        titolo: "Occhiali",
        children: (
          <Griglia
            nomi={NOMI_OCCHIALI.map((v, i) => ({ v, i }))}
            scelto={look.occhiali}
            anteprima={(i) => ({ ...look, occhiali: i, accessori: [] })}
            onScegli={(occhiali) => onCambia({ occhiali })}
          />
        ),
      })}

      {parte({
        titolo: "Maglione",
        children: <Campioni colori={maglioni} scelto={look.maglione} nome="Maglione" onScegli={(maglione) => onCambia({ maglione })} />,
      })}

      {(sbloccati.includes("cuciture") || sbloccati.includes("cornici")) &&
        parte({
          titolo: "Cucitura della toppa",
          children: (
            <div role="radiogroup" aria-label="Cucitura della toppa" className="mt-4 grid grid-cols-3 gap-3">
              {NOMI_CUCITURE.map((nome, i) => {
                const premio = premioCucitura(i);
                if (premio && !sbloccati.includes(premio)) return null; // compaiono solo quando sbloccate
                return (
                <button
                  key={nome}
                  type="button"
                  role="radio"
                  aria-checked={(look.cucitura ?? 0) === i}
                  onClick={() => onCambia({ cucitura: i })}
                  className={`cliccabile stoffa-chiara flex flex-col items-center gap-1 rounded-[20px] p-2 text-sm text-inchiostro ${(look.cucitura ?? 0) === i ? "outline-3 outline-offset-2 outline-vermiglio" : ""}`}
                >
                  <ToppaAvatar look={{ ...look, cucitura: i }} dimensione={64} />
                  {nome}
                </button>
                );
              })}
            </div>
          ),
        })}

      {premi.length > 0 &&
        parte({
          titolo: "I tuoi premi",
          children: (
            <ul className="mt-4 flex flex-col gap-3">
              {premi.map((a) => {
                const indossato = look.accessori.includes(a.id);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      aria-pressed={indossato}
                      onClick={() => indossa(a.id)}
                      className={`cliccabile stoffa-chiara flex w-full items-center gap-3 rounded-[20px] p-2 pr-4 text-left ${
                        indossato ? "outline-3 outline-offset-2 outline-vermiglio" : ""
                      }`}
                    >
                      <span className="toppa size-14 flex-none overflow-hidden">
                        <Avatar look={{ ...look, accessori: [a.id] }} className="relative top-[8%] h-full w-full" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-titolo text-lg leading-tight">{a.nome}</span>
                        <span className="block text-sm text-inchiostro/70">{indossato ? "Lo indossi" : "Tocca per indossarlo"}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ),
        })}
    </div>
  );
}

// Griglia di scelte con l'anteprima del personaggio; quella scelta è cerchiata.
function Griglia({
  nomi,
  scelto,
  anteprima,
  onScegli,
}: {
  nomi: { v: string; i: number }[];
  scelto: number;
  anteprima: (i: number) => Look;
  onScegli: (i: number) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      {nomi.map(({ v: n, i }) => (
        <button
          key={n}
          type="button"
          aria-pressed={scelto === i}
          onClick={() => onScegli(i)}
          className={`cliccabile stoffa-chiara flex flex-col items-center gap-1 rounded-[20px] py-2 ${scelto === i ? "outline-3 outline-offset-2 outline-vermiglio" : ""}`}
        >
          <span className="toppa size-14 overflow-hidden">
            <Avatar look={anteprima(i)} className="relative top-[8%] h-full w-full" />
          </span>
          <span className="text-center text-sm leading-tight">{n}</span>
        </button>
      ))}
    </div>
  );
}

// Campioni di colore: ognuno è un bottone tondo di stoffa; quello scelto è cerchiato.
function Campioni({ colori, scelto, nome, onScegli }: { colori: { v: string; i: number }[]; scelto: number; nome: string; onScegli: (i: number) => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {colori.map(({ v: c, i }) => {
        const olo = c.startsWith("url(");
        const neon = c === "#ff2bd6";
        const godo = c === "#f6efdd";
        const fondo = olo
          ? { backgroundImage: "linear-gradient(135deg,#ff4fae,#2fb8ff,#8a5cff,#ffc92e,#1fd69a)" }
          : neon
            ? { backgroundImage: "radial-gradient(circle, #ffd6f7 0%, #ff6be3 35%, #ff2bd6 70%)" }
            : { backgroundColor: c };
        return (
          <button
            key={c}
            type="button"
            aria-label={olo ? `${nome} olografico` : c === "#ff2bd6" ? `${nome} neon` : c === "#f6efdd" ? `${nome} GODO` : `${nome} ${i + 1}`}
            aria-pressed={scelto === i}
            onClick={() => onScegli(i)}
            className={`cliccabile flex size-12 items-center justify-center rounded-full ${olo ? "capelli-olografici" : ""} ${scelto === i ? "outline-3 outline-offset-2 outline-vermiglio" : ""}`}
            style={{ ...fondo, ["--spessore" as string]: "rgb(0 0 0 / 0.3)" }}
          >
            {godo && <span className="font-titolo text-[11px] leading-none text-vermiglio">GODO</span>}
          </button>
        );
      })}
    </div>
  );
}
