import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/*
  Sistema dei tasti (vedi app/globals.css):
  1. primario   – pillola vermiglio, tutta larghezza, uno solo per riquadro
  2. secondario – pillola chiara con testo verde, tutta larghezza
  3. tondo      – cerchio chiaro con icona verde, per azioni piccole
  Tutti alti 56px. Tutto ciò che è cliccabile è in rilievo.
*/

export function Tasto({
  tipo = "primario",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tipo?: "primario" | "secondario" }) {
  const stoffa = tipo === "primario" ? "stoffa-vermiglio" : "stoffa-chiara";
  return (
    <button className={`tasto cucitura cliccabile ${stoffa} ${className}`} {...props}>
      <span>{children}</span>
    </button>
  );
}

// Stesso aspetto del Tasto, ma porta a un'altra pagina.
export function TastoLink({
  href,
  tipo = "primario",
  className = "",
  children,
}: {
  href: string;
  tipo?: "primario" | "secondario";
  className?: string;
  children: ReactNode;
}) {
  const stoffa = tipo === "primario" ? "stoffa-vermiglio" : "stoffa-chiara";
  return (
    <Link href={href} className={`tasto cucitura cliccabile ${stoffa} ${className}`}>
      <span>{children}</span>
    </Link>
  );
}

// L'etichetta è obbligatoria: serve a chi usa lo screen reader e compare al passaggio del mouse.
export function TastoTondo({
  etichetta,
  icona,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { etichetta: string; icona: ReactNode }) {
  return (
    <button
      aria-label={etichetta}
      title={etichetta}
      className={`tasto-tondo cucitura cliccabile stoffa-chiara ${className}`}
      {...props}
    >
      {icona}
    </button>
  );
}

// Riquadro di feltro (non cliccabile). Margine interno 24px.
export function Feltro({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`feltro p-6 ${className}`}>
      <div className="relative">{children}</div>
    </div>
  );
}

// Titolo di un riquadro: sempre 24px, sempre verde.
export function TitoloRiquadro({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`font-titolo text-2xl leading-tight text-balance text-abete ${className}`}>{children}</h2>;
}

// Etichetta di stoffa cucita (non cliccabile), per le informazioni brevi.
export function EtichettaStoffa({
  children,
  colore = "crema",
}: {
  children: ReactNode;
  colore?: "crema" | "vermiglio" | "verde";
}) {
  const stile = {
    crema: "bg-feltro text-abete",
    vermiglio: "bg-vermiglio text-crema",
    verde: "bg-abete text-crema",
  }[colore];
  return <span className={`etichetta-stoffa text-sm ${stile}`}>{children}</span>;
}

// Testata delle pagine interne: tasto tondo per tornare indietro (unico modo),
// nome del gruppo come contesto e titolo della pagina.
export function TestataInterna({
  indietro,
  etichettaIndietro,
  contesto,
  titolo,
  sottotitolo,
}: {
  indietro: string;
  etichettaIndietro: string;
  contesto?: string;
  titolo: string;
  sottotitolo?: string;
}) {
  return (
    <header className="flex flex-col gap-4 pt-6">
      <Link
        href={indietro}
        aria-label={etichettaIndietro}
        title={etichettaIndietro}
        className="tasto-tondo cucitura cliccabile stoffa-chiara self-start"
      >
        {Icone.indietro}
      </Link>
      <div>
        {contesto && <p className="text-sm text-crema/75">{contesto}</p>}
        <h1 className="font-titolo text-[32px] leading-none">{titolo}</h1>
        {sottotitolo && <p className="mt-2 text-crema/80">{sottotitolo}</p>}
      </div>
    </header>
  );
}

// Campo di testo cucito con l'etichetta sempre visibile (da usare dentro un Feltro).
export function Campo({
  etichetta,
  aiuto,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etichetta: string; aiuto?: string; id: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium text-inchiostro">
        {etichetta}
      </label>
      <div className="campo-cucito">
        <input id={id} className="placeholder:text-inchiostro/40" {...props} />
      </div>
      {aiuto && <p className="text-sm text-inchiostro/70">{aiuto}</p>}
    </div>
  );
}

// Icone dei tasti tondi (tratto semplice, originali).
export const Icone = {
  indietro: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  avanti: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),
  matita: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 20l4-1 11-11-3-3L5 16z" />
      <path d="M14 7l3 3" />
    </svg>
  ),
  piu: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  meno: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 12h14" />
    </svg>
  ),
  altro: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18" cy="12" r="1.2" />
    </svg>
  ),
  occhio: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  occhioChiuso: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <path d="M4 20L20 4" />
    </svg>
  ),
  sopra: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="10" width="11" height="10" rx="2" />
      <path d="M9 10V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
    </svg>
  ),
  cestino: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  ),
  gomma: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M14 4l6 6-9 9H6l-3-3z" />
      <path d="M9 9l6 6M11 19h9" />
    </svg>
  ),
  annulla: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  ),
  fatto: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 12l5 5 9-10" />
    </svg>
  ),
  secchiello: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 10l7-7 8 8-7 7z" />
      <path d="M5 10h15" />
      <path d="M20 15c0 0 2 2.6 2 4a2 2 0 0 1-4 0c0-1.4 2-4 2-4z" />
    </svg>
  ),
  invia: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 12l16-8-6 16-3-6z" />
      <path d="M11 14l9-10" />
    </svg>
  ),
  foto: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  ),
  reazione: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M20 12.5A8 8 0 1 1 11.5 4" />
      <path d="M9 14.5c1.6 1.6 4.4 1.6 6 0M9 10h.01M14 10h.01M18 3v6M15 6h6" />
    </svg>
  ),
  fumetto: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    </svg>
  ),
  ago: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 19L18 6" />
      <ellipse cx="19" cy="5" rx="1.6" ry="2.6" transform="rotate(45 19 5)" />
      <path d="M5 19c-2 1-2-2 1-3 4-1 6 2 9 1" />
    </svg>
  ),
};

// Messaggio d'errore vicino a ciò che l'ha causato (non cliccabile).
export function Errore({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-2xl bg-vermiglio/10 px-4 py-3 text-sm text-vermiglio-scuro">
      {children}
    </p>
  );
}
