"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CATALOGO, toppaPersonalizzata, trovaToppa, type ContenutoPersonalizzato, type RigaPersonalizzata, type TipoToppa, type Toppa } from "@/components/toppe";
import { Cassettiera, PillolaNome, mescola, oggettoDaToppa, type ContenutoCassetto } from "@/components/cassettiera";
import { EditorParola, EditorSimbolo } from "@/components/editor-toppe";
import { AnimatePresence, motion } from "framer-motion";
import { FILI, NOMI_FILI, VUOTO } from "@/lib/ricamo";
import { STOFFE, STOFFE_PERSONALIZZABILI, type Stoffa } from "@/lib/parole";
import type { Profilo } from "@/lib/totem";
import { useRouter } from "next/navigation";
import { Errore, Icone, Tasto, TastoTondo, TitoloRiquadro } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";
import { suoni } from "@/lib/suoni";
import { controllaPremi } from "@/components/avviso-premi";
import { riduciFoto } from "@/lib/foto";

/*
  Bacheca = tela da ricamo con toppe, foto e un ricamo a punto croce.
  Coordinate in "unità tela": la larghezza della tela vale 100, l'altezza 100 * 4/3.
  x, y = centro dell'elemento; width = larghezza; l'altezza si ricava dal rapporto.
*/

export type Elemento = {
  id: string;
  kind: "toppa" | "ricamo" | "foto" | "immagine_link";
  content: { toppa?: string; tipo?: string; path?: string; url?: string; rapporto?: number; celle?: string; fondo?: Stoffa };
  x: number;
  y: number;
  width: number;
  rotation: number;
  z: number;
};

const ALTEZZA = (100 * 4) / 3;
const COLONNE = 60;
const RIGHE = 80;
const MAX_FOTO = 5; // foto e immagini da link sulla bacheca (ogni toppa invece una sola volta)


// Ogni toppa nuova arriva un po' storta e un po' spostata dal centro, come attaccata a mano
// (così le nuove non si nascondono una sotto l'altra).
function inclinazioneCasuale() {
  return Math.round(Math.random() * 16 - 8);
}
function spostamentoCasuale(ampiezza: number) {
  return Math.round((Math.random() * 2 - 1) * ampiezza);
}

function caricaDimensioni(url: string) {
  return new Promise<number>((ok, ko) => {
    const i = new Image();
    i.onload = () => ok(i.naturalWidth / i.naturalHeight);
    i.onerror = ko;
    i.src = url;
  });
}

