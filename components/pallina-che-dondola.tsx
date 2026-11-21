"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { suoni } from "@/lib/suoni";
import { Pallina } from "./ornamenti";

// La pallina dondola quando si scuote il telefono (o quando la si tocca).
// Su iPhone lo scuotimento funziona solo dopo il permesso dei sensori,
// che chiediamo al tocco su "Apri la busta"; il tocco funziona sempre.
// Easter egg: 7 tocchi di fila (meno di un secondo l'uno dall'altro) aprono il "Secret secret Santa".
const TOCCHI_SEGRETI = 7;

export function PallinaCheDondola({ className = "", groupId }: { className?: string; groupId?: string }) {
  const router = useRouter();
  const tocchi = useRef({ n: 0, ultimo: 0 });
  const [cade, setCade] = useState(false);
  const [serie, setSerie] = useState(0);
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
        if (cade) return;
        setDondola(true);
        setGiro((g) => g + 1);
        suoni.pallina();
        if (!groupId) return;
        const ora = Date.now();
        const t = tocchi.current;
        t.n = ora - t.ultimo < 1000 ? t.n + 1 : 1;
        t.ultimo = ora;
        setSerie(t.n);
        if (t.n >= TOCCHI_SEGRETI) {
          t.n = 0;
          setCade(true); // la pallina si stacca e cade, poi si apre la pagina segreta
          navigator.vibrate?.([20, 40, 60]);
          setTimeout(() => router.push(`/gruppo/${groupId}/secret-secret-santa`), 650);
        }
      }}
      className={`block ${cade ? "pallina-cade" : ""} ${className}`}
    >
      <span key={giro} onAnimationEnd={() => setDondola(false)} className={`block origin-top ${dondola ? "dondola" : ""}`}
        // dal 4° tocco di fila dondola sempre più forte: un indizio che sta per succedere qualcosa
        style={{ ["--forza" as string]: String(1 + Math.max(0, serie - 3) * 0.35) }}>
        <Pallina className="w-full" />
      </span>
    </button>
  );
}
