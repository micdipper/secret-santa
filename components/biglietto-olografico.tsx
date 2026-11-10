"use client";

// Il biglietto col nome, stile carta collezionabile olografica (tipo carte dei Pokémon):
// bande arcobaleno tenui che scorrono quando si inclina e un riflesso di luce.
// L'olografia sta SOTTO scritte e personaggio, che restano nitidi.
// La disposizione è identica al biglietto 3D (components/scena-busta.tsx → disegnaFronte):
// tutte le misure sono in percentuali / cqw della larghezza, proporzioni 4:5.
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { Avatar, type Look } from "@/components/avatar";
import { OLOGRAFIA_SCELTA, OLOGRAFIE, type Olografia } from "@/lib/olografie";

export function fontNome(nome: string) {
  return Math.min(0.1, 0.86 / Math.max(1, nome.length * 0.56)); // frazione della larghezza (uguale al 3D)
}

export function BigliettoOlografico({
  nome,
  look,
  olografiaDopo = 0,
  olografia = OLOGRAFIA_SCELTA,
}: {
  nome: string;
  look: Look | null;
  olografiaDopo?: number; // secondi prima che l'effetto olografico si accenda
  olografia?: Olografia;
}) {
  const ridotto = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 140, damping: 16 });
  const sy = useSpring(ry, { stiffness: 140, damping: 16 });
  // le bande e il riflesso scorrono con l'inclinazione
  const bandeX = useTransform(sy, [-18, 18], [0, 100]);
  const bandeY = useTransform(sx, [-18, 18], [0, 100]);
  const posBande = useMotionTemplate`${bandeX}% ${bandeY}%`;
  const luceX = useTransform(sy, [-18, 18], [85, 15]);
  const luceY = useTransform(sx, [-18, 18], [85, 15]);
  const riflesso = useMotionTemplate`radial-gradient(circle at ${luceX}% ${luceY}%, rgba(255,255,255,.75), rgba(255,255,255,0) 42%)`;
  // olografia delicata: più si inclina, più si accende (ma resta tenue)
  const forza = useTransform([sx, sy], ([a, b]: number[]) => 0.32 + Math.min(0.22, (Math.abs(a) + Math.abs(b)) / 50));

  useEffect(() => {
    if (ridotto) return;
    const giroscopio = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      ry.set(Math.max(-18, Math.min(18, e.gamma / 2.5)));
      rx.set(Math.max(-18, Math.min(18, -(e.beta - 45) / 2.5)));
    };
    window.addEventListener("deviceorientation", giroscopio);
    return () => window.removeEventListener("deviceorientation", giroscopio);
  }, [ridotto, rx, ry]);

  function muovi(e: React.PointerEvent<HTMLDivElement>) {
    if (ridotto) return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 32);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 32);
  }
  function lascia() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <div
      className="w-full [container-type:inline-size] [perspective:1000px]"
      onPointerMove={muovi}
      onPointerLeave={lascia}
      onPointerUp={lascia}
      style={{ touchAction: "pan-y" }}
    >
      <motion.div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-[8.2cqw] bg-crema text-center text-inchiostro"
        style={{ rotateX: sx, rotateY: sy }}
      >
        {/* ---- olografia (sotto il contenuto) ---- */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: olografiaDopo, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.div
            className="absolute inset-0 mix-blend-multiply"
            style={{
              opacity: forza,
              backgroundImage: OLOGRAFIE[olografia],
              backgroundSize: "300% 300%",
              backgroundPosition: posBande,
            }}
          />
          <motion.div className="absolute inset-0 mix-blend-soft-light" style={{ backgroundImage: riflesso }} />
        </motion.div>

        {/* ---- contenuto, nitido sopra l'olografia ---- */}
        <div className="pointer-events-none absolute inset-[2.6cqw] rounded-[5.8cqw] border-[0.7cqw] border-dashed border-vermiglio/75" />
        <span className="absolute top-[8.5%] left-1/2 size-[5.2cqw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-abete" />
        <p className="absolute top-[16.5%] w-full -translate-y-1/2 text-[4.5cqw] leading-none text-inchiostro/70">Farai il regalo a</p>
        <span className="toppa absolute top-[22.4%] left-[28%] aspect-square w-[44%] overflow-hidden">
          {look && <Avatar look={look} titolo={nome} className="relative top-[8%] h-full w-full" />}
        </span>
        <p
          className="absolute top-[66.5%] w-full -translate-y-1/2 font-titolo leading-none whitespace-nowrap text-vermiglio"
          style={{ fontSize: `${fontNome(nome) * 100}cqw` }}
        >
          {nome}
        </p>
        <p className="absolute top-[79.5%] w-full -translate-y-1/2 text-[4.3cqw] leading-none whitespace-nowrap">Acqua in bocca! Guarda la sua bacheca</p>
        <p className="absolute top-[85.5%] w-full -translate-y-1/2 text-[4.3cqw] leading-none whitespace-nowrap">per farti venire un&apos;idea.</p>
      </motion.div>
    </div>
  );
}
