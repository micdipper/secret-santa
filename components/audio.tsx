"use client";

import { useEffect, useState } from "react";
import { avviaMusica, eMuto, impostaMuto, seguiMuto, suoni } from "@/lib/suoni";

// Messo una volta sola nel layout: al primo tocco parte la musica,
// e ogni tocco su qualcosa di cliccabile fa il suo "tump" di feltro.
export function AscoltaTocchi() {
  useEffect(() => {
    let primo = true;
    // il "tump" suona solo al clic vero (dito appoggiato e sollevato sul tasto), non quando il dito ci passa sopra
    const giu = (e: MouseEvent) => {
      if (primo) {
        primo = false;
        avviaMusica();
      }
      const el = (e.target as HTMLElement).closest?.(".cliccabile, [data-suono='tasto']");
      if (el && !(el as HTMLButtonElement).disabled) suoni.tasto();
    };
    window.addEventListener("click", giu, { capture: true });
    return () => window.removeEventListener("click", giu, { capture: true });
  }, []);
  // il tasto per togliere musica e suoni: sempre visibile, in ogni schermata, in alto a destra
  return (
    <div className="pointer-events-none !fixed inset-x-0 top-0 !z-[60] mx-auto w-full max-w-md px-5 pt-[calc(env(safe-area-inset-top)+24px)]">
      <TastoAudio className="pointer-events-auto ml-auto" />
    </div>
  );
}

// Tasto tondo per togliere e rimettere l'audio (il telefono se lo ricorda).
export function TastoAudio({ className = "" }: { className?: string }) {
  const [muto, setMuto] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la scelta è salvata nel telefono
    setMuto(eMuto());
    return seguiMuto(setMuto);
  }, []);
  const etichetta = muto ? "Rimetti musica e suoni" : "Togli musica e suoni";
  return (
    <button
      type="button"
      aria-label={etichetta}
      title={etichetta}
      aria-pressed={muto}
      onClick={() => impostaMuto(!muto)}
      className={`tasto-tondo cucitura cliccabile stoffa-chiara !flex ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 10v4h4l5 4V6L8 10z" />
        {muto ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
      </svg>
    </button>
  );
}
