import Link from "next/link";
import { BustaSigillata, CuoreFolk, Pallina, Rametto, StellaNordica, Stellina, Uccellino } from "@/components/ornamenti";
import { PallinaCheDondola } from "@/components/pallina-che-dondola";
import { Profondita } from "@/components/profondita";
import { Campo, EtichettaStoffa, Feltro, Icone, Tasto, TastoTondo, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { ACCESSORI, Avatar, NOMI_BARBA, NOMI_CAPELLI, ToppaAvatar, lookIniziale } from "@/components/avatar";

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
    <div className="my-10 flex items-center gap-3 text-sm text-crema/60">
      <span className="flex-1 border-t-2 border-dashed border-crema/20" />
      {titolo}
      <span className="flex-1 border-t-2 border-dashed border-crema/20" />
    </div>
  );
}

export default function Stile() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-x-hidden px-5 pb-16">
      {/* Galleria dei personaggi: tutti i tagli, le barbe e i premi */}
      <section id="personaggi" className="grid grid-cols-3 gap-3 pt-6">
        {NOMI_CAPELLI.map((n, i) => (
          <figure key={n} className="toppa aspect-square w-full overflow-hidden">
            <Avatar look={{ pelle: i % 6, capelli: i, coloreCapelli: i === 12 ? 7 : i % 7, barba: 0, occhiali: 0, maglione: i % 6, accessori: [] }} className="relative top-[8%] h-full w-full" titolo={n} />
          </figure>
        ))}
        {NOMI_BARBA.slice(1).map((n, i) => (
          <figure key={n} className="toppa aspect-square w-full overflow-hidden">
            <Avatar look={{ pelle: (i + 2) % 6, capelli: [0, 8, 5, 11][i], coloreCapelli: [0, 2, 3, 5][i], barba: i + 1, occhiali: i % 3, maglione: i, accessori: [] }} className="relative top-[8%] h-full w-full" titolo={n} />
          </figure>
        ))}
      </section>
      {/* I premi, uno per volta, e infine tutti insieme */}
      <section id="premi" className="mt-6 grid grid-cols-3 gap-x-3 gap-y-4">
        {[
          ...ACCESSORI.map((a, i) => ({ nome: a.nome, look: { pelle: [1, 3, 0, 4][i], capelli: [0, 2, 7, 9][i], coloreCapelli: [1, 3, 0, 5][i], barba: 0, occhiali: 0, maglione: [3, 1, 4, 0][i], accessori: [a.id] } })),
          { nome: "Taglio Super", look: { pelle: 2, capelli: 12, coloreCapelli: 3, barba: 0, occhiali: 0, maglione: 3, accessori: [] } },
          { nome: "Capelli olografici", look: { pelle: 5, capelli: 4, coloreCapelli: 7, barba: 0, occhiali: 0, maglione: 1, accessori: [] } },
          { nome: "Tutti i premi", look: { pelle: 1, capelli: 12, coloreCapelli: 7, barba: 0, occhiali: 1, maglione: 3, accessori: ACCESSORI.map((a) => a.id) } },
        ].map((p) => (
          <figure key={p.nome} className="flex flex-col items-center gap-2">
            <span className="toppa aspect-square w-full overflow-hidden">
              <Avatar look={p.look} className="relative top-[8%] h-full w-full" titolo={p.nome} />
            </span>
            <figcaption className="text-center text-sm leading-tight">{p.nome}</figcaption>
          </figure>
        ))}
      </section>
      {/* ================= Pagina del gruppo ================= */}
      <header className="relative pt-10">
        <Profondita intensita={8} className="absolute -top-2 right-0 w-16">
          <PallinaCheDondola className="w-16" />
        </Profondita>
        <h1 className="pr-16 font-titolo text-[32px] leading-none">Natale tra amici</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <EtichettaStoffa colore="vermiglio">41 giorni allo scambio</EtichettaStoffa>
          <EtichettaStoffa>sab 20 dic</EtichettaStoffa>
          <EtichettaStoffa>budget 30 €</EtichettaStoffa>
        </div>
      </header>

      <Feltro className="mt-6">
        <BustaSigillata className="absolute -top-1 right-0 w-16 rotate-[8deg] drop-shadow-[0_3px_4px_rgba(0,0,0,.3)]" />
        <TitoloRiquadro className="pr-20">La tua busta è pronta</TitoloRiquadro>
        <p className="mt-2 pr-16">Scopri a chi farai il regalo. Lo vedrai solo tu.</p>
        <Tasto className="mt-5">Apri la busta</Tasto>
      </Feltro>

      {/* Riquadro cliccabile: in rilievo come i tasti, con la freccia */}
      <Link href="/stile" className="feltro cliccabile mt-4 flex items-center gap-4 p-4 pl-5">
        <span className="relative h-12 w-14 flex-none" aria-hidden>
          <span className="absolute top-1 left-0 h-11 w-9 -rotate-10 rounded-md border-[3px] border-[#fbf8f0] bg-senape shadow" />
          <span className="absolute top-0 left-3 h-11 w-9 rotate-2 rounded-md border-[3px] border-[#fbf8f0] bg-rosa shadow" />
          <span className="absolute top-1 left-6 h-11 w-9 rotate-12 rounded-md border-[3px] border-[#fbf8f0] bg-kraft shadow" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block font-titolo text-lg leading-tight text-abete">La tua bacheca</span>
          <span className="block text-sm text-inchiostro/70">3 cose aggiunte</span>
        </span>
        <span className="relative mr-2 text-abete [&_svg]:size-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[2.4]">
          {Icone.avanti}
        </span>
      </Link>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-titolo text-2xl">Chi c&apos;è</h2>
          <span className="text-sm text-crema/75">12 persone</span>
        </div>
        <ul className="-mx-5 mt-4 flex gap-3 overflow-x-auto px-5 pt-1 pb-2">
          {membri.map((m) => (
            <li key={m.nome} className="flex-none">
              <Link href="/stile" className="flex w-16 flex-col items-center gap-2 text-sm" aria-label={`Bacheca di ${m.nome}`}>
                <ToppaAvatar look={lookIniziale(m.nome)} novita={m.novita} cliccabile />
                {m.nome}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-crema/70">Tocca una persona per vedere la sua bacheca. Il pallino giallo indica chi l&apos;ha appena aggiornata.</p>
      </section>

      {/* ================= Crea il gruppo ================= */}
      <Separatore titolo="Esempio: crea il gruppo" />
      <TestataInterna indietro="/stile" etichettaIndietro="Torna ai tuoi gruppi" titolo="Crea il gruppo" />
      <Feltro className="mt-6">
        <div className="flex flex-col gap-5">
          <Campo id="prova-nome" etichetta="Come si chiama il gruppo?" placeholder="Natale tra amici" aiuto="Lo vedranno tutti gli invitati." />
          <Campo id="prova-tema" etichetta="Tema (facoltativo)" placeholder="Regali fatti a mano" />
        </div>
        <Tasto className="mt-6">Crea il gruppo</Tasto>
      </Feltro>

      {/* ================= Area dell'organizzatore ================= */}
      <Separatore titolo="Esempio: area dell'organizzatore" />
      <TestataInterna
        indietro="/stile"
        etichettaIndietro="Torna a Natale tra amici"
        contesto="Natale tra amici"
        titolo="Organizza"
        sottotitolo="Solo tu vedi questa pagina."
      />

      <Feltro className="mt-6">
        <TitoloRiquadro>Quando e quanto</TitoloRiquadro>
        <div className="mt-5 flex flex-col gap-5">
          <Campo id="prova-data" type="date" etichetta="Giorno dello scambio" defaultValue="2026-12-20" />
          <div className="flex flex-col gap-2">
            <span className="font-medium">Budget a persona</span>
            <div className="flex items-center justify-between gap-3">
              <TastoTondo etichetta="Diminuisci il budget" icona={Icone.meno} />
              <span className="font-titolo text-[32px] leading-none text-vermiglio">30 €</span>
              <TastoTondo etichetta="Aumenta il budget" icona={Icone.piu} />
            </div>
          </div>
        </div>
      </Feltro>

      <Feltro className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <TitoloRiquadro>Chi partecipa</TitoloRiquadro>
          <span className="text-sm text-inchiostro/70">4 su 6 entrati</span>
        </div>
        <ul className="mt-3 divide-y-2 divide-dashed divide-abete/15">
          {membri.map((m) => (
            <li key={m.nome} className="flex items-center gap-3 py-3">
              <ToppaAvatar look={m.entrato ? lookIniziale(m.nome) : null} dimensione={40} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{m.nome}</span>
                <span className={`block text-sm ${m.entrato ? "text-abete" : "text-inchiostro/60"}`}>
                  {m.entrato ? "è entrato" : "non è ancora entrato"}
                </span>
              </span>
              <TastoTondo etichetta={`Opzioni per ${m.nome}`} icona={Icone.altro} />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <Campo id="prova-nuovo" etichetta="Aggiungi una persona" placeholder="Nome e cognome" />
          </div>
          <TastoTondo etichetta="Aggiungi" icona={Icone.piu} />
        </div>
      </Feltro>

      <Feltro className="mt-4">
        <TitoloRiquadro>Chi non deve pescarsi</TitoloRiquadro>
        <p className="mt-2 text-sm text-inchiostro/70">Per esempio le coppie, che si fanno già un regalo.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <EtichettaStoffa colore="verde">Giulia e Marco</EtichettaStoffa>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Tasto tipo="secondario" className="flex-1">
            Nuova coppia
          </Tasto>
          <TastoTondo etichetta="Togli una coppia" icona={Icone.meno} />
        </div>
      </Feltro>

      <Feltro className="mt-4">
        <TitoloRiquadro>Link d&apos;invito</TitoloRiquadro>
        <p className="mt-2 text-sm text-inchiostro/70">Mandalo nel gruppo: ognuno tocca il proprio nome. Sul computer il link viene copiato.</p>
        <Tasto tipo="secondario" className="mt-5">
          Condividi il link
        </Tasto>
      </Feltro>

      <Feltro className="mt-4">
        <TitoloRiquadro>Estrazione</TitoloRiquadro>
        <p className="mt-2">Mancano Anna e Pietro. Quando entrano tutti potrai fare l&apos;estrazione: si fa una volta sola.</p>
        <Tasto className="mt-5" disabled>
          Fai l&apos;estrazione
        </Tasto>
      </Feltro>

      {/* ================= Riferimenti ================= */}
      <Separatore titolo="Riferimenti" />
      <h2 className="font-titolo text-2xl">I tre tasti</h2>
      <p className="mt-2 text-crema/80">Tutti alti 56px. Tutto ciò che si tocca è in rilievo; ciò che è informazione è piatto.</p>
      <Feltro className="mt-4">
        <p className="text-sm text-inchiostro/70">1. Primario: l&apos;azione principale, uno per riquadro</p>
        <Tasto className="mt-2">Apri la busta</Tasto>
        <p className="mt-5 text-sm text-inchiostro/70">2. Secondario: azioni utili ma non principali</p>
        <Tasto tipo="secondario" className="mt-2">
          Condividi il link
        </Tasto>
        <p className="mt-5 text-sm text-inchiostro/70">3. Tondo: piccole azioni con un&apos;icona</p>
        <div className="mt-2 flex gap-3">
          <TastoTondo etichetta="Modifica" icona={Icone.matita} />
          <TastoTondo etichetta="Aggiungi" icona={Icone.piu} />
          <TastoTondo etichetta="Ricama" icona={Icone.ago} />
          <TastoTondo etichetta="Indietro" icona={Icone.indietro} />
        </div>
        <p className="mt-5 text-sm text-inchiostro/70">Non cliccabili: piatti</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <EtichettaStoffa>sab 20 dic</EtichettaStoffa>
          <EtichettaStoffa colore="vermiglio">41 giorni</EtichettaStoffa>
          <ToppaAvatar look={lookIniziale("Giulia")} dimensione={40} />
        </div>
      </Feltro>

      <h2 className="mt-8 font-titolo text-2xl">Testi</h2>
      <Feltro className="mt-4">
        <p className="font-titolo text-[32px] leading-none text-abete">Titolo pagina 32</p>
        <p className="mt-3 font-titolo text-2xl leading-tight text-abete">Titolo riquadro 24</p>
        <p className="mt-2">Testo 16: Bricolage Grotesque, per tutto quello che si legge.</p>
        <p className="mt-1 text-sm text-inchiostro/70">Nota 14: aiuti e dettagli.</p>
      </Feltro>

      <h2 className="mt-8 font-titolo text-2xl">Colori</h2>
      <ul className="mt-4 grid grid-cols-3 gap-3">
        {palette.map((c) => (
          <li key={c.nome} className={`flex aspect-square flex-col justify-end rounded-[20px] p-3 ring-1 ring-crema/25 ${c.classe}`}>
            <span className="font-medium">{c.nome}</span>
            <span className="text-sm opacity-80">{c.hex}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-titolo text-2xl">Ornamenti</h2>
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
