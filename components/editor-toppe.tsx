"use client";

// Editor delle toppe del gruppo (solo l'organizzatore): fino a 4 simboli e 4 parole in più
// che compaiono nel cassetto di tutti. Simbolo = foto oppure ricamo a punto croce (col secchiello);
// parola = si scrive direttamente sulla toppa, che cresce con il testo, e si sceglie la stoffa.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LATO, MAX_PERSONALIZZATE, SimboloFoto, SimboloRicamato, ToppaParola, dentroCerchio, type ContenutoPersonalizzato, type RigaPersonalizzata } from "@/components/toppe";
import { Errore, Feltro, Icone, Tasto, TastoTondo, TitoloRiquadro } from "@/components/ui";
import { STOFFE, STOFFE_PERSONALIZZABILI, impagina, righeDa, type Stoffa } from "@/lib/parole";
import { FILI, NOMI_FILI, VUOTO, riempi } from "@/lib/ricamo";
import { clientSoloBrowser } from "@/lib/supabase/client";
import { suoni } from "@/lib/suoni";

export const CHIAVE_PROVA = "prova-toppe-gruppo"; // sala prove: le toppe restano solo nel telefono

export function leggiToppeProva(): RigaPersonalizzata[] {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE_PROVA) ?? "[]");
  } catch {
    return [];
  }
}

// Foto del simbolo: quadrato centrale, piccolo e leggero (la toppa la ritaglia tonda)
async function fotoPerToppa(file: File) {
  const img = await createImageBitmap(file);
  const L = 256;
  const c = document.createElement("canvas");
  c.width = L;
  c.height = L;
  const lato = Math.min(img.width, img.height);
  c.getContext("2d")!.drawImage(img, (img.width - lato) / 2, (img.height - lato) / 2, lato, lato, 0, 0, L, L);
  for (const q of [0.8, 0.65, 0.5]) {
    const url = c.toDataURL("image/jpeg", q);
    if (url.length < 100000) return url;
  }
  return c.toDataURL("image/jpeg", 0.35);
}

