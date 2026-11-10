"use client";

import { useState } from "react";
import { AperturaBusta, type Persona } from "@/components/apertura-busta";
import { lookIniziale } from "@/components/avatar";

// Pagina di prova: tutta l'apertura della busta con amici inventati.
// Non serve l'accesso e non scrive niente nel database.
const AMICI: Persona[] = ["Giulia Rossi", "Marco Bianchi", "Sara Verdi", "Luca Neri", "Anna Gialli"].map((nome) => ({
  id: nome,
  nome,
  look: lookIniziale(nome),
}));

export default function ProvaBusta() {
  const [giro, setGiro] = useState(0);
  // ogni giro esce una persona diversa
  const destinatario = AMICI[giro % AMICI.length];
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16">
      <AperturaBusta
        key={giro}
        groupId="prova"
        nomeGruppo="Prova (non è un gruppo vero)"
        candidati={AMICI}
        destinatario={destinatario}
        giaAperta={false}
        prova={{ ricomincia: () => setGiro((g) => g + 1) }}
      />
    </main>
  );
}
