// Prove di olografia natalizia (si sceglie quella che piace di più: vedi /stile)
export const OLOGRAFIE = {
  "rosso e oro": "repeating-linear-gradient(115deg, #ff8a6b 0%, #ffd36b 8%, #fff1c4 14%, #ff5a3c 22%, #ffc24a 30%, #ff8a6b 38%)",
  "bosco e oro": "repeating-linear-gradient(115deg, #7fd39a 0%, #ffe08a 8%, #fff4cf 14%, #3fbf7a 22%, #f1c75a 30%, #7fd39a 38%)",
  "festa (rosso, verde, oro)": "repeating-linear-gradient(115deg, #ff7b5f 0%, #ffd66e 7%, #8be0a8 14%, #fff2c8 20%, #ff6a4a 27%, #6fd197 34%, #ff7b5f 40%)",
  // più contrasto: azzurro ghiaccio deciso alternato ad argento e a un filo di lilla
  "ghiaccio e argento": "repeating-linear-gradient(115deg, #6fb8f2 0%, #e9f4ff 7%, #b9c6d6 12%, #ffffff 16%, #4fa3e8 23%, #d9e8f7 29%, #c7b8f0 34%, #6fb8f2 40%)",
} as const;
export type Olografia = keyof typeof OLOGRAFIE;
export const OLOGRAFIA_SCELTA: Olografia = "ghiaccio e argento"; // scelta da Marzia

// Brina: cristalli di ghiaccio ramificati (disegnati da noi), come i motivi delle carte olografiche
function cristallo(x: number, y: number, r: number, a: number) {
  const rami = [0, 60, 120, 180, 240, 300].map((g) => {
    const t = ((g + a) * Math.PI) / 180;
    const ex = x + Math.cos(t) * r;
    const ey = y + Math.sin(t) * r;
    const mx = x + Math.cos(t) * r * 0.55;
    const my = y + Math.sin(t) * r * 0.55;
    const b1 = t + 0.6;
    const b2 = t - 0.6;
    return `M${x} ${y}L${ex.toFixed(1)} ${ey.toFixed(1)}M${mx.toFixed(1)} ${my.toFixed(1)}l${(Math.cos(b1) * r * 0.3).toFixed(1)} ${(Math.sin(b1) * r * 0.3).toFixed(1)}M${mx.toFixed(1)} ${my.toFixed(1)}l${(Math.cos(b2) * r * 0.3).toFixed(1)} ${(Math.sin(b2) * r * 0.3).toFixed(1)}`;
  });
  return rami.join("");
}
const CRISTALLI = [
  [22, 30, 14, 0], [88, 18, 9, 15], [150, 52, 16, 30], [60, 96, 11, 10], [124, 120, 8, 25],
  [30, 160, 13, 5], [170, 170, 10, 20], [100, 190, 15, 0], [190, 100, 7, 12], [8, 104, 7, 22],
]
  .map(([x, y, r, a]) => cristallo(x, y, r, a))
  .join("");
export const BRINA = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><path d='${CRISTALLI}' fill='none' stroke='white' stroke-width='1.1' stroke-linecap='round'/></svg>`,
)}")`;

