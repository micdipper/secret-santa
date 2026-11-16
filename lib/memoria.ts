// Piccoli ricordi nella memoria del telefono (localStorage), sempre protetti:
// in navigazione privata o con la memoria bloccata si legge il valore "vuoto" e non si salva niente.
export function leggi<T>(chiave: string, vuoto: T): T {
  try {
    const v = localStorage.getItem(chiave);
    return v ? (JSON.parse(v) as T) : vuoto;
  } catch {
    return vuoto;
  }
}

export function scrivi(chiave: string, valore: unknown) {
  try {
    localStorage.setItem(chiave, JSON.stringify(valore));
  } catch {}
}
