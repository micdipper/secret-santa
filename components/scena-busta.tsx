"use client";

// Scena 3D della busta (three.js, caricato solo qui), raccontata come una piccola storia:
// 1) la busta cade dal cielo e si pianta nella neve, l'inquadratura scende con lei;
// 2) tre tocchi: sobbalza, sobbalza di più, poi vola davanti a te;
// 3) il sigillo di ceralacca si gratta via sfregando col dito;
// 4) il lembo si apre trascinando in su, curvandosi come carta;
// 5) esce il biglietto, viene avanti e si gira mostrando il nome.
import { useEffect, useRef } from "react";
import * as THREE from "three";

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
const B_ALTO = 2.9;
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

function disegnaFronte(c: CanvasRenderingContext2D, w: number, h: number, nome: string, avatar: HTMLImageElement | null) {
  c.clearRect(0, 0, w, h);
  c.save();
  arrotonda(c, w, h, 70);
  c.fillStyle = "#f3e8cf";
  c.fillRect(0, 0, w, h);
  // cucitura
  c.setLineDash([22, 16]);
  c.strokeStyle = "rgba(229,72,30,.75)";
  c.lineWidth = 7;
  c.beginPath();
  c.roundRect(22, 22, w - 44, h - 44, 50);
  c.stroke();
  c.setLineDash([]);
  // buco dell'etichetta
  c.fillStyle = "#2c4a32";
  c.beginPath();
  c.arc(w / 2, 70, 18, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "rgba(28,36,29,.7)";
  c.font = `34px ${famiglia("--font-bricolage", "system-ui, sans-serif")}`;
  c.textAlign = "center";
  c.fillText("Farai il regalo a", w / 2, 150);
  // toppa col personaggio
  const cy = 330;
  c.fillStyle = "#f1e4c8";
  c.beginPath();
  c.arc(w / 2, cy, 140, 0, Math.PI * 2);
  c.fill();
  if (avatar) {
    c.save();
    c.beginPath();
    c.arc(w / 2, cy, 140, 0, Math.PI * 2);
    c.clip();
    c.drawImage(avatar, w / 2 - 140, cy - 140 + 22, 280, 280);
    c.restore();
  }
  c.setLineDash([12, 10]);
  c.strokeStyle = "rgba(44,74,50,.55)";
  c.lineWidth = 4;
  c.beginPath();
  c.arc(w / 2, cy, 126, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);
  // nome, il più grande possibile
  const fam = famiglia("--font-basteleur", "Georgia, serif");
  let px = 92;
  c.font = `${px}px ${fam}`;
  while (c.measureText(nome).width > w - 90 && px > 40) c.font = `${(px -= 4)}px ${fam}`;
  c.fillStyle = "#e5481e";
  c.fillText(nome, w / 2, 590);
  c.restore();
}

const facile = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

const morbido = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

export type FaseBusta = "cade" | "neve" | "vola" | "sigillo" | "lembo" | "biglietto";

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
  onAperta,
}: {
  nome: string;
  avatarSvg: () => string | null;
  onFase: (f: FaseBusta, tocchi?: number) => void;
  onPrimoTocco: () => void;
  onAperta: () => void;
}) {
  const contenitore = useRef<HTMLDivElement>(null);
  const callback = useRef({ onFase, onPrimoTocco, onAperta });
  const dati = useRef({ nome, avatarSvg }); // letti una volta sola, all'avvio della scena

  useEffect(() => {
    callback.current = { onFase, onPrimoTocco, onAperta };
  }, [onFase, onPrimoTocco, onAperta]);

  useEffect(() => {
    const box = contenitore.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true; // per nascondere il biglietto finché è dentro la busta
    renderer.domElement.style.touchAction = "none";
    box.appendChild(renderer.domElement);

    const scena = new THREE.Scene();
    scena.fog = new THREE.Fog(0x163a25, 14, 38);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    scena.add(new THREE.HemisphereLight(0xfff8ea, 0xd9cdb0, 2.2));
    const luna = new THREE.DirectionalLight(0xfff1d6, 1.4);
    luna.position.set(2, 5, 6);
    scena.add(luna);
    const punto = texturaPunto();

    // ---------- paesaggio illustrato: neve di feltro crema, cumuli tondi, abeti ----------
    // ombre a tre toni, come un disegno (niente realismo)
    const toni = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    toni.minFilter = toni.magFilter = THREE.NearestFilter;
    toni.needsUpdate = true;
    const cartone = (colore: number) => new THREE.MeshToonMaterial({ color: colore, gradientMap: toni });
    const suolo = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), cartone(0xa8cbe2)); // neve azzurro ghiaccio: la busta crema calda si stacca bene
    suolo.rotation.x = -Math.PI / 2;
    suolo.position.y = SUOLO;
    scena.add(suolo);
    const matCumulo = cartone(0xc9e0ef);
    [[-2.3, -1.4, 0.9], [2.5, -2.6, 1.2], [-4.2, -6, 1.8], [4, 0.3, 0.8], [0.6, -8, 2.2], [-1.4, 1.8, 0.6]].forEach(([x, z, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), matCumulo);
      m.scale.y = 0.38;
      m.position.set(x, SUOLO, z);
      scena.add(m);
    });
    // il mucchietto di neve davanti alla busta: la fa sembrare piantata
    const mucchio = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), matCumulo);
    mucchio.scale.set(1.25, 0.32, 0.45);
    mucchio.position.set(0.05, SUOLO, 0.85);
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
      scena.add(albero);
    });

    // ---------- busta ----------
    const busta = new THREE.Group();
    scena.add(busta);
    const matCorpo = new THREE.MeshToonMaterial({ map: texturaCorpo(), gradientMap: toni, transparent: true });
    const corpo = new THREE.Mesh(new THREE.PlaneGeometry(LARGHEZZA, ALTEZZA), matCorpo);
    busta.add(corpo);
    const matDavanti = new THREE.MeshToonMaterial({ color: 0xf3e8cf, gradientMap: toni, transparent: true });
    const davanti = new THREE.Mesh(new THREE.PlaneGeometry(LARGHEZZA, ALTEZZA), matDavanti);
    davanti.rotation.y = Math.PI;
    davanti.position.z = -0.005;
    busta.add(davanti);

    // lembo: un foglio a strisce che si curva come carta (cerniera in alto)
    const RIGHE = 28;
    const geoLembo = new THREE.PlaneGeometry(LARGHEZZA, ALTO_LEMBO, 1, RIGHE);
    geoLembo.translate(0, -ALTO_LEMBO / 2, 0);
    const matLembo = new THREE.MeshToonMaterial({ map: texturaLembo(), gradientMap: toni, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 });
    const lembo = new THREE.Mesh(geoLembo, matLembo);
    lembo.position.set(0, ALTEZZA / 2, 0.012);
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

    // ---------- dimensioni ----------
    let scalaBase = 1;
    const ridimensiona = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const altezzaVisibile = 2 * 9 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      scalaBase = Math.min((altezzaVisibile * camera.aspect * 0.82) / LARGHEZZA, 1.2);
    };
    ridimensiona();
    const ro = new ResizeObserver(ridimensiona);
    ro.observe(box);

    // ---------- inquadrature ----------
    const CAM_CIELO = { pos: new THREE.Vector3(0, 3.6, 9), guarda: new THREE.Vector3(0, 4.2, 0) };
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
    let fase: FaseBusta = "cade";
    let inizioFase = 0;
    let tocchi = 0;
    let salto = 0; // altezza del sobbalzo
    let velSalto = 0;
    let dondolio = 0;
    let apertura = 0; // 0 = lembo chiuso, 1 = aperto
    let obiettivoApertura = 0;
    let trascinoLembo: { y: number; da: number } | null = null;
    let grattando = false;
    let sigilloVia = -1;
    let partenzaBiglietto: { pos: THREE.Vector3; scala: number } | null = null;
    let finita = false;
    const orologio = new THREE.Clock();
    const vaiA = (f: FaseBusta) => {
      fase = f;
      inizioFase = orologio.getElapsedTime();
      callback.current.onFase(f, tocchi);
    };
    callback.current.onFase("cade");

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
          renderer.domElement.setPointerCapture(e.pointerId);
        }
      } else if (fase === "lembo") {
        trascinoLembo = { y: e.clientY, da: apertura };
        renderer.domElement.setPointerCapture(e.pointerId);
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
      }
    };
    renderer.domElement.addEventListener("pointerdown", giu);
    renderer.domElement.addEventListener("pointermove", muovi);
    renderer.domElement.addEventListener("pointerup", su);
    renderer.domElement.addEventListener("pointercancel", su);

    // ---------- animazione ----------
    let frame = 0;
    let ultimo = 0;
    const ciclo = () => {
      frame = requestAnimationFrame(ciclo);
      const t = orologio.getElapsedTime();
      const dt = Math.min(t - ultimo, 0.05);
      ultimo = t;
      const f = t - inizioFase;
      const sNeve = scalaBase * 0.72;

      if (fase === "cade") {
        // la busta cade dal cielo girando; l'inquadratura scende con lei
        const k = Math.min(1, f / 1.7);
        const caduta = k * k; // accelera come un oggetto che cade
        busta.position.set(Math.sin(f * 3) * 0.5 * (1 - k), 8 + (POSA_NEVE.pos.y - 8) * caduta, POSA_NEVE.pos.z);
        busta.rotation.set(POSA_NEVE.rot.x * k + Math.sin(f * 5) * 0.6 * (1 - k), f * 4 * (1 - k), POSA_NEVE.rot.z + Math.cos(f * 4) * 0.5 * (1 - k));
        busta.scale.setScalar(sNeve);
        inquadra(CAM_CIELO, CAM_NEVE, morbido((f - 0.2) / 1.9));
        if (k >= 1) {
          sbuffi.emetti(new THREE.Vector3(0, SUOLO + 0.1, POSA_NEVE.pos.z), 70, 2.4, 1);
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
        matCera.emissiveIntensity = 0.08 + 0.08 * Math.sin(t * 4);
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
        }
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
          [matCorpo, matDavanti, matLembo].forEach((m) => (m.opacity = 1 - g));
          const k = facile((a - 1.3) / 1.1);
          const zFinale = 2.5;
          const hVis = 2 * (9 - zFinale) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          const scalaFinale = Math.min((hVis * camera.aspect * 0.86) / B_LARGO, (hVis * 0.62) / B_ALTO);
          const p0 = partenzaBiglietto.pos;
          biglietto.position.set(p0.x * (1 - k), p0.y * (1 - k), p0.z + (zFinale - p0.z) * k);
          biglietto.scale.setScalar(partenzaBiglietto.scala + (scalaFinale - partenzaBiglietto.scala) * k);
          biglietto.rotation.set(0, facile((a - 1.6) / 0.8) * Math.PI, Math.sin(k * Math.PI) * 0.08);
        }
        if (a > 2.55 && !finita) {
          finita = true;
          callback.current.onAperta();
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

      renderer.render(scena, camera);
    };
    ciclo();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", giu);
      renderer.domElement.removeEventListener("pointermove", muovi);
      renderer.domElement.removeEventListener("pointerup", su);
      renderer.domElement.removeEventListener("pointercancel", su);
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
