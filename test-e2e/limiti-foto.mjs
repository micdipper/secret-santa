// Collaudo dei limiti delle foto (fase 1, 21/11), DOPO aver applicato 20261122100000_limiti_foto.sql.
// 1) compressione (lib/foto.ts) in Chromium: foto da ~5 MB e caso peggiore sotto 50 KB, rotazione dell'iPhone giusta
// 2) database, con utenti finti e scavalcando l'interfaccia: 2 foto in bacheca, 1 foto al giorno nel feed,
//    5 foto dei totem da 50 KB, simboli (del gruppo e personali) senza foto nuove.
// Uso: NODE_USE_ENV_PROXY=1 node test-e2e/limiti-foto.mjs   (solo la parte 1: SOLO_BROWSER=1)
// Crea un gruppo "Test E2E Natale": alla fine stampa l'id da ripulire (chiedere prima a Marzia).
import { createRequire, stripTypeScriptTypes } from "module";
import { readFileSync } from "fs";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const { chromium } = require("playwright");
const URL_DB = "https://gesihnbtflnpjxwmpxkd.supabase.co";
const KEY = "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };

// ---------- 1) compressione nel browser ----------
// JPEG 40×30 con il verde a sinistra nei pixel ed EXIF "ruota di 90°" (come le foto verticali dell'iPhone)
const RUOTATA = "/9j/4AAQSkZJRgABAQAAAQABAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAeACgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDz+uZ8T/8AH/H/ANch/M101cz4n/4/4/8ArkP5mvyWl8R8x4Kf8ldD/r3P8kZFFFFdp/oUFFFFAHe1zPif/j/j/wCuQ/ma6auZ8T/8f8f/AFyH8zXFS+I/z18FP+Suh/17n+SMiiiiu0/0KCiiigD/2Q==";
{
  const codice = stripTypeScriptTypes(readFileSync(new URL("../lib/foto.ts", import.meta.url), "utf8"));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("about:blank");
  const r = await page.evaluate(async ({ codice, RUOTATA }) => {
    const m = await import(URL.createObjectURL(new Blob([codice], { type: "text/javascript" })));
    // foto finte da 12 MP: una "normale" (sfumature e forme) e una di sola grana (la più difficile da comprimere)
    const fotoFinta = async (grana) => {
      const c = document.createElement("canvas");
      c.width = 4032;
      c.height = 3024;
      const g = c.getContext("2d");
      const sf = g.createLinearGradient(0, 0, 0, c.height);
      sf.addColorStop(0, "#1e5090");
      sf.addColorStop(1, "#96c83c");
      g.fillStyle = sf;
      g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 300; i++) {
        g.fillStyle = `hsl(${(i * 47) % 360} 60% 50%)`;
        g.beginPath();
        g.arc((i * 997) % c.width, (i * 613) % c.height, 20 + (i % 9) * 30, 0, 7);
        g.fill();
      }
      const d = g.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const n = (Math.random() - 0.5) * (grana ? 255 : 40);
        d.data[i] += n;
        d.data[i + 1] += n;
        d.data[i + 2] += n;
      }
      g.putImageData(d, 0, 0);
      return await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.95));
    };
    const out = {};
    for (const [nome, grana] of [["normale", false], ["grana", true]]) {
      const f = await fotoFinta(grana);
      out[nome] = {
        partenza: f.size,
        feed: (await m.comprimiFoto(f, m.PROFILO_FEED)).blob.size,
        bacheca: (await m.comprimiFoto(f, m.PROFILO_BACHECA)).blob.size,
        totem: (await m.comprimiRitaglio(f, m.PROFILO_FRANCOBOLLO)).length,
      };
    }
    const blob = new Blob([Uint8Array.from(atob(RUOTATA), (c) => c.charCodeAt(0))], { type: "image/jpeg" });
    const rr = await m.comprimiFoto(blob, m.PROFILO_BACHECA);
    const i = new Image();
    i.src = URL.createObjectURL(rr.blob);
    await i.decode();
    const c = document.createElement("canvas");
    c.width = i.naturalWidth;
    c.height = i.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(i, 0, 0);
    const alto = g.getImageData(c.width / 2, 1, 1, 1).data;
    out.rotazione = { w: c.width, h: c.height, verdeInAlto: alto[1] > alto[0], rapporto: rr.rapporto };
    try {
      await m.comprimiFoto(new Blob(["non è una foto"]), m.PROFILO_FEED);
    } catch (e) {
      out.errore = e.message;
    }
    return out;
  }, { codice, RUOTATA });
  await browser.close();
  for (const nome of ["normale", "grana"]) {
    const x = r[nome];
    console.log(`     foto ${nome} da ${(x.partenza / 1048576).toFixed(1)} MB → feed ${(x.feed / 1024).toFixed(1)} KB, bacheca ${(x.bacheca / 1024).toFixed(1)} KB, totem ${x.totem} car.`);
    ok(x.feed <= 35 * 1024 && x.bacheca <= 50 * 1024, `foto ${nome}: feed sotto 35 KB e bacheca sotto 50 KB`);
    ok(x.totem <= 68300, `foto ${nome}: totem sotto 50 KB (≤ 68.300 caratteri base64)`);
  }
  ok(r.rotazione.h > r.rotazione.w && r.rotazione.verdeInAlto && r.rotazione.rapporto < 1, "foto verticale dell'iPhone (EXIF) ruotata giusta");
  ok(r.errore === "Non riesco a leggere questa foto. Prova con un'altra.", "file che non è una foto: messaggio chiaro");
}
if (process.env.SOLO_BROWSER) process.exit();

