"use client";

// Leva della slot machine in 3D (three.js): pomello rosso laccato, asta cromata, attacco dorato.
// Si tira giù col dito (ruota verso di te come una leva vera) e torna su con una molla.
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const ANGOLO_RIPOSO = -0.18;
const ANGOLO_MAX = 1.25;

export default function Leva3D({ attiva, onTira, riserva }: { attiva: boolean; onTira: () => void; riserva: ReactNode }) {
  const contenitore = useRef<HTMLDivElement>(null);
  const [senza3d, setSenza3d] = useState(false);
  const stato = useRef({ angolo: ANGOLO_RIPOSO, velocita: 0, trascino: false, inizioY: 0, spostato: false, tirata: false });
  const attivaRef = useRef(attiva);
  const onTiraRef = useRef(onTira);
  useEffect(() => {
    attivaRef.current = attiva;
    onTiraRef.current = onTira;
  }, [attiva, onTira]);

  useEffect(() => {
    const box = contenitore.current;
    if (!box) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- il 3D non c'è: uso la leva semplice
      setSenza3d(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    box.appendChild(renderer.domElement);

    const scena = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const ambiente = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scena.environment = ambiente;
    scena.environmentIntensity = 0.9;
    const luce = new THREE.DirectionalLight(0xfff3e0, 2.2);
    luce.position.set(3, 5, 6);
    scena.add(luce);

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(1.1, 0.7, 8);
    camera.lookAt(0, 0.35, 0);

    // attacco dorato che entra nel fianco della macchinetta
    const oro = new THREE.MeshStandardMaterial({ color: 0xd9a93a, metalness: 1, roughness: 0.28 });
    const attacco = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.1, 40), oro);
    attacco.rotation.z = Math.PI / 2;
    attacco.position.set(-0.45, -1.1, 0);
    scena.add(attacco);
    const borchia = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 16), oro);
    borchia.position.set(0.1, -1.1, 0);
    scena.add(borchia);

    // perno: tutta la leva ruota attorno a questo punto
    const perno = new THREE.Group();
    perno.position.set(0.1, -1.1, 0);
    scena.add(perno);
    const cromo = new THREE.MeshStandardMaterial({ color: 0xf2f4f7, metalness: 1, roughness: 0.12 });
    const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 2.3, 24), cromo);
    asta.position.y = 1.15;
    perno.add(asta);
    const anello = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 12, 32), oro);
    anello.rotation.x = Math.PI / 2;
    anello.position.y = 2.1;
    perno.add(anello);
    const lacca = new THREE.MeshPhysicalMaterial({ color: 0xd8300a, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.3 });
    const pomello = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 32), lacca);
    pomello.position.y = 2.55;
    perno.add(pomello);

    // ombra morbida sotto, finta (un disco scuro sfumato)
    const ombraTela = document.createElement("canvas");
    ombraTela.width = ombraTela.height = 64;
    const oc = ombraTela.getContext("2d")!;
    const g = oc.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(0,0,0,.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    oc.fillStyle = g;
    oc.fillRect(0, 0, 64, 64);
    const ombra = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ombraTela), transparent: true, depthWrite: false }));
    ombra.position.set(0.1, -1.5, -0.2);
    scena.add(ombra);

    const ridimensiona = () => {
      renderer.setSize(box.clientWidth, box.clientHeight);
      camera.aspect = box.clientWidth / box.clientHeight;
      camera.updateProjectionMatrix();
    };
    ridimensiona();
    const ro = new ResizeObserver(ridimensiona);
    ro.observe(box);

    // molla: la leva torna a riposo con un rimbalzo
    let frame = 0;
    let prima = performance.now();
    const ciclo = (ora: number) => {
      frame = requestAnimationFrame(ciclo);
      const dt = Math.min((ora - prima) / 1000, 0.05);
      prima = ora;
      const s = stato.current;
      if (!s.trascino) {
        const forza = (ANGOLO_RIPOSO - s.angolo) * 90 - s.velocita * 7;
        s.velocita += forza * dt;
        s.angolo += s.velocita * dt;
      }
      perno.rotation.x = s.angolo;
      // il pomello oscilla un poco quando la macchinetta è pronta, per invitare a tirare
      perno.rotation.z = attivaRef.current && !s.trascino ? Math.sin(ora / 380) * 0.025 : 0;
      renderer.render(scena, camera);
    };
    frame = requestAnimationFrame(ciclo);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      scena.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      ambiente.dispose();
      pmrem.dispose();
      renderer.dispose();
      box.removeChild(renderer.domElement);
    };
  }, []);

  function tira() {
    const s = stato.current;
    if (s.tirata || !attivaRef.current) return;
    s.tirata = true;
    s.angolo = Math.max(s.angolo, ANGOLO_MAX * 0.9);
    s.velocita = 0;
    onTiraRef.current();
  }

  if (senza3d) return <>{riserva}</>;

  return (
    <div ref={contenitore} className="absolute inset-0">
      {/* il tasto invisibile sopra la leva: dito, mouse e tastiera */}
      <button
        type="button"
        aria-label="Tira la leva"
        disabled={!attiva}
        className="absolute inset-0 z-10 cursor-grab touch-none rounded-2xl opacity-0 focus-visible:opacity-100 disabled:cursor-default"
        onPointerDown={(e) => {
          if (!attiva) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          Object.assign(stato.current, { trascino: true, inizioY: e.clientY, spostato: false, velocita: 0 });
        }}
        onPointerMove={(e) => {
          const s = stato.current;
          if (!s.trascino) return;
          const dy = e.clientY - s.inizioY;
          if (Math.abs(dy) > 4) s.spostato = true;
          s.angolo = Math.min(ANGOLO_MAX, Math.max(ANGOLO_RIPOSO, ANGOLO_RIPOSO + (dy / 110) * ANGOLO_MAX));
        }}
        onPointerUp={() => {
          const s = stato.current;
          if (!s.trascino) return;
          s.trascino = false;
          // tirata abbastanza, oppure un semplice tocco
          if (s.angolo > ANGOLO_MAX * 0.6 || !s.spostato) tira();
        }}
        onPointerCancel={() => (stato.current.trascino = false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            tira();
          }
        }}
      />
    </div>
  );
}
