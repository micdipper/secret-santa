// Date in italiano, calcolate sul fuso di Roma.

// Oggi a Roma, come "AAAA-MM-GG"
export function oggiRoma() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
}

function oggiARoma() {
  return new Date(`${oggiRoma()}T00:00:00Z`);
}

export function giorniMancanti(data: string | null) {
  if (!data) return null;
  const diff = new Date(`${data}T00:00:00Z`).getTime() - oggiARoma().getTime();
  return Math.round(diff / 86_400_000);
}

export function dataBreve(data: string | null) {
  if (!data) return null;
  return new Date(`${data}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

// La data di n giorni prima (es. il giorno in cui si blocca la data dello scambio); n negativo = giorni dopo
export function giornoPrima(data: string, n: number) {
  return new Date(new Date(`${data}T00:00:00Z`).getTime() - n * 86_400_000).toISOString().slice(0, 10);
}
