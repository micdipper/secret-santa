import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

// Tasto a pillola di stoffa: solo testo, per le azioni principali.
export function Tasto({
  variante = "crema",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "crema" | "vermiglio" | "verde" }) {
  const colori = {
    crema:
      "bg-feltro text-vermiglio-scuro shadow-[inset_0_-4px_8px_rgba(120,90,40,.2),0_8px_14px_-8px_rgba(0,0,0,.6)]",
    vermiglio:
      "bg-vermiglio text-crema shadow-[inset_0_-4px_8px_rgba(0,0,0,.18),0_8px_14px_-8px_rgba(0,0,0,.6)]",
    verde:
      "bg-abete text-crema shadow-[inset_0_-4px_8px_rgba(0,0,0,.25),0_8px_14px_-8px_rgba(0,0,0,.6)]",
  }[variante];
  return <button className={`tasto ${colori} ${className}`} {...props} />;
}

// Bottone di legno rotondo con icona incisa: solo per piccole azioni senza testo.
// L'etichetta è obbligatoria per chi usa lo screen reader.
export function BottoneLegno({
  etichetta,
  icona,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { etichetta: string; icona: ReactNode }) {
  return (
    <button aria-label={etichetta} title={etichetta} className={`bottone-legno ${className}`} {...props}>
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
    <div className={`feltro ${variante === "vermiglio" ? "feltro-vermiglio" : ""} p-6 ${className}`}>
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
}: {
  emoji: string;
  dimensione?: number;
  novita?: boolean;
}) {
  return (
    <span
      className="toppa"
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

// Campo di testo con l'etichetta sempre visibile (da usare dentro un Feltro).
export function Campo({
  etichetta,
  aiuto,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etichetta: string; aiuto?: string; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium text-inchiostro">
        {etichetta}
      </label>
      <input
        id={id}
        className="min-h-12 rounded-2xl border-2 border-abete/30 bg-white/60 px-4 text-inchiostro placeholder:text-inchiostro/40 focus:border-abete"
        {...props}
      />
      {aiuto && <p className="text-sm text-inchiostro/70">{aiuto}</p>}
    </div>
  );
}

// Icone incise per i bottoni di legno (tratto semplice, originali).
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
  ago: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 19L18 6" />
      <ellipse cx="19" cy="5" rx="1.6" ry="2.6" transform="rotate(45 19 5)" />
      <path d="M5 19c-2 1-2-2 1-3 4-1 6 2 9 1" />
    </svg>
  ),
};
