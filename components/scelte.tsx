"use client";

import { useState } from "react";
import { Icone, TastoTondo } from "@/components/ui";

// Campo per la password (almeno 8 caratteri), con il tasto per mostrarla.
export function CampoPassword({
  id,
  etichetta,
  valore,
  onCambia,
  aiuto,
  nuova = false,
}: {
  id: string;
  etichetta: string;
  valore: string;
  onCambia: (v: string) => void;
  aiuto?: string;
  nuova?: boolean;
}) {
  const [visibile, setVisibile] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium text-inchiostro">
        {etichetta}
      </label>
      <div className="flex items-center gap-3">
        <div className="campo-cucito min-w-0 flex-1">
          <input
            id={id}
            type={visibile ? "text" : "password"}
            autoComplete={nuova ? "new-password" : "current-password"}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={valore}
            onChange={(ev) => onCambia(ev.target.value)}
            placeholder={nuova ? "Almeno 8 caratteri" : "La tua password"}
          />
        </div>
        <TastoTondo
          type="button"
          etichetta={visibile ? "Nascondi la password" : "Mostra la password"}
          icona={visibile ? Icone.occhioChiuso : Icone.occhio}
          aria-pressed={visibile}
          onClick={() => setVisibile(!visibile)}
        />
      </div>
      {aiuto && <p className="text-sm text-inchiostro/70">{aiuto}</p>}
    </div>
  );
}
