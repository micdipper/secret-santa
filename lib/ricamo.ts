// Punto croce: colori dei fili e secchiello (riempie l'area dello stesso colore toccata).

// Fili ben visibili sulla tela crema (gli stessi colori dei personaggi)
export const FILI = ["#e5481e", "#2c4a32", "#e9a81c", "#24304a", "#f4a9c4", "#7d3c5a", "#5a3520", "#1c241d"];
export const NOMI_FILI = ["vermiglio", "verde", "senape", "blu notte", "rosa", "bordeaux", "marrone", "nero"];
export const VUOTO = ".";

// Riempie tutte le celle collegate (sopra, sotto, destra, sinistra) che hanno lo stesso valore di quella toccata.
// "dentro" esclude le celle fuori dalla forma (es. fuori dal cerchio della toppa).
export function riempi(
  celle: string[],
  colonne: number,
  righe: number,
  c: number,
  r: number,
  valore: string,
  dentro: (c: number, r: number) => boolean = () => true,
) {
  if (c < 0 || r < 0 || c >= colonne || r >= righe || !dentro(c, r)) return;
  const prima = celle[r * colonne + c];
  if (prima === valore) return;
  const coda = [[c, r]];
  while (coda.length) {
    const [x, y] = coda.pop()!;
    if (x < 0 || y < 0 || x >= colonne || y >= righe || !dentro(x, y)) continue;
    const i = y * colonne + x;
    if (celle[i] !== prima) continue;
    celle[i] = valore;
    coda.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}
