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

// Freccia verde davanti al testo di un tasto che porta a un'altra pagina.
export function FrecciaAvanti() {
  return <span className="relative mr-2 text-abete [&_svg]:size-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.4]">{Icone.avanti}</span>;
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
  chiudi: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
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
  calendario: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
      <path d="M4 10h16M9 3.5v4M15 3.5v4" />
      <path d="M12 12.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" />
    </svg>
  ),
  // condividi "classico": su iPhone il quadrato con la freccia, su Android i tre pallini collegati
  condividiIos: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" />
    </svg>
  ),
  condividiAndroid: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" />
    </svg>
  ),
  rimescola: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M3 7h3.5c2 0 3.2 1 4.3 2.6l2.4 3.8C14.3 15 15.5 17 17.5 17H21M18 14l3 3-3 3" />
      <path d="M3 17h3.5c1.3 0 2.2-.5 3-1.3M14.2 8.3C15 7.5 16 7 17.5 7H21M18 4l3 3-3 3" />
    </svg>
  ),
  scarica: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />
    </svg>
  ),
  lucchetto: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="5" y="11" width="14" height="9.5" rx="2.5" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
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