// ---------- 2) database ----------
const nuovo = () => createClient(URL_DB, KEY, { auth: { persistSession: false } });
const accesso = async () => {
  const c = nuovo();
  const { data, error } = await c.auth.signUp({ email: `${crypto.randomUUID()}@users.secretsanta.local`, password: "provaprova123" });
  if (error) throw error;
  return { c, uid: data.user.id };
};
const [A, B] = [await accesso(), await accesso()];
const { data: g, error: eg } = await A.c.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: null, p_theme: "", p_my_name: "Giulia Rossi", p_my_avatar: null, p_other_names: ["Marco"] });
if (eg) throw eg;
const gid = g[0].group_id, code = g[0].invite_code;
const { data: membri } = await A.c.from("group_members").select("id, display_name").eq("group_id", gid);
const mid = Object.fromEntries(membri.map((m) => [m.display_name, m.id]));
A.mid = mid["Giulia Rossi"];
B.mid = mid["Marco"];
const risposte = { 2: "a", 1: "b", "-1": "c", "-2": "d" };
const domande = ["impegno", "esigenza", "impegno", "esigenza"].map((parametro, i) => ({ parametro, testo: `Domanda ${i + 1}`, risposte }));
const PROFILI = ["IMPEGNO_ALTO_RICEVE_TUTTO", "IMPEGNO_ALTO_ESIGENTE", "IMPEGNO_BASSO_RICEVE_TUTTO", "IMPEGNO_BASSO_ESIGENTE", "BONUS"];
const totem = (immagine) => PROFILI.map((profilo) => ({ profilo, nome: profilo, descrizione: "", immagine }));
let r = await A.c.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem("") });
if (r.error) throw r.error;
r = await B.c.rpc("claim_member", { p_invite_code: code, p_member_id: B.mid, p_avatar: null });
if (r.error) throw r.error;
const base64 = (caratteri) => "data:image/jpeg;base64," + "A".repeat(caratteri - 23);

// totem dell'organizzatore: 5 foto da 50 KB passano, una più pesante no
r = await A.c.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem(base64(68300)) });
ok(!r.error, "l'organizzatore salva 5 foto dei totem da 50 KB");
r = await A.c.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem(base64(68300)).map((t, i) => (i === 0 ? { ...t, nome: "Nome cambiato" } : t)) });
ok(!r.error, "con le foto salvate cambia ancora il nome di un totem");
r = await A.c.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem(base64(68300)).map((t, i) => (i === 4 ? { ...t, immagine: base64(80000) } : t)) });
ok(r.error?.message.includes("troppo pesante"), "una foto del totem oltre 50 KB è rifiutata");

