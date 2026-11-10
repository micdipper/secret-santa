"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, animate, motion, useAnimate, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, ToppaAvatar, type Look } from "@/components/avatar";
import { BigliettoOlografico } from "@/components/biglietto-olografico";
import { Feltro, Icone, Tasto, TastoLink, TestataInterna, TitoloRiquadro } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";

// three.js si scarica solo quando serve (mentre gira la slot machine)
const caricaScena = () => import("@/components/scena-busta");
const ScenaBusta = dynamic(caricaScena, { ssr: false });
type FaseBusta = import("@/components/scena-busta").FaseBusta;
const Leva3D = dynamic(() => import("@/components/leva-3d"), { ssr: false });

export type Persona = { id: string; nome: string; look: Look | null };

const ALTEZZA_VOCE = 120; // altezza di un personaggio nel rullo (px)
const GIRI = 46; // quanti personaggi passano prima di fermarsi
const DURATA_GIRO = 7.5; // secondi
const CORSA_LEVA = 84; // quanto scende il pomello della leva semplice (px)
const ARRIVO = -(GIRI + 1) * ALTEZZA_VOCE; // dove si ferma il rullo
const CADE: [number, number, number, number] = [0.55, 0, 0.85, 0.35]; // curva "cade con la gravità"

// Cosa dire in alto, passo per passo
const ISTRUZIONI: Record<FaseBusta, (tocchi: number) => string> = {
  attesa: () => "",
  cade: () => "Attenzione… cade!",
  neve: (n) => (n === 0 ? "È finita nella neve! Toccala per tirarla fuori" : n === 1 ? "Ancora un colpetto!" : "Dai, ultimo tocco!"),
  vola: () => "Eccola!",
  sigillo: () => "Gratta via il sigillo col dito",
  lembo: () => "Ora apri la busta: trascina il lembo in su",
  biglietto: () => "Ecco a chi!",
};

const COLORI = ["#e5481e", "#e9a81c", "#f3e8cf", "#2c4a32", "#f4a9c4"];

// Le schegge del vetro della finestrella: triangoli dal punto d'impatto (al centro) verso i bordi
const SCHEGGE = [
  [0, 0, 40, 0], [40, 0, 100, 0], [100, 0, 100, 38], [100, 38, 100, 100],
  [100, 100, 55, 100], [55, 100, 0, 100], [0, 100, 0, 52], [0, 52, 0, 0],
].map(([x1, y1, x2, y2], i) => {
  const dx = (x1 + x2) / 2 - 50;
  const dy = (y1 + y2) / 2 - 50;
  return { forma: `50% 48%, ${x1}% ${y1}%, ${x2}% ${y2}%`, x: dx * 3.2, y: dy * 2.4, r: (i % 2 ? 1 : -1) * (40 + i * 9) };
});
const SIGILLO_BUSTA = 70; // quanto è grande il sigillo sulla busta 3D (px): quello della slot si rimpicciolisce fin lì

