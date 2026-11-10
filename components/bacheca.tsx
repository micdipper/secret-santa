"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CATALOGO, NOMI_TIPI, trovaToppa, type TipoToppa } from "@/components/toppe";
import { useRouter } from "next/navigation";
import { Errore, Feltro, Icone, Tasto, TastoTondo } from "@/components/ui";
import { clientSoloBrowser } from "@/lib/supabase/client";
import { suoni } from "@/lib/suoni";

/*
  Bacheca = tela da ricamo con toppe, foto e un ricamo a punto croce.
  Coordinate in "unità tela": la larghezza della tela vale 100, l'altezza 100 * 4/3.
  x, y = centro dell'elemento; width = larghezza; l'altezza si ricava dal rapporto.
*/

export type Elemento = {
  id: string;
  kind: "toppa" | "ricamo" | "foto" | "immagine_link";
  content: { toppa?: string; tipo?: string; path?: string; url?: string; rapporto?: number; celle?: string };
  x: number;
  y: number;
  width: number;
  rotation: number;
  z: number;
};

const ALTEZZA = (100 * 4) / 3;
const COLONNE = 60;
const RIGHE = 80;
// Fili ben visibili sulla tela crema (gli stessi colori dei personaggi)
const FILI = ["#e5481e", "#2c4a32", "#e9a81c", "#24304a", "#f4a9c4", "#7d3c5a", "#5a3520", "#1c241d"];
const NOMI_FILI = ["vermiglio", "verde", "senape", "blu notte", "rosa", "bordeaux", "marrone", "nero"];
const VUOTO = ".";

function rapportoDi(e: Elemento) {
  if (e.kind === "toppa") return trovaToppa(e.content.toppa ?? "")?.rapporto ?? 1;
  return e.content.rapporto ?? 1;
}

