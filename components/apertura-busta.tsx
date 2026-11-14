"use client";

import confetti from "canvas-confetti";
import {
  AnimatePresence,
  animate,
  motion,
  useAnimate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, ToppaAvatar, type Look } from "@/components/avatar";
import { BigliettoOlografico } from "@/components/biglietto-olografico";
import {
  Icone,
  Tasto,
  TastoLink,
  TestataInterna,
  TitoloRiquadro,
} from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";
import { cambiaBrano, suoni } from "@/lib/suoni";


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
  neve: (n) =>
    n === 0
      ? "È finita nella neve! Toccala per tirarla fuori"
      : n === 1
        ? "Ancora un colpetto!"
        : "Dai, ultimo tocco!",
  vola: () => "Eccola!",
  sigillo: () => "Gratta via il sigillo col dito",
  lembo: () => "Ora apri la busta: trascina il lembo in su",
  biglietto: () => "Eccolo…",
  girala: () => "Tocca il biglietto per girarlo",
};

const COLORI = ["#e5481e", "#e9a81c", "#f3e8cf", "#2c4a32", "#f4a9c4"];

// Il vetro della finestrella: una ragnatela di crepe dal punto d'impatto (raggi + anelli).
// Le schegge sono le "celle" della ragnatela, così si stacca proprio quello che si era crepato.
const IMPATTO = { x: 50, y: 50 };
const RAGGI = [0, 38, 77, 118, 152, 196, 233, 271, 312].map(
  (g) => (g * Math.PI) / 180,
);
const ANELLI = [0, 11, 27, 46, 80];
const dentro = (v: number) => Math.min(100, Math.max(0, v));
const punto = (anello: number, raggio: number) => {
  const r = ANELLI[anello] * (1 + ((raggio * 7 + anello * 3) % 5) * 0.06); // un po' irregolare
  const a = RAGGI[raggio % RAGGI.length];
  return [
    dentro(IMPATTO.x + Math.cos(a) * r * 1.25),
    dentro(IMPATTO.y + Math.sin(a) * r),
  ];
};
const SCHEGGE = ANELLI.slice(0, -1).flatMap((_, i) =>
  RAGGI.map((_, j) => {
    const pts =
      i === 0
        ? [punto(0, 0), punto(1, j), punto(1, j + 1)]
        : [punto(i, j), punto(i + 1, j), punto(i + 1, j + 1), punto(i, j + 1)];
    const cx = pts.reduce((t, p) => t + p[0], 0) / pts.length;
    const seme = (i * 13 + j * 7) % 11;
    return {
      punti: pts.map((p) => p.join(",")).join(" "),
      dx: (cx - 50) * 0.35 + (seme - 5),
      giu: 380 + seme * 25,
      r: (seme % 2 ? 1 : -1) * (25 + seme * 14),
      ritardo: i * 0.06 + (seme % 3) * 0.03,
      opacita: 0.1 + (seme % 4) * 0.05,
    };
  }),
);
const CREPE = [
  ...RAGGI.map(
    (_, j) =>
      `M${IMPATTO.x} ${IMPATTO.y} ` +
      [1, 2, 3, 4].map((i) => `L${punto(i, j).join(" ")}`).join(" "),
  ),
  ...[1, 2, 3].map(
    (i) => "M" + RAGGI.map((_, j) => punto(i, j).join(" ")).join(" L") + " Z",
  ),
];

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
  prova,
}: {
  groupId: string;
  nomeGruppo: string;
  candidati: Persona[];
  destinatario: Persona;
  giaAperta: boolean;
  prova?: { ricomincia: () => void }; // pagina di prova: niente database, "Ricomincia" al posto della bacheca
}) {
  const supabase = clientSoloBrowser();
  const ridotto = useReducedMotion();
  const [fase, setFase] = useState<
    "leva" | "gira" | "fermo" | "crepa" | "rotta" | "scena"
  >("leva");
  // si parte da un personaggio del gruppo "a caso" (sempre lo stesso per la stessa persona, così la pagina non salta)
  const primo = candidati.length ? candidati[[...(groupId + destinatario.id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % candidati.length] : null;
  const [voci, setVoci] = useState<(Persona | "?")[]>(primo ? [primo, ...candidati.filter((c) => c !== primo).slice(0, 2)] : ["?"]);
  const [sfocato, setSfocato] = useState(false);
  const [busta3d, setBusta3d] = useState<boolean | null>(null); // null = non lo so ancora
  const [scenaPronta, setScenaPronta] = useState(false);
  const [faseScena, setFaseScena] = useState<FaseBusta>("attesa");
  const [tocchi, setTocchi] = useState(0);
  const [rivelato, setRivelato] = useState(false);
  const [bustaPronta, setBustaPronta] = useState(false);
  const avatarNascosto = useRef<HTMLDivElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const finestra = useRef<HTMLDivElement>(null);
  const [rotta, setRotta] = useState<{
    macchina: DOMRect;
    finestra: DOMRect;
  } | null>(null);
  const feltro = useRef<HTMLDivElement>(null);
  const [buco, setBuco] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const telaio = useRef<HTMLDivElement>(null);
  const [bucoTelaio, setBucoTelaio] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const postoCard = useRef<HTMLDivElement>(null);
  const [macchina, animaMacchina] = useAnimate();
  const rullo = useRef<HTMLDivElement>(null);
  const partito = useRef(false);

  // il personaggio come immagine, per disegnarlo sul biglietto 3D
  const prendiSvg = () => {
    const el = avatarNascosto.current?.querySelector("svg");
    return el ? new XMLSerializer().serializeToString(el) : null;
  };

  // Appena si apre la pagina: c'è il 3D? Se sì preparo subito la scena (la neve scende già dietro la slot)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- si sa solo nel browser
    setBusta3d(!ridotto && webglDisponibile());
  }, [ridotto]);

  // il riquadro di feltro ha un "buco" dietro la finestrella: da lì si vede la busta vera, che sta dietro
  useEffect(() => {
    const misura = () => {
      const f = finestra.current?.getBoundingClientRect();
      const c = feltro.current?.getBoundingClientRect();
      // un po' più grande della finestrella (il bordo lo copre): così anche mentre trema non si vede il feltro dietro
      if (f && c)
        setBuco({
          x: f.left - c.left - 12,
          y: f.top - c.top - 12,
          w: f.width + 24,
          h: f.height + 24,
        });
      const t = telaio.current?.getBoundingClientRect();
      if (f && t) setBucoTelaio({ x: f.left - t.left, y: f.top - t.top, w: f.width, h: f.height });
    };
    misura();
    window.addEventListener("resize", misura);
    return () => window.removeEventListener("resize", misura);
  }, [busta3d, scenaPronta]);

  // dov'è la busta: al centro della finestrella, col sigillo grande 70px
  const sigilloSulloSchermo = () => {
    const r = finestra.current?.getBoundingClientRect();
    if (!r) return null;
    return r; // la busta sta tutta dentro la finestrella
  };

  // la musica d'attesa dal momento in cui la busta esce dalla slot; si torna al carillon dopo il nome (o uscendo)
  useEffect(() => {
    if (fase === "rotta") cambiaBrano("attesa");
  }, [fase]);
  useEffect(() => () => cambiaBrano("carillon"), []);

  // durante la scena la pagina non scorre (le dita servono alla busta)
  const inScena = fase === "rotta" || fase === "scena";
  useEffect(() => {
    if (!inScena) return;
    const html = document.documentElement;
    const prima = [html.style.overflow, document.body.style.overflow, document.body.style.touchAction];
    html.style.overflow = "clip";
    document.body.style.overflow = "clip";
    document.body.style.touchAction = "none";
    return () => {
      html.style.overflow = prima[0];
      document.body.style.overflow = prima[1];
      document.body.style.touchAction = prima[2];
    };
  }, [inScena]);

  // ---------- leva semplice (se la leva 3D non c'è) ----------
  const y = useMotionValue(0);
  const asta = useTransform(y, [0, CORSA_LEVA], [CORSA_LEVA + 20, 20]);

  async function tiraLaLeva() {
    if (partito.current) return;
    partito.current = true;
    suoni.leva();
    if (y.get() < CORSA_LEVA * 0.8)
      await animate(y, CORSA_LEVA, { duration: 0.18 });
    animate(y, 0, { type: "spring", stiffness: 260, damping: 9 });

    // i personaggi mescolati, e in fondo la busta (che sta dietro la finestrella)
    const mescolati: Persona[] = [];
    while (mescolati.length < GIRI)
      mescolati.push(...[...candidati].sort(() => Math.random() - 0.5));
    setVoci([primo ?? "?", ...mescolati.slice(0, GIRI), "?", mescolati[0] ?? "?"]);
    setFase("gira");
    setSfocato(true);
    animaMacchina(
      macchina.current,
      { x: [0, -6, 6, -4, 4, 0], rotate: [0, -1, 1, -0.5, 0] },
      { duration: 0.45 },
    );

    await new Promise((ok) => requestAnimationFrame(ok));
    const durata = ridotto ? 0.8 : DURATA_GIRO;
    setTimeout(() => setSfocato(false), durata * 600);
    // tic-tic: un clic ogni personaggio che passa (rallenta col rullo)
    let ultimaVoce = 0;
    let girando = true;
    const ascolta = () => {
      if (!girando || !rullo.current) return;
      const m = new DOMMatrix(getComputedStyle(rullo.current).transform);
      const voce = Math.floor(-m.m42 / ALTEZZA_VOCE);
      if (voce !== ultimaVoce) {
        ultimaVoce = voce;
        suoni.tic();
      }
      requestAnimationFrame(ascolta);
    };
    requestAnimationFrame(ascolta);
    await animate(
      rullo.current!,
      { y: [0, ARRIVO - 14, ARRIVO] },
      {
        duration: durata,
        times: [0, 0.94, 1],
        ease: [[0.12, 0.6, 0.22, 1], "easeOut"],
      },
    );

    girando = false;
    setFase("fermo");
    suoni.fermo();
    await animaMacchina(
      macchina.current,
      { scale: [1, 1.05, 1] },
      { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
    );
    if (!busta3d) {
      // versione semplice: niente rottura, si passa alla busta disegnata
      setTimeout(() => setFase("scena"), 600);
      return;
    }
    // trema, sempre più forte, finché il vetro si crepa e si rompe
    const N = 36;
    const tremoreX = Array.from({ length: N + 1 }, (_, i) =>
      i === N ? 0 : (i % 2 ? 1 : -1) * (0.6 + 10 * (i / N) ** 2),
    );
    const tremoreY = Array.from({ length: N + 1 }, (_, i) =>
      i === N ? 0 : (i % 3 === 0 ? -1 : 1) * (0.3 + 3 * (i / N) ** 2),
    );
    const tremoreR = tremoreX.map((x) => x * 0.22);
    // scricchiolii sempre più fitti
    [300, 650, 950, 1150, 1300, 1450, 1560, 1660, 1750, 1830, 1900].forEach((ms) => setTimeout(() => suoni.scricchiolio(), ms));
    setTimeout(() => setFase("crepa"), 1100); // a metà del tremore il vetro comincia a creparsi
    await animaMacchina(
      macchina.current,
      { x: tremoreX, y: tremoreY, rotate: tremoreR },
      { duration: 2, ease: "linear" },
    );
    // …e si rompe: la busta, che è sempre stata lì dietro, comincia a cadere
    if (corpo.current && finestra.current)
      setRotta({
        macchina: corpo.current.getBoundingClientRect(),
        finestra: finestra.current.getBoundingClientRect(),
      });
    setFase("rotta");
    suoni.vetroRotto();
    setTimeout(() => setFase("scena"), 1700);
  }

  // ---------- busta ----------
  // Su iPhone il permesso per il movimento si può chiedere solo dopo un tocco
  function chiediMovimento() {
    const D = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof D?.requestPermission === "function")
      D.requestPermission().catch(() => {});
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
    suoni.fanfara();
    setTimeout(() => cambiaBrano("carillon"), 2500);
    setRivelato(true);
    if (!prova) segnaAperta();
    if (!ridotto) {
      confetti({
        particleCount: 120,
        spread: 100,
        startVelocity: 45,
        origin: { y: 0.45 },
        colors: COLORI,
        zIndex: 60,
      });
      confetti({
        particleCount: 40,
        spread: 360,
        startVelocity: 20,
        shapes: ["star"],
        colors: ["#f1d27a", "#e9a81c"],
        origin: { y: 0.4 },
        zIndex: 60,
      });
    }
  }

  const nomeBreve = destinatario.nome.split(" ")[0];
  const testata = (
    <TestataInterna
      indietro={prova ? "/prove" : `/gruppo/${groupId}`}
      etichettaIndietro={`Torna a ${nomeGruppo}`}
      contesto={nomeGruppo}
      titolo="La tua busta"
    />
  );

  // ---------- busta già aperta: il biglietto, subito ----------
  if (giaAperta) {
    return (
      <>
        {testata}
        <div className="mx-auto mt-6 w-full max-w-[340px]">
          <BigliettoOlografico
            nome={destinatario.nome}
            look={destinatario.look}
          />
        </div>
        <p className="mt-6 text-center text-sm text-crema/75">
          Inclinalo col dito o muovendo il telefono.
        </p>
        <TastoLink
          href={`/gruppo/${groupId}/bacheca/${destinatario.id}`}
          className="mt-4"
        >
          Guarda la bacheca di {nomeBreve}
        </TastoLink>
      </>
    );
  }

  // la macchinetta (senza leva). parte: "tutto" (quella vera), "telaio" (il feltro, per quando si smonta), "insegna"
  const corpoMacchina = (parte: "tutto" | "telaio" | "insegna"): ReactNode => (
    <>
      <div
        className="relative mx-auto -mb-2 w-[150px] rounded-t-[20px] bg-abete px-3 pt-2 pb-4 text-center font-titolo text-sm leading-tight text-crema"
        style={{ visibility: parte === "telaio" ? "hidden" : "visible" }}
      >
        Babbo-matic
      </div>
      <div
        ref={parte === "tutto" ? telaio : undefined}
        className="relative rounded-[28px] p-4"
        style={{ visibility: parte === "insegna" ? "hidden" : "visible" }}
      >
        {/* il fondo vermiglio, col buco della finestrella (dietro c'è la busta) */}
        <div
          className="absolute inset-0 rounded-[28px] bg-vermiglio shadow-[inset_0_-8px_14px_rgba(0,0,0,.25),0_12px_20px_-10px_rgba(0,0,0,.5)]"
          style={busta3d && bucoTelaio ? maschera(bucoTelaio.x, bucoTelaio.y, bucoTelaio.w, bucoTelaio.h) : undefined}
        />
        <div className="pointer-events-none absolute inset-2 rounded-[20px] border-2 border-dashed border-crema/60" />
        <Lampadine fase={fase} />
        {/* la finestrella: dietro (trasparente) c'è la busta vera; davanti scorrono i personaggi */}
        <div
          ref={parte === "tutto" ? finestra : undefined}
          className="relative mt-3 h-[200px] overflow-hidden rounded-2xl"
        >
          {parte === "tutto" && (
            <>
              <div
                ref={rullo}
                className="absolute inset-x-0 top-[40px]"
                style={{
                  filter: sfocato && !ridotto ? "blur(2px)" : "none",
                  transition: "filter .6s",
                }}
              >
                <div className="absolute inset-x-0 -top-[120px] h-[120px] bg-[#efe3c9]" />
                {/* ogni casella è una busta: al posto del sigillo c'è il personaggio; l'ultima è la busta vera (col sigillo) */}
                {voci.map((p, i) => (
                  <div
                    key={i}
                    className={`relative flex items-center justify-center ${p === "?" && busta3d ? "" : "bg-[#efe3c9]"}`} // stesso colore della carta della busta
                    style={{ height: ALTEZZA_VOCE }}
                  >
                    {p === "?" ? (
                      busta3d ? null : (
                        <Sigillo />
                      )
                    ) : (
                      <>
                        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                          <path d="M-20 -24L50 30L120 -24" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                          <path d="M-20 84L36 38M120 84L64 38" fill="none" stroke="rgba(0,0,0,.07)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                        </svg>
                        <span className="relative rounded-full shadow-[0_3px_5px_rgba(0,0,0,.3)]">
                          <ToppaAvatar look={p.look} dimensione={92} />
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_6px_12px_rgba(0,0,0,.3)]" />
              <div
                className={`pointer-events-none absolute inset-x-2 top-[44px] h-[112px] rounded-2xl border-[3px] ${fase === "leva" || fase === "gira" ? "border-vermiglio/25" : "border-senape"}`}
              />
              {/* il vetro: un riflesso obliquo */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(125deg,rgba(255,255,255,.4)_0_12%,transparent_12%_28%,rgba(255,255,255,.18)_28%_32%,transparent_32%)] shadow-[inset_0_0_0_2px_rgba(255,255,255,.45)]" />
              {/* le crepe: una ragnatela che si allarga dal centro */}
              {fase === "crepa" && (
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  aria-hidden
                >
                  {CREPE.map((d, i) => (
                    <motion.path
                      key={d}
                      d={d}
                      fill="none"
                      stroke="rgba(255,255,255,.9)"
                      vectorEffect="non-scaling-stroke"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{
                        delay:
                          i < RAGGI.length
                            ? i * 0.04
                            : 0.35 + (i - RAGGI.length) * 0.12,
                        duration: 0.35,
                        ease: [0.3, 0, 0.7, 1],
                      }}
                      style={{
                        strokeWidth: i < RAGGI.length ? 1.2 : 0.8,
                        filter: "drop-shadow(0 0 0.6px rgba(0,0,0,.7))",
                      }}
                    />
                  ))}
                </svg>
              )}
            </>
          )}
        </div>
        <Lampadine fase={fase} />
      </div>
      <span
        className="absolute top-[176px] -right-[16px] h-12 w-5 rounded-r-xl bg-abete shadow-[inset_-2px_-3px_4px_rgba(0,0,0,.25)]"
        style={{ visibility: parte === "insegna" ? "hidden" : "visible" }}
      >
        <span className="absolute inset-[3px] rounded-r-lg border-2 border-dashed border-l-0 border-crema/50" />
      </span>
    </>
  );

  // la maschera che fa il buco della finestrella (nel riquadro di feltro e nel telaio che cade)
  const maschera = (x: number, y: number, w: number, h: number) => ({
    maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
    WebkitMaskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
    maskSize: `100% 100%, ${w}px ${h}px`,
    WebkitMaskSize: `100% 100%, ${w}px ${h}px`,
    maskPosition: `0 0, ${x}px ${y}px`,
    WebkitMaskPosition: `0 0, ${x}px ${y}px`,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskComposite: "exclude",
    WebkitMaskComposite: "xor",
  });

  return (
    <>
      {/* ---------- la scena 3D: sta DIETRO la pagina (stesso verde dello sfondo) e c'è già mentre la slot gira ---------- */}
      {/* dietro la pagina finché la slot è intera; quando si rompe passa davanti al riquadro (la busta era nella slot, sopra di lui) */}
      {busta3d && (
        <div
          // il 3D resta sempre allo stesso livello (cambiarlo fa sparire la tela per un attimo):
          // quando la slot si rompe è la pagina a passare dietro la busta
          className="pointer-events-none fixed inset-0 -z-10"
        >
          <ScenaBusta
            nome={destinatario.nome}
            avatarSvg={prendiSvg}
            parti={fase === "rotta" || fase === "scena"}
            sigilloSulloSchermo={sigilloSulloSchermo}
            onPronta={() => setScenaPronta(true)}
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
      {busta3d === null || (busta3d && !scenaPronta) ? (
        <p
          className="mt-24 text-center font-titolo text-2xl text-crema/80"
          aria-live="polite"
        >
          Preparo la tua busta…
        </p>
      ) : null}
      {fase !== "scena" && (
        <motion.div
          initial={false}
          animate={{ opacity: busta3d === false || scenaPronta ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          style={{
            pointerEvents: busta3d === false || scenaPronta ? "auto" : "none",
            position: "relative",
            zIndex: inScena ? -20 : 0, // si rompe: il riquadro cade DIETRO la busta (che era nella slot, sopra di lui)
          }}
          className={
            busta3d === null || (busta3d && !scenaPronta)
              ? "absolute inset-x-5 top-0"
              : ""
          }
        >
          <motion.div
            animate={fase === "rotta" ? { y: -260 } : { y: 0 }}
            transition={{ duration: 0.8, ease: [0.5, 0, 0.75, 0] }}
          >
            {testata}
          </motion.div>
          <motion.div
            ref={feltro}
            className="mt-6"
            animate={
              fase === "rotta" ? { y: "110vh", rotate: 6 } : { y: 0, rotate: 0 }
            }
            transition={{ duration: 0.9, ease: CADE, delay: 0.2 }}
          >
            {/* il riquadro di feltro: il buco è solo nello sfondo (dietro la finestrella), non nel contenuto */}
            <div className="relative">
              <div
                className="feltro inset-0"
                style={{
                  position: "absolute", // (la classe .feltro imposta "relative")
                  ...(busta3d && buco && !rotta ? maschera(buco.x, buco.y, buco.w, buco.h) : {}),
                }}
              />
              <div className="relative p-6 text-inchiostro">
                <TitoloRiquadro>Chi ti è uscito?</TitoloRiquadro>
                <p className="mt-2">
                  {fase === "leva"
                    ? "Tira giù la leva e incrocia le dita."
                    : fase === "gira"
                      ? "Gira, gira, gira…"
                      : "Ecco… è uscita la tua busta!"}
                </p>

                {/* La macchinetta, centrata; la leva è attaccata al suo fianco */}
                <div className="mt-8 flex justify-center">
                  <motion.div ref={macchina} className="relative w-[196px]">
                    {/* quando si rompe, questa resta nascosta: al suo posto c'è la copia identica che si smonta (sotto) */}
                    <div
                      ref={corpo}
                      className="relative"
                      style={{ visibility: rotta ? "hidden" : "visible" }}
                    >
                      {corpoMacchina("tutto")}
                    </div>

                    {/* Leva 3D attaccata al fianco (se il 3D non c'è, quella semplice); quando si rompe vola via */}
                    <motion.div
                      className="absolute top-0 -right-[70px] z-20 h-[300px] w-[120px]"
                      animate={
                        fase === "rotta"
                          ? { x: 220, y: [0, -80, 700], rotate: 120 }
                          : {}
                      }
                      transition={{
                        duration: 1.2,
                        times: [0, 0.25, 1],
                        ease: [[0.2, 0.7, 0.4, 1], CADE],
                      }}
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
                              disabled={
                                fase !== "leva" || candidati.length === 0
                              }
                              className="absolute -top-1 -left-[7px] size-12 touch-none rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff8a6a,#e5481e_45%,#8f2408)] shadow-[0_4px_8px_rgba(0,0,0,.45),inset_0_-3px_5px_rgba(0,0,0,.3)] disabled:cursor-default"
                              style={{ y }}
                              drag={fase === "leva" ? "y" : false}
                              dragConstraints={{ top: 0, bottom: CORSA_LEVA }}
                              dragElastic={0.05}
                              dragMomentum={false}
                              onDragEnd={() =>
                                y.get() > CORSA_LEVA * 0.6
                                  ? tiraLaLeva()
                                  : animate(y, 0, {
                                      type: "spring",
                                      stiffness: 300,
                                      damping: 12,
                                    })
                              }
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
                  {fase === "leva"
                    ? "Trascina giù il pomello rosso (o toccalo)."
                    : "Chi sarà? Lo scoprirai aprendo la busta."}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {rotta && fase === "rotta" && (
        <div
          className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
        >
          <div
            className="absolute"
            style={{
              left: rotta.macchina.left,
              top: rotta.macchina.top,
              width: rotta.macchina.width,
              height: rotta.macchina.height,
            }}
          >
          {/* 1) il telaio di feltro: senza vetro si affloscia e cade tutto insieme, come stoffa */}
          <motion.div
            className="absolute inset-0"
            style={{
              transformOrigin: "50% 0%",
              ...maschera(
                rotta.finestra.left - rotta.macchina.left,
                rotta.finestra.top - rotta.macchina.top,
                rotta.finestra.width,
                rotta.finestra.height,
              ),
            }}
            animate={{
              y: [0, 6, 40, 900],
              rotate: [0, -2, 3, 9],
              skewX: [0, 3, -4, 2],
              scaleY: [1, 0.96, 0.92, 0.85],
            }}
            transition={{
              delay: 0.3,
              duration: 1.4,
              times: [0, 0.15, 0.35, 1],
              ease: [[0.3, 0, 0.6, 1], [0.4, 0, 0.6, 1], CADE],
            }}
          >
            {corpoMacchina("telaio")}
          </motion.div>

          {/* 2) l'insegna "Babbo-matic": si stacca da un chiodo, dondola e cade */}
          <motion.div
            className="absolute inset-0"
            style={{ transformOrigin: "71% 4%" }}
            animate={{ rotate: [0, 28, 18, 24, 70], y: [0, 4, 4, 30, 900] }}
            transition={{
              delay: 0.15,
              duration: 1.7,
              times: [0, 0.2, 0.32, 0.45, 1],
              ease: [[0.5, 0, 0.6, 1.4], "easeInOut", "easeInOut", CADE],
            }}
          >
            {corpoMacchina("insegna")}
          </motion.div>

          {/* 3) il vetro va in frantumi: le schegge (le celle della ragnatela) cadono con la gravità */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute overflow-visible"
            style={{
              left: rotta.finestra.left - rotta.macchina.left,
              top: rotta.finestra.top - rotta.macchina.top,
              width: rotta.finestra.width,
              height: rotta.finestra.height,
            }}
            aria-hidden
          >
            {SCHEGGE.map((p) => (
              <motion.polygon
                key={p.punti}
                points={p.punti}
                fill={`rgba(255,255,255,${p.opacita})`}
                stroke="rgba(255,255,255,.85)"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                animate={{
                  x: [0, p.dx * 0.3, p.dx],
                  y: [0, -4, p.giu],
                  rotate: [0, p.r * 0.15, p.r],
                }}
                transition={{
                  delay: p.ritardo,
                  duration: 1.1,
                  times: [0, 0.12, 1],
                  ease: [[0.2, 0.8, 0.4, 1], CADE],
                }}
              />
            ))}
          </svg>
          </div>
        </div>
      )}

      <div ref={avatarNascosto} className="hidden" aria-hidden>
        {destinatario.look && <Avatar look={destinatario.look} />}
      </div>

      {/* ---------- sopra la scena: le istruzioni, poi la card finale (tutto senza sfondo: dietro c'è la neve) ---------- */}
      {fase === "scena" && (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col">
          <div className="flex items-start gap-4 px-5 pt-[calc(env(safe-area-inset-top)+24px)]">
            <AnimatePresence>
              {rivelato && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                >
                  <Link
                    href={prova ? "/prove" : `/gruppo/${groupId}`}
                    aria-label="Torna al gruppo"
                    title="Torna al gruppo"
                    className="pointer-events-auto tasto-tondo cucitura cliccabile stoffa-chiara"
                  >
                    {Icone.indietro}
                  </Link>
                </motion.div>
              )}
              {!rivelato && <span className="w-14 flex-none" />}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.p
                key={
                  rivelato
                    ? "fine"
                    : busta3d
                      ? `${faseScena}-${tocchi}`
                      : "semplice"
                }
                // altezza fissa (due righe): se la scritta cambia numero di righe, il posto del biglietto non si sposta
                className="flex h-[64px] flex-1 items-center justify-center text-center font-titolo text-2xl leading-tight text-balance text-crema [text-shadow:0_2px_8px_rgba(0,0,0,.35)]"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                aria-live="polite"
              >
                {rivelato
                  ? "Ecco a chi!"
                  : busta3d
                    ? ISTRUZIONI[faseScena](tocchi)
                    : "Una busta per te"}
              </motion.p>
            </AnimatePresence>
            <span className="w-14 flex-none" />
          </div>

          {/* il posto della card: il biglietto 3D ci vola esattamente sopra, poi la card vera prende il suo posto */}
          <div className="flex flex-1 items-center justify-center px-5">
            <div
              ref={postoCard}
              className={`w-full max-w-[340px] ${busta3d ? "aspect-[4/5]" : ""}`} // ha sempre le misure della card: il biglietto 3D ci arriva sopra
              style={{ visibility: rivelato ? "visible" : "hidden" }}
            >
              {!busta3d && !rivelato && (
                <motion.div
                  className="pointer-events-auto"
                  style={{ visibility: "visible" }}
                  initial={
                    ridotto ? false : { scale: 0.5, rotate: -12, opacity: 0 }
                  }
                  animate={{ scale: 1, rotate: -3, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 120, damping: 13 }}
                  onAnimationComplete={() => setBustaPronta(true)}
                >
                  <BustaGrande />
                </motion.div>
              )}
              {/* la card vera è pronta fin dall'inizio (nascosta): quando prende il posto del biglietto 3D non ci sono scatti,
                  e l'olografia si accende piano */}
              {(rivelato || busta3d) && (
                <div className={rivelato ? "pointer-events-auto" : "pointer-events-none"}>
                  <BigliettoOlografico
                    nome={destinatario.nome}
                    look={destinatario.look}
                    accesa
                    olografiaDopo={0}
                  />
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
                transition={{
                  delay: 0.5,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <p className="text-center text-sm text-crema [text-shadow:0_1px_6px_rgba(0,0,0,.4)]">
                  Inclinalo col dito o muovendo il telefono.
                </p>
                {prova ? (
                  <Tasto className="mt-4" onClick={prova.ricomincia}>
                    Ricomincia la prova
                  </Tasto>
                ) : (
                  <TastoLink
                    href={`/gruppo/${groupId}/bacheca/${destinatario.id}`}
                    className="mt-4"
                  >
                    Guarda la bacheca di {nomeBreve}
                  </TastoLink>
                )}
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
  const velocita =
    fase === "gira" ? "0.25s" : fase === "leva" ? "1.2s" : "0.12s";
  return (
    <div className="relative mt-1 flex justify-between px-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="lampadina size-3 rounded-full bg-senape"
          style={{
            animationDuration: velocita,
            animationDelay: i % 2 ? `calc(${velocita} / 2)` : "0s",
          }}
        />
      ))}
    </div>
  );
}

// Il sigillo di ceralacca: è lo stesso che chiude la busta (quello che si gratta via).
function Sigillo({ acceso = false }: { acceso?: boolean }) {
  // (usato solo nella versione senza 3D)
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="size-[92px] drop-shadow-[0_3px_4px_rgba(0,0,0,.3)]"
      aria-hidden
      animate={acceso ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={
        acceso ? { repeat: Infinity, duration: 0.7, ease: "easeInOut" } : {}
      }
    >
      <defs>
        <radialGradient id="sigillo-cera" cx="38%" cy="35%" r="70%">
          <stop offset="0" stopColor="#e2493c" />
          <stop offset="1" stopColor="#7e1414" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#sigillo-cera)" />
      <circle
        cx="50"
        cy="50"
        r="31"
        fill="none"
        stroke="#5c0d0d"
        strokeOpacity=".5"
        strokeWidth="3"
      />
      {/* la S del logo impressa nella cera: bordo scuro in alto a sinistra, riflesso in basso a destra */}
      {[
        [1.6, "rgba(255,190,170,.55)"],
        [0, "#3e0808"],
        [1, "#8a1812"],
      ].map(([d, c]) => (
        <text
          key={c as string}
          x={50 + (d as number)}
          y={53 + (d as number)}
          textAnchor="middle"
          dominantBaseline="central"
          fill={c as string}
          style={{ fontFamily: "var(--font-basteleur), Georgia, serif", fontSize: 58 }}
        >
          S
        </text>
      ))}
    </motion.svg>
  );
}

// Busta disegnata (quando il 3D non c'è o con "riduci movimento").
function BustaGrande() {
  return (
    <svg
      viewBox="0 0 280 190"
      className="w-full drop-shadow-[0_12px_18px_rgba(0,0,0,.35)]"
      aria-hidden
    >
      <rect x="4" y="4" width="272" height="182" rx="10" fill="#f7efdd" />
      <path d="M4 14l136 96L276 14" fill="#efe3c9" />
      <path
        d="M4 14l136 96L276 14"
        fill="none"
        stroke="#000"
        strokeOpacity=".08"
        strokeWidth="2"
      />
      <path
        d="M4 182l100-76M276 182L176 106"
        stroke="#000"
        strokeOpacity=".06"
        strokeWidth="2"
      />
      <circle cx="140" cy="108" r="24" fill="#b3261e" />
      <circle
        cx="140"
        cy="108"
        r="16"
        fill="none"
        stroke="#5c0d0d"
        strokeOpacity=".5"
        strokeWidth="2"
      />
      <path
        d="M140 98l2.4 7.6 7.6 2.4-7.6 2.4-2.4 7.6-2.4-7.6-7.6-2.4 7.6-2.4z"
        fill="#f1d27a"
      />
    </svg>
  );
}
