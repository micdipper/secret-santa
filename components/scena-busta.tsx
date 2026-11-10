"use client";

// Scena 3D della busta (three.js, caricato solo qui).
// La busta arriva volando e girando, si posa tra neve e stelline;
// quando "aperta" diventa vero, il lembo si solleva, esce una luce e la busta scende via.
import { useEffect, useRef } from "react";
import * as THREE from "three";

const LARGHEZZA = 3.4;
const ALTEZZA = 2.2;
const DURATA_ARRIVO = 1.9; // secondi

function tela(w: number, h: number, disegna: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  disegna(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Corpo della busta (retro): carta crema, pieghe, fodera a righe dove sta il lembo.
function texturaCorpo() {
  return tela(1024, 662, (c) => {
    c.fillStyle = "#f7efdd";
    c.fillRect(0, 0, 1024, 662);
    // fodera vermiglio e crema, visibile solo quando il lembo è aperto
    c.save();
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(1024, 0);
    c.lineTo(512, 380);
    c.closePath();
    c.clip();
    c.fillStyle = "#e5481e";
    c.fillRect(0, 0, 1024, 400);
    c.strokeStyle = "#f3e8cf";
    c.lineWidth = 14;
    for (let x = -400; x < 1400; x += 60) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + 380, 400);
      c.stroke();
    }
    c.restore();
    // pieghe laterali e in basso
    c.strokeStyle = "rgba(0,0,0,.08)";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(0, 662);
    c.lineTo(400, 330);
    c.moveTo(1024, 662);
    c.lineTo(624, 330);
    c.stroke();
    c.fillStyle = "rgba(120,90,40,.06)";
    for (let i = 0; i < 1400; i++) c.fillRect(Math.random() * 1024, Math.random() * 662, 2, 2);
  });
}

// Lembo: triangolo crema con la ceralacca in punta.
function texturaLembo() {
  return tela(1024, 512, (c) => {
    c.fillStyle = "#efe3c9";
    c.fillRect(0, 0, 1024, 512);
    c.strokeStyle = "rgba(0,0,0,.1)";
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(512, 500);
    c.lineTo(1024, 0);
    c.stroke();
  });
}

