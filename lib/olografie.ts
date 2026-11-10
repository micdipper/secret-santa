// Prove di olografia natalizia (si sceglie quella che piace di più: vedi /stile)
export const OLOGRAFIE = {
  "rosso e oro": "repeating-linear-gradient(115deg, #ff8a6b 0%, #ffd36b 8%, #fff1c4 14%, #ff5a3c 22%, #ffc24a 30%, #ff8a6b 38%)",
  "bosco e oro": "repeating-linear-gradient(115deg, #7fd39a 0%, #ffe08a 8%, #fff4cf 14%, #3fbf7a 22%, #f1c75a 30%, #7fd39a 38%)",
  "festa (rosso, verde, oro)": "repeating-linear-gradient(115deg, #ff7b5f 0%, #ffd66e 7%, #8be0a8 14%, #fff2c8 20%, #ff6a4a 27%, #6fd197 34%, #ff7b5f 40%)",
  "ghiaccio e argento": "repeating-linear-gradient(115deg, #bfe6ff 0%, #ffffff 8%, #d8ecff 14%, #9fd6ff 22%, #f1e6ff 30%, #bfe6ff 38%)",
} as const;
export type Olografia = keyof typeof OLOGRAFIE;
export const OLOGRAFIA_SCELTA: Olografia = "festa (rosso, verde, oro)";

