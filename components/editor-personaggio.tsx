"use client";

import type { ReactNode } from "react";
import {
  ACCESSORI,
  Avatar,
  CAPELLI_SUPER,
  COLORE_OLOGRAFICO,
  COLORI_CAPELLI,
  COME_SBLOCCARE_OLOGRAFICO,
  COME_SBLOCCARE_SUPER,
  MAGLIONI,
  NOMI_BARBA,
  NOMI_CAPELLI,
  NOMI_OCCHIALI,
  PELLI,
  type Look,
} from "@/components/avatar";
import { Feltro, TitoloRiquadro } from "@/components/ui";

/*
  Le scelte del personaggio. Usato in due posti:
  - pagina "Il tuo personaggio" (ogni parte nel suo riquadro, con gli accessori);
  - "Crea un gruppo", dentro il riquadro "Tu" (parti una sotto l'altra, senza accessori).
*/
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
  const superOk = sbloccati.includes("super");
  const oloOk = sbloccati.includes("olografico");

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

  return (
    <div className="flex flex-col gap-4">
      {parte({
        titolo: "Pelle",
        children: <Campioni colori={PELLI} scelto={look.pelle} nome="Pelle" onScegli={(pelle) => onCambia({ pelle })} />,
      })}

      {parte({
        titolo: "Capelli",
        children: (
          <>
            <Griglia
              nomi={NOMI_CAPELLI}
              scelto={look.capelli}
              bloccato={(i) => i === CAPELLI_SUPER && !superOk}
              anteprima={(i) => ({ ...look, capelli: i, accessori: [] })}
              onScegli={(capelli) => onCambia({ capelli })}
            />
            {!superOk && <p className="mt-3 text-sm text-inchiostro/70">Super è un premio: {COME_SBLOCCARE_SUPER.toLowerCase()}</p>}
            <p className="mt-5 font-medium">Colore</p>
            <Campioni
              colori={COLORI_CAPELLI}
              scelto={look.coloreCapelli}
              nome="Colore dei capelli"
              bloccato={(i) => i === COLORE_OLOGRAFICO && !oloOk}
              onScegli={(coloreCapelli) => onCambia({ coloreCapelli })}
            />
            {!oloOk && <p className="mt-3 text-sm text-inchiostro/70">L&apos;olografico è un premio: {COME_SBLOCCARE_OLOGRAFICO.toLowerCase()}</p>}
          </>
        ),
      })}

      {parte({
        titolo: "Barba e baffi",
        children: (
          <Griglia nomi={NOMI_BARBA} scelto={look.barba} anteprima={(i) => ({ ...look, barba: i, accessori: [] })} onScegli={(barba) => onCambia({ barba })} />
        ),
      })}

      {parte({
        titolo: "Occhiali",
        children: (
          <Griglia
            nomi={NOMI_OCCHIALI}
            scelto={look.occhiali}
            anteprima={(i) => ({ ...look, occhiali: i, accessori: [] })}
            onScegli={(occhiali) => onCambia({ occhiali })}
          />
        ),
      })}

      {parte({
        titolo: "Maglione",
        children: <Campioni colori={MAGLIONI} scelto={look.maglione} nome="Maglione" onScegli={(maglione) => onCambia({ maglione })} />,
      })}

      {riquadri && (
        <Feltro>
          <TitoloRiquadro>Accessori</TitoloRiquadro>
          <p className="mt-2 text-sm text-inchiostro/70">Si sbloccano solo facendo le cose. Se ne indossa uno alla volta: tocca quello che vuoi mettere.</p>
          <ul className="mt-4 flex flex-col gap-3">
            {ACCESSORI.map((a) => {
              const ok = sbloccati.includes(a.id);
              const indossato = look.accessori.includes(a.id);
              const anteprima = (
                <span className={`toppa size-14 flex-none overflow-hidden ${ok ? "" : "opacity-40 grayscale"}`}>
                  <Avatar look={{ ...look, accessori: [a.id] }} className="relative top-[8%] h-full w-full" />
                </span>
              );
              return (
                <li key={a.id}>
                  {ok ? (
                    <button
                      type="button"
                      aria-pressed={indossato}
                      onClick={() => onCambia({ accessori: indossato ? [] : [a.id] })}
                      className={`cliccabile stoffa-chiara flex w-full items-center gap-3 rounded-[20px] p-2 pr-4 text-left ${
                        indossato ? "outline-3 outline-offset-2 outline-vermiglio" : ""
                      }`}
                    >
                      {anteprima}
                      <span className="min-w-0 flex-1">
                        <span className="block font-titolo text-lg leading-tight">{a.nome}</span>
                        <span className="block text-sm text-inchiostro/70">{indossato ? "Lo indossi" : "Tocca per indossarlo"}</span>
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 rounded-[20px] border-2 border-dashed border-abete/20 p-2 pr-4">
                      {anteprima}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-inchiostro/70">{a.nome} · bloccato</span>
                        <span className="block text-sm text-inchiostro/70">{a.comeSbloccarlo}</span>
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
            <li className="flex items-center gap-3 rounded-[20px] border-2 border-dashed border-abete/20 p-2 pr-4">
              <span className="toppa size-14 flex-none text-2xl text-inchiostro/40">?</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-inchiostro/70">Cappello misterioso · bloccato</span>
                <span className="block text-sm text-inchiostro/70">Arriverà con il quiz: dipende dal tuo verdetto.</span>
              </span>
            </li>
          </ul>
        </Feltro>
      )}
    </div>
  );
}

// Griglia di scelte con l'anteprima del personaggio; quella scelta è cerchiata.
// Una scelta bloccata è piatta e spenta (non si tocca).
function Griglia({
  nomi,
  scelto,
  anteprima,
  onScegli,
  bloccato = () => false,
}: {
  nomi: string[];
  scelto: number;
  anteprima: (i: number) => Look;
  onScegli: (i: number) => void;
  bloccato?: (i: number) => boolean;
}) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      {nomi.map((n, i) => {
        const chiuso = bloccato(i);
        const interno = (
          <>
            <span className={`toppa size-14 overflow-hidden ${chiuso ? "opacity-40 grayscale" : ""}`}>
              <Avatar look={anteprima(i)} className="relative top-[8%] h-full w-full" />
            </span>
            <span className="text-center text-sm leading-tight">{chiuso ? `${n} · bloccato` : n}</span>
          </>
        );
        return chiuso ? (
          <div key={n} className="flex flex-col items-center gap-1 rounded-[20px] border-2 border-dashed border-abete/20 py-2 text-inchiostro/60">
            {interno}
          </div>
        ) : (
          <button
            key={n}
            type="button"
            aria-pressed={scelto === i}
            onClick={() => onScegli(i)}
            className={`cliccabile stoffa-chiara flex flex-col items-center gap-1 rounded-[20px] py-2 ${scelto === i ? "outline-3 outline-offset-2 outline-vermiglio" : ""}`}
          >
            {interno}
          </button>
        );
      })}
    </div>
  );
}

// Campioni di colore: ognuno è un bottone tondo di stoffa; quello scelto è cerchiato.
function Campioni({
  colori,
  scelto,
  nome,
  onScegli,
  bloccato = () => false,
}: {
  colori: string[];
  scelto: number;
  nome: string;
  onScegli: (i: number) => void;
  bloccato?: (i: number) => boolean;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {colori.map((c, i) => {
        const olo = c.startsWith("url(");
        const fondo = olo ? { backgroundImage: "linear-gradient(135deg,#ff4fae,#2fb8ff,#8a5cff,#ffc92e,#1fd69a)" } : { backgroundColor: c };
        return bloccato(i) ? (
          <span key={c} title="Premio da sbloccare" className="size-12 rounded-full border-2 border-dashed border-abete/30 opacity-40" style={fondo} />
        ) : (
          <button
            key={c}
            type="button"
            aria-label={olo ? `${nome} olografico` : `${nome} ${i + 1}`}
            aria-pressed={scelto === i}
            onClick={() => onScegli(i)}
            className={`cliccabile size-12 rounded-full ${olo ? "capelli-olografici" : ""} ${scelto === i ? "outline-3 outline-offset-2 outline-vermiglio" : ""}`}
            style={{ ...fondo, ["--spessore" as string]: "rgb(0 0 0 / 0.3)" }}
          />
        );
      })}
    </div>
  );
}
