"use client";

import { LayoutGroup, motion } from "framer-motion";
import { ToppaAvatar, type Look } from "@/components/avatar";

export type Persona = { memberId: string; nome: string; look: Look | null };
export type Partita = { member_id: string; score: number | null; started_at: string; finished_at: string | null };
export type Riga = Persona & {
  migliore: number | null; // null = non ha ancora giocato
  quando: string | null; // quando ha fatto il punteggio migliore (a parità vince chi l'ha fatto prima)
  tentativi: number;
  staGiocando: boolean;
};

// La classifica si calcola sempre dalle partite del database (mai sommando gli eventi della diretta)
export function calcolaRighe(persone: Persona[], partite: Partita[], ora: number, durataMax: number): Riga[] {
  const righe = persone.map((p): Riga => {
    const mie = partite.filter((r) => r.member_id === p.memberId);
    const finite = mie.filter((r) => r.score !== null && r.finished_at);
    const migliore = finite.length ? Math.max(...finite.map((r) => r.score!)) : mie.length ? 0 : null;
    const quando = finite.filter((r) => r.score === migliore).map((r) => r.finished_at!).sort()[0] ?? null;
    const staGiocando = mie.some((r) => r.score === null && new Date(r.started_at).getTime() > ora - durataMax * 1000);
    return { ...p, migliore, quando, tentativi: mie.length, staGiocando };
  });
  return righe.sort((a, b) => {
    if ((a.migliore === null) !== (b.migliore === null)) return a.migliore === null ? 1 : -1;
    if ((b.migliore ?? 0) !== (a.migliore ?? 0)) return (b.migliore ?? 0) - (a.migliore ?? 0);
    if (a.quando && b.quando && a.quando !== b.quando) return a.quando < b.quando ? -1 : 1;
    if (!!a.quando !== !!b.quando) return a.quando ? -1 : 1;
    return a.nome.localeCompare(b.nome, "it");
  });
}

// Posizione di ognuno (pari punteggio e pari momento = stessa posizione; chi non ha giocato non ce l'ha)
export function posizioni(righe: Riga[]) {
  const pos: Record<string, number | null> = {};
  righe.forEach((r, i) => {
    const prima = righe[i - 1];
    if (r.migliore === null) pos[r.memberId] = null;
    else if (prima && prima.migliore === r.migliore && prima.quando === r.quando) pos[r.memberId] = pos[prima.memberId];
    else pos[r.memberId] = i + 1;
  });
  return pos;
}

// Tentativi usati: ●●○
export function Pallini({ usati, totale = 3, className = "" }: { usati: number; totale?: number; className?: string }) {
  return (
    <span className={`inline-flex gap-1 ${className}`} aria-label={`${usati} tentativi su ${totale}`}>
      {Array.from({ length: totale }, (_, i) => (
        <span key={i} className={`size-2.5 rounded-full border-[1.5px] border-current ${i < Math.min(usati, totale) ? "bg-current" : ""}`} />
      ))}
    </span>
  );
}

// Classifica in diretta (piatta: non si tocca). Le righe si riordinano con una molla.
export function Classifica({ righe, io, tentativiMax = 3 }: { righe: Riga[]; io: string | null; tentativiMax?: number }) {
  const pos = posizioni(righe);
  return (
    <LayoutGroup>
      <ol className="feltro flex flex-col gap-1 p-3">
        {righe.map((r) => {
          const mia = r.memberId === io;
          const p = pos[r.memberId];
          return (
            <motion.li
              key={r.memberId}
              layout="position"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className={`relative flex items-center gap-3 rounded-[18px] px-3 py-2 ${mia ? "bg-senape/30" : ""} ${r.migliore === null ? "opacity-55" : ""}`}
            >
              <span className={`w-7 flex-none text-center font-titolo text-lg ${p === 1 ? "text-vermiglio" : "text-abete"}`}>{p ?? "–"}</span>
              <ToppaAvatar look={r.look} dimensione={40} nome={r.nome} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-inchiostro">
                  {r.nome}
                  {mia && r.nome !== "Tu" && <span className="text-inchiostro/60"> (tu)</span>}
                </span>
                {r.staGiocando ? (
                  <span className="block animate-pulse text-sm font-medium text-vermiglio-scuro">sta giocando…</span>
                ) : r.migliore === null ? (
                  <span className="block text-sm text-inchiostro/70">non ha ancora giocato</span>
                ) : (
                  <Pallini usati={r.tentativi} totale={tentativiMax} className="mt-1 text-abete" />
                )}
              </span>
              <motion.span key={r.migliore ?? -1} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="flex-none font-titolo text-2xl text-abete tabular-nums">
                {r.migliore ?? ""}
              </motion.span>
            </motion.li>
          );
        })}
      </ol>
    </LayoutGroup>
  );
}
