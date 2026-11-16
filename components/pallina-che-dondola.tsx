"use client";

import { useEffect, useRef, useState } from "react";
import { suoni } from "@/lib/suoni";
import { Pallina } from "./ornamenti";

// La pallina dondola quando si scuote il telefono (o quando la si tocca).
// Su iPhone lo scuotimento funziona solo dopo il permesso dei sensori,
// che chiediamo al tocco su "Apri la busta"; il tocco funziona sempre.
export function PallinaCheDondola({ className = "" }: { className?: string }) {
  const [dondola, setDondola] = useState(false);
  // ogni tocco fa ripartire il dondolio da capo (prima, a pallina già in movimento, il tocco non faceva niente)
  const [giro, setGiro] = useState(0);
  const ultimo = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scossa = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const forza = Math.hypot(a.x, a.y, a.z);
      const ora = Date.now();
      if (forza > 14 && ora - ultimo.current > 1500) {
        ultimo.current = ora;
        setDondola(true);
        suoni.pallina();
      }
    };
    window.addEventListener("devicemotion", scossa);
    return () => window.removeEventListener("devicemotion", scossa);
  }, []);

  return (
    <button
      type="button"
      aria-label="Fai dondolare la pallina"
      onClick={() => {
        setDondola(true);
        setGiro((g) => g + 1);
        suoni.pallina();
      }}
      className={`block ${className}`}
    >
      <span key={giro} onAnimationEnd={() => setDondola(false)} className={`block origin-top ${dondola ? "dondola" : ""}`}>
        <Pallina className="w-full" />
      </span>
    </button>
  );
}
