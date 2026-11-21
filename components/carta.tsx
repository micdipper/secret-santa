"use client";
// Oggetti di carta e da rivista presi dal design system "Secret Santa" (classi ss-* in globals.css):
// conto alla rovescia, banda a maglia, timbro, scarabocchi (biglietto e stella a raggiera tolti: stonavano col feltro).
// Tutti piatti (non cliccabili): decorano e informano, non si toccano.
import { useEffect, useId, useState, type ReactNode } from "react";

// Giorni · ore · minuti allo scambio (mezzanotte del giorno dello scambio, ora italiana), aggiornato ogni minuto.
export function Countdown({ data }: { data: string }) {
  const [ora, setOra] = useState<number | null>(null);
  useEffect(() => {
    const subito = setTimeout(() => setOra(Date.now()), 0); // dopo il primo disegno: server e telefono hanno orari diversi
    const t = setInterval(() => setOra(Date.now()), 30_000);
    return () => {
      clearTimeout(subito);
      clearInterval(t);
    };
  }, []);
  if (ora === null) return <div className="h-[78px]" aria-hidden />;
  // mezzanotte italiana: l'offset di Roma in quel giorno (inverno +1)
  const fine = new Date(`${data}T00:00:00+01:00`).getTime();
  const resto = Math.max(0, fine - ora);
  const g = Math.floor(resto / 86_400_000);
  const o = Math.floor((resto % 86_400_000) / 3_600_000);
  const m = Math.floor((resto % 3_600_000) / 60_000);
  const due = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="ss-countdown" role="timer" aria-label={`Mancano ${g} giorni, ${o} ore e ${m} minuti`}>
      <div className="ss-countdown__unit">
        <span className="ss-countdown__value">{due(g)}</span>
        <span className="ss-countdown__label">giorni</span>
      </div>
      <span className="ss-countdown__sep ss-star" aria-hidden />
      <div className="ss-countdown__unit">
        <span className="ss-countdown__value">{due(o)}</span>
        <span className="ss-countdown__label">ore</span>
      </div>
      <span className="ss-countdown__sep ss-star" aria-hidden />
      <div className="ss-countdown__unit">
        <span className="ss-countdown__value">{due(m)}</span>
        <span className="ss-countdown__label">min</span>
      </div>
    </div>
  );
}

// Banda a maglia nordica da bordo a bordo (massimo due per schermata).
export function KnitBand({ piccola = false, className = "" }: { piccola?: boolean; className?: string }) {
  return <div aria-hidden className={`ss-knit ${piccola ? "ss-knit--small" : ""} ${className}`} />;
}

// Timbro tondo con il testo che gira sul bordo e una parola al centro.
export function RubberStamp({ giro, parola, inchiostro = false, className = "" }: { giro: string; parola: string; inchiostro?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`ss-rubber ${inchiostro ? "ss-rubber--ink" : ""} ${className}`} viewBox="0 0 120 120" role="img" aria-label={parola}>
      <defs>
        <path id={`giro${id}`} d="M60 60m-43 0a43 43 0 1 1 86 0a43 43 0 1 1-86 0" />
      </defs>
      <circle className="ss-rubber__ring" cx="60" cy="60" r="56" />
      <circle className="ss-rubber__ring ss-rubber__ring--thin" cx="60" cy="60" r="31" />
      <text>
        <textPath href={`#giro${id}`}>{giro}</textPath>
      </text>
      <text className="ss-rubber__word" x="60" y="66" textAnchor="middle">
        {parola}
      </text>
    </svg>
  );
}

// Scarabocchi a penna attorno a 1-3 parole.
export function Scribble({ tipo, children }: { tipo: "cerchio" | "sottolineato" | "evidenziato"; children: ReactNode }) {
  return <span className={`ss-scribble ss-scribble--${tipo}`}>{children}</span>;
}

export function Segno({ tipo, className = "" }: { tipo: "spunta" | "asterisco" | "freccia"; className?: string }) {
  return <span aria-hidden className={`ss-mark ss-mark--${tipo} ${className}`} />;
}
