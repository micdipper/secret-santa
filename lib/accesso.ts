// Accesso senza email: ogni persona ha un'email finta generata dal sito
// e il PIN a 4 cifre come password (con un suffisso fisso per la lunghezza minima).
// Nessuna email viene mai inviata.

const SUFFISSO = "-babbo-natale-segreto";

export function nuovaEmailFinta() {
  return `${crypto.randomUUID()}@users.secretsanta.local`;
}

export function passwordDaPin(pin: string) {
  return `${pin}${SUFFISSO}`;
}

export function pinValido(pin: string) {
  return /^\d{4}$/.test(pin);
}

export const EMOJI = ["🦊", "🐻", "🦉", "🐧", "🦌", "🐿️", "🐰", "🐱", "🐶", "🐼", "🐨", "🐸", "🦔", "🐝", "🦄", "🐢", "🐙", "🦭", "🐹", "🦝", "⛄", "🧸", "🍪", "🌲"];
