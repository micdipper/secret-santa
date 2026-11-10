"use client";

import confetti from "canvas-confetti";
import { animate, motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { ToppaAvatar, type Look } from "@/components/avatar";
import { Stellina } from "@/components/ornamenti";
import { Feltro, Tasto, TastoLink, TitoloRiquadro } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";

export type Persona = { id: string; nome: string; look: Look | null };

const ALTEZZA_VOCE = 120; // altezza di un personaggio nel rullo (px)
const GIRI = 26; // quanti personaggi passano prima di fermarsi

/*
  Apertura della busta in due tempi:
  1) slot machine: i personaggi del gruppo scorrono e si fermano su chi ti è uscito
     (il risultato arriva già deciso dal database: è solo spettacolo);
  2) la busta si apre ed esce il biglietto col nome.
  Se la busta era già stata aperta, si vede subito il biglietto.
*/
export function AperturaBusta({
  groupId,
  candidati,
  destinatario,
  giaAperta,
}: {
  groupId: string;
  candidati: Persona[];
  destinatario: Persona;
  giaAperta: boolean;
}) {
  const supabase = clientSoloBrowser();
  const ridotto = useReducedMotion();
  const rullo = useRef<HTMLDivElement>(null);
  const [fase, setFase] = useState<"leva" | "gira" | "fermo" | "busta" | "biglietto">(giaAperta ? "biglietto" : "leva");
  const [voci, setVoci] = useState<(Persona | null)[]>([null, ...candidati.slice(0, 2)]);
  const [leva, setLeva] = useState(false);

  async function tiraLaLeva() {
    // Sequenza: "?" iniziale, poi personaggi mescolati, e alla fine chi ti è uscito
    const mescolati: Persona[] = [];
    while (mescolati.length < GIRI) {
      const giro = [...candidati].sort(() => Math.random() - 0.5);
      mescolati.push(...giro);
    }
    const giro = mescolati.slice(0, GIRI);
    // subito prima e subito dopo non deve passare la stessa persona (sembrerebbe già fermo)
    const altri = candidati.filter((c) => c.id !== destinatario.id);
    if (altri.length && giro[GIRI - 1].id === destinatario.id) giro[GIRI - 1] = altri[0];
    const lista = [null, ...giro, destinatario, altri[1] ?? altri[0] ?? null];
    setVoci(lista);
    setFase("gira");
    setLeva(true);
    setTimeout(() => setLeva(false), 450);

    await new Promise((ok) => requestAnimationFrame(ok));
    const el = rullo.current;
    if (el) {
      el.style.transform = "translateY(0px)";
      await animate(el, { y: -(GIRI + 1) * ALTEZZA_VOCE }, { duration: ridotto ? 0.6 : 4.2, ease: [0.15, 0.85, 0.25, 1] });
    }
    setFase("fermo");
    if (!ridotto) confetti({ particleCount: 70, spread: 70, origin: { y: 0.4 }, colors: ["#e5481e", "#e9a81c", "#f3e8cf", "#2c4a32"] });
    setTimeout(() => setFase("busta"), 1600);
  }

  async function apriLaBusta() {
    setFase("biglietto");
    // Me lo ricordo: la pagina del gruppo mostrerà il promemoria (e sblocca il premio calendario)
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    await supabase
      .from("group_members")
      .update({ envelope_opened_at: new Date().toISOString() })
      .eq("group_id", groupId)
      .eq("user_id", uid)
      .is("envelope_opened_at", null);
  }

  const nomeBreve = destinatario.nome.split(" ")[0];

  if (fase === "biglietto") {
    return (
      <motion.div
        initial={giaAperta || ridotto ? false : { y: 60, opacity: 0, rotate: -4 }}
        animate={{ y: 0, opacity: 1, rotate: -1.5 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
      >
        <Biglietto destinatario={destinatario} />
        <TastoLink href={`/gruppo/${groupId}/bacheca/${destinatario.id}`} className="mt-6">
          Guarda la bacheca di {nomeBreve}
        </TastoLink>
      </motion.div>
    );
  }

  if (fase === "busta") {
    return (
      <Feltro>
        <TitoloRiquadro>Ecco la tua busta</TitoloRiquadro>
        <p className="mt-2">Dentro c&apos;è il biglietto. Lo vedi solo tu.</p>
        <motion.div
          className="relative mx-auto mt-6 w-full max-w-[280px]"
          initial={ridotto ? false : { scale: 0.6, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: -3, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 12 }}
        >
          <BustaGrande />
        </motion.div>
        <Tasto className="mt-6" onClick={apriLaBusta}>
          Apri la busta
        </Tasto>
      </Feltro>
    );
  }

  return (
    <Feltro>
      <TitoloRiquadro>Chi ti è uscito?</TitoloRiquadro>
      <p className="mt-2">Tira la leva: la macchinetta si fermerà sulla persona a cui farai il regalo.</p>

      <div className="mt-6 flex items-center justify-center gap-3">
        {/* La macchinetta: un rullo di personaggi dentro una finestra cucita */}
        <div className="relative w-[200px] rounded-[28px] bg-vermiglio p-4 shadow-[inset_0_-6px_12px_rgba(0,0,0,.25)]">
          <div className="pointer-events-none absolute inset-2 rounded-[22px] border-2 border-dashed border-crema/60" />
          <div className="relative h-[200px] overflow-hidden rounded-2xl bg-crema shadow-[inset_0_4px_10px_rgba(0,0,0,.25)]">
            <div ref={rullo} className="absolute inset-x-0 top-[40px]">
              {voci.map((p, i) => (
                <div key={i} className="flex flex-col items-center justify-center gap-1" style={{ height: ALTEZZA_VOCE }}>
                  {p ? (
                    <>
                      <ToppaAvatar look={p.look} dimensione={80} />
                      <span className="font-titolo text-lg leading-none text-abete">{p.nome.split(" ")[0]}</span>
                    </>
                  ) : (
                    <span className="toppa size-20 font-titolo text-4xl text-vermiglio">?</span>
                  )}
                </div>
              ))}
            </div>
            {/* sfumature in alto e in basso, come un rullo che gira */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#d9ccb0] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#d9ccb0] to-transparent" />
            {fase === "fermo" && <div className="pointer-events-none absolute inset-x-2 top-[38px] h-[124px] rounded-2xl border-[3px] border-senape" />}
          </div>
          <Stellina className="absolute -top-3 -left-3 size-7 text-senape" />
          <Stellina className="absolute -right-2 -bottom-3 size-5 text-senape" />
        </div>

        {/* La leva (decorativa: si tira col tasto qui sotto) */}
        <motion.div
          aria-hidden
          className="flex h-[150px] w-6 origin-bottom flex-col items-center"
          animate={{ rotateX: leva ? 160 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ transformPerspective: 400 }}
        >
          <span className="size-6 flex-none rounded-full bg-senape shadow-[inset_-2px_-3px_4px_rgba(0,0,0,.25)]" />
          <span className="w-1.5 flex-1 rounded-full bg-crema/80" />
          <span className="h-4 w-4 flex-none rounded-sm bg-vermiglio-scuro" />
        </motion.div>
      </div>

      {fase === "leva" ? (
        <Tasto className="mt-6" onClick={tiraLaLeva} disabled={candidati.length === 0}>
          Tira la leva
        </Tasto>
      ) : (
        // mentre gira non c'è niente da toccare: solo una scritta
        <p className="mt-6 flex h-14 items-center justify-center font-titolo text-2xl text-vermiglio" aria-live="polite">
          {fase === "gira" ? "Gira, gira…" : `È ${nomeBreve}!`}
        </p>
      )}
    </Feltro>
  );
}

// Biglietto col nome, come un'etichetta per pacchi.
function Biglietto({ destinatario }: { destinatario: Persona }) {
  return (
    <div className="relative rounded-[28px] bg-crema p-6 text-center text-inchiostro shadow-[0_16px_30px_-12px_rgba(0,0,0,.6)]">
      <div className="pointer-events-none absolute inset-2 rounded-[20px] border-2 border-dashed border-vermiglio/70" />
      <span className="absolute top-4 left-1/2 size-4 -translate-x-1/2 rounded-full bg-abete shadow-[inset_0_2px_3px_rgba(0,0,0,.4)]" />
      <p className="relative mt-6 text-sm text-inchiostro/70">Farai il regalo a</p>
      <div className="relative mt-4 flex justify-center">
        <ToppaAvatar look={destinatario.look} dimensione={120} nome={destinatario.nome} />
      </div>
      <p className="relative mt-4 font-titolo text-[32px] leading-none text-vermiglio">{destinatario.nome}</p>
      <p className="relative mt-4">Acqua in bocca! Guarda la sua bacheca per farti venire un&apos;idea.</p>
    </div>
  );
}

// Busta grande disegnata (la versione 3D arriverà dopo).
function BustaGrande() {
  return (
    <svg viewBox="0 0 280 190" className="w-full drop-shadow-[0_12px_18px_rgba(0,0,0,.35)]" aria-hidden>
      <rect x="4" y="4" width="272" height="182" rx="10" fill="#f7efdd" />
      <path d="M4 14l136 96L276 14" fill="#efe3c9" />
      <path d="M4 14l136 96L276 14" fill="none" stroke="#000" strokeOpacity=".08" strokeWidth="2" />
      <path d="M4 182l100-76M276 182L176 106" stroke="#000" strokeOpacity=".06" strokeWidth="2" />
      <circle cx="140" cy="108" r="24" fill="#b3261e" />
      <circle cx="140" cy="108" r="16" fill="none" stroke="#5c0d0d" strokeOpacity=".5" strokeWidth="2" />
      <path d="M140 98l2.4 7.6 7.6 2.4-7.6 2.4-2.4 7.6-2.4-7.6-7.6-2.4 7.6-2.4z" fill="#f1d27a" />
    </svg>
  );
}