function webglDisponibile() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/*
  Apertura della busta, come un'unica scena senza stacchi:
  1) slot machine: si tira la leva, i personaggi scorrono e si fermano sul sigillo di ceralacca;
  2) la macchinetta si incrina e si rompe: la busta (che sta dietro, dove c'era il sigillo) cade nella neve;
  3) nella scena 3D: tre tocchi, si gratta il sigillo, si apre il lembo, esce il biglietto;
  4) il biglietto 3D vola esattamente al posto della card olografica, identica: il cambio non si vede.
  Il risultato arriva già deciso dal database: è solo spettacolo.
*/
export function AperturaBusta({
  groupId,
  nomeGruppo,
  candidati,
  destinatario,
  giaAperta,
}: {
  groupId: string;
  nomeGruppo: string;
  candidati: Persona[];
  destinatario: Persona;
  giaAperta: boolean;
}) {
  const supabase = clientSoloBrowser();
  const ridotto = useReducedMotion();
  const [fase, setFase] = useState<"leva" | "gira" | "fermo" | "crepa" | "rotta" | "scena">("leva");
  const [voci, setVoci] = useState<(Persona | "?")[]>(["?", ...candidati.slice(0, 2)]);
  const [sfocato, setSfocato] = useState(false);
  const [busta3d, setBusta3d] = useState(true);
  const [faseScena, setFaseScena] = useState<FaseBusta>("attesa");
  const [tocchi, setTocchi] = useState(0);
  const [rivelato, setRivelato] = useState(false);
  const [bustaPronta, setBustaPronta] = useState(false);
  const avatarNascosto = useRef<HTMLDivElement>(null);
  const sigilloFinale = useRef<HTMLDivElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const finestra = useRef<HTMLDivElement>(null);
  const [rotta, setRotta] = useState<{ macchina: DOMRect; finestra: DOMRect } | null>(null);
  const rettangoloSigillo = useRef<DOMRect | null>(null);
  const postoCard = useRef<HTMLDivElement>(null);
  const [macchina, animaMacchina] = useAnimate();
  const rullo = useRef<HTMLDivElement>(null);
  const partito = useRef(false);

  // il personaggio come immagine, per disegnarlo sul biglietto 3D
  const prendiSvg = () => {
    const el = avatarNascosto.current?.querySelector("svg");
    return el ? new XMLSerializer().serializeToString(el) : null;
  };

  // durante la scena la pagina non scorre (le dita servono alla busta)
  const inScena = fase === "rotta" || fase === "scena";
  useEffect(() => {
    if (!inScena) return;
    const html = document.documentElement;
    const prima = [html.style.overflow, document.body.style.touchAction];
    html.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      html.style.overflow = prima[0];
      document.body.style.touchAction = prima[1];
    };
  }, [inScena]);

  // ---------- leva semplice (se la leva 3D non c'è) ----------
  const y = useMotionValue(0);
  const asta = useTransform(y, [0, CORSA_LEVA], [CORSA_LEVA + 20, 20]);

  async function tiraLaLeva() {
    if (partito.current) return;
    partito.current = true;
    caricaScena(); // intanto preparo la scena 3D
    setBusta3d(!ridotto && webglDisponibile());
    if (y.get() < CORSA_LEVA * 0.8) await animate(y, CORSA_LEVA, { duration: 0.18 });
    animate(y, 0, { type: "spring", stiffness: 260, damping: 9 });

    // i personaggi mescolati, e in fondo il sigillo
    const mescolati: Persona[] = [];
    while (mescolati.length < GIRI) mescolati.push(...[...candidati].sort(() => Math.random() - 0.5));
    setVoci(["?", ...mescolati.slice(0, GIRI), "?", mescolati[0] ?? "?"]);
    setFase("gira");
    setSfocato(true);
    animaMacchina(macchina.current, { x: [0, -6, 6, -4, 4, 0], rotate: [0, -1, 1, -0.5, 0] }, { duration: 0.45 });

    await new Promise((ok) => requestAnimationFrame(ok));
    const durata = ridotto ? 0.8 : DURATA_GIRO;
    setTimeout(() => setSfocato(false), durata * 600);
    await animate(rullo.current!, { y: [0, ARRIVO - 14, ARRIVO] }, { duration: durata, times: [0, 0.94, 1], ease: [[0.12, 0.6, 0.22, 1], "easeOut"] });

    setFase("fermo");
    await animaMacchina(macchina.current, { scale: [1, 1.05, 1] }, { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] });
    if (ridotto || !webglDisponibile()) {
      // versione semplice: niente rottura, si passa alla busta disegnata
      setTimeout(() => setFase("scena"), 600);
      return;
    }
    // trema, sempre più forte, finché il vetro si crepa e si rompe
    const N = 36;
    const tremoreX = Array.from({ length: N + 1 }, (_, i) => (i === N ? 0 : (i % 2 ? 1 : -1) * (0.6 + 10 * (i / N) ** 2)));
    const tremoreY = Array.from({ length: N + 1 }, (_, i) => (i === N ? 0 : (i % 3 === 0 ? -1 : 1) * (0.3 + 3 * (i / N) ** 2)));
    const tremoreR = tremoreX.map((x) => x * 0.22);
    setTimeout(() => setFase("crepa"), 1100); // a metà del tremore il vetro comincia a creparsi
    await animaMacchina(macchina.current, { x: tremoreX, y: tremoreY, rotate: tremoreR }, { duration: 2, ease: "linear" });
    // …e si rompe: la busta, che stava dietro al sigillo, comincia a cadere
    // la busta 3D parte dal posto del sigillo, con il sigillo grande come SIGILLO_BUSTA
    const r = sigilloFinale.current?.getBoundingClientRect();
    rettangoloSigillo.current = r
      ? new DOMRect(r.left + r.width / 2 - SIGILLO_BUSTA / 2, r.top + r.height / 2 - SIGILLO_BUSTA / 2, SIGILLO_BUSTA, SIGILLO_BUSTA)
      : null;
    if (corpo.current && finestra.current) setRotta({ macchina: corpo.current.getBoundingClientRect(), finestra: finestra.current.getBoundingClientRect() });
    setFase("rotta");
    setTimeout(() => setFase("scena"), 1500);
  }

  // ---------- busta ----------
  // Su iPhone il permesso per il movimento si può chiedere solo dopo un tocco
  function chiediMovimento() {
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof D?.requestPermission === "function") D.requestPermission().catch(() => {});
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

  // il biglietto è fuori: festa!
  function bustaAperta() {
    setRivelato(true);
    segnaAperta();
    if (!ridotto) {
      confetti({ particleCount: 120, spread: 100, startVelocity: 45, origin: { y: 0.45 }, colors: COLORI, zIndex: 60 });
      confetti({ particleCount: 40, spread: 360, startVelocity: 20, shapes: ["star"], colors: ["#f1d27a", "#e9a81c"], origin: { y: 0.4 }, zIndex: 60 });
    }
  }

  const nomeBreve = destinatario.nome.split(" ")[0];
  const testata = (
    <TestataInterna indietro={`/gruppo/${groupId}`} etichettaIndietro={`Torna a ${nomeGruppo}`} contesto={nomeGruppo} titolo="La tua busta" />
  );

  // ---------- busta già aperta: il biglietto, subito ----------
  if (giaAperta) {
    return (
      <>
        {testata}
        <div className="mx-auto mt-6 w-full max-w-[340px]">
          <BigliettoOlografico nome={destinatario.nome} look={destinatario.look} />
        </div>
        <p className="mt-6 text-center text-sm text-crema/75">Inclinalo col dito o muovendo il telefono.</p>
        <TastoLink href={`/gruppo/${groupId}/bacheca/${destinatario.id}`} className="mt-4">
          Guarda la bacheca di {nomeBreve}
        </TastoLink>
      </>
    );
  }

  // la macchinetta (senza leva); "copia" = uno dei pezzi in cui si rompe (niente riferimenti)
  const corpoMacchina = (copia: boolean, vuota = false): ReactNode => (
    <>
      <div className="relative mx-auto -mb-2 w-[150px] rounded-t-[20px] bg-abete px-3 pt-2 pb-4 text-center font-titolo text-sm leading-tight text-crema">
        Babbo-matic
      </div>
      <div className="relative rounded-[28px] bg-vermiglio p-4 shadow-[inset_0_-8px_14px_rgba(0,0,0,.25),0_12px_20px_-10px_rgba(0,0,0,.5)]">
        <div className="pointer-events-none absolute inset-2 rounded-[20px] border-2 border-dashed border-crema/60" />
        <Lampadine fase={fase} />
        <div
          ref={copia ? undefined : finestra}
          className={`relative mt-3 h-[200px] overflow-hidden rounded-2xl ${vuota ? "" : "bg-crema shadow-[inset_0_6px_12px_rgba(0,0,0,.3)]"}`}
        >
          {!vuota && (
          <>
          <div
            ref={copia ? undefined : rullo}
            className="absolute inset-x-0 top-[40px]"
            style={{
              filter: sfocato && !ridotto ? "blur(2px)" : "none",
              transition: "filter .6s",
              transform: copia ? `translateY(${ARRIVO}px)` : undefined,
            }}
          >
            {voci.map((p, i) => (
              <div key={i} className="flex items-center justify-center" style={{ height: ALTEZZA_VOCE }}>
                {p === "?" ? (
                  <div ref={!copia && i === GIRI + 1 ? sigilloFinale : undefined}>
                    <Sigillo acceso={i === GIRI + 1 && (fase === "fermo" || fase === "crepa")} />
                  </div>
                ) : (
                  <ToppaAvatar look={p.look} dimensione={92} />
                )}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#cbbd9f] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#cbbd9f] to-transparent" />
          <div
            className={`pointer-events-none absolute inset-x-2 top-[44px] h-[112px] rounded-2xl border-[3px] ${fase === "leva" || fase === "gira" ? "border-vermiglio/25" : "border-senape"}`}
          />
          {/* il vetro: un riflesso obliquo */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(125deg,rgba(255,255,255,.5)_0_14%,transparent_14%_30%,rgba(255,255,255,.25)_30%_35%,transparent_35%)] shadow-[inset_0_0_0_2px_rgba(255,255,255,.45)]" />
          {/* le crepe, solo sul vetro, dal punto d'impatto al centro */}
          {fase === "crepa" && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              {["M50 48 L40 0", "M50 48 L100 38", "M50 48 L55 100", "M50 48 L0 52", "M50 48 L100 0", "M50 48 L0 100", "M50 48 L100 100", "M50 48 L0 0"].map((d, i) => (
                <motion.path
                  key={d}
                  d={d}
                  fill="none"
                  stroke="#ffffff"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: i * 0.08, duration: 0.3, ease: [0.4, 0, 1, 1] }}
                  style={{ strokeWidth: 2, filter: "drop-shadow(0 0 1px rgba(0,0,0,.6))" }}
                />
              ))}
            </svg>
          )}
          </>
          )}
        </div>
        <Lampadine fase={fase} />
      </div>
      <span className="absolute top-[176px] -right-[16px] h-12 w-5 rounded-r-xl bg-abete shadow-[inset_-2px_-3px_4px_rgba(0,0,0,.25)]">
        <span className="absolute inset-[3px] rounded-r-lg border-2 border-dashed border-l-0 border-crema/50" />
      </span>
    </>
  );

  return (
    <>
      {/* ---------- la scena 3D: sta DIETRO la pagina (stesso verde dello sfondo) e c'è già mentre la slot gira ---------- */}
      {busta3d && fase !== "leva" && (
        <div className="fixed inset-0 -z-10">
          <ScenaBusta
            nome={destinatario.nome}
            avatarSvg={prendiSvg}
            parti={fase === "rotta" || fase === "scena"}
            sigilloSulloSchermo={() => rettangoloSigillo.current}
            postoCard={() => postoCard.current?.getBoundingClientRect() ?? null}
            onFase={(f, n) => {
              setFaseScena(f);
              setTocchi(n ?? 0);
            }}
            onPrimoTocco={chiediMovimento}
            onAperta={bustaAperta}
          />
        </div>
      )}

      {/* ---------- la pagina con la slot: quando si rompe, la testata vola su e il riquadro cade giù ---------- */}
      {fase !== "scena" && (
        <>
          <motion.div animate={fase === "rotta" ? { y: -260 } : { y: 0 }} transition={{ duration: 0.8, ease: [0.5, 0, 0.75, 0] }}>
            {testata}
          </motion.div>
          <motion.div
            className="mt-6"
            animate={fase === "rotta" ? { y: "110vh", rotate: 6 } : { y: 0, rotate: 0 }}
            transition={{ duration: 0.75, ease: CADE }}
          >
            <Feltro>
              <TitoloRiquadro>Chi ti è uscito?</TitoloRiquadro>
              <p className="mt-2">
                {fase === "leva" ? "Tira giù la leva e incrocia le dita." : fase === "gira" ? "Gira, gira, gira…" : "Ecco… è uscita la tua busta!"}
              </p>

              {/* La macchinetta, centrata; la leva è attaccata al suo fianco */}
              <div className="mt-8 flex justify-center">
                <motion.div ref={macchina} className="relative w-[196px]">
                  {/* quando si rompe, questa resta nascosta: al suo posto c'è la copia identica che si smonta (sotto) */}
                  <div ref={corpo} className="relative" style={{ visibility: rotta ? "hidden" : "visible" }}>
                    {corpoMacchina(false)}
                  </div>

                  {/* Leva 3D attaccata al fianco (se il 3D non c'è, quella semplice); quando si rompe vola via */}
                  <motion.div
                    className="absolute top-0 -right-[70px] z-20 h-[300px] w-[120px]"
                    animate={fase === "rotta" ? { x: 220, y: [0, -80, 700], rotate: 120 } : {}}
                    transition={{ duration: 1.2, times: [0, 0.25, 1], ease: [[0.2, 0.7, 0.4, 1], CADE] }}
                  >
                    <Leva3D
                      attiva={fase === "leva" && candidati.length > 0}
                      onTira={tiraLaLeva}
                      riserva={
                        <div className="pointer-events-auto absolute top-[64px] left-[56px] h-[150px] w-[34px]">
                          <span className="absolute bottom-0 left-0 h-9 w-6 rounded-r-xl bg-[linear-gradient(90deg,#9c7a22,#f1d27a_45%,#b8922f)] shadow-[0_2px_4px_rgba(0,0,0,.35)]" />
                          <motion.span
                            className="absolute bottom-6 left-[13px] w-2 rounded-full bg-[linear-gradient(90deg,#8d939b,#f4f6f8_45%,#6f757d)]"
                            style={{ height: asta }}
                          />
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
                  </motion.div>
                </motion.div>
              </div>
              <p className="mt-6 text-center text-sm text-inchiostro/70">
                {fase === "leva" ? "Trascina giù il pomello rosso (o toccalo)." : "Chi sarà? Lo scoprirai aprendo la busta."}
              </p>
            </Feltro>
          </motion.div>
        </>
      )}

      {rotta && fase === "rotta" && (
        <div
          className="pointer-events-none fixed z-40"
          style={{ left: rotta.macchina.left, top: rotta.macchina.top, width: rotta.macchina.width, height: rotta.macchina.height }}
        >
          {/* 1) dentro la finestrella: il sigillo, che si rimpicciolisce e lascia il posto alla busta 3D (sta dietro, identica) */}
          <motion.div
            className="absolute flex items-center justify-center overflow-hidden rounded-2xl bg-crema"
            style={{
              left: rotta.finestra.left - rotta.macchina.left,
              top: rotta.finestra.top - rotta.macchina.top,
              width: rotta.finestra.width,
              height: rotta.finestra.height,
            }}
            animate={{ backgroundColor: ["rgba(243,232,207,1)", "rgba(243,232,207,1)", "rgba(243,232,207,0)"] }}
            transition={{ duration: 0.35, times: [0, 0.5, 1], ease: "easeOut" }}
          >
            <motion.div animate={{ scale: SIGILLO_BUSTA / 92 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <motion.div animate={{ opacity: [1, 1, 0] }} transition={{ duration: 0.35, times: [0, 0.8, 1] }}>
                <Sigillo />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 2) il telaio di feltro si smonta: due metà che si staccano e cadono */}
          {["0% 0%, 53% 0%, 47% 100%, 0% 100%", "53% 0%, 100% 0%, 100% 100%, 47% 100%"].map((forma, i) => (
            <motion.div
              key={forma}
              className="absolute inset-0"
              style={{
                clipPath: `polygon(${forma})`,
                transformOrigin: i ? "100% 100%" : "0% 100%",
                // la finestrella è un buco: il vetro si è rotto, dietro c'è la busta
                maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
                WebkitMaskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
                maskSize: `100% 100%, ${rotta.finestra.width}px ${rotta.finestra.height}px`,
                WebkitMaskSize: `100% 100%, ${rotta.finestra.width}px ${rotta.finestra.height}px`,
                maskPosition: `0 0, ${rotta.finestra.left - rotta.macchina.left}px ${rotta.finestra.top - rotta.macchina.top}px`,
                WebkitMaskPosition: `0 0, ${rotta.finestra.left - rotta.macchina.left}px ${rotta.finestra.top - rotta.macchina.top}px`,
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskComposite: "exclude",
                WebkitMaskComposite: "xor",
              }}
              animate={{ x: i ? 170 : -170, y: [0, -24, 760], rotate: i ? 32 : -32 }}
              transition={{ delay: 0.3, duration: 1.3, times: [0, 0.2, 1], ease: [[0.2, 0.7, 0.4, 1], CADE] }}
            >
              {corpoMacchina(true, true)}
            </motion.div>
          ))}

          {/* 3) il vetro va in frantumi: le schegge volano verso di te e cadono */}
          <div
            className="absolute"
            style={{
              left: rotta.finestra.left - rotta.macchina.left,
              top: rotta.finestra.top - rotta.macchina.top,
              width: rotta.finestra.width,
              height: rotta.finestra.height,
            }}
          >
            {SCHEGGE.map((p) => (
              <motion.div
                key={p.forma}
                className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,.55),rgba(255,255,255,.12)_45%,rgba(255,255,255,.4))]"
                style={{ clipPath: `polygon(${p.forma})` }}
                animate={{ x: p.x, y: [0, p.y, p.y + 520], rotate: p.r, scale: 1.35, opacity: [1, 1, 0] }}
                transition={{ duration: 1, times: [0, 0.3, 1], ease: [[0.15, 0.8, 0.3, 1], CADE] }}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={avatarNascosto} className="hidden" aria-hidden>
        {destinatario.look && <Avatar look={destinatario.look} />}
      </div>

      {/* ---------- sopra la scena: le istruzioni, poi la card finale (tutto senza sfondo: dietro c'è la neve) ---------- */}
      {fase === "scena" && (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col">
          <div className="flex min-h-[88px] items-center gap-4 px-5 pt-[calc(env(safe-area-inset-top)+24px)]">
            <AnimatePresence>
              {rivelato && (
                <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
                  <Link
                    href={`/gruppo/${groupId}`}
                    aria-label="Torna al gruppo"
                    title="Torna al gruppo"
                    className="pointer-events-auto tasto-tondo cucitura cliccabile stoffa-chiara"
                  >
                    {Icone.indietro}
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.p
                key={rivelato ? "fine" : busta3d ? `${faseScena}-${tocchi}` : "semplice"}
                className="flex-1 text-center font-titolo text-2xl leading-tight text-balance text-crema [text-shadow:0_2px_8px_rgba(0,0,0,.35)]"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                aria-live="polite"
              >
                {rivelato ? "Ecco a chi!" : busta3d ? ISTRUZIONI[faseScena](tocchi) : "Una busta per te"}
              </motion.p>
            </AnimatePresence>
            {rivelato && <span className="w-14" />}
          </div>

          {/* il posto della card: il biglietto 3D ci vola esattamente sopra, poi la card vera prende il suo posto */}
          <div className="flex flex-1 items-center justify-center px-5">
            <div ref={postoCard} className="w-full max-w-[340px]" style={{ visibility: rivelato ? "visible" : "hidden" }}>
              {!busta3d && !rivelato && (
                <motion.div
                  className="pointer-events-auto"
                  style={{ visibility: "visible" }}
                  initial={ridotto ? false : { scale: 0.5, rotate: -12, opacity: 0 }}
                  animate={{ scale: 1, rotate: -3, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 120, damping: 13 }}
                  onAnimationComplete={() => setBustaPronta(true)}
                >
                  <BustaGrande />
                </motion.div>
              )}
              {rivelato && (
                <div className="pointer-events-auto">
                  <BigliettoOlografico nome={destinatario.nome} look={destinatario.look} olografiaDopo={0.3} />
                </div>
              )}
            </div>
          </div>

          <div className="mx-auto w-full max-w-md px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
            {rivelato && (
              <motion.div
                className="pointer-events-auto"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="text-center text-sm text-crema [text-shadow:0_1px_6px_rgba(0,0,0,.4)]">Inclinalo col dito o muovendo il telefono.</p>
                <TastoLink href={`/gruppo/${groupId}/bacheca/${destinatario.id}`} className="mt-4">
                  Guarda la bacheca di {nomeBreve}
                </TastoLink>
              </motion.div>
            )}
            {!busta3d && bustaPronta && !rivelato && (
              <div className="pointer-events-auto">
                <Tasto
                  onClick={() => {
                    chiediMovimento();
                    bustaAperta();
                  }}
                >
                  Apri la busta
                </Tasto>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Lampadine attorno alla finestra: lampeggiano piano, veloci mentre gira, a festa quando si ferma.
function Lampadine({ fase }: { fase: string }) {
  const velocita = fase === "gira" ? "0.25s" : fase === "leva" ? "1.2s" : "0.12s";
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
function Sigillo({ acceso = false }: { acceso?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="size-[92px] drop-shadow-[0_3px_4px_rgba(0,0,0,.3)]"
      aria-hidden
      animate={acceso ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={acceso ? { repeat: Infinity, duration: 0.7, ease: "easeInOut" } : {}}
    >
      <defs>
        <radialGradient id="sigillo-cera" cx="38%" cy="35%" r="70%">
          <stop offset="0" stopColor="#e2493c" />
          <stop offset="1" stopColor="#7e1414" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#sigillo-cera)" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#5c0d0d" strokeOpacity=".5" strokeWidth="3" />
      <path d="M50 27l5 18 18 5-18 5-5 18-5-18-18-5 18-5z" fill="#f1d27a" />
    </motion.svg>
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
