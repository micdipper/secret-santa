import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Stoffa = "crema" | "vermiglio" | "verde";

// Tasto a pillola di stoffa: solo testo, per le azioni principali.
// Tutto ciò che è cliccabile è "in rilievo" (classe .cliccabile).
export function Tasto({
  variante = "crema",
  largo = false,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Stoffa; largo?: boolean }) {
  return (
    <button
      className={`tasto cucitura cliccabile stoffa-${variante} ${largo ? "w-full" : ""} ${className}`}
      {...props}
    >
      <span>{children}</span>
    </button>
  );
}

// Bottone tondo: stessa stoffa e cucitura dei tasti, con un'icona.
// L'etichetta è obbligatoria per chi usa lo screen reader.
export function TastoTondo({
  etichetta,
  icona,
  variante = "crema",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { etichetta: string; icona: ReactNode; variante?: Stoffa }) {
  return (
    <button
      aria-label={etichetta}
      title={etichetta}
      className={`tasto-tondo cucitura cliccabile stoffa-${variante} ${className}`}
      {...props}
    >
      {icona}
    </button>
  );
}

// Riquadro di feltro con la cucitura tratteggiata.
export function Feltro({
  children,
  variante = "crema",
  className = "",
}: {
  children: ReactNode;
  variante?: "crema" | "vermiglio";
  className?: string;
}) {
  return (
    <div className={`feltro ${variante === "vermiglio" ? "feltro-vermiglio" : ""} px-6 pt-7 pb-6 ${className}`}>
      <div className="relative">{children}</div>
    </div>
  );
}

// Etichetta di stoffa cucita, per le informazioni brevi (giorni, data, budget).
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
  return <span className={`etichetta-stoffa text-[15px] ${stile}`}>{children}</span>;
}

// Toppa rotonda cucita con l'emoji della persona.
export function Toppa({
  emoji,
  dimensione = 58,
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
      className={`toppa ${cliccabile ? "cliccabile stoffa-crema" : ""}`}
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

// Link per tornare alla pagina del gruppo, in alto nelle pagine interne.
export function TornaAlGruppo({ href, nome }: { href: string; nome: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-crema/12 pr-4 pl-2.5 text-[15px] text-crema"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {nome}
    </Link>
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
    <div className="flex flex-col gap-1.5">
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

// Icone per i bottoni tondi (tratto semplice, originali).
export const Icone = {
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
  condividi: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" />
    </svg>
  ),
  altro: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18" cy="12" r="1.2" />
    </svg>
  ),
  avanti: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),
  meno: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 12h14" />
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
