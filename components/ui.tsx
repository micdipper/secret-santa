import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

// Pulsante principale: un'etichetta vermiglio con un'ombra "stampata" piena.
export function Pulsante({
  variante = "pieno",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "pieno" | "carta" }) {
  const stile =
    variante === "pieno"
      ? "bg-vermiglio text-crema shadow-[4px_4px_0_var(--color-abete-scuro)]"
      : "bg-crema text-abete shadow-[4px_4px_0_var(--color-vermiglio)]";
  return (
    <button
      className={`min-h-12 rounded-full px-6 font-titolo text-lg transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 ${stile} ${className}`}
      {...props}
    />
  );
}

// Foglio di carta fissato con un pezzo di nastro adesivo.
export function Foglio({
  children,
  inclinazione = 0,
  colore = "crema",
  className = "",
}: {
  children: ReactNode;
  inclinazione?: number;
  colore?: "crema" | "kraft" | "rosa" | "senape";
  className?: string;
}) {
  const sfondo = {
    crema: "bg-crema",
    kraft: "bg-kraft",
    rosa: "bg-rosa",
    senape: "bg-senape",
  }[colore];
  return (
    <div
      className={`grana relative px-5 pt-7 pb-5 shadow-[0_10px_18px_-10px_rgba(10,25,12,.7)] ${sfondo} ${className}`}
      style={{ transform: `rotate(${inclinazione}deg)` }}
    >
      <span
        aria-hidden
        className="nastro absolute -top-3 left-1/2 h-7 w-24 -translate-x-1/2 -rotate-3 bg-senape/70"
      />
      <div className="relative z-2">{children}</div>
    </div>
  );
}

// Francobollo: per piccoli dati importanti (es. il budget).
export function Francobollo({
  valore,
  didascalia,
  className = "",
}: {
  valore: string;
  didascalia: string;
  className?: string;
}) {
  return (
    <div className={`francobollo inline-block bg-crema ${className}`}>
      <div className="flex min-w-24 flex-col items-center border-2 border-vermiglio px-3 py-2 text-vermiglio">
        <span className="font-titolo text-3xl leading-none">{valore}</span>
        <span className="mt-1 text-sm">{didascalia}</span>
      </div>
    </div>
  );
}

// Etichetta per pacchi con il buco e lo spago (es. la data dello scambio).
export function Etichetta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative inline-flex ${className}`}>
      <div className="etichetta flex items-center gap-3 bg-kraft py-2 pr-4 pl-7 text-inchiostro">
        <span aria-hidden className="size-3 shrink-0 rounded-full bg-abete" />
        <span>{children}</span>
      </div>
    </div>
  );
}

// Post-it con una parola chiave scritta in grande.
export function PostIt({
  children,
  colore = "senape",
  inclinazione = -3,
}: {
  children: ReactNode;
  colore?: "senape" | "rosa" | "crema";
  inclinazione?: number;
}) {
  const sfondo = { senape: "bg-senape", rosa: "bg-rosa", crema: "bg-crema" }[colore];
  return (
    <div
      className={`grana inline-flex size-28 items-center justify-center p-3 text-center font-titolo text-xl text-inchiostro shadow-[0_8px_14px_-8px_rgba(10,25,12,.7)] ${sfondo}`}
      style={{ transform: `rotate(${inclinazione}deg)` }}
    >
      <span className="relative z-2">{children}</span>
    </div>
  );
}

// Campo di testo con l'etichetta sempre visibile.
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
        className="min-h-12 rounded-md border-2 border-abete/40 bg-white/70 px-3 text-inchiostro placeholder:text-inchiostro/40 focus:border-abete"
        {...props}
      />
      {aiuto && <p className="text-sm text-inchiostro/70">{aiuto}</p>}
    </div>
  );
}