function texturaCeralacca() {
  return tela(256, 256, (c) => {
    const g = c.createRadialGradient(100, 90, 10, 128, 128, 128);
    g.addColorStop(0, "#e2493c");
    g.addColorStop(1, "#7e1414");
    c.fillStyle = g;
    c.beginPath();
    c.arc(128, 128, 124, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(60,8,8,.5)";
    c.lineWidth = 8;
    c.beginPath();
    c.arc(128, 128, 84, 0, Math.PI * 2);
    c.stroke();
    // stellina a 4 punte dorata
    c.fillStyle = "#f1d27a";
    c.beginPath();
    const p = [[128, 70], [142, 114], [186, 128], [142, 142], [128, 186], [114, 142], [70, 128], [114, 114]];
    p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fill();
  });
}

// Puntino morbido per neve e scintille
function texturaPunto() {
  return tela(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
}

const facile = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export default function ScenaBusta({ aperta, onPronta, onAperta }: { aperta: boolean; onPronta: () => void; onAperta: () => void }) {
  const contenitore = useRef<HTMLDivElement>(null);
  const apertaRef = useRef(aperta);
  const callback = useRef({ onPronta, onAperta });

  useEffect(() => {
    apertaRef.current = aperta;
  }, [aperta]);
  useEffect(() => {
    callback.current = { onPronta, onAperta };
  }, [onPronta, onAperta]);

  useEffect(() => {
    const box = contenitore.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    box.appendChild(renderer.domElement);

    const scena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 9);
    scena.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sole = new THREE.DirectionalLight(0xfff1d6, 1.6);
    sole.position.set(2, 3, 6);
    scena.add(sole);

    // ---------- busta ----------
    const busta = new THREE.Group();
    scena.add(busta);
    const matCorpo = new THREE.MeshStandardMaterial({ map: texturaCorpo(), roughness: 0.9, transparent: true });
    const corpo = new THREE.Mesh(new THREE.PlaneGeometry(LARGHEZZA, ALTEZZA), matCorpo);
    busta.add(corpo);
    // retro (il davanti della busta, visibile mentre gira)
    const matDavanti = new THREE.MeshStandardMaterial({ color: 0xf3e8cf, roughness: 0.9, transparent: true });
    const davanti = new THREE.Mesh(new THREE.PlaneGeometry(LARGHEZZA, ALTEZZA), matDavanti);
    davanti.rotation.y = Math.PI;
    davanti.position.z = -0.005;
    busta.add(davanti);

    const cerniera = new THREE.Group(); // il lembo ruota attorno al bordo in alto
    cerniera.position.set(0, ALTEZZA / 2, 0.012);
    busta.add(cerniera);
    const forma = new THREE.Shape();
    forma.moveTo(-LARGHEZZA / 2, 0);
    forma.lineTo(LARGHEZZA / 2, 0);
    forma.lineTo(0, -ALTEZZA * 0.6);
    forma.closePath();
    const geoLembo = new THREE.ShapeGeometry(forma);
    // coordinate della texture sul triangolo
    const pos = geoLembo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / LARGHEZZA + 0.5;
      uv[i * 2 + 1] = 1 + pos.getY(i) / (ALTEZZA * 0.6);
    }
    geoLembo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const matLembo = new THREE.MeshStandardMaterial({ map: texturaLembo(), roughness: 0.85, side: THREE.DoubleSide, transparent: true });
    const lembo = new THREE.Mesh(geoLembo, matLembo);
    cerniera.add(lembo);
    const matCera = new THREE.MeshStandardMaterial({ map: texturaCeralacca(), roughness: 0.35, metalness: 0.1, transparent: true });
    const cera = new THREE.Mesh(new THREE.CircleGeometry(0.34, 48), matCera);
    cera.position.set(0, -ALTEZZA * 0.6 + 0.3, 0.01);
    cerniera.add(cera);

    // luce che esce dalla busta aperta
    const punto = texturaPunto();
    const matLuce = new THREE.SpriteMaterial({ map: punto, color: 0xffd98a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const luce = new THREE.Sprite(matLuce);
    luce.position.set(0, ALTEZZA * 0.3, -0.02); // dietro al corpo: si vede uscire da sopra
    luce.scale.set(3, 2, 1);
    luce.renderOrder = -1; // disegnata per prima: il corpo della busta la copre
    busta.add(luce);

    // ---------- neve ----------
    const N_NEVE = 260;
    const neve = new Float32Array(N_NEVE * 3);
    const velNeve = new Float32Array(N_NEVE);
    for (let i = 0; i < N_NEVE; i++) {
      neve[i * 3] = (Math.random() - 0.5) * 8;
      neve[i * 3 + 1] = (Math.random() - 0.5) * 10;
      neve[i * 3 + 2] = (Math.random() - 0.5) * 4;
      velNeve[i] = 0.25 + Math.random() * 0.5;
    }
    const geoNeve = new THREE.BufferGeometry();
    geoNeve.setAttribute("position", new THREE.BufferAttribute(neve, 3));
    const matNeve = new THREE.PointsMaterial({ map: punto, size: 0.09, transparent: true, opacity: 0, depthWrite: false, color: 0xffffff });
    scena.add(new THREE.Points(geoNeve, matNeve));

    // ---------- scintille (esplosioni) ----------
    const N_SC = 220;
    const sc = new Float32Array(N_SC * 3);
    const velSc = new Float32Array(N_SC * 3);
    const geoSc = new THREE.BufferGeometry();
    geoSc.setAttribute("position", new THREE.BufferAttribute(sc, 3));
    const matSc = new THREE.PointsMaterial({ map: punto, size: 0.16, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffd36b });
    scena.add(new THREE.Points(geoSc, matSc));
    let inizioScoppio = -10;
    function scoppio(y: number, forza: number) {
      for (let i = 0; i < N_SC; i++) {
        const a = Math.random() * Math.PI * 2;
        const b = (Math.random() - 0.5) * Math.PI;
        const v = forza * (0.4 + Math.random());
        sc[i * 3] = 0;
        sc[i * 3 + 1] = y;
        sc[i * 3 + 2] = 0.3;
        velSc[i * 3] = Math.cos(a) * Math.cos(b) * v;
        velSc[i * 3 + 1] = Math.sin(b) * v + 0.6;
        velSc[i * 3 + 2] = Math.sin(a) * Math.cos(b) * v * 0.4;
      }
      geoSc.attributes.position.needsUpdate = true;
      inizioScoppio = orologio.getElapsedTime();
    }

    // ---------- inclinazione col dito o col telefono ----------
    let inclX = 0;
    let inclY = 0;
    const muovi = (e: PointerEvent) => {
      inclY = (e.clientX / window.innerWidth - 0.5) * 0.5;
      inclX = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    const giroscopio = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      inclY = Math.max(-0.4, Math.min(0.4, e.gamma / 60));
      inclX = Math.max(-0.3, Math.min(0.3, (e.beta - 45) / 90));
    };
    window.addEventListener("pointermove", muovi);
    window.addEventListener("deviceorientation", giroscopio);

    // ---------- dimensioni ----------
    let scalaBase = 1;
    const ridimensiona = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const altezzaVisibile = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      scalaBase = Math.min((altezzaVisibile * camera.aspect * 0.82) / LARGHEZZA, 1.2);
    };
    ridimensiona();
    const ro = new ResizeObserver(ridimensiona);
    ro.observe(box);

    // ---------- animazione ----------
    const orologio = new THREE.Clock();
    let pronta = false;
    let inizioApertura = -1;
    let finita = false;
    let frame = 0;
    let ultimo = 0;
    matCera.emissive = new THREE.Color(0xffb86b);

    const ciclo = () => {
      frame = requestAnimationFrame(ciclo);
      const t = orologio.getElapsedTime();
      const dt = Math.min(t - ultimo, 0.05);
      ultimo = t;

      // arrivo: da lontano, girando su se stessa
      const k = facile(t / DURATA_ARRIVO);
      const s = scalaBase * (0.2 + 0.8 * k);
      busta.scale.set(s, s, s);
      busta.position.set(0, (1 - k) * 3 + Math.sin(t * 1.6) * 0.06 * k, -14 * (1 - k));
      busta.rotation.y = (1 - k) * Math.PI * 4 + inclY * k;
      busta.rotation.x = inclX * k;
      busta.rotation.z = (1 - k) * 0.6 + Math.sin(t * 1.1) * 0.02;
      matNeve.opacity = Math.min(0.9, t / 1.5);
      if (!pronta && t > DURATA_ARRIVO) {
        pronta = true;
        scoppio(0, 2.2);
        callback.current.onPronta();
      }
      // la ceralacca luccica
      matCera.emissiveIntensity = pronta && inizioApertura < 0 ? 0.15 + 0.15 * Math.sin(t * 4) : 0;

      // apertura
      if (apertaRef.current && pronta && inizioApertura < 0) {
        inizioApertura = t;
        scoppio(ALTEZZA / 2 * scalaBase, 3);
      }
      if (inizioApertura >= 0) {
        const a = t - inizioApertura;
        cerniera.rotation.x = facile(a / 0.8) * Math.PI * 0.92;
        matLuce.opacity = 0.85 * Math.min(1, a / 0.5) * (a < 1.4 ? 1 : Math.max(0, 1 - (a - 1.4) / 0.6));
        luce.scale.set(3 + a * 1.5, 2 + a, 1);
        if (a > 1.0) {
          const g = facile((a - 1.0) / 0.9);
          busta.position.y -= g * 4;
          [matCorpo, matDavanti, matLembo, matCera].forEach((m) => (m.opacity = 1 - g));
        }
        if (a > 1.05 && !finita) {
          finita = true;
          callback.current.onAperta();
        }
      }

      // neve che cade
      for (let i = 0; i < N_NEVE; i++) {
        neve[i * 3 + 1] -= velNeve[i] * dt;
        neve[i * 3] += Math.sin(t + i) * 0.002;
        if (neve[i * 3 + 1] < -5) neve[i * 3 + 1] = 5;
      }
      geoNeve.attributes.position.needsUpdate = true;

      // scintille che si allargano e si spengono
      const vita = t - inizioScoppio;
      if (vita < 1.6) {
        for (let i = 0; i < N_SC * 3; i++) sc[i] += velSc[i] * dt;
        for (let i = 0; i < N_SC; i++) velSc[i * 3 + 1] -= 1.2 * dt;
        geoSc.attributes.position.needsUpdate = true;
        matSc.opacity = 1 - vita / 1.6;
      } else matSc.opacity = 0;

      renderer.render(scena, camera);
    };
    ciclo();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("pointermove", muovi);
      window.removeEventListener("deviceorientation", giroscopio);
      renderer.dispose();
      scena.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
          o.geometry?.dispose();
          const m = o.material as THREE.Material & { map?: THREE.Texture };
          m.map?.dispose();
          m.dispose();
        }
      });
      box.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={contenitore} className="absolute inset-0" aria-hidden />;
}
