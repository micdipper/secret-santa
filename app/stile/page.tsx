import { CuoreFolk, FasciaMaglia, Rametto, StellaNordica, Stellina, Uccellino } from "@/components/ornamenti";
import { Campo, Etichetta, Foglio, Francobollo, PostIt, Pulsante } from "@/components/ui";

// Pagina di prova della base grafica (non collegata al resto del sito).
export const metadata = { title: "Base grafica – Secret Santa" };

const membri = [
  { nome: "Giulia", emoji: "🦊" },
  { nome: "Marco", emoji: "🐻" },
  { nome: "Sara", emoji: "🦉" },
  { nome: "Luca", emoji: "🐧" },
  { nome: "Anna", emoji: "🦌" },
  { nome: "Pietro", emoji: "🐿️" },
];

const palette = [
  { nome: "Abete", classe: "bg-abete", hex: "#2c4a32", testo: "text-crema" },
  { nome: "Vermiglio", classe: "bg-vermiglio", hex: "#e5481e", testo: "text-crema" },
  { nome: "Crema", classe: "bg-crema", hex: "#f3e8cf", testo: "text-inchiostro" },
  { nome: "Kraft", classe: "bg-kraft", hex: "#cdb48a", testo: "text-inchiostro" },
  { nome: "Senape", classe: "bg-senape", hex: "#e9a81c", testo: "text-inchiostro" },
  { nome: "Rosa", classe: "bg-rosa", hex: "#f4a9c4", testo: "text-inchiostro" },
];

export default function Stile() {
  return (
    <main className="flex-1 overflow-x-hidden pb-16 text-crema">
      <FasciaMaglia />

      {/* Esempio: testata della pagina del gruppo */}
      <section className="relative px-5 pt-10 pb-6">
        <Stellina className="absolute top-6 right-6 size-7 text-senape" />
        <Stellina className="absolute top-24 left-4 size-4 text-crema/70" />
        <p className="text-crema/80">Il gruppo di</p>
        <h1 className="font-titolo text-[3.4rem] leading-[0.95] text-crema">Natale tra amici</h1>
        <Rametto className="mt-3 w-32 text-crema/60" />
      </section>

      <section className="relative mx-auto flex max-w-md flex-col gap-8 px-5">
        <Foglio inclinazione={-1.5}>
          <p className="text-inchiostro/70">Mancano</p>
          <p className="font-titolo text-[3.25rem] leading-none whitespace-nowrap text-vermiglio">41 giorni</p>
          <p className="mt-2 text-inchiostro">allo scambio dei regali.</p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Francobollo valore="30 €" didascalia="budget" className="-rotate-3" />
            <Etichetta>sabato 20 dicembre</Etichetta>
          </div>
        </Foglio>

        <div className="flex items-start justify-between gap-3">
          <PostIt colore="rosa" inclinazione={-4}>
            maglioni
          </PostIt>
          <PostIt colore="senape" inclinazione={3}>
            libri gialli
          </PostIt>
          <CuoreFolk className="mt-6 size-12 text-vermiglio" />
        </div>

        <Foglio inclinazione={1} colore="kraft">
          <h2 className="font-titolo text-2xl text-abete">Chi c&apos;è</h2>
          <ul className="mt-3 grid grid-cols-3 gap-3">
            {membri.map((m, i) => (
              <li
                key={m.nome}
                className="flex flex-col items-center bg-crema px-1 pt-2 pb-1 text-inchiostro shadow-sm"
                style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
              >
                <span className="text-3xl" aria-hidden>
                  {m.emoji}
                </span>
                <span className="text-sm">{m.nome}</span>
              </li>
            ))}
          </ul>
        </Foglio>

        <div className="flex flex-col gap-4">
          <Pulsante>Apri la busta</Pulsante>
          <Pulsante variante="carta">Vai alla mia moodboard</Pulsante>
        </div>

        <Foglio inclinazione={-0.5}>
          <Campo id="prova-nome" etichetta="Come si chiama il gruppo?" placeholder="Natale tra amici" aiuto="Lo vedranno tutti gli invitati." />
        </Foglio>
      </section>

      <FasciaMaglia className="mt-14" colore="var(--color-vermiglio)" sfondo="var(--color-crema)" />

      {/* Riferimenti: palette, caratteri, ornamenti */}
      <section className="mx-auto mt-10 flex max-w-md flex-col gap-8 px-5">
        <div>
          <h2 className="font-titolo text-3xl">Colori</h2>
          <ul className="mt-4 grid grid-cols-3 gap-3">
            {palette.map((c) => (
              <li key={c.nome} className={`grana flex aspect-square flex-col justify-end p-2 ${c.classe} ${c.testo} ring-1 ring-crema/30`}>
                <span className="relative z-2 font-medium">{c.nome}</span>
                <span className="relative z-2 text-sm opacity-80">{c.hex}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-titolo text-3xl">Caratteri</h2>
          <p className="mt-3 font-titolo text-4xl leading-tight">La tua busta ti aspetta</p>
          <p className="mt-1 text-crema/80">Basteleur Bold, solo per i titoli.</p>
          <p className="mt-4 text-lg">
            Aggiungi foto, post-it e colori alla tua moodboard: chi ti ha pescato la guarderà per scegliere il regalo.
          </p>
          <p className="mt-1 text-crema/80">Bricolage Grotesque, per tutto il resto.</p>
        </div>

        <div>
          <h2 className="font-titolo text-3xl">Ornamenti</h2>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <Stellina className="size-10 text-senape" title="Stellina" />
            <StellaNordica className="size-12 text-vermiglio" title="Stella nordica" />
            <CuoreFolk className="size-12 text-rosa" title="Cuore" />
            <Uccellino className="h-10 text-crema" title="Uccellino" />
            <Rametto className="w-28 text-crema" title="Rametto di abete" />
          </div>
        </div>
      </section>
    </main>
  );
}
