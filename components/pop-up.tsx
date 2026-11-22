"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

// Pop-up del sito: velo scuro su tutto lo schermo e riquadro di feltro al centro, che entra con una molla.
// etichetta = id del titolo dentro (per i lettori di schermo); tipo "alertdialog" quando chiede una scelta.
export function PopUp({
  aperto,
  etichetta,
  children,
  tipo = "dialog",
  className = "",
}: {
  aperto: boolean;
  etichetta: string;
  children: ReactNode;
  tipo?: "dialog" | "alertdialog";
  className?: string;
}) {
  return (
    <AnimatePresence>
      {aperto && (
        <motion.div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/55 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role={tipo}
            aria-modal="true"
            aria-labelledby={etichetta}
            className={`feltro w-full max-w-sm p-6 ${className}`}
            initial={{ scale: 0.85, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className="relative flex min-h-0 flex-col">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
