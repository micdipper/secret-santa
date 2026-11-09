"use client";

import { EMOJI } from "@/lib/accesso";

// Griglia di emoji: ognuna è una toppa che si tocca (in rilievo); quella scelta è cerchiata.
export function ScegliEmoji({ valore, onCambia }: { valore: string; onCambia: (e: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-medium text-inchiostro">La tua emoji</legend>
      <div className="grid grid-cols-6 gap-2">
        {EMOJI.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={`Emoji ${e}`}
            aria-pressed={valore === e}
            onClick={() => onCambia(e)}
            className={`toppa cliccabile stoffa-chiara aspect-square w-full text-2xl ${
              valore === e ? "outline-3 outline-offset-2 outline-vermiglio" : ""
            }`}
          >
            {e}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// Campo per il PIN a 4 cifre (tastiera numerica sul telefono).
export function CampoPin({
  id,
  etichetta,
  valore,
  onCambia,
  aiuto,
}: {
  id: string;
  etichetta: string;
  valore: string;
  onCambia: (v: string) => void;
  aiuto?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium text-inchiostro">
        {etichetta}
      </label>
      <div className="campo-cucito">
        <input
          id={id}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]{4}"
          maxLength={4}
          value={valore}
          onChange={(ev) => onCambia(ev.target.value.replace(/\D/g, "").slice(0, 4))}
          className="text-center font-titolo text-2xl tracking-[0.6em]"
          placeholder="••••"
        />
      </div>
      {aiuto && <p className="text-sm text-inchiostro/70">{aiuto}</p>}
    </div>
  );
}
