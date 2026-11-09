"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Leggero effetto profondità: l'elemento si sposta un po' quando si inclina
// il telefono (o si muove il mouse sul computer). Disattivato con "riduci movimento".
// Su iPhone il giroscopio richiede un permesso: qui non lo chiediamo (è solo
// decorazione), quindi su iPhone l'elemento resta fermo finché il permesso non
// viene dato altrove (es. "Apri la busta").
export function Profondita({
  children,
  intensita = 10,
  className = "",
}: {
  children: ReactNode;
  intensita?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const sposta = (x: number, y: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${x * intensita}px, ${y * intensita}px, 0)`;
      });
    };
    const limita = (v: number) => Math.max(-1, Math.min(1, v));

    const daGiroscopio = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      sposta(limita(e.gamma / 30), limita((e.beta - 45) / 30));
    };
    const daMouse = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      sposta((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };

    window.addEventListener("deviceorientation", daGiroscopio);
    window.addEventListener("pointermove", daMouse);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("deviceorientation", daGiroscopio);
      window.removeEventListener("pointermove", daMouse);
    };
  }, [intensita]);

  return (
    <div ref={ref} className={`transition-transform duration-300 ease-out will-change-transform ${className}`}>
      {children}
    </div>
  );
}
