"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, animate, motion, useAnimate, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import Link from "next/link";
import { Avatar, ToppaAvatar, type Look } from "@/components/avatar";
import { BigliettoOlografico } from "@/components/biglietto-olografico";
import { Feltro, Icone, Tasto, TastoLink, TitoloRiquadro } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";

// three.js si scarica solo quando serve (durante il giro della slot machine)
const caricaScena = () => import("@/components/scena-busta");
const ScenaBusta = dynamic(caricaScena, { ssr: false });
type FaseBusta = import("@/components/scena-busta").FaseBusta;
const Leva3D = dynamic(() => import("@/components/leva-3d"), { ssr: false });

export type Persona = { id: string; nome: string; look: Look | null };

const ALTEZZA_VOCE = 120; // altezza di un personaggio nel rullo (px)
const GIRI = 46; // quanti personaggi passano prima di fermarsi
const DURATA_GIRO = 7.5; // secondi
const CORSA_LEVA = 84; // quanto scende il pomello (px)
// Cosa dire in alto, passo per passo
const ISTRUZIONI: Record<FaseBusta, (tocchi: number) => string> = {
  cade: () => "Attenzione… arriva!",
  neve: (n) => (n === 0 ? "È finita nella neve! Toccala per tirarla fuori" : n === 1 ? "Ancora un colpetto!" : "Dai, ultimo tocco!"),
  vola: () => "Eccola!",
  sigillo: () => "Gratta via il sigillo col dito",
  lembo: () => "Ora apri la busta: trascina il lembo in su",
  biglietto: () => "Ecco a chi!",
};

const COLORI = ["#e5481e", "#e9a81c", "#f3e8cf", "#2c4a32", "#f4a9c4"];

