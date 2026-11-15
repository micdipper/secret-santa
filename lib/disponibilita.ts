// Disponibilità per lo scambio: date in italiano e conteggi (usati sia nel browser sia nella pagina del gruppo, sul server).
const FUSO = { timeZone: "UTC" } as const; // le date "YYYY-MM-DD" si leggono a mezzogiorno UTC: niente scarti di fuso
const giorno = (d: string) => new Date(`${d}T12:00:00Z`);
export const dataLunga = (d: string) => giorno(d).toLocaleDateString("it-IT", { ...FUSO, weekday: "long", day: "numeric", month: "long" });
export const settimana = (d: string) => giorno(d).toLocaleDateString("it-IT", { ...FUSO, weekday: "short" });
export const numero = (d: string) => giorno(d).toLocaleDateString("it-IT", { ...FUSO, day: "numeric" });
export const mese = (d: string) => giorno(d).toLocaleDateString("it-IT", { ...FUSO, month: "short" });

// Quante persone per ogni giorno proposto e quale (o quali, a pari merito) è il più probabile
export function conteggi(giorni: string[], risposte: Record<string, string[]>) {
  const chi = Object.fromEntries(giorni.map((g) => [g, Object.keys(risposte).filter((m) => risposte[m].includes(g))]));
  const max = Math.max(0, ...giorni.map((g) => chi[g].length));
  const migliori = max > 0 ? giorni.filter((g) => chi[g].length === max) : [];
  return { chi, max, migliori };
}