// ---------- simbolo: ricamo a punto croce dentro il cerchio, oppure foto ----------
function EditorSimbolo({ valore, onCambia, id }: { valore: ContenutoPersonalizzato; onCambia: (v: ContenutoPersonalizzato) => void; id: string }) {
  const [celle, setCelle] = useState(valore.celle || VUOTO.repeat(LATO * LATO));
  const [storia, setStoria] = useState<string[]>([]);
  const lavoro = useRef<string[] | null>(null); // le celle mentre il dito ricama
  const ultima = useRef<{ c: number; r: number } | null>(null);
  const [filo, setFilo] = useState(0);
  const [strumento, setStrumento] = useState<"ago" | "gomma" | "secchiello">("ago");
  const [errore, setErrore] = useState("");

  function cambia(nuove: string, ricorda = true) {
    if (ricorda) setStoria((s) => [...s.slice(-29), celle]);
    setCelle(nuove);
    onCambia({ celle: nuove });
  }

  function cellaDa(ev: React.PointerEvent) {
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const passo = 78 / LATO;
    return {
      c: Math.floor(((ev.clientX - r.left) / r.width) * (100 / passo) - 11 / passo),
      r: Math.floor(((ev.clientY - r.top) / r.height) * (100 / passo) - 11 / passo),
    };
  }
  function cuci(a: string[], c: number, r: number) {
    if (c < 0 || r < 0 || c >= LATO || r >= LATO || !dentroCerchio(c, r)) return;
    a[r * LATO + c] = strumento === "gomma" ? VUOTO : String(filo);
  }

  if (valore.foto) {
    return (
      <div className="flex flex-col gap-4">
        <div className="mx-auto w-full max-w-[220px]">
          <SimboloFoto foto={valore.foto} id={id} />
        </div>
        <Tasto tipo="secondario" onClick={() => onCambia({ celle })}>
          Ricamalo invece
        </Tasto>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="mx-auto aspect-square w-full max-w-[240px] touch-none select-none"
        aria-label="Simbolo da ricamare: disegna col dito"
        onPointerDown={(ev) => {
          (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
          const a = celle.split("");
          const p = cellaDa(ev);
          if (strumento === "secchiello") {
            riempi(a, LATO, LATO, p.c, p.r, String(filo), dentroCerchio);
            suoni.toppa();
            return cambia(a.join(""));
          }
          setStoria((s) => [...s.slice(-29), celle]);
          lavoro.current = a;
          ultima.current = p;
          cuci(a, p.c, p.r);
          suoni.punto();
          setCelle(a.join(""));
        }}
        onPointerMove={(ev) => {
          const a = lavoro.current;
          const u = ultima.current;
          if (!a || !u) return;
          const p = cellaDa(ev);
          if (p.c === u.c && p.r === u.r) return;
          // linea continua tra i due quadretti
          const passi = Math.max(Math.abs(p.c - u.c), Math.abs(p.r - u.r));
          for (let k = 1; k <= passi; k++) cuci(a, Math.round(u.c + ((p.c - u.c) * k) / passi), Math.round(u.r + ((p.r - u.r) * k) / passi));
          ultima.current = p;
          suoni.punto();
          setCelle(a.join(""));
        }}
        onPointerUp={() => {
          if (!lavoro.current) return;
          const fatto = lavoro.current.join("");
          lavoro.current = null;
          ultima.current = null;
          cambia(fatto, false);
        }}
      >
        <SimboloRicamato celle={celle} griglia />
      </div>

      <div role="radiogroup" aria-label="Colore del filo" className="grid grid-cols-4 justify-items-center gap-3">
        {FILI.map((f, i) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={strumento !== "gomma" && filo === i}
            aria-label={`Filo ${NOMI_FILI[i]}`}
            onClick={() => {
              setFilo(i);
              if (strumento === "gomma") setStrumento("ago");
            }}
            className={`size-11 rounded-full border-[3px] border-white shadow ${strumento !== "gomma" && filo === i ? "outline-3 outline-offset-2 outline-inchiostro" : ""}`}
            style={{ background: f }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        <TastoTondo etichetta="Gomma" icona={Icone.gomma} aria-pressed={strumento === "gomma"} className={strumento === "gomma" ? "!bg-senape" : ""} onClick={() => setStrumento(strumento === "gomma" ? "ago" : "gomma")} />
        <TastoTondo
          etichetta="Secchiello: colora tutta l'area"
          icona={Icone.secchiello}
          aria-pressed={strumento === "secchiello"}
          className={strumento === "secchiello" ? "!bg-senape" : ""}
          onClick={() => setStrumento(strumento === "secchiello" ? "ago" : "secchiello")}
        />
        <TastoTondo
          etichetta="Annulla l'ultimo tratto"
          icona={Icone.annulla}
          disabled={storia.length === 0}
          onClick={() => {
            const prima = storia[storia.length - 1];
            setStoria(storia.slice(0, -1));
            cambia(prima, false);
          }}
        />
        <TastoTondo
          etichetta="Ricomincia da capo"
          icona={Icone.cestino}
          disabled={!/[0-9]/.test(celle)}
          onClick={() => cambia(VUOTO.repeat(LATO * LATO))}
        />
      </div>
      <label className="tasto cucitura cliccabile stoffa-chiara cursor-pointer">
        <span>Usa una foto</span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              setErrore("");
              onCambia({ foto: await fotoPerToppa(f), celle });
            } catch {
              setErrore("Non riesco a leggere questa foto. Prova con un'altra.");
            }
          }}
        />
      </label>
      <Errore>{errore}</Errore>
    </div>
  );
}

// ---------- parola: si scrive direttamente sulla toppa ----------
const SCALA = 0.72; // px per unità della toppa
const MAX_RIGHE = 3;

function EditorParola({ valore, onCambia, n }: { valore: ContenutoPersonalizzato; onCambia: (v: ContenutoPersonalizzato) => void; n: number }) {
  const testo = valore.testo ?? "";
  const stoffa: Stoffa = valore.stoffa ?? "vermiglio";
  const righe = righeDa(testo || " ");
  const L = impagina(righe);
  const prima = L.righe[0];
  const zoom = Math.max(1, 16 / (L.corpo * SCALA));
  return (
    <div className="flex flex-col gap-5">
      <div className="relative mx-auto max-w-full transition-[width,height] duration-200 ease-out" style={{ width: L.w * SCALA, height: L.h * SCALA }}>
        <ToppaParola righe={righe} stoffa={stoffa} senzaTesto />
        <textarea
          aria-label={`Testo della parola ${n}`}
          value={testo}
          placeholder="scrivi qui"
          maxLength={40}
          rows={1}
          wrap="off"
          spellCheck={false}
          autoCapitalize="none"
          onChange={(e) => onCambia({ testo: e.target.value.split("\n").slice(0, MAX_RIGHE).join("\n"), stoffa })}
          className="absolute top-0 left-0 origin-top-left resize-none overflow-hidden bg-transparent text-center font-titolo whitespace-pre outline-none placeholder:opacity-50"
          style={{
            // il carattere resta almeno 16px (niente zoom automatico su iPhone): se serve più piccolo, rimpicciolisco tutto il campo
            width: L.w * SCALA * zoom,
            height: L.h * SCALA * zoom,
            transform: `scale(${1 / zoom})`,
            color: STOFFE[stoffa].testo,
            caretColor: STOFFE[stoffa].testo,
            fontSize: L.corpo * SCALA * zoom,
            lineHeight: `${L.corpo * 1.2 * SCALA * zoom}px`,
            paddingTop: (prima.y - prima.corpo * 0.6 + prima.corpo * 0.1) * SCALA * zoom,
          }}
        />
      </div>
      <p className="-mt-2 text-center text-sm text-inchiostro/70">Tocca la toppa per scrivere. Vai a capo per una seconda riga (massimo {MAX_RIGHE}).</p>
      <div role="radiogroup" aria-label="Stoffa della toppa" className="grid grid-cols-5 justify-items-center gap-3">
        {STOFFE_PERSONALIZZABILI.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={stoffa === s}
            aria-label={`Stoffa ${STOFFE[s].nome}`}
            onClick={() => onCambia({ testo, stoffa: s })}
            className={`relative size-11 rounded-full shadow ${stoffa === s ? "outline-3 outline-offset-2 outline-inchiostro" : ""}`}
            style={{ background: STOFFE[s].fondo }}
          >
            <span className="absolute inset-[5px] rounded-full border-2 border-dashed" style={{ borderColor: STOFFE[s].filo }} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- tutto l'editor ----------
export function EditorToppeGruppo({ groupId, prova = false, dopo }: { groupId: string; prova?: boolean; dopo: string }) {
  const supabase = clientSoloBrowser();
  const router = useRouter();
  const [toppe, setToppe] = useState<RigaPersonalizzata[] | null>(null);
  const iniziali = useRef<string[]>([]);
  const [errore, setErrore] = useState("");
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    (async () => {
      if (prova) {
        const t = leggiToppeProva();
        iniziali.current = t.map((x) => x.id);
        return setToppe(t);
      }
      const { data } = await supabase.from("group_toppe").select("id, tipo, ordine, contenuto").eq("group_id", groupId).order("ordine");
      iniziali.current = (data ?? []).map((x) => x.id);
      setToppe((data as RigaPersonalizzata[]) ?? []);
    })();
  }, [supabase, groupId, prova]);

  if (!toppe) return <p className="mt-6 text-crema/80">Carico le toppe…</p>;

  const cambia = (id: string, contenuto: ContenutoPersonalizzato) => setToppe(toppe.map((t) => (t.id === id ? { ...t, contenuto } : t)));
  const aggiungi = (tipo: "simbolo" | "parola") =>
    setToppe([...toppe, { id: crypto.randomUUID(), tipo, ordine: toppe.length, contenuto: tipo === "parola" ? { testo: "", stoffa: "vermiglio" } : { celle: "" } }]);

  async function salva() {
    setErrore("");
    const parole = toppe!.filter((t) => t.tipo === "parola");
    const simboli = toppe!.filter((t) => t.tipo === "simbolo");
    if (parole.some((t) => !t.contenuto.testo?.trim())) return setErrore("C'è una parola vuota: scrivila o toglila.");
    if (simboli.some((t) => !t.contenuto.foto && !/[0-9]/.test(t.contenuto.celle ?? ""))) return setErrore("C'è un simbolo vuoto: ricamalo, metti una foto o toglilo.");
    const righe = toppe!.map((t, i) => ({
      id: t.id,
      group_id: groupId,
      tipo: t.tipo,
      ordine: i,
      contenuto: t.tipo === "parola" ? { testo: t.contenuto.testo!.trim(), stoffa: t.contenuto.stoffa } : t.contenuto.foto ? { foto: t.contenuto.foto } : { celle: t.contenuto.celle },
    }));
    setSalvo(true);
    if (prova) {
      try {
        localStorage.setItem(CHIAVE_PROVA, JSON.stringify(righe));
      } catch {}
      return router.push(dopo);
    }
    const tolte = iniziali.current.filter((id) => !toppe!.some((t) => t.id === id));
    if (tolte.length) {
      const { error } = await supabase.from("group_toppe").delete().in("id", tolte);
      if (error) {
        setSalvo(false);
        return setErrore("Non sono riuscito a salvare. Riprova.");
      }
    }
    if (righe.length) {
      const { error } = await supabase.from("group_toppe").upsert(righe);
      if (error) {
        setSalvo(false);
        return setErrore(error.message.includes("Al massimo") ? error.message : "Non sono riuscito a salvare. Riprova.");
      }
    }
    router.push(dopo);
    router.refresh();
  }

  const blocco = (tipo: "simbolo" | "parola") => {
    const sue = toppe.filter((t) => t.tipo === tipo);
    const nome = tipo === "simbolo" ? "Simbolo" : "Parola";
    return (
      <>
        {sue.map((t, i) => (
          <Feltro key={t.id}>
            <div className="mb-4 flex items-center gap-3">
              <TitoloRiquadro className="flex-1">
                {nome} {i + 1}
              </TitoloRiquadro>
              <TastoTondo etichetta={`Togli: ${nome.toLowerCase()} ${i + 1}`} icona={Icone.meno} onClick={() => setToppe(toppe.filter((x) => x.id !== t.id))} />
            </div>
            {tipo === "simbolo" ? (
              <EditorSimbolo id={t.id} valore={t.contenuto} onCambia={(v) => cambia(t.id, v)} />
            ) : (
              <EditorParola n={i + 1} valore={t.contenuto} onCambia={(v) => cambia(t.id, v)} />
            )}
          </Feltro>
        ))}
        <Tasto tipo="secondario" disabled={sue.length >= MAX_PERSONALIZZATE} onClick={() => aggiungi(tipo)}>
          {sue.length >= MAX_PERSONALIZZATE ? `${tipo === "simbolo" ? "Simboli" : "Parole"}: ${MAX_PERSONALIZZATE} su ${MAX_PERSONALIZZATE}` : `+ ${tipo === "simbolo" ? "Un simbolo" : "Una parola"} (${sue.length}/${MAX_PERSONALIZZATE})`}
        </Tasto>
      </>
    );
  };

  return (
    <div className="mt-6 flex flex-col gap-4">
      <h2 className="mt-2 font-titolo text-2xl">Simboli</h2>
      {blocco("simbolo")}
      <h2 className="mt-6 font-titolo text-2xl">Parole</h2>
      {blocco("parola")}
      <div className="mt-6 flex flex-col gap-3">
        <Errore>{errore}</Errore>
        <Tasto onClick={salva} disabled={salvo}>
          {salvo ? "Salvo…" : "Salva le toppe"}
        </Tasto>
      </div>
    </div>
  );
}