export function Bacheca({
  groupId,
  memberId,
  modificabile,
  iniziali,
  prova = false,
  iniziaRicamando = false,
  totem = null,
  personalizzate = [],
}: {
  groupId: string;
  memberId: string;
  modificabile: boolean;
  iniziali: Elemento[];
  prova?: boolean; // sala prove: tutto funziona ma non si salva niente
  iniziaRicamando?: boolean; // si apre già col ricamo (dal kit del punto croce)
  totem?: { profilo: Profilo; nome: string; immagine?: string | null } | null; // il MIO totem: le sue toppe compaiono nel cassetto
  personalizzate?: RigaPersonalizzata[]; // toppe create dall'organizzatore per il gruppo
}) {
  // toppe create a mano: quelle del gruppo (dall'organizzatore, member_id vuoto) e quelle personali di ognuno
  const [righe, setRighe] = useState<RigaPersonalizzata[]>(personalizzate);
  const create = righe.map((r) => ({ r, t: toppaPersonalizzata(r) }));
  const delGruppo = create.filter((x) => !x.r.member_id).map((x) => x.t);
  const mie = create.filter((x) => x.r.member_id === memberId);
  const toppaDi = (id: string): Toppa | undefined => trovaToppa(id) ?? create.find((x) => x.t.id === id)?.t;
  const rapportoDi = (e: Elemento) => (e.kind === "toppa" ? (toppaDi(e.content.toppa ?? "")?.rapporto ?? 1) : (e.content.rapporto ?? 1));

  const supabase = clientSoloBrowser();
  const router = useRouter();
  const telaRef = useRef<HTMLDivElement>(null);
  const [larghezza, setLarghezza] = useState(0);
  const [elementi, setElementi] = useState<Elemento[]>(iniziali.filter((e) => e.kind !== "ricamo"));
  const [ricamo, setRicamo] = useState<Elemento | null>(iniziali.find((e) => e.kind === "ricamo") ?? null);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [attaccata, setAttaccata] = useState("");
  // la conferma "è sulla tela" sparisce da sola
  useEffect(() => {
    if (!attaccata) return;
    const t = setTimeout(() => setAttaccata(""), 1800);
    return () => clearTimeout(t);
  }, [attaccata, elementi.length]);
  const [modoRicamo, setModoRicamo] = useState(iniziaRicamando);
  const [nomeTela, setNomeTela] = useState<string | null>(null); // nome della toppa che sto trascinando sulla tela

  // DOPPIO FONDO: le toppe del mio totem e del gruppo, una volta scoperte, restano scoperte (lo ricorda il telefono)
  const chiaveScoperte = `doppio-fondo:${prova ? "prova" : memberId}`;
  const [scoperte, setScoperte] = useState<string[] | null>(null);
  useEffect(() => {
    let lette: string[] = [];
    try {
      lette = JSON.parse(localStorage.getItem(chiaveScoperte) ?? "[]");
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- memoria del telefono, letta dopo il primo disegno
    setScoperte(lette);
  }, [chiaveScoperte]);
  function scopri(ids: string[]) {
    setScoperte((s) => {
      const nuove = [...new Set([...(s ?? []), ...ids])];
      try {
        localStorage.setItem(chiaveScoperte, JSON.stringify(nuove));
      } catch {}
      return nuove;
    });
  }

  // la MIA toppa (un simbolo e una parola creati da me)
  const [editor, setEditor] = useState<{ tipo: "simbolo" | "parola"; id: string; contenuto: ContenutoPersonalizzato; esiste: boolean } | null>(null);
  const [erroreEditor, setErroreEditor] = useState("");
  const [salvoMia, setSalvoMia] = useState(false);
  async function salvaMia() {
    if (!editor) return;
    const k = editor.contenuto;
    if (editor.tipo === "parola" && !k.testo?.trim()) return setErroreEditor("Scrivi la tua parola sulla toppa.");
    const riga: RigaPersonalizzata = {
      id: editor.id,
      tipo: editor.tipo,
      ordine: 0,
      member_id: memberId,
      contenuto: editor.tipo === "parola" ? { testo: k.testo!.trim(), stoffa: k.stoffa ?? "vermiglio" } : k.foto ? { foto: k.foto } : { celle: k.celle ?? "", stoffa: k.stoffa ?? "crema" },
    };
    setSalvoMia(true);
    if (!prova) {
      const { error } = await traccia(supabase.from("group_toppe").upsert({ ...riga, group_id: groupId }));
      if (error) {
        setSalvoMia(false);
        return setErroreEditor("Non sono riuscito a salvarla. Riprova.");
      }
    }
    setRighe((l) => [...l.filter((x) => x.id !== riga.id), riga]);
    setSalvoMia(false);
    setEditor(null);
    suoni.toppa();
  }
  async function togliMia() {
    if (!editor) return;
    const id = editor.id;
    setEditor(null);
    // via anche dalla tela
    for (const e of elementi.filter((x) => x.content.toppa === `g:${id}`)) await togli(e.id);
    setRighe((l) => l.filter((x) => x.id !== id));
    if (!prova) await traccia(supabase.from("group_toppe").delete().eq("id", id));
  }
  const [urlFoto, setUrlFoto] = useState<Record<string, string>>({});
  const [errore, setErrore] = useState("");
  const [linkImmagine, setLinkImmagine] = useState("");
  const [caricamento, setCaricamento] = useState(false);

  // Salvataggi in corso: servono per dire "Tutto salvato" e per il tasto "Ho finito"
  const inCorso = useRef(new Set<Promise<unknown>>());
  const [quantiInCorso, setQuantiInCorso] = useState(0);
  const [esco, setEsco] = useState(false);
  const traccia = useCallback(<T,>(lavoro: PromiseLike<T>): Promise<T> => {
    const p = Promise.resolve(lavoro);
    inCorso.current.add(p);
    setQuantiInCorso((n) => n + 1);
    p.finally(() => {
      inCorso.current.delete(p);
      setQuantiInCorso((n) => n - 1);
    }).catch(() => {});
    return p;
  }, []);

  async function hoFinito() {
    setEsco(true);
    await Promise.allSettled([...inCorso.current]);
    router.push(prova ? "/prove" : `/gruppo/${groupId}`);
    router.refresh();
  }

  // nella mia bacheca il pinch della pagina è spento: due dita servono a ingrandire le toppe
  // (e la pagina ingrandita spostava i punti del ricamo rispetto al dito)
  useEffect(() => {
    if (!modificabile) return;
    const html = document.documentElement;
    const prima = html.style.touchAction;
    html.style.touchAction = "pan-x pan-y";
    return () => {
      html.style.touchAction = prima;
    };
  }, [modificabile]);

  // Larghezza reale della tela (per convertire pixel ↔ unità)
  useEffect(() => {
    const el = telaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLarghezza(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Le foto stanno in un archivio privato: chiedo indirizzi temporanei per vederle
  useEffect(() => {
    const percorsi = elementi.filter((e) => e.kind === "foto" && e.content.path && !urlFoto[e.content.path]).map((e) => e.content.path!);
    if (!percorsi.length) return;
    supabase.storage
      .from("moodboard")
      .createSignedUrls(percorsi, 60 * 60)
      .then(({ data }) => {
        if (!data) return;
        setUrlFoto((u) => ({ ...u, ...Object.fromEntries(data.filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl as string])) }));
      });
  }, [elementi, supabase, urlFoto]);

  const px = larghezza / 100; // pixel per unità

  // ---------- salvataggio ----------
  const salvaPosizione = useCallback(
    async (e: Elemento) => {
      if (prova) return;
      const { error } = await traccia(
        supabase
          .from("moodboard_items")
          .update({ x: e.x, y: e.y, width: e.width, height: e.width / rapportoDi(e), rotation: e.rotation, z: e.z, updated_at: new Date().toISOString() })
          .eq("id", e.id),
      );
      if (error) setErrore("Non sono riuscito a salvare l'ultima modifica.");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase, traccia, prova],
  );

  async function aggiungi(
    kind: Elemento["kind"],
    content: Elemento["content"],
    width: number,
  ) {
    const z = Math.max(0, ...elementi.map((e) => e.z)) + 1;
    const nuovo = {
      member_id: memberId,
      kind,
      content,
      x: 50 + spostamentoCasuale(18),
      y: ALTEZZA / 2 + spostamentoCasuale(24),
      width,
      height: width / (content.rapporto ?? toppaDi(content.toppa ?? "")?.rapporto ?? 1),
      rotation: inclinazioneCasuale(),
      z,
    };
    const { data, error } = prova
      ? { data: { id: crypto.randomUUID(), kind, content, x: nuovo.x, y: nuovo.y, width, rotation: nuovo.rotation, z }, error: null }
      : await traccia(supabase.from("moodboard_items").insert(nuovo).select("id, kind, content, x, y, width, rotation, z").single());
    if (error || !data) {
      return setErrore(error?.message?.includes("5 foto") ? `Sulla bacheca ci stanno al massimo ${MAX_FOTO} foto.` : "Non sono riuscito ad attaccarlo. Riprova.");
    }
    setErrore("");
    setElementi((l) => [...l, data as Elemento]);
    setSelezionato(data.id);
    if (!prova) controllaPremi(); // magari ha appena vinto il lupetto
  }

  async function togli(id: string) {
    const e = elementi.find((x) => x.id === id);
    setElementi((l) => l.filter((x) => x.id !== id));
    setSelezionato(null);
    if (prova) return;
    await traccia(supabase.from("moodboard_items").delete().eq("id", id));
    // la foto si cancella dall'archivio solo se nessun'altra (vecchie copie) la usa ancora
    const usataAncora = elementi.some((x) => x.id !== id && x.content.path && x.content.path === e?.content.path);
    if (e?.kind === "foto" && e.content.path && !usataAncora) await traccia(supabase.storage.from("moodboard").remove([e.content.path]));
  }

  // quello che tocchi passa davanti agli altri
  function portaSopra(id: string): number | null {
    const max = Math.max(0, ...elementi.map((e) => e.z));
    const e = elementi.find((x) => x.id === id);
    if (!e || (e.z === max && elementi.filter((x) => x.z === max).length === 1)) return null;
    const z = max + 1;
    setElementi((l) => l.map((x) => (x.id === id ? { ...x, z } : x)));
    salvaPosizione({ ...e, z });
    return z;
  }

  async function aggiungiFoto(file: File) {
    if (fotoPiene) return setErrore(`Sulla bacheca ci stanno al massimo ${MAX_FOTO} foto: togline una per metterne un'altra.`);
    setCaricamento(true);
    try {
      const { blob, rapporto } = await riduciFoto(file);
      if (prova) {
        // nella sala prove la foto resta solo nel telefono
        await aggiungi("immagine_link", { url: URL.createObjectURL(blob), rapporto }, 36);
        setAttaccata("La foto");
        setCaricamento(false);
        return;
      }
      const path = `${groupId}/${memberId}/${crypto.randomUUID()}.jpg`;
      const { error } = await traccia(supabase.storage.from("moodboard").upload(path, blob, { contentType: "image/jpeg" }));
      if (error) throw error;
      await aggiungi("foto", { path, rapporto }, 36);
      setAttaccata("La foto");
    } catch {
      setErrore("Non sono riuscito a caricare la foto. Riprova con un'altra immagine.");
    }
    setCaricamento(false);
  }

  async function aggiungiDaLink() {
    const url = linkImmagine.trim();
    if (fotoPiene) return setErrore(`Sulla bacheca ci stanno al massimo ${MAX_FOTO} foto: togline una per metterne un'altra.`);
    if (!/^https?:\/\//i.test(url)) return setErrore("Incolla un indirizzo che inizia con https://");
    try {
      const rapporto = await caricaDimensioni(url);
      await aggiungi("immagine_link", { url, rapporto }, 36);
      setLinkImmagine("");
      setAttaccata("L'immagine");
    } catch {
      setErrore("Questa immagine non si apre: alcuni siti non permettono di mostrarle altrove. Prova a salvarla e caricarla come foto.");
    }
  }

  // ---------- gesti: un dito sposta, due dita ingrandiscono e ruotano ----------
  const tocchi = useRef(new Map<number, { x: number; y: number }>());
  const maniglia = useRef<{ e: Elemento; cx: number; cy: number; d0: number; a0: number } | null>(null);
  const partenza = useRef<{ e: Elemento; punti: { x: number; y: number }[] } | null>(null);

  // Un gesto alla volta, su UN solo elemento: prima il ricordo del movimento era condiviso
  // e un secondo dito (o un tocco rimasto appeso) su un'altra toppa la faceva saltare sopra la prima.
  function inizioGesto(ev: React.PointerEvent, el: Elemento) {
    if (!modificabile || modoRicamo) return;
    ev.stopPropagation();
    if (partenza.current && partenza.current.e.id !== el.id) {
      // c'è già un gesto su un'altra toppa con un dito: questo è il secondo dito e vale per QUELLA toppa
      if (tocchi.current.size === 1) {
        (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
        tocchi.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        const g = partenza.current;
        const corrente = elementi.find((x) => x.id === g.e.id) ?? g.e;
        partenza.current = { e: corrente, punti: [...tocchi.current.values()] };
        return;
      }
      // se quei tocchi sono "appesi" li dimentico, altrimenti ignoro questo dito
      if (tocchi.current.size > 0) return;
      partenza.current = null;
    }
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    tocchi.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    setSelezionato(el.id);
    const zNuova = portaSopra(el.id);
    const trovato = elementi.find((x) => x.id === el.id) ?? el;
    const corrente = zNuova ? { ...trovato, z: zNuova } : trovato;
    partenza.current = { e: corrente, punti: [...tocchi.current.values()] };
  }

  function muoviGesto(ev: React.PointerEvent, id: string) {
    if (!tocchi.current.has(ev.pointerId) || !partenza.current || partenza.current.e.id !== id || !px) return;
    tocchi.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const ora = [...tocchi.current.values()];
    const { e, punti } = partenza.current;
    let { x, y, width, rotation } = e;

    if (ora.length === 1 || punti.length === 1) {
      x = e.x + (ora[0].x - punti[0].x) / px;
      y = e.y + (ora[0].y - punti[0].y) / px;
    } else {
      const [a0, b0] = punti;
      const [a1, b1] = ora;
      const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
      const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
      const ang0 = Math.atan2(b0.y - a0.y, b0.x - a0.x);
      const ang1 = Math.atan2(b1.y - a1.y, b1.x - a1.x);
      width = Math.max(10, Math.min(90, e.width * (d1 / d0)));
      rotation = e.rotation + ((ang1 - ang0) * 180) / Math.PI;
      x = e.x + ((a1.x + b1.x) / 2 - (a0.x + b0.x) / 2) / px;
      y = e.y + ((a1.y + b1.y) / 2 - (a0.y + b0.y) / 2) / px;
    }
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(ALTEZZA, y));
    setElementi((l) => l.map((el) => (el.id === id ? { ...el, x, y, width, rotation } : el)));
    // mentre trascino un simbolo o una texture, il nome compare in basso
    if (e.kind === "toppa" && e.content.tipo !== "parola") setNomeTela(toppaDi(e.content.toppa ?? "")?.nome ?? null);
  }

  function fineGesto(ev: React.PointerEvent, id: string) {
    if (!tocchi.current.has(ev.pointerId)) return;
    tocchi.current.delete(ev.pointerId);
    if (partenza.current && partenza.current.e.id !== id) return;
    const corrente = elementi.find((x) => x.id === id);
    if (tocchi.current.size === 0) {
      partenza.current = null;
      setNomeTela(null);
      if (corrente) salvaPosizione(corrente);
    } else if (corrente) {
      // un dito alzato su due: riparto dalla posizione attuale
      partenza.current = { e: corrente, punti: [...tocchi.current.values()] };
    }
  }

  // ---------- disegno di un elemento ----------
  function contenuto(e: Elemento) {
    if (e.kind === "toppa") return <>{toppaDi(e.content.toppa ?? "")?.disegno()}</>;
    const src = e.kind === "foto" ? urlFoto[e.content.path ?? ""] : e.content.url;
    return (
      <span className="block h-full w-full bg-white p-[6%] pb-[14%] shadow-[0_3px_6px_rgba(0,0,0,.3)]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="block h-full w-full animate-pulse bg-kraft/40" />
        )}
      </span>
    );
  }

  // cosa c'è in un cassetto: tutte le toppe mescolate; quelle del mio totem e del gruppo non ancora scoperte
  // stanno nel doppio fondo
  function cassetto(tipo: TipoToppa): ContenutoCassetto {
    // ogni toppa si attacca una volta sola: appena è sulla tela sparisce dal cassetto (togliendola ritorna)
    const libera = (t: Toppa) => !elementi.some((e) => e.kind === "toppa" && e.content.toppa === t.id);
    const speciali = [...(totem ? CATALOGO.filter((t) => t.totem === totem.profilo && !t.ritirata && t.tipo === tipo) : []), ...delGruppo.filter((t) => t.tipo === tipo)].filter(libera);
    const base = CATALOGO.filter((t) => !t.totem && !t.ritirata && t.tipo === tipo && libera(t));
    const mia = mie.filter((x) => x.r.tipo === tipo && libera(x.t)).map((x) => oggettoDaToppa(x.t, { segno: "mio", nome: tipo === "simbolo" ? "Il tuo simbolo" : "La tua parola" }));
    const giaScoperte = speciali.filter((t) => scoperte?.includes(t.id));
    return {
      visibili: mescola([...base, ...giaScoperte].map((t) => oggettoDaToppa(t))).concat(mia),
      nascosti: speciali.filter((t) => !scoperte?.includes(t.id)).map((t) => oggettoDaToppa(t)),
    };
  }

  // in cima ai cassetti Simboli e Parole: crea (o cambia) la tua toppa
  function azioneMia(tipo: "simbolo" | "parola") {
    const m = mie.find((x) => x.r.tipo === tipo);
    const parola = tipo === "parola";
    return (
      <button
        type="button"
        className="cucitura cliccabile stoffa-chiara relative flex h-11 items-center rounded-full px-4 font-titolo text-sm text-abete"
        onClick={() => {
          setErroreEditor("");
          setEditor({
            tipo,
            id: m?.r.id ?? crypto.randomUUID(),
            contenuto: m?.r.contenuto ?? (parola ? { testo: "", stoffa: "vermiglio" } : { celle: "", stoffa: "crema" }),
            esiste: !!m,
          });
        }}
      >
        <span className="pt-0.5">{m ? (parola ? "Cambia la tua parola" : "Cambia il tuo simbolo") : parola ? "+ La tua parola" : "+ Il tuo simbolo"}</span>
      </button>
    );
  }

  const ordinati = [...elementi].sort((a, b) => a.z - b.z);
  const numFoto = elementi.filter((e) => e.kind === "foto" || e.kind === "immagine_link").length;
  const fotoPiene = numFoto >= MAX_FOTO;
  const sel = elementi.find((e) => e.id === selezionato);

  return (
    <div>
      <div
        ref={telaRef}
        className="tela-aida relative w-full overflow-hidden rounded-[28px] shadow-[0_8px_16px_-10px_rgba(0,0,0,.5)]"
        style={{
          aspectRatio: "3 / 4",
          ["--cella" as string]: `${larghezza / COLONNE}px`,
          // la tela colorata col secchiello: tinta unita
          backgroundColor: ricamo?.content.fondo ? STOFFE[ricamo.content.fondo].fondo : undefined,
          transition: "background-color 400ms cubic-bezier(.4,0,.2,1)",
          touchAction: modificabile && selezionato ? "none" : undefined,
        }}
        onPointerDown={(ev) => {
          if (modoRicamo) return;
          // secondo dito ovunque sulla tela mentre il primo tiene una toppa: ingrandisce e ruota quella toppa
          const g = partenza.current;
          if (modificabile && g && tocchi.current.size === 1) {
            (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
            tocchi.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
            const corrente = elementi.find((x) => x.id === g.e.id) ?? g.e;
            partenza.current = { e: corrente, punti: [...tocchi.current.values()] };
            return;
          }
          setSelezionato(null);
        }}
        onPointerMove={(ev) => partenza.current && muoviGesto(ev, partenza.current.e.id)}
        onPointerUp={(ev) => partenza.current && fineGesto(ev, partenza.current.e.id)}
        onPointerCancel={(ev) => partenza.current && fineGesto(ev, partenza.current.e.id)}
      >
        {larghezza > 0 && (
          <StratoRicamo
            larghezza={larghezza}
            iniziale={ricamo}
            attivo={modoRicamo}
            memberId={memberId}
            onSalvato={setRicamo}
            onErrore={setErrore}
            onFine={() => setModoRicamo(false)}
            traccia={traccia}
            supabase={supabase}
            prova={prova}
          />
        )}

        {px > 0 &&
          ordinati.map((e) => {
            const w = e.width * px;
            const h = w / rapportoDi(e);
            return (
              <div
                key={e.id}
                role={modificabile ? "button" : undefined}
                aria-label={modificabile ? "Elemento della bacheca: trascina per spostarlo" : undefined}
                onPointerDown={(ev) => inizioGesto(ev, e)}
                onPointerMove={(ev) => muoviGesto(ev, partenza.current?.e.id ?? e.id)}
                onPointerUp={(ev) => fineGesto(ev, partenza.current?.e.id ?? e.id)}
                onPointerCancel={(ev) => fineGesto(ev, partenza.current?.e.id ?? e.id)}
                onLostPointerCapture={(ev) => fineGesto(ev, partenza.current?.e.id ?? e.id)}
                className={`absolute select-none ${modificabile && !modoRicamo ? "cursor-grab touch-none" : "pointer-events-none"} ${
                  modoRicamo ? "opacity-40" : ""
                }`}
                style={{
                  width: w,
                  height: h,
                  left: e.x * px - w / 2,
                  top: e.y * px - h / 2,
                  transform: `rotate(${e.rotation}deg)`,
                  zIndex: e.z + 10,
                  filter: "drop-shadow(0 3px 3px rgba(0,0,0,.28))",
                  outline: selezionato === e.id ? "2px dashed #e5481e" : "none",
                  outlineOffset: 4,
                }}
              >
                {contenuto(e)}
                {modificabile && !modoRicamo && selezionato === e.id && (
                  // maniglia nell'angolo: trascinandola con un dito la toppa si ingrandisce, rimpicciolisce e ruota
                  <span
                    role="slider"
                    aria-label="Trascina per ingrandire o ruotare"
                    aria-valuenow={Math.round(e.width)}
                    className="absolute -right-6 -bottom-6 flex size-11 touch-none items-center justify-center"
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
                      const box = (ev.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                      const cx = box.left + box.width / 2;
                      const cy = box.top + box.height / 2;
                      maniglia.current = { e, cx, cy, d0: Math.hypot(ev.clientX - cx, ev.clientY - cy) || 1, a0: Math.atan2(ev.clientY - cy, ev.clientX - cx) };
                    }}
                    onPointerMove={(ev) => {
                      const m = maniglia.current;
                      if (!m) return;
                      ev.stopPropagation();
                      const d = Math.hypot(ev.clientX - m.cx, ev.clientY - m.cy);
                      const a = Math.atan2(ev.clientY - m.cy, ev.clientX - m.cx);
                      const width = Math.max(10, Math.min(90, (m.e.width * d) / m.d0));
                      const rotation = m.e.rotation + ((a - m.a0) * 180) / Math.PI;
                      setElementi((l) => l.map((x) => (x.id === m.e.id ? { ...x, width, rotation } : x)));
                    }}
                    onPointerUp={(ev) => {
                      ev.stopPropagation();
                      const m = maniglia.current;
                      maniglia.current = null;
                      const ora = m && elementi.find((x) => x.id === m.e.id);
                      if (ora) salvaPosizione(ora);
                    }}
                    onPointerCancel={() => (maniglia.current = null)}
                  >
                    <span className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-vermiglio text-white shadow-[0_2px_4px_rgba(0,0,0,.4)]">
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
                        <path d="M7 17L17 7M11 7h6v6M7 11v6h6" />
                      </svg>
                    </span>
                  </span>
                )}
              </div>
            );
          })}

        {elementi.length === 0 && !/[0-9]/.test(ricamo?.content.celle ?? "") && !modoRicamo && (
          <p
            className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 text-center opacity-70"
            style={{ color: ricamo?.content.fondo ? STOFFE[ricamo.content.fondo].testo : "#1c241d" }}
          >
            {modificabile ? "La tela è vuota. Attacca una toppa o ricama qualcosa qui sotto." : "Questa bacheca è ancora vuota."}
          </p>
        )}
      </div>

      {modificabile && (
        <>
          {/* Comandi per la toppa toccata sulla tela (attaccare e ricamare si fa dalla cassettiera qui sotto) */}
          {!modoRicamo && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <TastoTondo etichetta="Togli dalla bacheca" icona={Icone.cestino} disabled={!sel} onClick={() => sel && togli(sel.id)} />
            </div>
          )}

          {errore && (
            <div className="mt-3">
              <Errore>{errore}</Errore>
            </div>
          )}

          {!modoRicamo && scoperte && (
            <div className="mt-6">
              <Cassettiera
                contenuto={{ simbolo: cassetto("simbolo"), parola: cassetto("parola"), palette: cassetto("palette") }}
                azioni={{ simbolo: azioneMia("simbolo"), parola: azioneMia("parola") }}
                onScopri={scopri}
                onPrendi={(o) => {
                  suoni.toppa();
                  const t = toppaDi(o.id);
                  if (t) aggiungi("toppa", { toppa: t.id, tipo: t.tipo }, t.tipo === "parola" ? (t.larghezza ?? 46) : 26);
                  setAttaccata(o.nome);
                }}
                onKit={() => {
                  setModoRicamo(true);
                  setSelezionato(null);
                  telaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                foto={
                  <div className="flex flex-col gap-4 rounded-2xl bg-feltro p-4 text-inchiostro shadow-[0_3px_6px_rgba(0,0,0,.35)]">
                    <p className="text-center text-sm text-inchiostro/70">
                      {fotoPiene ? `Hai già ${MAX_FOTO} foto sulla tela: togline una per metterne un'altra.` : `Foto sulla tela: ${numFoto} di ${MAX_FOTO}`}
                    </p>
                    <label className={`tasto cucitura cliccabile stoffa-vermiglio relative ${fotoPiene ? "pointer-events-none opacity-50" : "cursor-pointer"}`} aria-disabled={fotoPiene}>
                      <span>{caricamento ? "Carico…" : "Scegli una foto"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={caricamento || fotoPiene}
                        onChange={(ev) => {
                          const f = ev.target.files?.[0];
                          if (f) aggiungiFoto(f);
                          ev.target.value = "";
                        }}
                      />
                    </label>
                    <div className="flex items-end gap-3">
                      <label className="flex min-w-0 flex-1 flex-col gap-2">
                        <span className="text-sm font-medium">Oppure un&apos;immagine da un link</span>
                        <span className="campo-cucito block">
                          <input value={linkImmagine} onChange={(ev) => setLinkImmagine(ev.target.value)} placeholder="https://…" inputMode="url" />
                        </span>
                      </label>
                      <TastoTondo etichetta="Aggiungi l'immagine dal link" icona={Icone.piu} disabled={!linkImmagine.trim() || fotoPiene} onClick={aggiungiDaLink} />
                    </div>
                  </div>
                }
              />
              {/* conferma breve: la toppa è finita sulla tela, qui sopra */}
              <AnimatePresence>
                {attaccata && (
                  <motion.p
                    key={attaccata + elementi.length}
                    role="status"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    className="fixed inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-[200] mx-auto w-fit rounded-full bg-crema px-4 py-2 text-sm text-abete shadow-[0_6px_16px_-6px_rgba(0,0,0,.6)]"
                  >
                    ↑ «{attaccata}» è sulla tela
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          <PillolaNome nome={nomeTela} />

          {/* la mia toppa: editor in un foglio che sale dal basso */}
          <AnimatePresence>
            {editor && (
              <motion.div
                key="foglio-mia-toppa"
                className="fixed inset-0 z-[400] flex items-end justify-center bg-black/55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={editor.tipo === "simbolo" ? "Il tuo simbolo" : "La tua parola"}
                  className="feltro max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-b-none p-6 pb-[max(24px,env(safe-area-inset-bottom))]"
                  initial={{ y: 60 }}
                  animate={{ y: 0 }}
                  exit={{ y: 80 }}
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                >
                  <div className="relative mb-4 flex items-center gap-3">
                    <TitoloRiquadro className="flex-1">{editor.tipo === "simbolo" ? "Il tuo simbolo" : "La tua parola"}</TitoloRiquadro>
                    <TastoTondo etichetta="Chiudi senza salvare" icona={Icone.chiudi} onClick={() => setEditor(null)} />
                  </div>
                  <div className="relative">
                    {editor.tipo === "simbolo" ? (
                      <EditorSimbolo id={editor.id} valore={editor.contenuto} onCambia={(v) => setEditor((e) => (e ? { ...e, contenuto: v } : e))} />
                    ) : (
                      <EditorParola n={1} valore={editor.contenuto} onCambia={(v) => setEditor((e) => (e ? { ...e, contenuto: v } : e))} />
                    )}
                    <p className="mt-4 text-sm text-inchiostro/70">Ne puoi avere uno solo: lo trovi nel cassetto con il pallino azzurro. Lo vede solo chi guarda la tua bacheca.</p>
                    <div className="mt-4 flex flex-col gap-3">
                      <Errore>{erroreEditor}</Errore>
                      <Tasto onClick={salvaMia} disabled={salvoMia}>
                        {salvoMia ? "Salvo…" : "Salva"}
                      </Tasto>
                      {editor.esiste && (
                        <Tasto tipo="secondario" onClick={togliMia}>
                          {editor.tipo === "simbolo" ? "Togli il tuo simbolo" : "Togli la tua parola"}
                        </Tasto>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Si salva da sola, ma serve un modo chiaro per dire "ho finito" */}
          {!modoRicamo && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-sm text-crema/80" aria-live="polite">
                {quantiInCorso > 0 ? "Salvo…" : "Tutto salvato"}
              </p>
              <Tasto onClick={hoFinito} disabled={esco}>
                {esco ? "Un momento…" : "Ho finito"}
              </Tasto>
            </div>
          )}
        </>
      )}
    </div>
  );

}

// ---------- strato del ricamo a punto croce ----------
function StratoRicamo({
  larghezza,
  iniziale,
  attivo,
  memberId,
  onSalvato,
  prova,
  onErrore,
  onFine,
  traccia,
  supabase,
}: {
  larghezza: number;
  iniziale: Elemento | null;
  attivo: boolean;
  memberId: string;
  onSalvato: (e: Elemento) => void;
  prova?: boolean;
  onErrore: (m: string) => void;
  onFine: () => void;
  traccia: <T>(lavoro: PromiseLike<T>) => Promise<T>;
  supabase: ReturnType<typeof clientSoloBrowser>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const celle = useRef<string[]>((iniziale?.content.celle ?? VUOTO.repeat(COLONNE * RIGHE)).split(""));
  const storia = useRef<string[]>([]);
  const ultima = useRef<{ c: number; r: number } | null>(null);
  const [filo, setFilo] = useState(0);
  const [strumento, setStrumento] = useState<"ago" | "gomma" | "secchiello">("ago");
  // colore della tela (tinta unita, scelto col secchiello); null = crema della tela
  const [fondo, setFondoStato] = useState<Stoffa | null>(iniziale?.content.fondo ?? null);
  const fondoRef = useRef<Stoffa | null>(fondo);
  const gomma = strumento === "gomma";
  const [puoAnnullare, setPuoAnnullare] = useState(false);
  const idRicamo = useRef<string | null>(iniziale?.id ?? null);
  const premioControllato = useRef(false); // il premio del primo ricamo: basta controllarlo una volta
  const timerSalva = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cella = larghezza / COLONNE;
  const altezza = cella * RIGHE;

  const disegnaCella = useCallback(
    (ctx: CanvasRenderingContext2D, c: number, r: number) => {
      const v = celle.current[r * COLONNE + c];
      const x = c * cella;
      const y = r * cella;
      ctx.clearRect(x - 1, y - 1, cella + 2, cella + 2);
      if (v === VUOTO) return;
      const m = cella * 0.18;
      ctx.strokeStyle = FILI[Number(v)];
      ctx.lineWidth = Math.max(1.4, cella * 0.3);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + m, y + m);
      ctx.lineTo(x + cella - m, y + cella - m);
      ctx.moveTo(x + cella - m, y + m);
      ctx.lineTo(x + m, y + cella - m);
      ctx.stroke();
    },
    [cella],
  );

  const ridisegna = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(larghezza * dpr);
    cv.height = Math.round(altezza * dpr);
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, larghezza, altezza);
    for (let r = 0; r < RIGHE; r++) for (let c = 0; c < COLONNE; c++) if (celle.current[r * COLONNE + c] !== VUOTO) disegnaCella(ctx, c, r);
  }, [larghezza, altezza, disegnaCella]);

  useEffect(() => {
    ridisegna();
  }, [ridisegna]);

  const contenutoRicamo = () => (fondoRef.current ? { celle: celle.current.join(""), fondo: fondoRef.current } : { celle: celle.current.join("") });
  function coloraTela(s: Stoffa | null) {
    fondoRef.current = s;
    setFondoStato(s);
    suoni.toppa();
    salvaPresto();
  }

  // Salvo poco dopo l'ultimo punto; intanto il salvataggio risulta "in corso"
  const fineAttesa = useRef<(() => void) | null>(null);
  function salvaPresto() {
    // la bacheca deve sapere sempre se c'è almeno un punto (per la scritta "la tela è vuota")
    const ricamoOra = { id: idRicamo.current ?? "ricamo", kind: "ricamo", content: contenutoRicamo(), x: 50, y: ALTEZZA / 2, width: 100, rotation: 0, z: 0 } as Elemento;
    onSalvato(ricamoOra);
    if (prova) return;
    if (timerSalva.current) clearTimeout(timerSalva.current);
    if (!fineAttesa.current) traccia(new Promise<void>((ok) => (fineAttesa.current = ok)));
    timerSalva.current = setTimeout(salvaOra, 600);
  }

  async function salvaOra() {
    timerSalva.current = null;
    try {
      const content = contenutoRicamo();
      if (idRicamo.current) {
        const { error } = await supabase.from("moodboard_items").update({ content, updated_at: new Date().toISOString() }).eq("id", idRicamo.current);
        if (error) onErrore("Non sono riuscito a salvare il ricamo.");
        else if (!premioControllato.current) {
          premioControllato.current = true;
          controllaPremi();
        }
      } else {
        const { data, error } = await supabase
          .from("moodboard_items")
          .insert({ member_id: memberId, kind: "ricamo", content, x: 50, y: ALTEZZA / 2, width: 100, height: ALTEZZA, rotation: 0, z: 0 })
          .select("id, kind, content, x, y, width, rotation, z")
          .single();
        if (error || !data) return onErrore("Non sono riuscito a salvare il ricamo.");
        idRicamo.current = data.id;
        onSalvato(data as Elemento);
      }
    } finally {
      fineAttesa.current?.();
      fineAttesa.current = null;
    }
  }

  // "Fine ricamo": salvo subito quello che manca
  function fine() {
    if (timerSalva.current) {
      clearTimeout(timerSalva.current);
      salvaOra();
    }
    onFine();
  }

  function puntoDa(ev: React.PointerEvent) {
    // in proporzione alla tela com'è davvero sullo schermo (non con la misura ricordata, che può essere vecchia)
    const cv = canvasRef.current!;
    const n = ev.nativeEvent;
    if (n.target === cv && cv.clientWidth > 0) {
      return { c: Math.floor((n.offsetX / cv.clientWidth) * COLONNE), r: Math.floor((n.offsetY / cv.clientHeight) * RIGHE) };
    }
    const r = cv.getBoundingClientRect();
    return { c: Math.floor(((ev.clientX - r.left) / r.width) * COLONNE), r: Math.floor(((ev.clientY - r.top) / r.height) * RIGHE) };
  }

  function cuci(c: number, r: number) {
    if (c < 0 || r < 0 || c >= COLONNE || r >= RIGHE) return;
    celle.current[r * COLONNE + c] = gomma ? VUOTO : String(filo);
    disegnaCella(canvasRef.current!.getContext("2d")!, c, r);
  }

  // linea continua tra due quadretti (così il tratto veloce non lascia buchi)
  function cuciLinea(a: { c: number; r: number }, b: { c: number; r: number }) {
    let { c: x0, r: y0 } = a;
    const { c: x1, r: y1 } = b;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      cuci(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full ${attivo ? "z-[100000] touch-none" : "pointer-events-none"}`}
        onPointerDown={(ev) => {
          if (!attivo) return;
          ev.stopPropagation();
          (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
          storia.current.push(celle.current.join(""));
          if (storia.current.length > 30) storia.current.shift();
          setPuoAnnullare(true);
          const p = puntoDa(ev);
          if (strumento === "secchiello") return; // col secchiello si sceglie il colore qui sotto
          ultima.current = p;
          cuci(p.c, p.r);
          suoni.punto();
        }}
        onPointerMove={(ev) => {
          if (!attivo || !ultima.current) return;
          const p = puntoDa(ev);
          if (p.c !== ultima.current.c || p.r !== ultima.current.r) suoni.punto();
          cuciLinea(ultima.current, p);
          ultima.current = p;
        }}
        onPointerUp={() => {
          if (!attivo || !ultima.current) return;
          ultima.current = null;
          salvaPresto();
        }}
        aria-label={attivo ? "Tela da ricamare: disegna col dito" : undefined}
      />
      {attivo && (
        <div className="fixed inset-x-0 bottom-0 z-[100001] px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="feltro mx-auto flex max-w-md flex-col items-center gap-3 p-4">
            {strumento === "secchiello" ? (
              <div className="relative flex flex-col items-center gap-2">
                <p className="text-sm font-medium">Colore della tela</p>
                <div role="radiogroup" aria-label="Colore della tela" className="grid grid-cols-5 gap-3">
                  {(["crema", ...STOFFE_PERSONALIZZABILI.filter((x) => x !== "crema")] as Stoffa[]).map((x) => {
                    const scelto = (fondo ?? "crema") === x;
                    return (
                      <button
                        key={x}
                        role="radio"
                        aria-checked={scelto}
                        aria-label={`Tela ${STOFFE[x].nome}`}
                        onClick={() => coloraTela(x === "crema" ? null : x)}
                        className={`size-11 rounded-full border-[3px] border-white shadow ${scelto ? "outline-3 outline-offset-2 outline-inchiostro" : ""}`}
                        style={{ background: x === "crema" ? "#f6eedb" : STOFFE[x].fondo }}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
            <div role="radiogroup" aria-label="Colore del filo" className="relative grid grid-cols-4 gap-3">
              {FILI.map((f, i) => (
                <button
                  key={f}
                  role="radio"
                  aria-checked={!gomma && filo === i}
                  aria-label={`Filo ${NOMI_FILI[i]}`}
                  onClick={() => {
                    setFilo(i);
                    if (gomma) setStrumento("ago");
                  }}
                  className={`size-11 rounded-full border-[3px] border-white shadow ${!gomma && filo === i ? "outline-3 outline-offset-2 outline-inchiostro" : ""}`}
                  style={{ background: f }}
                />
              ))}
            </div>
            )}
            <div className="relative flex gap-3">
              <TastoTondo etichetta="Gomma" icona={Icone.gomma} aria-pressed={gomma} className={gomma ? "!bg-senape" : ""} onClick={() => setStrumento(gomma ? "ago" : "gomma")} />
              <TastoTondo
                etichetta="Secchiello: colora tutta la tela"
                icona={Icone.secchiello}
                aria-pressed={strumento === "secchiello"}
                className={strumento === "secchiello" ? "!bg-senape" : ""}
                onClick={() => setStrumento(strumento === "secchiello" ? "ago" : "secchiello")}
              />
              <TastoTondo
                etichetta="Annulla l'ultimo tratto"
                icona={Icone.annulla}
                disabled={!puoAnnullare}
                onClick={() => {
                  const prima = storia.current.pop();
                  if (prima) {
                    celle.current = prima.split("");
                    ridisegna();
                    salvaPresto();
                  }
                  setPuoAnnullare(storia.current.length > 0);
                }}
              />
              <TastoTondo etichetta="Fine ricamo" icona={Icone.fatto} onClick={fine} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

