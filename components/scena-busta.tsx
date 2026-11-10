"use client";

// Scena 3D della busta (three.js, caricato solo qui), raccontata come una piccola storia:
// 1) la busta cade dal cielo e si pianta nella neve, l'inquadratura scende con lei;
// 2) tre tocchi: sobbalza, sobbalza di più, poi vola davanti a te;
// 3) il sigillo di ceralacca si gratta via sfregando col dito;
// 4) il lembo si apre trascinando in su, curvandosi come carta;
// 5) esce il biglietto, viene avanti e si gira mostrando il nome.
import { useEffect, useRef } from "react";
import { fontNome } from "@/components/biglietto-olografico";
import { suoni } from "@/lib/suoni";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// Effetti di luce: ognuno si può spegnere qui (true → false)
const EFFETTI = {
  ombre: true, // ombre morbide sulla neve + alone scuro sotto la busta
  bagliore: false, // (spento: sui telefoni veri sbiancava la neve) le cose luminose (luce della busta, scintille, ceralacca) emanano luce
  contorno: true, // luce fredda da dietro che disegna i bordi
  notte: true, // luce calda davanti, fredda dietro, angoli più scuri
  brillii: true, // puntini che brillano sulla neve
  vivido: true, // più contrasto e colori più pieni
};

const LARGHEZZA = 3.4;
const ALTEZZA = 2.2;
const SUOLO = -2; // altezza della neve

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
    // l'apertura a V in alto è trasparente: da lì si vede dentro la busta (e il biglietto)
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    c.moveTo(-2, -2);
    c.lineTo(1026, -2);
    c.lineTo(512, 397);
    c.closePath();
    c.fill();
    c.restore();
    // bordo della tasca, appena più scuro
    c.strokeStyle = "rgba(0,0,0,.12)";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(512, 397);
    c.lineTo(1024, 0);
    c.stroke();
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
// Lembo: triangolo di carta su fondo trasparente (la forma la dà la texture)
const ALTO_LEMBO = ALTEZZA * 0.6;
function texturaLembo() {
  const h = Math.round((1024 * ALTO_LEMBO) / LARGHEZZA);
  return tela(1024, h, (c) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(1024, 0);
    c.lineTo(512, h - 2);
    c.closePath();
    c.fillStyle = "#efe3c9";
    c.fill();
    c.strokeStyle = "rgba(0,0,0,.12)";
    c.lineWidth = 5;
    c.stroke();
    c.fillStyle = "rgba(120,90,40,.06)";
    for (let i = 0; i < 700; i++) c.fillRect(Math.random() * 1024, Math.random() * h * 0.6, 2, 2);
  });
}

