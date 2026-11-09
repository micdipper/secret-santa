import Link from "next/link";
import { BustaSigillata, CuoreFolk, Pallina, Rametto, StellaNordica, Stellina, Uccellino } from "@/components/ornamenti";
import { PallinaCheDondola } from "@/components/pallina-che-dondola";
import { Profondita } from "@/components/profondita";
import { Campo, EtichettaStoffa, Feltro, Icone, Tasto, TastoTesto, TastoTondo, Toppa, TornaAlGruppo } from "@/components/ui";

// Pagina di prova della base grafica (non collegata al resto del sito).
export const metadata = { title: "Base grafica – Secret Santa" };

const membri = [
  { nome: "Giulia", emoji: "🦊", novita: true, entrato: true },
  { nome: "Marco", emoji: "🐻", entrato: true },
  { nome: "Sara", emoji: "🦉", novita: true, entrato: true },
  { nome: "Luca", emoji: "🐧", entrato: true },
  { nome: "Anna", emoji: "🦌", entrato: false },
  { nome: "Pietro", emoji: "🐿️", entrato: false },
];

const palette = [
  { nome: "Abete", classe: "bg-abete", hex: "#2c4a32" },
  { nome: "Vermiglio", classe: "bg-vermiglio", hex: "#e5481e" },
  { nome: "Feltro", classe: "bg-feltro text-inchiostro", hex: "#f1e4c8" },
  { nome: "Kraft", classe: "bg-kraft text-inchiostro", hex: "#cdb48a" },
  { nome: "Senape", classe: "bg-senape text-inchiostro", hex: "#e9a81c" },
  { nome: "Rosa", classe: "bg-rosa text-inchiostro", hex: "#f4a9c4" },
];

function Separatore({ titolo }: { titolo: string }) {
  return (
    <div className="my-12 flex items-center gap-3 text-sm text-crema/60">
      <span className="flex-1 border-t-2 border-dashed border-crema/20" />
      {titolo}
      <span className="flex-1 border-t-2 border-dashed border-crema/20" />
    </div>
  );
}