// bacheca: 2 foto/immagini, anche scavalcando l'interfaccia; le foto dei totem non contano
const immagine = (i) => ({ member_id: A.mid, kind: "immagine_link", content: { url: `https://example.com/${i}.jpg`, rapporto: 1 }, width: 36, height: 36 });
r = await A.c.from("moodboard_items").insert([immagine(1)]);
ok(!r.error, "l'organizzatore (con 5 foto dei totem) attacca la prima immagine");
r = await A.c.from("moodboard_items").insert([immagine(2)]).select("id").single();
ok(!r.error, "seconda immagine attaccata");
const seconda = r.data?.id;
r = await A.c.from("moodboard_items").insert([immagine(3)]);
ok(r.error?.message.includes("al massimo 2 foto"), "la terza immagine è rifiutata");
r = await A.c.from("moodboard_items").insert([{ ...immagine(4), kind: "foto", content: { path: `${gid}/${A.mid}/x.jpg`, rapporto: 1 } }]);
ok(!!r.error, "anche una terza foto è rifiutata");
r = await A.c.from("moodboard_items").insert([{ member_id: A.mid, kind: "toppa", content: { toppa: "stella", tipo: "simbolo" }, width: 26, height: 26 }]).select("id").single();
r = await A.c.from("moodboard_items").update({ kind: "immagine_link", content: { url: "https://example.com/5.jpg", rapporto: 1 } }).eq("id", r.data.id).select("id");
ok(!!r.error, "trasformare una toppa in immagine non scavalca il limite");
r = await A.c.from("moodboard_items").update({ x: 30, y: 40, width: 50, rotation: 12 }).eq("id", seconda).select("id");
ok(!r.error && r.data.length === 1, "spostare, ingrandire e ruotare una foto resta possibile");
r = await A.c.from("moodboard_items").delete().eq("id", seconda).select("id");
ok(!r.error && r.data.length === 1, "togliere una foto resta possibile");

// feed: una foto al giorno, i post di solo testo passano sempre
const jpeg = Buffer.from(RUOTATA, "base64");
const carica = async () => {
  const path = `${gid}/${B.mid}/${crypto.randomUUID()}.jpg`;
  const { error } = await B.c.storage.from("moodboard").upload(path, jpeg, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
};
const p1 = await carica();
r = await B.c.rpc("pubblica_post", { p_group: gid, p_testo: "prima foto", p_foto: p1 });
ok(!r.error, "primo post con foto pubblicato");
const p2 = await carica();
r = await B.c.rpc("pubblica_post", { p_group: gid, p_testo: "seconda foto", p_foto: p2 });
ok(r.error?.message === "Hai già postato una foto oggi, riprova domani", "seconda foto nello stesso giorno rifiutata");
r = await B.c.rpc("pubblica_post", { p_group: gid, p_testo: "solo testo", p_foto: null });
ok(!r.error, "un post di solo testo passa");
r = await A.c.rpc("pubblica_post", { p_group: gid, p_testo: "", p_foto: null });
ok(!!r.error, "un post vuoto resta rifiutato");
await B.c.storage.from("moodboard").remove([p1, p2]);

// simboli: nessuna foto nuova, né del gruppo né personali; ricamati sì
const simbolo = (member_id, foto) => ({ id: crypto.randomUUID(), group_id: gid, tipo: "simbolo", ordine: 0, member_id, contenuto: { foto } });
r = await A.c.from("group_toppe").insert(simbolo(null, base64(1000)));
ok(r.error?.message.includes("si ricamano"), "simbolo del gruppo con una foto rifiutato");
r = await B.c.from("group_toppe").insert(simbolo(B.mid, base64(1000)));
ok(r.error?.message.includes("si ricamano"), "simbolo personale con una foto rifiutato");
r = await A.c.from("group_toppe").insert({ id: crypto.randomUUID(), group_id: gid, tipo: "simbolo", ordine: 0, member_id: null, contenuto: { celle: "0", stoffa: "crema" } });
ok(!r.error, "simbolo del gruppo ricamato salvato");
r = await B.c.from("group_toppe").insert({ id: crypto.randomUUID(), group_id: gid, tipo: "simbolo", ordine: 0, member_id: B.mid, contenuto: { celle: "0", stoffa: "crema" } });
ok(!r.error, "simbolo personale ricamato salvato");

console.log(`\nGruppo di prova da ripulire (chiedere prima a Marzia): ${gid}`);
console.log(`Accessi di prova: ${A.uid}, ${B.uid}`);