function disegnaCeralacca(c: CanvasRenderingContext2D) {
  {
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
  }
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

// ---------- biglietto (retro con "?" e fronte col nome) ----------
const B_LARGO = 2.6;
const B_ALTO = B_LARGO * 1.25; // stesse proporzioni della card finale (4:5)
const PX = 640 / B_LARGO; // pixel della texture per unità

function arrotonda(c: CanvasRenderingContext2D, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(0, 0, w, h, r);
  c.clip();
}

function famiglia(variabile: string, riserva: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(variabile).trim() || riserva;
}

function disegnaRetro(c: CanvasRenderingContext2D, w: number, h: number) {
  c.clearRect(0, 0, w, h);
  c.save();
  arrotonda(c, w, h, 70);
  c.fillStyle = "#f3e8cf";
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "#e5481e";
  c.lineWidth = 34;
  for (let x = -h; x < w + h; x += 72) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + h, h);
    c.stroke();
  }
  c.fillStyle = "#e9a81c";
  c.beginPath();
  c.arc(w / 2, h / 2, 150, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#2c4a32";
  c.beginPath();
  c.arc(w / 2, h / 2, 132, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f3e8cf";
  c.font = `200px ${famiglia("--font-basteleur", "Georgia, serif")}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("?", w / 2, h / 2 + 10);
  c.restore();
}

// Fronte del biglietto: STESSA disposizione della card finale (components/biglietto-olografico.tsx),
// tutte le misure sono frazioni della larghezza, così il passaggio dal 3D alla card non si vede.
function disegnaFronte(c: CanvasRenderingContext2D, w: number, h: number, nome: string, avatar: HTMLImageElement | null) {
  c.clearRect(0, 0, w, h);
  c.save();
  arrotonda(c, w, h, w * 0.082);
  c.fillStyle = "#f3e8cf";
  c.fillRect(0, 0, w, h);
  // cucitura
  c.setLineDash([w * 0.024, w * 0.016]);
  c.strokeStyle = "rgba(229,72,30,.75)";
  c.lineWidth = w * 0.007;
  c.beginPath();
  c.roundRect(w * 0.026, w * 0.026, w - w * 0.052, h - w * 0.052, w * 0.058);
  c.stroke();
  c.setLineDash([]);
  // buco dell'etichetta
  c.fillStyle = "#2c4a32";
  c.beginPath();
  c.arc(w / 2, h * 0.085, w * 0.026, 0, Math.PI * 2);
  c.fill();
  const testo = famiglia("--font-bricolage", "system-ui, sans-serif");
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "rgba(28,36,29,.7)";
  c.font = `${w * 0.045}px ${testo}`;
  c.fillText("Farai il regalo a", w / 2, h * 0.165);
  // toppa col personaggio
  const cy = h * 0.4;
  const r = w * 0.22;
  c.fillStyle = "#f1e4c8";
  c.beginPath();
  c.arc(w / 2, cy, r, 0, Math.PI * 2);
  c.fill();
  if (avatar) {
    c.save();
    c.beginPath();
    c.arc(w / 2, cy, r, 0, Math.PI * 2);
    c.clip();
    c.drawImage(avatar, w / 2 - r, cy - r + r * 0.16, r * 2, r * 2);
    c.restore();
  }
  c.setLineDash([w * 0.014, w * 0.012]);
  c.strokeStyle = "rgba(44,74,50,.55)";
  c.lineWidth = w * 0.005;
  c.beginPath();
  c.arc(w / 2, cy, r - w * 0.014, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);
  // nome
  c.fillStyle = "#e5481e";
  c.font = `${w * fontNome(nome)}px ${famiglia("--font-basteleur", "Georgia, serif")}`;
  c.fillText(nome, w / 2, h * 0.665);
  // frase
  c.fillStyle = "#1c241d";
  c.font = `${w * 0.043}px ${testo}`;
  c.fillText("Acqua in bocca! Guarda la sua bacheca", w / 2, h * 0.795);
  c.fillText("per farti venire un'idea.", w / 2, h * 0.855);
  c.restore();
}

const facile = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

const morbido = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

export type FaseBusta = "attesa" | "cade" | "neve" | "vola" | "sigillo" | "lembo" | "biglietto";

// Piccolo sistema di particelle (neve che sbuffa, briciole di ceralacca, scintille)
function particelle(scena: THREE.Scene, punto: THREE.Texture, n: number, colore: number, dimensione: number, additivo: boolean, gravita: number) {
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const vita = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: punto,
    size: dimensione,
    color: colore,
    transparent: true,
    depthWrite: false,
    blending: additivo ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const punti = new THREE.Points(geo, mat);
  punti.frustumCulled = false;
  scena.add(punti);
  for (let i = 0; i < n; i++) pos[i * 3 + 1] = -999;
  let prossimo = 0;
  return {
    emetti(da: THREE.Vector3, quanti: number, forza: number, su = 0.6) {
      for (let q = 0; q < quanti; q++) {
        const i = prossimo;
        prossimo = (prossimo + 1) % n;
        const a = Math.random() * Math.PI * 2;
        const v = forza * (0.3 + Math.random());
        pos.set([da.x, da.y, da.z], i * 3);
        vel.set([Math.cos(a) * v, Math.random() * v * su + v * 0.2, Math.sin(a) * v * 0.6], i * 3);
        vita[i] = 1;
      }
    },
    aggiorna(dt: number) {
      for (let i = 0; i < n; i++) {
        if (vita[i] <= 0) continue;
        vita[i] -= dt * 0.9;
        vel[i * 3 + 1] -= gravita * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (vita[i] <= 0) pos[i * 3 + 1] = -999;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

export default function ScenaBusta({
  nome,
  avatarSvg,
  onFase,
  onPrimoTocco,
  onPronta,
  onAperta,
  parti,
  sigilloSulloSchermo,
  postoCard,
}: {
  nome: string;
  avatarSvg: () => string | null;
  onFase: (f: FaseBusta, tocchi?: number) => void;
  onPrimoTocco: () => void;
  onPronta?: () => void; // la scena è pronta (si può mostrare la pagina senza scatti)
  parti: boolean; // la slot si è rotta: la busta comincia a cadere
  sigilloSulloSchermo: () => DOMRect | null; // dov'era il sigillo nella slot (la busta parte da lì)
  postoCard: () => DOMRect | null; // dove sta la card finale (il biglietto 3D ci vola esattamente sopra)
  onAperta: () => void;
}) {
  const contenitore = useRef<HTMLDivElement>(null);
  const callback = useRef({ onFase, onPrimoTocco, onAperta, onPronta });
  const dati = useRef({ nome, avatarSvg, sigilloSulloSchermo, postoCard }); // letti dalla scena quando servono
  const partiRef = useRef(parti);
  useEffect(() => {
    partiRef.current = parti;
  }, [parti]);

  useEffect(() => {
    callback.current = { onFase, onPrimoTocco, onAperta, onPronta };
  }, [onFase, onPrimoTocco, onAperta, onPronta]);

  useEffect(() => {
    const box = contenitore.current!;
    // trasparente: il cielo è lo sfondo della pagina (così il colore non cambia mai)
    const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // un po' meno pixel: molto più leggero, a occhio uguale
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true; // per nascondere il biglietto finché è dentro la busta
    renderer.domElement.style.touchAction = "none";
    box.appendChild(renderer.domElement);

    const scena = new THREE.Scene();

    scena.fog = new THREE.Fog(0x163a25, 14, 38);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    scena.add(new THREE.HemisphereLight(0xfff8ea, 0xbfb08f, EFFETTI.notte ? 1.3 : 2.2));
    // luce principale: calda (come una lanterna) se "notte" è acceso
    const luna = new THREE.DirectionalLight(EFFETTI.notte ? 0xffdcaa : 0xfff1d6, EFFETTI.notte ? 2.4 : 1.4);
    luna.position.set(2.5, 6, 6);
    luna.target.position.set(0, SUOLO, 0);
    scena.add(luna, luna.target);
    if (EFFETTI.ombre) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      luna.castShadow = true;
      luna.shadow.mapSize.set(1024, 1024);
      luna.shadow.radius = 6;
      luna.shadow.bias = -0.002;
      Object.assign(luna.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 30 });
    }
    if (EFFETTI.contorno) {
      // luce fredda da dietro: disegna un filo luminoso sui bordi
      const controluce = new THREE.DirectionalLight(0x9cc6ff, 1.3);
      controluce.position.set(-2, 4, -8);
      scena.add(controluce);
    }
    const punto = texturaPunto();

    // ---------- paesaggio illustrato: neve di feltro crema, cumuli tondi, abeti ----------
    // ombre a tre toni, come un disegno (niente realismo)
    const toni = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 195, 195, 195, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    toni.minFilter = toni.magFilter = THREE.NearestFilter;
    toni.needsUpdate = true;
    const cartone = (colore: number) => new THREE.MeshToonMaterial({ color: colore, gradientMap: toni });
    const suolo = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), cartone(0xa8cbe2)); // neve azzurro ghiaccio: la busta crema calda si stacca bene
    suolo.rotation.x = -Math.PI / 2;
    suolo.position.y = SUOLO;
    suolo.receiveShadow = true;
    scena.add(suolo);
    const matCumulo = cartone(0xc9e0ef);
    [[-2.3, -1.4, 0.9], [2.5, -2.6, 1.2], [-4.2, -6, 1.8], [4, 0.3, 0.8], [0.6, -8, 2.2], [-1.4, 1.8, 0.6]].forEach(([x, z, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), matCumulo);
      m.scale.y = 0.38;
      m.position.set(x, SUOLO, z);
      m.receiveShadow = m.castShadow = EFFETTI.ombre;
      scena.add(m);
    });
    // il mucchietto di neve davanti alla busta: la fa sembrare piantata
    const mucchio = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), matCumulo);
    mucchio.scale.set(1.25, 0.32, 0.45);
    mucchio.position.set(0.05, SUOLO, 0.85);
    mucchio.receiveShadow = true;
    scena.add(mucchio);
    // abeti stilizzati con la punta innevata
    const matAbete = cartone(0x2c4a32);
    const matAbeteScuro = cartone(0x1e3826);
    const matNeveAlbero = cartone(0xc9e0ef);
    const matTronco = cartone(0x6b4a2b);
    [[-3.6, -5, 1.1], [-6.5, -9, 1.6], [3.4, -6.5, 1.3], [6.8, -10, 1.8], [-1.2, -13, 1.5], [1.8, -15, 2], [-9, -14, 1.7], [9.5, -15, 1.9]].forEach(([x, z, h], i) => {
      const albero = new THREE.Group();
      const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.6, 8), matTronco);
      tronco.position.y = 0.3;
      albero.add(tronco);
      [0, 1, 2].forEach((k) => {
        const r = 1.1 - k * 0.3;
        const piano = new THREE.Mesh(new THREE.ConeGeometry(r, 1.2, 9), k % 2 ? matAbeteScuro : matAbete);
        piano.position.y = 0.9 + k * 0.62;
        albero.add(piano);
      });
      const punta = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.45, 9), matNeveAlbero);
      punta.position.y = 2.42;
      albero.add(punta);
      albero.scale.setScalar(h);
      albero.rotation.y = i;
      albero.position.set(x, SUOLO, z);
      albero.traverse((o) => (o.castShadow = EFFETTI.ombre));
      scena.add(albero);
    });

    // ---------- busta ----------
    const busta = new THREE.Group();
    scena.add(busta);
    const matCorpo = new THREE.MeshToonMaterial({ map: texturaCorpo(), gradientMap: toni, transparent: true, alphaTest: 0.5 });
    const corpo = new THREE.Mesh(new THREE.PlaneGeometry(LARGHEZZA, ALTEZZA), matCorpo);
    corpo.castShadow = EFFETTI.ombre;
    busta.add(corpo);
    const matDavanti = new THREE.MeshToonMaterial({ color: 0xf3e8cf, gradientMap: toni, transparent: true });
    const davanti = new THREE.Mesh(new THREE.PlaneGeometry(LARGHEZZA, ALTEZZA), matDavanti);
    davanti.rotation.y = Math.PI;
    davanti.position.z = -0.005;
    busta.add(davanti);
    // l'interno della busta, dietro al biglietto: si vede dall'apertura a V
    const matInterno = new THREE.MeshToonMaterial({ color: 0xd9c49b, gradientMap: toni, transparent: true });
    const interno = new THREE.Mesh(new THREE.PlaneGeometry(LARGHEZZA * 0.98, ALTEZZA * 0.98), matInterno);
    interno.position.z = -0.035;
    busta.add(interno);

    // lembo: un foglio a strisce che si curva come carta (cerniera in alto)
    const RIGHE = 28;
    const geoLembo = new THREE.PlaneGeometry(LARGHEZZA, ALTO_LEMBO, 1, RIGHE);
    geoLembo.translate(0, -ALTO_LEMBO / 2, 0);
    const matLembo = new THREE.MeshToonMaterial({ map: texturaLembo(), gradientMap: toni, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 });
    const lembo = new THREE.Mesh(geoLembo, matLembo);
    lembo.position.set(0, ALTEZZA / 2, 0.004);
    lembo.castShadow = EFFETTI.ombre;
    busta.add(lembo);
    const posLembo = geoLembo.attributes.position;
    // la riga di ogni vertice la calcolo una volta sola dalla forma piatta
    const rigaDi = new Int16Array(posLembo.count);
    for (let i = 0; i < posLembo.count; i++) rigaDi[i] = Math.round((-posLembo.getY(i) / ALTO_LEMBO) * RIGHE);
    function piega(p: number) {
      const A = p * Math.PI * 1.1;
      const curva = Math.sin(Math.PI * Math.min(p, 1)) * 1.1;
      const passo = ALTO_LEMBO / RIGHE;
      let y = 0;
      let z = 0;
      const righe: [number, number][] = [[0, 0]];
      for (let j = 1; j <= RIGHE; j++) {
        const d = j / RIGHE;
        const a = A + curva * d * d;
        y -= Math.cos(a) * passo;
        z += Math.sin(a) * passo;
        righe.push([y, z]);
      }
      for (let i = 0; i < posLembo.count; i++) {
        const r = righe[rigaDi[i]];
        posLembo.setY(i, r[0]);
        posLembo.setZ(i, r[1]);
      }
      posLembo.needsUpdate = true;
      geoLembo.computeVertexNormals();
    }
    piega(0);

    // sigillo: una tela che si gratta via
    const telaCera = document.createElement("canvas");
    telaCera.width = telaCera.height = 256;
    const cc = telaCera.getContext("2d")!;
    disegnaCeralacca(cc);
    const texCera = new THREE.CanvasTexture(telaCera);
    texCera.colorSpace = THREE.SRGBColorSpace;
    const matCera = new THREE.MeshStandardMaterial({ map: texCera, roughness: 0.35, metalness: 0.1, transparent: true, alphaTest: 0.1, emissive: new THREE.Color(0xffb86b), emissiveIntensity: 0 });
    const R_CERA = 0.36;
    const cera = new THREE.Mesh(new THREE.CircleGeometry(R_CERA, 48), matCera);
    cera.position.set(0, ALTEZZA / 2 - ALTO_LEMBO + 0.3, 0.03);
    busta.add(cera);
    // per sapere quanto è stato grattato: una griglia di celle dentro il cerchio
    const GRIGLIA = 16;
    const grattate = new Set<number>();
    let celleDentro = 0;
    for (let gx = 0; gx < GRIGLIA; gx++)
      for (let gy = 0; gy < GRIGLIA; gy++) if (Math.hypot(gx + 0.5 - GRIGLIA / 2, gy + 0.5 - GRIGLIA / 2) < GRIGLIA / 2 - 0.3) celleDentro++;

    // luce che esce dalla busta aperta
    const matLuce = new THREE.SpriteMaterial({ map: punto, color: 0xffd98a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const luce = new THREE.Sprite(matLuce);
    luce.position.set(0, ALTEZZA * 0.3, -0.02);
    luce.scale.set(3, 2, 1);
    luce.renderOrder = -1;
    busta.add(luce);

    // ---------- biglietto dentro la busta ----------
    const tw = 640;
    const th = Math.round(B_ALTO * PX);
    const telaRetro = document.createElement("canvas");
    telaRetro.width = tw;
    telaRetro.height = th;
    const telaFronte = document.createElement("canvas");
    telaFronte.width = tw;
    telaFronte.height = th;
    const texRetro = new THREE.CanvasTexture(telaRetro);
    const texFronte = new THREE.CanvasTexture(telaFronte);
    [texRetro, texFronte].forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    });
    disegnaRetro(telaRetro.getContext("2d")!, tw, th);
    disegnaFronte(telaFronte.getContext("2d")!, tw, th, dati.current.nome, null);
    (async () => {
      await document.fonts.ready;
      disegnaRetro(telaRetro.getContext("2d")!, tw, th);
      texRetro.needsUpdate = true;
      const svg = dati.current.avatarSvg();
      let img: HTMLImageElement | null = null;
      if (svg) {
        img = new Image();
        img.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        await img.decode().catch(() => (img = null));
      }
      disegnaFronte(telaFronte.getContext("2d")!, tw, th, dati.current.nome, img);
      texFronte.needsUpdate = true;
    })();
    const taglio = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const matRetro = new THREE.MeshBasicMaterial({ map: texRetro, transparent: true, alphaTest: 0.5, clippingPlanes: [taglio] });
    const matFronte = new THREE.MeshBasicMaterial({ map: texFronte, transparent: true, alphaTest: 0.5, clippingPlanes: [taglio] });
    const biglietto = new THREE.Group();
    const retro = new THREE.Mesh(new THREE.PlaneGeometry(B_LARGO, B_ALTO), matRetro);
    const fronte = new THREE.Mesh(new THREE.PlaneGeometry(B_LARGO, B_ALTO), matFronte);
    fronte.rotation.y = Math.PI;
    fronte.position.z = -0.003;
    biglietto.add(retro, fronte);
    biglietto.visible = false;
    scena.add(biglietto);
    const Y_DENTRO = ALTEZZA / 2 - 0.12 - B_ALTO / 2;
    const Y_FUORI = ALTEZZA / 2 + B_ALTO * 0.25;

    // ---------- neve che cade e particelle ----------
    const N_NEVE = 320;
    const neve = new Float32Array(N_NEVE * 3);
    const velNeve = new Float32Array(N_NEVE);
    for (let i = 0; i < N_NEVE; i++) {
      neve.set([(Math.random() - 0.5) * 12, Math.random() * 12 - 3, (Math.random() - 0.5) * 8], i * 3);
      velNeve[i] = 0.3 + Math.random() * 0.5;
    }
    const geoNeve = new THREE.BufferGeometry();
    geoNeve.setAttribute("position", new THREE.BufferAttribute(neve, 3));
    const fiocchi = new THREE.Points(geoNeve, new THREE.PointsMaterial({ map: punto, size: 0.09, transparent: true, depthWrite: false, color: 0xffffff }));
    fiocchi.frustumCulled = false;
    scena.add(fiocchi);
    const sbuffi = particelle(scena, punto, 200, 0xffffff, 0.16, false, 3);
    const briciole = particelle(scena, punto, 260, 0xb3261e, 0.07, false, 6);
    const scintille = particelle(scena, punto, 220, 0xffd36b, 0.15, true, 1.2);

    // alone scuro morbido sotto la busta (la fa "appoggiare" alla neve)
    const alone = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: tela(128, 128, (c) => {
          const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
          g.addColorStop(0, "rgba(20,40,60,.55)");
          g.addColorStop(1, "rgba(20,40,60,0)");
          c.fillStyle = g;
          c.fillRect(0, 0, 128, 128);
        }),
        transparent: true,
        depthWrite: false,
      }),
    );
    alone.rotation.x = -Math.PI / 2;
    alone.position.y = SUOLO + 0.02;
    alone.visible = EFFETTI.ombre;
    scena.add(alone);

    // puntini che brillano sulla neve, a gruppi che si accendono a turno
    const brillii: THREE.PointsMaterial[] = [];
    if (EFFETTI.brillii) {
      for (let gr = 0; gr < 4; gr++) {
        const n = 50;
        const p = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 14, SUOLO + 0.04, Math.random() * 7 - 5], i * 3);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(p, 3));
        const m = new THREE.PointsMaterial({ map: punto, size: 0.12, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        brillii.push(m);
        scena.add(new THREE.Points(g, m));
      }
    }

    // ---------- bagliore e angoli scuri (post-produzione) ----------
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scena, camera));
    const bagliore = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.6, 0.82);
    bagliore.enabled = EFFETTI.bagliore;
    composer.addPass(bagliore);
    // (niente angoli scuri: scurirebbero la scena ma non lo sfondo della pagina)
    composer.addPass(new OutputPass());
    // più contrasto e colori più pieni (niente aspetto sbiadito)
    const vivido = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, contrasto: { value: 1.18 }, saturazione: { value: 1.25 } },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform sampler2D tDiffuse; uniform float contrasto; uniform float saturazione; varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
          vec3 col = mix(vec3(l), c.rgb, saturazione);
          col = (col - 0.5) * contrasto + 0.5;
          gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
        }`,
    });
    vivido.enabled = EFFETTI.vivido;
    composer.addPass(vivido);
    // se il telefono fa fatica, tolgo il bagliore da solo
    let tempi = 0;
    let fotogrammi = 0;

    // ---------- dimensioni ----------
    let scalaBase = 1;
    const ridimensiona = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      renderer.setSize(w, h);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      bagliore.resolution.set(w / 2, h / 2);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const altezzaVisibile = 2 * 9 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      scalaBase = Math.min((altezzaVisibile * camera.aspect * 0.82) / LARGHEZZA, 1.2);
    };
    ridimensiona();
    const ro = new ResizeObserver(ridimensiona);
    ro.observe(box);

    // ---------- inquadrature ----------
    const CAM_CIELO = { pos: new THREE.Vector3(0, 3.6, 9), guarda: new THREE.Vector3(0, 6.5, 0) };
    const CAM_NEVE = { pos: new THREE.Vector3(0, 0.1, 6.2), guarda: new THREE.Vector3(0, -1.5, 0.4) };
    const CAM_DAVANTI = { pos: new THREE.Vector3(0, 0, 9), guarda: new THREE.Vector3(0, 0, 0) };
    const guardaOra = new THREE.Vector3();
    function inquadra(da: typeof CAM_CIELO, a: typeof CAM_CIELO, k: number) {
      camera.position.lerpVectors(da.pos, a.pos, k);
      guardaOra.lerpVectors(da.guarda, a.guarda, k);
      camera.lookAt(guardaOra);
    }
    const POSA_NEVE = { pos: new THREE.Vector3(0, -1.68, 0.4), rot: new THREE.Euler(-0.35, 0.15, 0.16) };

    // ---------- stato della storia ----------
    let fase: FaseBusta = "attesa";
    let partenzaBusta: { pos: THREE.Vector3; quat: THREE.Quaternion; scala: number } | null = null;
    let scalaVicina = 1;
    let inizioFase = 0;
    let tocchi = 0;
    let salto = 0; // altezza del sobbalzo
    let velSalto = 0;
    let dondolio = 0;
    let apertura = 0; // 0 = lembo chiuso, 1 = aperto
    let obiettivoApertura = 0;
    let trascinoLembo: { y: number; da: number } | null = null;
    let grattando = false;
    let ultimaGrattata = 0;
    let sigilloVia = -1;
    let partenzaBiglietto: { pos: THREE.Vector3; scala: number } | null = null;
    let finita = false;
    const orologio = new THREE.Clock();
    const vaiA = (f: FaseBusta) => {
      fase = f;
      inizioFase = orologio.getElapsedTime();
      callback.current.onFase(f, tocchi);
    };
    callback.current.onFase("attesa");

    // ---------- tocchi e dita ----------
    const raggio = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const colpisci = (e: PointerEvent, oggetti: THREE.Object3D[]) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raggio.setFromCamera(ndc, camera);
      return raggio.intersectObjects(oggetti, false)[0];
    };
    const punto3 = new THREE.Vector3();

    function gratta(e: PointerEvent) {
      const h = colpisci(e, [cera]);
      if (!h?.uv) return;
      const x = h.uv.x * 256;
      const y = (1 - h.uv.y) * 256;
      cc.save();
      cc.globalCompositeOperation = "destination-out";
      cc.beginPath();
      cc.arc(x, y, 30, 0, Math.PI * 2);
      cc.fill();
      cc.restore();
      texCera.needsUpdate = true;
      const gx0 = Math.floor((x / 256) * GRIGLIA);
      const gy0 = Math.floor((y / 256) * GRIGLIA);
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -2; dy <= 2; dy++) {
          const gx = gx0 + dx;
          const gy = gy0 + dy;
          if (gx < 0 || gy < 0 || gx >= GRIGLIA || gy >= GRIGLIA) continue;
          if (Math.hypot(dx, dy) <= 2 && Math.hypot(gx + 0.5 - GRIGLIA / 2, gy + 0.5 - GRIGLIA / 2) < GRIGLIA / 2 - 0.3) grattate.add(gx * GRIGLIA + gy);
        }
      briciole.emetti(h.point, 4, 1.2, 0.8);
      const ora = performance.now();
      if (ora - ultimaGrattata > 70) {
        ultimaGrattata = ora;
        suoni.gratta();
      }
      if (grattate.size / celleDentro > 0.55 && sigilloVia < 0) {
        // il resto del sigillo si sbriciola e cade
        sigilloVia = orologio.getElapsedTime();
        cera.getWorldPosition(punto3);
        briciole.emetti(punto3, 60, 2, 0.6);
        scintille.emetti(punto3, 40, 1.5);
      }
    }

    const giu = (e: PointerEvent) => {
      if (fase === "neve") {
        if (!colpisci(e, [corpo, davanti, lembo, cera])) return;
        if (tocchi === 0) callback.current.onPrimoTocco();
        tocchi++;
        suoni.puff();
        busta.getWorldPosition(punto3);
        punto3.y = SUOLO + 0.1;
        sbuffi.emetti(punto3, 30 + tocchi * 15, 1.6 + tocchi * 0.5, 1);
        if (tocchi >= 3) vaiA("vola");
        else {
          velSalto = tocchi === 1 ? 2.2 : 3.4;
          dondolio = tocchi === 1 ? 0.25 : 0.45;
          callback.current.onFase("neve", tocchi);
        }
      } else if (fase === "sigillo") {
        if (colpisci(e, [cera])) {
          grattando = true;
        }
      } else if (fase === "lembo") {
        trascinoLembo = { y: e.clientY, da: apertura };
        suoni.carta();
      }
    };
    const muovi = (e: PointerEvent) => {
      if (fase === "sigillo" && grattando) gratta(e);
      if (fase === "lembo" && trascinoLembo) {
        const corsa = box.clientHeight * 0.3;
        obiettivoApertura = apertura = Math.min(1, Math.max(0, trascinoLembo.da + (trascinoLembo.y - e.clientY) / corsa));
      }
    };
    const su = () => {
      grattando = false;
      if (fase === "lembo" && trascinoLembo) {
        trascinoLembo = null;
        obiettivoApertura = apertura > 0.4 ? 1 : 0; // oltre metà si apre da solo, altrimenti torna giù
        if (obiettivoApertura) suoni.carta();
      }
    };
    // la scena sta dietro la pagina: ascolto le dita su tutta la finestra (ma non sui tasti)
    const suTasto = (e: PointerEvent) => !!(e.target as HTMLElement).closest?.("a,button");
    const giuFinestra = (e: PointerEvent) => !suTasto(e) && giu(e);
    window.addEventListener("pointerdown", giuFinestra);
    window.addEventListener("pointermove", muovi);
    window.addEventListener("pointerup", su);
    window.addEventListener("pointercancel", su);

    // ---------- animazione ----------
    let frame = 0;
    let ultimo = 0;
    let fotogrammiTotali = 0;
    renderer.compile(scena, camera); // preparo subito tutti i materiali: niente scatti dopo
    const ciclo = () => {
      frame = requestAnimationFrame(ciclo);
      const t = orologio.getElapsedTime();
      const dt = Math.min(t - ultimo, 0.05);
      ultimo = t;
      const f = t - inizioFase;
      const sNeve = scalaBase * 0.72;

      if (fase === "attesa") {
        inquadra(CAM_CIELO, CAM_NEVE, 0);
        camera.updateMatrixWorld();
        {
          // la busta sta dietro la finestrella della slot (la segue anche se la pagina scorre), girata verso di te
          const r = dati.current.sigilloSulloSchermo();
          const w = box.clientWidth;
          const h = box.clientHeight;
          const cx = r ? r.left + r.width / 2 : w / 2;
          const cy = r ? r.top + r.height / 2 : h / 2;
          const distanza = 6;
          const punto = new THREE.Vector3((cx / w) * 2 - 1, -(cy / h) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
          const pos = camera.position.clone().add(punto.multiplyScalar(distanza));
          const perPixel = (2 * distanza * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h;
          // dentro la slot: larga quanto la finestrella (meno un margine)
          const scala = (((r ? r.width : 170) - 8) * perPixel) / LARGHEZZA;
          scalaVicina = (w * 0.85 * perPixel) / LARGHEZZA; // quando la slot si rompe si avvicina allo schermo
          const quat = camera.quaternion.clone();
          partenzaBusta = { pos, quat, scala };
          busta.position.copy(pos);
          busta.quaternion.copy(quat);
          busta.scale.setScalar(scala);
          if (partiRef.current) vaiA("cade");
        }
      } else if (fase === "cade" && partenzaBusta) {
        // dal posto del sigillo la busta cade nella neve girando; l'inquadratura scende con lei
        // un attimo sospesa (dondola mentre i pezzi volano via), poi cade
        const SOSPESA = 0.65;
        const k = Math.min(1, Math.max(0, f - SOSPESA) / 2);
        const caduta = k * k; // accelera come un oggetto che cade
        const finale = new THREE.Quaternion().setFromEuler(POSA_NEVE.rot);
        const fc = Math.max(0, f - SOSPESA); // tempo di caduta
        // un solo giro morbido che rallenta, più un dondolio leggero (come un foglio che cade)
        const giro = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(Math.sin(fc * 3) * 0.3 * (1 - k), Math.PI * 2 * (1 - morbido(k)), Math.sin(fc * 2.2) * 0.25 * (1 - k)),
        );
        busta.quaternion.copy(partenzaBusta.quat).slerp(finale, morbido(k)).multiply(giro);
        if (f < SOSPESA) busta.rotateZ(Math.sin(f * 18) * 0.05 * (1 - f / SOSPESA));
        busta.position.lerpVectors(partenzaBusta.pos, POSA_NEVE.pos, caduta);
        busta.position.x += Math.sin(Math.max(0, f - SOSPESA) * 3) * 0.4 * (1 - k);
        // prima si avvicina (si ingrandisce, in prospettiva), poi cade e torna alla misura della neve
        const avvicina = morbido(Math.min(1, f / SOSPESA));
        const grande = partenzaBusta.scala + (scalaVicina - partenzaBusta.scala) * avvicina;
        busta.scale.setScalar(grande + (sNeve - grande) * morbido(k));
        inquadra(CAM_CIELO, CAM_NEVE, morbido((f - SOSPESA - 0.1) / 2));
        if (k >= 1) {
          sbuffi.emetti(new THREE.Vector3(0, SUOLO + 0.1, POSA_NEVE.pos.z), 70, 2.4, 1);
          suoni.tonfoNeve();
          vaiA("neve");
        }
      } else if (fase === "neve") {
        inquadra(CAM_CIELO, CAM_NEVE, 1);
        // sobbalzi
        velSalto -= 14 * dt;
        salto = Math.max(0, salto + velSalto * dt);
        if (salto === 0 && velSalto < 0) {
          if (velSalto < -2) sbuffi.emetti(new THREE.Vector3(0, SUOLO + 0.1, POSA_NEVE.pos.z), 20, 1.2, 1);
          velSalto = 0;
        }
        dondolio *= Math.exp(-3 * dt);
        busta.position.copy(POSA_NEVE.pos).add(new THREE.Vector3(0, salto, 0));
        busta.rotation.set(POSA_NEVE.rot.x, POSA_NEVE.rot.y, POSA_NEVE.rot.z + Math.sin(t * 18) * dondolio);
        busta.scale.setScalar(sNeve);
        matCera.emissiveIntensity = 0.12 + 0.12 * Math.sin(t * 4);
      } else if (fase === "vola") {
        // si alza in volo con una giravolta e si mette davanti
        const k = morbido(f / 1.6);
        busta.position.set(
          POSA_NEVE.pos.x * (1 - k) + Math.sin(k * Math.PI) * 0.6,
          POSA_NEVE.pos.y * (1 - k) + Math.sin(k * Math.PI) * 1.6,
          POSA_NEVE.pos.z * (1 - k),
        );
        busta.rotation.set(POSA_NEVE.rot.x * (1 - k), POSA_NEVE.rot.y * (1 - k) + k * Math.PI * 2, POSA_NEVE.rot.z * (1 - k));
        busta.scale.setScalar(sNeve + (scalaBase - sNeve) * k);
        inquadra(CAM_NEVE, CAM_DAVANTI, k);
        if (f > 0.3 && f < 1.2) scintille.emetti(busta.getWorldPosition(punto3), 2, 0.6);
        if (f >= 1.6) {
          busta.getWorldPosition(punto3);
          scintille.emetti(punto3, 80, 2);
          vaiA("sigillo");
        }
      } else {
        // davanti a te: dondola appena
        inquadra(CAM_NEVE, CAM_DAVANTI, 1);
        if (fase !== "biglietto") {
          busta.position.set(0, Math.sin(t * 1.6) * 0.05, 0);
          busta.rotation.set(Math.sin(t * 0.9) * 0.03, Math.sin(t * 0.7) * 0.05, 0);
          busta.scale.setScalar(scalaBase);
        }
      }

      // il sigillo che si sbriciola
      if (sigilloVia >= 0) {
        const a = t - sigilloVia;
        cera.position.y = ALTEZZA / 2 - ALTO_LEMBO + 0.3 - a * a * 3;
        cera.rotation.z = a * 4;
        matCera.opacity = Math.max(0, 1 - a * 2);
        if (a > 0.5 && fase === "sigillo") {
          cera.visible = false;
          vaiA("lembo");
        }
      }

      // il lembo segue il dito; lasciato, va verso aperto o chiuso con una molla
      if (fase === "lembo" || fase === "biglietto") {
        if (!trascinoLembo) apertura += (obiettivoApertura - apertura) * Math.min(1, dt * 7);
        piega(apertura);
        matLuce.opacity = Math.min(0.85, apertura * 0.9) * (fase === "biglietto" ? Math.max(0, 1 - (t - inizioFase - 0.8) / 0.6) : 1);
        if (fase === "lembo" && obiettivoApertura === 1 && apertura > 0.97) {
          busta.getWorldPosition(punto3);
          scintille.emetti(punto3.add(new THREE.Vector3(0, ALTEZZA / 2 * scalaBase, 0)), 90, 2.5);
          vaiA("biglietto");
          obiettivoApertura = 1.36; // il lembo si ripiega dietro la busta: non copre più il biglietto
          lembo.position.z = -0.03; // e passa dietro al biglietto che esce (niente righe sovrapposte)
        }
      }

      // mentre apri il lembo il biglietto è già lì dentro, infilato nella busta
      if (fase === "lembo") {
        biglietto.visible = true;
        busta.localToWorld(punto3.set(0, Y_DENTRO, -0.02));
        biglietto.position.copy(punto3);
        biglietto.quaternion.copy(busta.quaternion);
        biglietto.scale.copy(busta.scale);
        busta.localToWorld(punto3.set(0, -ALTEZZA / 2, 0));
        taglio.constant = -punto3.y;
      }

      // il biglietto esce, la busta scende via, il biglietto viene avanti e si gira
      if (fase === "biglietto") {
        const a = t - inizioFase;
        if (a <= 1.3) {
          biglietto.visible = true;
          const k = facile(a / 1.3);
          busta.localToWorld(punto3.set(0, Y_DENTRO + (Y_FUORI - Y_DENTRO) * k, -0.02));
          biglietto.position.copy(punto3);
          biglietto.quaternion.copy(busta.quaternion);
          biglietto.scale.copy(busta.scale);
          busta.localToWorld(punto3.set(0, -ALTEZZA / 2, 0));
          taglio.constant = -punto3.y;
        } else {
          if (!partenzaBiglietto) {
            partenzaBiglietto = { pos: biglietto.position.clone(), scala: biglietto.scale.x };
            matRetro.clippingPlanes = [];
            matFronte.clippingPlanes = [];
            matRetro.needsUpdate = matFronte.needsUpdate = true;
          }
          const g = facile((a - 1.3) / 0.9);
          busta.position.y = -g * 5;
          [matCorpo, matDavanti, matLembo, matInterno].forEach((m) => (m.opacity = 1 - g));
          const k = facile((a - 1.3) / 1.1);
          const zFinale = 2.5;
          const hVis = 2 * (9 - zFinale) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          const posto = dati.current.postoCard();
          const W = box.clientWidth;
          const H = box.clientHeight;
          const scalaFinale = posto ? (posto.height / H) * (hVis / B_ALTO) : Math.min((hVis * camera.aspect * 0.86) / B_LARGO, (hVis * 0.62) / B_ALTO);
          const xFinale = posto ? ((posto.left + posto.width / 2) / W - 0.5) * hVis * camera.aspect : 0;
          const yFinale = posto ? -((posto.top + posto.height / 2) / H - 0.5) * hVis : 0;
          const p0 = partenzaBiglietto.pos;
          biglietto.position.set(p0.x + (xFinale - p0.x) * k, p0.y + (yFinale - p0.y) * k, p0.z + (zFinale - p0.z) * k);
          biglietto.scale.setScalar(partenzaBiglietto.scala + (scalaFinale - partenzaBiglietto.scala) * k);
          biglietto.rotation.set(0, facile((a - 1.6) / 0.8) * Math.PI, Math.sin(k * Math.PI) * 0.08);
        }
        if (a > 2.55 && !finita) {
          finita = true;
          callback.current.onAperta();
          // la card vera prende il suo posto (identica): tolgo quella 3D un attimo dopo
          setTimeout(() => (biglietto.visible = false), 150);
        }
      }

      // neve che cade
      for (let i = 0; i < N_NEVE; i++) {
        neve[i * 3 + 1] -= velNeve[i] * dt;
        neve[i * 3] += Math.sin(t + i) * 0.002;
        if (neve[i * 3 + 1] < SUOLO) neve[i * 3 + 1] = 9;
      }
      geoNeve.attributes.position.needsUpdate = true;
      sbuffi.aggiorna(dt);
      briciole.aggiorna(dt);
      scintille.aggiorna(dt);

      // alone che segue la busta (più chiaro quando è in alto)
      if (alone.visible) {
        busta.getWorldPosition(punto3);
        const alto = Math.max(0, punto3.y - SUOLO);
        alone.position.x = punto3.x;
        alone.position.z = punto3.z + 0.1;
        const largo = LARGHEZZA * busta.scale.x * (1.1 + alto * 0.25);
        alone.scale.set(largo, largo * 0.5, 1);
        (alone.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - alto / 3.5) * (fase === "biglietto" ? 0 : 1);
      }
      brillii.forEach((m, i) => (m.opacity = Math.max(0, Math.sin(t * 1.3 + i * 1.6)) * 0.9));
      if (bagliore.enabled && t < 4) {
        tempi += dt;
        fotogrammi++;
        if (t > 3 && fotogrammi / tempi < 35) bagliore.enabled = false;
      }

      composer.render();
      if (++fotogrammiTotali === 3) callback.current.onPronta?.();
    };
    ciclo();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("pointerdown", giuFinestra);
      window.removeEventListener("pointermove", muovi);
      window.removeEventListener("pointerup", su);
      window.removeEventListener("pointercancel", su);
      composer.dispose();
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

  return <div ref={contenitore} className="absolute inset-0" />;
}
