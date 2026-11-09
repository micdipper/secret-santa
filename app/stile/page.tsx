import { BustaSigillata, CuoreFolk, Pallina, Rametto, StellaNordica, Stellina, Uccellino } from "@/components/ornamenti";
import { Profondita } from "@/components/profondita";
import { BottoneLegno, Campo, EtichettaStoffa, Feltro, Icone, Tasto, Toppa, TornaAlGruppo } from "@/components/ui";

// Pagina di prova della base grafica (non collegata al resto del sito).
export const metadata = { title: "Base grafica – Secret Santa" };

const membri = [
  { nome: "Giulia", emoji: "🦊", novita: true },
  { nome: "Marco", emoji: "🐻" },
  { nome: "Sara", emoji: "🦉", novita: true },
  { nome: "Luca", emoji: "🐧" },
  { nome: "Anna", emoji: "🦌" },
  { nome: "Pietro", emoji: "🐿️" },
];

const palette = [
  { nome: "Abete", classe: "bg-abete", hex: "#2c4a32" },
  { nome: "Vermiglio", classe: "bg-vermiglio", hex: "#e5481e" },
  { nome: "Feltro", classe: "bg-feltro text-inchiostro", hex: "#f1e4c8" },
  { nome: "Kraft", classe: "bg-kraft text-inchiostro", hex: "#cdb48a" },
  { nome: "Senape", classe: "bg-senape text-inchiostro", hex: "#e9a81c" },
  { nome: "Rosa", classe: "bg-rosa text-inchiostro", hex: "#f4a9c4" },
];

