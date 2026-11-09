// Accesso senza email: ogni persona ha un'email finta generata dal sito
// e una password scelta da lei (almeno 8 caratteri, nessun altro vincolo).
// Nessuna email viene mai inviata.

export const LUNGHEZZA_MINIMA_PASSWORD = 8;

export function nuovaEmailFinta() {
  return `${crypto.randomUUID()}@users.secretsanta.local`;
}

export function passwordValida(password: string) {
  return password.length >= LUNGHEZZA_MINIMA_PASSWORD;
}

export const EMOJI = ["🦊", "🐻", "🦉", "🐧", "🦌", "🐿️", "🐰", "🐱", "🐶", "🐼", "🐨", "🐸", "🦔", "🐝", "🦄", "🐢", "🐙", "🦭", "🐹", "🦝", "⛄", "🧸", "🍪", "🌲"];
