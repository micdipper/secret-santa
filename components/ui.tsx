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

// Toppa rotonda con l'emoji della persona. In rilievo solo se si può toccare.
export function Toppa({
  emoji,
  dimensione = 56,
  novita = false,
  cliccabile = false,
}: {
  emoji: string;
  dimensione?: number;
  novita?: boolean;
  cliccabile?: boolean;
}) {
  return (
    <span
      className={`toppa ${cliccabile ? "cliccabile stoffa-chiara" : ""}`}
      style={{ width: dimensione, height: dimensione, fontSize: dimensione * 0.48 }}
      aria-hidden
    >
      {emoji}
      {novita && (
        <span className="absolute top-0.5 right-0 size-3.5 rounded-full bg-senape shadow-[0_0_0_2px_var(--color-abete)]" />
      )}
    </span>
  );
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