export default function Stile() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-x-hidden px-[18px] pb-16">
      {/* ---------- Esempio: pagina del gruppo ---------- */}
      <section className="relative pt-11">
        <Profondita intensita={8} className="absolute -top-2 right-1 w-16">
          <PallinaCheDondola className="w-16" />
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
        <Tasto className="mt-5">Apri la busta</Tasto>
      </Feltro>

      {/* Riquadro cliccabile: in rilievo, come i tasti */}
      <Link href="/stile" className="feltro cliccabile mt-4 flex items-center gap-3.5 px-4 py-3.5 [--spessore:#c4a877]">
        <span className="relative h-[52px] w-14 flex-none" aria-hidden>
          <span className="absolute top-1.5 left-0 h-11 w-[38px] -rotate-10 rounded-md border-[3px] border-[#fbf8f0] bg-senape shadow" />
          <span className="absolute top-0.5 left-3 h-11 w-[38px] rotate-2 rounded-md border-[3px] border-[#fbf8f0] bg-rosa shadow" />
          <span className="absolute top-1.5 left-6 h-11 w-[38px] rotate-12 rounded-md border-[3px] border-[#fbf8f0] bg-kraft shadow" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block font-titolo text-lg leading-tight whitespace-nowrap text-abete">La tua bacheca</span>
          <span className="block text-sm text-inchiostro/75">3 cose aggiunte</span>
        </span>
        <span className="relative mr-1 text-abete [&_svg]:size-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.4]">
          {Icone.avanti}
        </span>
      </Link>

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
      <p className="mt-4 text-[13px] text-crema/70">
        Prova: tocca la pallina (sul telefono Android puoi anche scuoterlo).
      </p>

      {/* ---------- Esempio: crea il gruppo ---------- */}
      <Separatore titolo="Esempio: crea il gruppo" />
      <TornaAlGruppo href="/stile" nome="Indietro" />
      <h1 className="mt-4 font-titolo text-[34px] leading-none">Crea il gruppo</h1>
      <Feltro className="mt-5">
        <div className="flex flex-col gap-5">
          <Campo id="prova-nome" etichetta="Come si chiama il gruppo?" placeholder="Natale tra amici" aiuto="Lo vedranno tutti gli invitati." />
          <Campo id="prova-tema" etichetta="Tema (facoltativo)" placeholder="Regali fatti a mano" />
        </div>
      </Feltro>
      <div className="mt-6 flex flex-col items-center gap-2">
        <Tasto variante="vermiglio" largo>
          Crea il gruppo
        </Tasto>
        <TastoTesto>Annulla</TastoTesto>
      </div>

      {/* ---------- Esempio: area dell'organizzatore ---------- */}
      <Separatore titolo="Esempio: area dell'organizzatore" />
      <TornaAlGruppo href="/stile" nome="Natale tra amici" />
      <h1 className="mt-4 font-titolo text-[34px] leading-none">Organizza</h1>
      <p className="mt-2 text-crema/80">Solo tu vedi questa pagina.</p>

      <Feltro className="mt-5">
        <h2 className="font-titolo text-[22px] text-abete">Quando e quanto</h2>
        <div className="mt-4 flex flex-col gap-5">
          <Campo id="prova-data" type="date" etichetta="Giorno dello scambio" defaultValue="2026-12-20" />
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-inchiostro">Budget a persona</span>
            <div className="flex items-center gap-3">
              <TastoTondo etichetta="Diminuisci il budget" icona={Icone.meno} />
              <span className="min-w-20 text-center font-titolo text-3xl text-vermiglio">30 €</span>
              <TastoTondo etichetta="Aumenta il budget" icona={Icone.piu} />
            </div>
          </div>
        </div>
      </Feltro>

      <Feltro className="mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-titolo text-[22px] text-abete">Chi partecipa</h2>
          <span className="text-sm text-inchiostro/70">4 su 6 entrati</span>
        </div>
        <ul className="mt-3 divide-y-2 divide-dashed divide-abete/15">
          {membri.map((m) => (
            <li key={m.nome} className="flex min-h-14 items-center gap-3 py-2">
              <Toppa emoji={m.entrato ? m.emoji : "·"} dimensione={40} />
              <span className="flex-1">
                <span className="block font-medium">{m.nome}</span>
                <span className={`block text-sm ${m.entrato ? "text-abete" : "text-inchiostro/60"}`}>
                  {m.entrato ? "è entrato" : "non è ancora entrato"}
                </span>
              </span>
              <TastoTondo etichetta={`Opzioni per ${m.nome}`} icona={Icone.altro} />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-end gap-3">
          <div className="flex-1">
            <Campo id="prova-nuovo" etichetta="Aggiungi una persona" placeholder="Nome e cognome" />
          </div>
          <TastoTondo etichetta="Aggiungi" icona={Icone.piu} variante="verde" />
        </div>
      </Feltro>

      <Feltro className="mt-4">
        <h2 className="font-titolo text-[22px] text-abete">Chi non deve pescarsi</h2>
        <p className="mt-1 text-sm text-inchiostro/70">Per esempio le coppie, che si fanno già un regalo.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <EtichettaStoffa colore="verde">Giulia e Marco</EtichettaStoffa>
        </div>
        <Tasto variante="crema" className="mt-4">
          Aggiungi una coppia
        </Tasto>
      </Feltro>

      <Feltro className="mt-4">
        <h2 className="font-titolo text-[22px] text-abete">Link d&apos;invito</h2>
        <p className="mt-1 text-sm text-inchiostro/70">Mandalo nel gruppo: ognuno tocca il proprio nome.</p>
        <div className="campo-cucito mt-3">
          <input readOnly value="secretsanta.app/g/3f9a1c7e2b4d" aria-label="Link d'invito" />
        </div>
        <Tasto variante="verde" largo className="mt-4">
          Condividi il link
        </Tasto>
      </Feltro>

      <Feltro variante="vermiglio" className="mt-4">
        <h2 className="font-titolo text-[24px]">Estrazione</h2>
        <p className="mt-1">Mancano Anna e Pietro. Quando entrano tutti, potrai fare l&apos;estrazione: si fa una volta sola.</p>
        <Tasto variante="crema" largo className="mt-4" disabled>
          Fai l&apos;estrazione
        </Tasto>
      </Feltro>

      {/* ---------- Riferimenti ---------- */}
      <Separatore titolo="Riferimenti" />
      <h2 className="font-titolo text-3xl">Cliccabile o no?</h2>
      <p className="mt-1 text-crema/80">
        Ciò che si tocca è in rilievo (ha uno spessore sotto), si solleva al passaggio del mouse e si schiaccia al tocco. Ciò che è solo
        informazione è piatto, cucito sulla stoffa.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Tasto>Apri la busta</Tasto>
        <TastoTondo etichetta="Modifica" icona={Icone.matita} />
        <TastoTondo etichetta="Aggiungi" icona={Icone.piu} variante="verde" />
        <TastoTondo etichetta="Ricama" icona={Icone.ago} variante="vermiglio" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <EtichettaStoffa>non cliccabile</EtichettaStoffa>
        <EtichettaStoffa colore="vermiglio">informazione</EtichettaStoffa>
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
