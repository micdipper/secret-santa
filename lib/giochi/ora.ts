"use client";

import { useEffect, useState } from "react";

// L'ora del server (non quella del telefono, che può essere sbagliata): scarto calcolato una volta
// quando arriva get_giochi, poi l'orologio del telefono fa solo da cronometro.
export function scartoDa(oraServer: string) {
  return new Date(oraServer).getTime() - Date.now();
}

// Ora del server che avanza ogni secondo (0 finché la pagina non è nel telefono: evita differenze col server di Next)
export function useOraServer(scarto: number) {
  const [ora, setOra] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'orologio parte subito
    setOra(Date.now() + scarto);
    const t = setInterval(() => setOra(Date.now() + scarto), 1000);
    return () => clearInterval(t);
  }, [scarto]);
  return ora;
}

// "2 g 5 h" · "5 h 12 min" · "12:05"
export function durataBreve(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const g = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (g > 0) return `${g} g ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export type StatoFinestra = "bloccato" | "aperto" | "chiuso";
export const statoDa = (apre: number, chiude: number, ora: number): StatoFinestra => (ora < apre ? "bloccato" : ora < chiude ? "aperto" : "chiuso");

// giorno del gioco, in italiano ("ven 18 dic"), sul fuso di Roma
export const giornoGioco = (apre: number) =>
  new Date(apre).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Rome" });