function webglDisponibile() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/*
  Apertura della busta:
  1) slot machine: si tira la leva, i personaggi del gruppo scorrono a lungo e si fermano
     su un pacchetto misterioso (chi è lo dice solo la busta);
  2) scena: la busta arriva volando in 3D tra neve e stelline; "Apri la busta" la apre;
  3) esce il biglietto, si gira e mostra il nome.
  Il risultato arriva già deciso dal database: è solo spettacolo.
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
  const [fase, setFase] = useState<"leva" | "gira" | "fermo" | "scena" | "biglietto">(giaAperta ? "biglietto" : "leva");
  const [voci, setVoci] = useState<(Persona | "?")[]>(["?", ...candidati.slice(0, 2)]);
  const [sfocato, setSfocato] = useState(false);
  const [busta3d, setBusta3d] = useState(true);
  const [bustaPronta, setBustaPronta] = useState(false);
  const [aperta, setAperta] = useState(false);
  const [faseScena, setFaseScena] = useState<FaseBusta>("cade");
  const [tocchi, setTocchi] = useState(0);
  const [rivelato, setRivelato] = useState(false);
  const avatarNascosto = useRef<HTMLDivElement>(null);
  // il personaggio come immagine, per disegnarlo sul biglietto 3D
  const prendiSvg = () => {
    const el = avatarNascosto.current?.querySelector("svg");
    return el ? new XMLSerializer().serializeToString(el) : null;
  };
  const [macchina, animaMacchina] = useAnimate();
  const rullo = useRef<HTMLDivElement>(null);
  const partito = useRef(false);

  // ---------- leva ----------
  const y = useMotionValue(0);
  const asta = useTransform(y, [0, CORSA_LEVA], [CORSA_LEVA + 20, 20]);

  async function tiraLaLeva() {
    if (partito.current) return;
    partito.current = true;
    caricaScena(); // intanto preparo la busta 3D
    setBusta3d(!ridotto && webglDisponibile());
    if (y.get() < CORSA_LEVA * 0.8) await animate(y, CORSA_LEVA, { duration: 0.18 });
    animate(y, 0, { type: "spring", stiffness: 260, damping: 9 });

    // i personaggi mescolati, e in fondo il pacchetto misterioso
    const mescolati: Persona[] = [];
    while (mescolati.length < GIRI) mescolati.push(...[...candidati].sort(() => Math.random() - 0.5));
    setVoci(["?", ...mescolati.slice(0, GIRI), "?", mescolati[0] ?? "?"]);
    setFase("gira");
    setSfocato(true);
    animaMacchina(macchina.current, { x: [0, -6, 6, -4, 4, 0], rotate: [0, -1, 1, -0.5, 0] }, { duration: 0.45 });

    await new Promise((ok) => requestAnimationFrame(ok));
    const el = rullo.current!;
    const arrivo = -(GIRI + 1) * ALTEZZA_VOCE;
    const durata = ridotto ? 0.8 : DURATA_GIRO;
    setTimeout(() => setSfocato(false), durata * 600);
    await animate(el, { y: [0, arrivo - 14, arrivo] }, { duration: durata, times: [0, 0.94, 1], ease: [[0.12, 0.6, 0.22, 1], "easeOut"] });

    setFase("fermo");
    animaMacchina(macchina.current, { scale: [1, 1.05, 1], rotate: [0, 1.5, -1.5, 0] }, { duration: 0.5 });
    if (!ridotto) confetti({ particleCount: 60, spread: 80, startVelocity: 35, origin: { y: 0.45 }, colors: COLORI });
    setTimeout(() => {
      setFase("scena");
    }, 1500);
  }

  // ---------- busta ----------
  // Su iPhone il permesso per il movimento si può chiedere solo dopo un tocco
  function chiediMovimento() {
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof D?.requestPermission === "function") D.requestPermission().catch(() => {});
  }

  // versione semplice (senza 3D): un tocco e si apre
  function apriLaBusta() {
    chiediMovimento();
    bustaAperta();
  }

  // Me lo ricordo: la pagina del gruppo mostrerà il promemoria (e sblocca il premio calendario)
  async function segnaAperta() {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (uid) {
      await supabase
        .from("group_members")
        .update({ envelope_opened_at: new Date().toISOString() })
        .eq("group_id", groupId)
        .eq("user_id", uid)
        .is("envelope_opened_at", null);
    }
  }

  // il biglietto è fuori: festa! (in 2D il biglietto si gira da solo, quindi aspetto un attimo)
  function bustaAperta() {
    setRivelato(true);
    setAperta(true);
    segnaAperta();
    if (!ridotto) {
      setTimeout(
        () => {
          confetti({ particleCount: 120, spread: 100, startVelocity: 45, origin: { y: 0.5 }, colors: COLORI, zIndex: 60 });
          confetti({ particleCount: 40, spread: 360, startVelocity: 20, shapes: ["star"], colors: ["#f1d27a", "#e9a81c"], origin: { y: 0.4 }, zIndex: 60 });
        },
        busta3d ? 0 : 1300,
      );
    }
  }

  const nomeBreve = destinatario.nome.split(" ")[0];

  return (
    <>
      {fase === "biglietto" ? (
        <div>
          <BigliettoOlografico nome={destinatario.nome} look={destinatario.look} conIngresso={!giaAperta} />
          <motion.div initial={giaAperta ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: giaAperta ? 0 : 1.8 }}>
            <p className="mt-6 text-center text-sm text-crema/75">Inclinalo col dito o muovendo il telefono.</p>
            <TastoLink href={`/gruppo/${groupId}/bacheca/${destinatario.id}`} className="mt-4">
              Guarda la bacheca di {nomeBreve}
            </TastoLink>
          </motion.div>
        </div>
      ) : (
        <Feltro>
          <TitoloRiquadro>Chi ti è uscito?</TitoloRiquadro>
          <p className="mt-2">{fase === "leva" ? "Tira giù la leva e incrocia le dita." : fase === "gira" ? "Gira, gira, gira…" : "Ecco… è lui o lei!"}</p>

          {/* La macchinetta, centrata; la leva è attaccata al suo fianco */}
          <div className="mt-8 flex justify-center">
            <motion.div ref={macchina} className="relative w-[196px]">
              {/* insegna */}
              <div className="relative mx-auto -mb-2 w-[150px] rounded-t-[20px] bg-abete px-3 pt-2 pb-4 text-center font-titolo text-sm leading-tight text-crema">
                Babbo-matic
              </div>
              <div className="relative rounded-[28px] bg-vermiglio p-4 shadow-[inset_0_-8px_14px_rgba(0,0,0,.25),0_12px_20px_-10px_rgba(0,0,0,.5)]">
                <div className="pointer-events-none absolute inset-2 rounded-[20px] border-2 border-dashed border-crema/60" />
                <Lampadine fase={fase} />
                <div className="relative mt-3 h-[200px] overflow-hidden rounded-2xl bg-crema shadow-[inset_0_6px_12px_rgba(0,0,0,.3)]">
                  <div ref={rullo} className="absolute inset-x-0 top-[40px]" style={{ filter: sfocato && !ridotto ? "blur(2px)" : "none", transition: "filter .6s" }}>
                    {voci.map((p, i) => (
                      <div key={i} className="flex items-center justify-center" style={{ height: ALTEZZA_VOCE }}>
                        {p === "?" ? <Sigillo /> : <ToppaAvatar look={p.look} dimensione={92} />}
                      </div>
                    ))}
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#cbbd9f] to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#cbbd9f] to-transparent" />
                  {/* linea di mira */}
                  <div className={`pointer-events-none absolute inset-x-2 top-[44px] h-[112px] rounded-2xl border-[3px] ${fase === "fermo" ? "border-senape" : "border-vermiglio/25"}`} />
                </div>
                <Lampadine fase={fase} />
              </div>

              {/* attacco di feltro verde sul fianco, da cui esce la leva */}
              <span className="absolute top-[176px] -right-[16px] h-12 w-5 rounded-r-xl bg-abete shadow-[inset_-2px_-3px_4px_rgba(0,0,0,.25)]">
                <span className="absolute inset-[3px] rounded-r-lg border-2 border-dashed border-crema/50 border-l-0" />
              </span>
              {/* Leva 3D attaccata al fianco (se il 3D non c'è, quella semplice) */}
              <div className="absolute top-0 -right-[70px] z-20 h-[300px] w-[120px]">
                <Leva3D
                  attiva={fase === "leva" && candidati.length > 0}
                  onTira={tiraLaLeva}
                  riserva={
                    <div className="pointer-events-auto absolute top-[64px] left-[56px] h-[150px] w-[34px]">
                {/* attacco dorato sul fianco */}
                <span className="absolute bottom-0 left-0 h-9 w-6 rounded-r-xl bg-[linear-gradient(90deg,#9c7a22,#f1d27a_45%,#b8922f)] shadow-[0_2px_4px_rgba(0,0,0,.35)]" />
                {/* asta cromata */}
                <motion.span
                  className="absolute bottom-6 left-[13px] w-2 rounded-full bg-[linear-gradient(90deg,#8d939b,#f4f6f8_45%,#6f757d)]"
                  style={{ height: asta }}
                />
                {/* pomello */}
                <motion.button
                  type="button"
                  aria-label="Tira la leva"
                  disabled={fase !== "leva" || candidati.length === 0}
                  className="absolute -top-1 -left-[7px] size-12 touch-none rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff8a6a,#e5481e_45%,#8f2408)] shadow-[0_4px_8px_rgba(0,0,0,.45),inset_0_-3px_5px_rgba(0,0,0,.3)] disabled:cursor-default"
                  style={{ y }}
                  drag={fase === "leva" ? "y" : false}
                  dragConstraints={{ top: 0, bottom: CORSA_LEVA }}
                  dragElastic={0.05}
                  dragMomentum={false}
                  onDragEnd={() => (y.get() > CORSA_LEVA * 0.6 ? tiraLaLeva() : animate(y, 0, { type: "spring", stiffness: 300, damping: 12 }))}
                  onTap={() => fase === "leva" && tiraLaLeva()}
                >
                  <span className="absolute top-2 left-3 h-3 w-4 rounded-full bg-white/50 blur-[1px]" />
                </motion.button>
                    </div>
                  }
                />
                {fase === "leva" && !ridotto && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute top-[96px] right-0 font-titolo text-2xl text-senape"
                    animate={{ y: [0, 16, 0], opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.3 }}
                  >
                    ↓
                  </motion.span>
                )}
              </div>
            </motion.div>
          </div>
          <p className="mt-6 text-center text-sm text-inchiostro/70">
            {fase === "leva" ? "Trascina giù il pomello rosso (o toccalo)." : "Chi sarà? Lo scoprirai aprendo la busta."}
          </p>
        </Feltro>
      )}

      <div ref={avatarNascosto} className="hidden" aria-hidden>
        {destinatario.look && <Avatar look={destinatario.look} />}
      </div>

      {/* ---------- la scena della busta (a tutto schermo) ---------- */}
      <AnimatePresence>
        {fase === "scena" && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[radial-gradient(120%_80%_at_50%_40%,#2f5a39,#10251a)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.9, ease: "easeInOut" } }}
          >
            <div className="relative z-10 flex items-center gap-4 px-5 pt-[calc(env(safe-area-inset-top)+24px)]">
              {rivelato && (
                <Link href={`/gruppo/${groupId}`} aria-label="Torna al gruppo" title="Torna al gruppo" className="tasto-tondo cucitura cliccabile stoffa-chiara">
                  {Icone.indietro}
                </Link>
              )}
              <AnimatePresence mode="wait">
                <motion.p
                  key={rivelato ? "fine" : busta3d ? `${faseScena}-${tocchi}` : "semplice"}
                  className="flex-1 text-center font-titolo text-2xl leading-tight text-balance text-crema"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  aria-live="polite"
                >
                  {rivelato || aperta ? "Ecco a chi!" : busta3d ? ISTRUZIONI[faseScena](tocchi) : "Una busta per te"}
                </motion.p>
              </AnimatePresence>
              {rivelato && <span className="w-14" />}
            </div>
            {/* la scena occupa tutto lo schermo; titolo e tasto stanno sopra */}
            <motion.div className="absolute inset-0" animate={{ opacity: rivelato && busta3d ? 0 : 1 }} transition={{ duration: 0.5, delay: 0.15 }}>
              {busta3d ? (
                <ScenaBusta
                  nome={destinatario.nome}
                  avatarSvg={prendiSvg}
                  onFase={(f, n) => {
                    setFaseScena(f);
                    setTocchi(n ?? 0);
                  }}
                  onPrimoTocco={chiediMovimento}
                  onAperta={bustaAperta}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-8">
                  <motion.div
                    className="w-full max-w-[300px]"
                    initial={ridotto ? false : { scale: 0.4, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: -3, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 120, damping: 12 }}
                    onAnimationComplete={() => setBustaPronta(true)}
                  >
                    <BustaGrande />
                  </motion.div>
                </div>
              )}
            </motion.div>
            {/* il biglietto vero (olografico, da inclinare) prende il posto di quello 3D */}
            {rivelato && (
              <motion.div
                className="relative z-10 mx-auto my-auto w-full max-w-md px-5"
                initial={busta3d ? { opacity: 0, scale: 0.96 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <BigliettoOlografico nome={destinatario.nome} look={destinatario.look} conIngresso={!busta3d} />
              </motion.div>
            )}
            <div className={`relative z-10 mx-auto w-full max-w-md px-5 pb-[max(24px,env(safe-area-inset-bottom))] ${rivelato ? "" : "mt-auto"}`}>
              {rivelato && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: busta3d ? 0.6 : 1.8 }}>
                  <p className="text-center text-sm text-crema/75">Inclinalo col dito o muovendo il telefono.</p>
                  <TastoLink href={`/gruppo/${groupId}/bacheca/${destinatario.id}`} className="mt-4">
                    Guarda la bacheca di {nomeBreve}
                  </TastoLink>
                </motion.div>
              )}
              <AnimatePresence>
                {!busta3d && (bustaPronta || ridotto) && !aperta && (
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Tasto onClick={apriLaBusta}>Apri la busta</Tasto>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Lampadine attorno alla finestra: lampeggiano piano, veloci mentre gira, a festa quando si ferma.
function Lampadine({ fase }: { fase: string }) {
  const velocita = fase === "gira" ? "0.25s" : fase === "fermo" ? "0.12s" : "1.2s";
  return (
    <div className="relative mt-1 flex justify-between px-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="lampadina size-3 rounded-full bg-senape"
          style={{ animationDuration: velocita, animationDelay: i % 2 ? `calc(${velocita} / 2)` : "0s" }}
        />
      ))}
    </div>
  );
}

// Il sigillo di ceralacca: è lo stesso che chiude la busta (quello che si gratta via).
function Sigillo() {
  return (
    <svg viewBox="0 0 100 100" className="size-[92px] drop-shadow-[0_3px_4px_rgba(0,0,0,.3)]" aria-hidden>
      <defs>
        <radialGradient id="sigillo-cera" cx="38%" cy="35%" r="70%">
          <stop offset="0" stopColor="#e2493c" />
          <stop offset="1" stopColor="#7e1414" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#sigillo-cera)" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#5c0d0d" strokeOpacity=".5" strokeWidth="3" />
      <path d="M50 27l5 18 18 5-18 5-5 18-5-18-18-5 18-5z" fill="#f1d27a" />
    </svg>
  );
}

// Busta disegnata (quando il 3D non c'è o con "riduci movimento").
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