export default function Stile() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-x-hidden px-[18px] pb-16">
      {/* ---------- Esempio: pagina del gruppo ---------- */}
      <section className="relative pt-11">
        <Profondita intensita={8} className="pointer-events-none absolute -top-2 right-1 w-16">
          <Pallina className="w-full" />
        </Profondita>
        <h1 className="pr-16 font-titolo text-[34px] leading-none text-crema drop-shadow-[0_3px_12px_rgba(0,0,0,.5)]">
          Natale tra amici
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <EtichettaStoffa colore="vermiglio">
            <b className="mr-1.5 font-titolo text-[17px] font-normal">41</b> giorni allo scambio
          </EtichettaStoffa>
          <EtichettaStoffa>sab 20 dic</EtichettaStoffa>
          <EtichettaStoffa>budget 30 €</EtichettaStoffa>
        </div>
      </section>

      <Feltro variante="vermiglio" className="mt-6">
        <BustaSigillata className="absolute top-0 right-0 w-[72px] rotate-[8deg] drop-shadow-[0_3px_4px_rgba(0,0,0,.35)]" />
        <h2 className="font-titolo text-[28px] leading-[1.05]">
          La tua busta
          <br />è pronta
        </h2>
        <p className="mt-1.5 max-w-[220px]">Scopri a chi farai il regalo. Lo vedrai solo tu.</p>
        <Tasto className="mt-4">Apri la busta</Tasto>
      </Feltro>

      <div className="feltro mt-3.5 flex items-center gap-3.5 px-4 py-3.5">
        <div className="relative h-[52px] w-14 flex-none" aria-hidden>
          <span className="absolute top-1.5 left-0 h-11 w-[38px] -rotate-10 rounded-md border-[3px] border-[#fbf8f0] bg-senape shadow" />
          <span className="absolute top-0.5 left-3 h-11 w-[38px] rotate-2 rounded-md border-[3px] border-[#fbf8f0] bg-rosa shadow" />
          <span className="absolute top-1.5 left-6 h-11 w-[38px] rotate-12 rounded-md border-[3px] border-[#fbf8f0] bg-kraft shadow" />
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="font-titolo text-lg leading-tight whitespace-nowrap text-abete">La tua bacheca</p>
          <p className="text-sm text-inchiostro/75">3 cose aggiunte</p>
        </div>
        <BottoneLegno etichetta="Modifica la tua bacheca" icona={Icone.matita} />
      </div>

      <div className="mt-7 mb-3 flex items-baseline justify-between">
        <h3 className="font-titolo text-[22px]">Chi c&apos;è</h3>
        <span className="text-sm text-crema/75">12 persone</span>
      </div>
      <ul className="-mx-[18px] flex gap-3.5 overflow-x-auto px-[18px] pb-1.5">
        {membri.map((m) => (
          <li key={m.nome} className="flex w-[62px] flex-none flex-col items-center gap-1.5 text-[13px]">
            <Toppa emoji={m.emoji} novita={m.novita} />
            {m.nome}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[13px] text-crema/70">Il pallino giallo indica chi ha appena aggiornato la bacheca.</p>

      {/* ---------- Esempio: intestazione di una pagina interna ---------- */}
      <hr className="my-12 border-t-2 border-dashed border-crema/20" />
      <TornaAlGruppo href="/stile" nome="Natale tra amici" />
      <h1 className="mt-4 font-titolo text-[34px] leading-none">La tua bacheca</h1>
      <p className="mt-2 text-crema/80">Foto, colori e parole che ti somigliano. La vedono tutti nel gruppo.</p>

      <Feltro className="mt-5">
        <Campo id="prova-nome" etichetta="Come si chiama il gruppo?" placeholder="Natale tra amici" aiuto="Lo vedranno tutti gli invitati." />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Tasto variante="vermiglio">Crea il gruppo</Tasto>
          <Tasto variante="verde">Annulla</Tasto>
        </div>
      </Feltro>

      {/* ---------- Riferimenti ---------- */}
      <hr className="my-12 border-t-2 border-dashed border-crema/20" />
      <h2 className="font-titolo text-3xl">Tasti</h2>
      <p className="mt-1 text-crema/80">Pillole di stoffa con solo testo per le azioni principali; bottoni di legno solo per piccole azioni con un&apos;icona.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Tasto>Apri la busta</Tasto>
        <BottoneLegno etichetta="Modifica" icona={Icone.matita} />
        <BottoneLegno etichetta="Aggiungi" icona={Icone.piu} />
        <BottoneLegno etichetta="Condividi il link" icona={Icone.condividi} />
        <BottoneLegno etichetta="Ricama" icona={Icone.ago} />
      </div>

      <h2 className="mt-10 font-titolo text-3xl">Colori</h2>
      <ul className="mt-4 grid grid-cols-3 gap-3">
        {palette.map((c) => (
          <li key={c.nome} className={`flex aspect-square flex-col justify-end rounded-2xl p-2.5 ring-1 ring-crema/25 ${c.classe}`}>
            <span className="font-medium">{c.nome}</span>
            <span className="text-sm opacity-80">{c.hex}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-titolo text-3xl">Caratteri</h2>
      <p className="mt-3 font-titolo text-4xl leading-tight">La tua busta ti aspetta</p>
      <p className="mt-1 text-crema/75">Basteleur Bold, solo per titoli e tasti.</p>
      <p className="mt-4 text-lg">Aggiungi toppe, colori e ricami alla tua bacheca: chi ti ha pescato la guarderà per scegliere il regalo.</p>
      <p className="mt-1 text-crema/75">Bricolage Grotesque, per tutto il resto.</p>

      <h2 className="mt-10 font-titolo text-3xl">Ornamenti</h2>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <Stellina className="size-10 text-senape" title="Stellina" />
        <StellaNordica className="size-12 text-vermiglio" title="Stella nordica" />
        <CuoreFolk className="size-12 text-rosa" title="Cuore" />
        <Uccellino className="h-10 text-crema" title="Uccellino" />
        <Rametto className="w-28 text-crema" title="Rametto di abete" />
        <BustaSigillata className="w-20" title="Busta" />
        <Pallina className="w-12" title="Pallina" />
      </div>
    </main>
  );
}