// Riduce una foto del telefono (che può pesare molti MB) a max 1200px in JPEG.
async function riduciFoto(file: File): Promise<{ blob: Blob; rapporto: number }> {
  const img = await createImageBitmap(file);
  const scala = Math.min(1, 1200 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scala);
  c.height = Math.round(img.height * scala);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), "image/jpeg", 0.82));
  return { blob, rapporto: img.width / img.height };
}

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
}: {
  groupId: string;
  memberId: string;
  modificabile: boolean;
  iniziali: Elemento[];
}) {
  const supabase = clientSoloBrowser();
  const router = useRouter();
  const telaRef = useRef<HTMLDivElement>(null);
  const [larghezza, setLarghezza] = useState(0);
  const [elementi, setElementi] = useState<Elemento[]>(iniziali.filter((e) => e.kind !== "ricamo"));
  const [ricamo, setRicamo] = useState<Elemento | null>(iniziali.find((e) => e.kind === "ricamo") ?? null);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [cassetto, setCassetto] = useState<TipoToppa | "foto" | null>(null);
  const [modoRicamo, setModoRicamo] = useState(false);
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
    router.push(`/gruppo/${groupId}`);
    router.refresh();
  }

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
      const { error } = await traccia(
        supabase
          .from("moodboard_items")
          .update({ x: e.x, y: e.y, width: e.width, height: e.width / rapportoDi(e), rotation: e.rotation, z: e.z, updated_at: new Date().toISOString() })
          .eq("id", e.id),
      );
      if (error) setErrore("Non sono riuscito a salvare l'ultima modifica.");
    },
    [supabase, traccia],
  );

  async function aggiungi(kind: Elemento["kind"], content: Elemento["content"], width: number) {
    const z = Math.max(0, ...elementi.map((e) => e.z)) + 1;
    const nuovo = { member_id: memberId, kind, content, x: 50 + spostamentoCasuale(18), y: ALTEZZA / 2 + spostamentoCasuale(24), width, height: width / (content.rapporto ?? trovaToppa(content.toppa ?? "")?.rapporto ?? 1), rotation: inclinazioneCasuale(), z };
    const { data, error } = await traccia(supabase.from("moodboard_items").insert(nuovo).select("id, kind, content, x, y, width, rotation, z").single());
    if (error || !data) return setErrore("Non sono riuscito ad attaccarlo. Riprova.");
    setErrore("");
    setElementi((l) => [...l, data as Elemento]);
    setSelezionato(data.id);
  }

  async function togli(id: string) {
    const e = elementi.find((x) => x.id === id);
    setElementi((l) => l.filter((x) => x.id !== id));
    setSelezionato(null);
    await traccia(supabase.from("moodboard_items").delete().eq("id", id));
    if (e?.kind === "foto" && e.content.path) await traccia(supabase.storage.from("moodboard").remove([e.content.path]));
  }

  function portaSopra(id: string) {
    const z = Math.max(0, ...elementi.map((e) => e.z)) + 1;
    setElementi((l) => l.map((e) => (e.id === id ? { ...e, z } : e)));
    const e = elementi.find((x) => x.id === id);
    if (e) salvaPosizione({ ...e, z });
  }

  async function aggiungiFoto(file: File) {
    setCaricamento(true);
    try {
      const { blob, rapporto } = await riduciFoto(file);
      const path = `${groupId}/${memberId}/${crypto.randomUUID()}.jpg`;
      const { error } = await traccia(supabase.storage.from("moodboard").upload(path, blob, { contentType: "image/jpeg" }));
      if (error) throw error;
      await aggiungi("foto", { path, rapporto }, 36);
      setCassetto(null);
    } catch {
      setErrore("Non sono riuscito a caricare la foto. Riprova con un'altra immagine.");
    }
    setCaricamento(false);
  }

  async function aggiungiDaLink() {
    const url = linkImmagine.trim();
    if (!/^https?:\/\//i.test(url)) return setErrore("Incolla un indirizzo che inizia con https://");
    try {
      const rapporto = await caricaDimensioni(url);
      await aggiungi("immagine_link", { url, rapporto }, 36);
      setLinkImmagine("");
      setCassetto(null);
    } catch {
      setErrore("Questa immagine non si apre: alcuni siti non permettono di mostrarle altrove. Prova a salvarla e caricarla come foto.");
    }
  }

  // ---------- gesti: un dito sposta, due dita ingrandiscono e ruotano ----------
  const tocchi = useRef(new Map<number, { x: number; y: number }>());
  const partenza = useRef<{ e: Elemento; punti: { x: number; y: number }[] } | null>(null);

  function inizioGesto(ev: React.PointerEvent, el: Elemento) {
    if (!modificabile || modoRicamo) return;
    ev.stopPropagation();
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    tocchi.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    setSelezionato(el.id);
    const corrente = elementi.find((x) => x.id === el.id) ?? el;
    partenza.current = { e: corrente, punti: [...tocchi.current.values()] };
  }

  function muoviGesto(ev: React.PointerEvent, id: string) {
    if (!tocchi.current.has(ev.pointerId) || !partenza.current || !px) return;
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
  }

  function fineGesto(ev: React.PointerEvent, id: string) {
    tocchi.current.delete(ev.pointerId);
    const corrente = elementi.find((x) => x.id === id);
    if (tocchi.current.size === 0) {
      partenza.current = null;
      if (corrente) salvaPosizione(corrente);
    } else if (corrente) {
      // un dito alzato su due: riparto dalla posizione attuale
      partenza.current = { e: corrente, punti: [...tocchi.current.values()] };
    }
  }

  // ---------- disegno di un elemento ----------
  function contenuto(e: Elemento) {
    if (e.kind === "toppa") return <>{trovaToppa(e.content.toppa ?? "")?.disegno()}</>;
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

  const ordinati = [...elementi].sort((a, b) => a.z - b.z);
  const sel = elementi.find((e) => e.id === selezionato);

  return (
    <div>
      <div
        ref={telaRef}
        className="tela-aida relative w-full overflow-hidden rounded-[28px] shadow-[0_8px_16px_-10px_rgba(0,0,0,.5)]"
        style={{ aspectRatio: "3 / 4", ["--cella" as string]: `${larghezza / COLONNE}px` }}
        onPointerDown={() => !modoRicamo && setSelezionato(null)}
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
                onPointerMove={(ev) => muoviGesto(ev, e.id)}
                onPointerUp={(ev) => fineGesto(ev, e.id)}
                onPointerCancel={(ev) => fineGesto(ev, e.id)}
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
              </div>
            );
          })}

        {elementi.length === 0 && !ricamo && !modoRicamo && (
          <p className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-inchiostro/60">
            {modificabile ? "La tela è vuota. Attacca una toppa o ricama qualcosa qui sotto." : "Questa bacheca è ancora vuota."}
          </p>
        )}
      </div>

      {modificabile && (
        <>
          {/* Comandi: uno per funzione */}
          {!modoRicamo && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <TastoTondo etichetta="Apri il cassetto delle toppe" icona={Icone.piu} aria-pressed={!!cassetto} onClick={() => setCassetto(cassetto ? null : "simbolo")} />
              <TastoTondo
                etichetta="Ricama"
                icona={Icone.ago}
                onClick={() => {
                  setModoRicamo(true);
                  setCassetto(null);
                  setSelezionato(null);
                }}
              />
              <TastoTondo etichetta="Porta sopra" icona={Icone.sopra} disabled={!sel} onClick={() => sel && portaSopra(sel.id)} />
              <TastoTondo etichetta="Togli dalla bacheca" icona={Icone.cestino} disabled={!sel} onClick={() => sel && togli(sel.id)} />
            </div>
          )}

          {errore && (
            <div className="mt-3">
              <Errore>{errore}</Errore>
            </div>
          )}

          {cassetto && !modoRicamo && (
            <Feltro className="mt-4">
              <div role="tablist" className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1">
                {(["simbolo", "parola", "palette", "foto"] as const).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={cassetto === t}
                    onClick={() => setCassetto(t)}
                    className={`cliccabile relative flex-none rounded-full px-4 py-2 text-sm ${cassetto === t ? "stoffa-vermiglio" : "stoffa-chiara"}`}
                  >
                    {t === "foto" ? "Foto" : NOMI_TIPI[t]}
                  </button>
                ))}
              </div>

              {cassetto === "foto" ? (
                <div className="mt-5 flex flex-col gap-4">
                  <label className="tasto cucitura cliccabile stoffa-vermiglio relative cursor-pointer">
                    <span>{caricamento ? "Carico…" : "Scegli una foto"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={caricamento}
                      onChange={(ev) => {
                        const f = ev.target.files?.[0];
                        if (f) aggiungiFoto(f);
                        ev.target.value = "";
                      }}
                    />
                  </label>
                  <div className="flex items-end gap-3">
                    <label className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="font-medium">Oppure un&apos;immagine da un link</span>
                      <span className="campo-cucito block">
                        <input value={linkImmagine} onChange={(ev) => setLinkImmagine(ev.target.value)} placeholder="https://…" inputMode="url" />
                      </span>
                    </label>
                    <TastoTondo etichetta="Aggiungi l'immagine dal link" icona={Icone.piu} disabled={!linkImmagine.trim()} onClick={aggiungiDaLink} />
                  </div>
                </div>
              ) : (
                <ul className="mt-5 grid grid-cols-3 gap-3">
                  {CATALOGO.filter((t) => t.tipo === cassetto).map((t) => (
                    <li key={t.id} className={t.tipo === "parola" ? "col-span-3 sm:col-span-1" : ""}>
                      <button
                        aria-label={`Attacca: ${t.nome}`}
                        onClick={() => {
                          suoni.toppa();
                          aggiungi("toppa", { toppa: t.id, tipo: t.tipo }, t.tipo === "parola" ? 46 : 26);
                        }}
                        className="block w-full transition-transform active:scale-95"
                        style={{ aspectRatio: String(t.rapporto) }}
                      >
                        {t.disegno()}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Feltro>
          )}

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
  const [gomma, setGomma] = useState(false);
  const [puoAnnullare, setPuoAnnullare] = useState(false);
  const idRicamo = useRef<string | null>(iniziale?.id ?? null);
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

  // Salvo poco dopo l'ultimo punto; intanto il salvataggio risulta "in corso"
  const fineAttesa = useRef<(() => void) | null>(null);
  function salvaPresto() {
    if (timerSalva.current) clearTimeout(timerSalva.current);
    if (!fineAttesa.current) traccia(new Promise<void>((ok) => (fineAttesa.current = ok)));
    timerSalva.current = setTimeout(salvaOra, 600);
  }

  async function salvaOra() {
    timerSalva.current = null;
    try {
      const content = { celle: celle.current.join("") };
      if (idRicamo.current) {
        const { error } = await supabase.from("moodboard_items").update({ content, updated_at: new Date().toISOString() }).eq("id", idRicamo.current);
        if (error) onErrore("Non sono riuscito a salvare il ricamo.");
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
    const r = canvasRef.current!.getBoundingClientRect();
    return { c: Math.floor((ev.clientX - r.left) / cella), r: Math.floor((ev.clientY - r.top) / cella) };
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
            <div role="radiogroup" aria-label="Colore del filo" className="relative grid grid-cols-4 gap-3">
              {FILI.map((f, i) => (
                <button
                  key={f}
                  role="radio"
                  aria-checked={!gomma && filo === i}
                  aria-label={`Filo ${NOMI_FILI[i]}`}
                  onClick={() => {
                    setFilo(i);
                    setGomma(false);
                  }}
                  className={`size-11 rounded-full border-[3px] border-white shadow ${!gomma && filo === i ? "outline-3 outline-offset-2 outline-inchiostro" : ""}`}
                  style={{ background: f }}
                />
              ))}
            </div>
            <div className="relative flex gap-3">
              <TastoTondo etichetta="Gomma" icona={Icone.gomma} aria-pressed={gomma} className={gomma ? "!bg-senape" : ""} onClick={() => setGomma(!gomma)} />
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
