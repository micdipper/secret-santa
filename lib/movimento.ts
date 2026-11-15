"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

// "Riduci movimento" del telefono, letto solo dopo che la pagina è montata.
// (useReducedMotion lo sa già al primo disegno nel browser, il server no: le due versioni della pagina
//  venivano diverse e React segnalava l'errore #418. Prima del montaggio vale null = "non lo so ancora".)
export function useRiduciMovimento(): boolean | null {
  const riduci = useReducedMotion();
  const [montato, setMontato] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- serve proprio un secondo disegno, dopo il montaggio
    setMontato(true);
  }, []);
  return montato ? !!riduci : null;
}
