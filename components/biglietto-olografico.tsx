"use client";

// Biglietto col nome, stile carta collezionabile: si gira per mostrare il nome
// e si inclina col dito o muovendo il telefono, con un riflesso olografico.
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { ToppaAvatar, type Look } from "@/components/avatar";

export function BigliettoOlografico({ nome, look, conIngresso }: { nome: string; look: Look | null; conIngresso: boolean }) {
  const ridotto = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 150, damping: 15 });
  const sy = useSpring(ry, { stiffness: 150, damping: 15 });
  // il riflesso scorre quando il biglietto si inclina
  const posX = useTransform(sy, [-18, 18], [0, 100]);
  const posY = useTransform(sx, [-18, 18], [0, 100]);
  const riflesso = useMotionTemplate`${posX}% ${posY}%`;
  const lucidoX = useTransform(sy, [-18, 18], [80, 20]);
  const lucidoY = useTransform(sx, [-18, 18], [80, 20]);
  const lucido = useMotionTemplate`radial-gradient(circle at ${lucidoX}% ${lucidoY}%, rgba(255,255,255,.55), transparent 45%)`;

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
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 30);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 30);
  }
  function lascia() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <div className="[perspective:1000px]" onPointerMove={muovi} onPointerLeave={lascia} onPointerUp={lascia} style={{ touchAction: "pan-y" }}>
      <motion.div
        className="relative [transform-style:preserve-3d]"
        style={{ rotateX: sx, rotateY: sy }}
        initial={conIngresso && !ridotto ? { y: 220, scale: 0.6, rotateZ: -8, opacity: 0 } : false}
        animate={{ y: 0, scale: 1, rotateZ: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 90, damping: 13 }}
      >
        {/* il biglietto si gira: prima si vede il retro, poi il nome */}
        <motion.div
          className="relative [transform-style:preserve-3d]"
          initial={conIngresso && !ridotto ? { rotateY: 180 } : false}
          animate={{ rotateY: 0 }}
          transition={{ delay: 0.7, duration: 0.9, ease: [0.3, 0.7, 0.2, 1] }}
        >
          {/* fronte */}
          <div className="relative overflow-hidden rounded-[28px] bg-crema p-6 text-center text-inchiostro shadow-[0_24px_40px_-14px_rgba(0,0,0,.7)] [backface-visibility:hidden]">
            <div className="pointer-events-none absolute inset-2 rounded-[20px] border-2 border-dashed border-vermiglio/70" />
            <span className="absolute top-4 left-1/2 size-4 -translate-x-1/2 rounded-full bg-abete shadow-[inset_0_2px_3px_rgba(0,0,0,.4)]" />
            <p className="relative mt-6 text-sm text-inchiostro/70">Farai il regalo a</p>
            <div className="relative mt-4 flex justify-center">
              <ToppaAvatar look={look} dimensione={128} nome={nome} />
            </div>
            <p className="relative mt-4 font-titolo text-[32px] leading-none text-vermiglio">{nome}</p>
            <p className="relative mt-4">Acqua in bocca! Guarda la sua bacheca per farti venire un&apos;idea.</p>
            {/* riflesso olografico + lucido */}
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
              style={{
                backgroundImage:
                  "linear-gradient(115deg, transparent 20%, rgba(255,79,174,.55) 35%, rgba(47,184,255,.55) 45%, rgba(138,92,255,.5) 55%, rgba(255,201,46,.55) 65%, transparent 80%)",
                backgroundSize: "260% 260%",
                backgroundPosition: riflesso,
              }}
            />
            <motion.div className="pointer-events-none absolute inset-0 mix-blend-soft-light" style={{ backgroundImage: lucido }} />
          </div>
          {/* retro: carta da pacco a righe con un "?" cucito */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-[28px] [backface-visibility:hidden] [transform:rotateY(180deg)]"
            style={{ background: "repeating-linear-gradient(45deg, #e5481e 0 18px, #f3e8cf 18px 36px)" }}
          >
            <span className="flex size-28 items-center justify-center rounded-full bg-abete font-titolo text-6xl text-crema shadow-[0_0_0_6px_#e9a81c]">?</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
