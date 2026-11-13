// Collaudo Novità (feed, post, reazioni) e censura dei nomi: 3 utenti finti nel gruppo "Test E2E Natale".
// Uso: NODE_USE_ENV_PROXY=1 node test-e2e/feed.mjs  — alla fine stampa gli id da ripulire (chiedere prima a Marzia).
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const URL = "https://gesihnbtflnpjxwmpxkd.supabase.co";
const KEY = "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const nuovo = () => createClient(URL, KEY, { auth: { persistSession: false } });
const accesso = async () => {
  const c = nuovo();
  const { data, error } = await c.auth.signUp({ email: `${crypto.randomUUID()}@users.secretsanta.local`, password: "provaprova123" });
  if (error) throw error;
  return { c, uid: data.user.id };
};

const [A, B, C, X] = [await accesso(), await accesso(), await accesso(), await accesso()];
const { data: g, error: eg } = await A.c.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: null, p_theme: "", p_my_name: "Giulia Rossi", p_my_avatar: null, p_other_names: ["Marco", "Alessandra"] });
if (eg) throw eg;
const gid = g[0].group_id, code = g[0].invite_code;
const { data: membri } = await A.c.from("group_members").select("id, display_name").eq("group_id", gid);
const mid = Object.fromEntries(membri.map((m) => [m.display_name, m.id]));
A.mid = mid["Giulia Rossi"]; B.mid = mid["Marco"]; C.mid = mid["Alessandra"];
for (const [x, n] of [[B, "Marco"], [C, "Alessandra"]]) {
  const e = (await x.c.rpc("claim_member", { p_invite_code: code, p_member_id: mid[n], p_avatar: null })).error;
  if (e) throw e;
}
const tipi = async () => ((await A.c.from("feed_events").select("tipo, member_id").eq("group_id", gid)).data ?? []);
let t = await tipi();
ok(t.filter((x) => x.tipo === "creato").length === 1 && t.filter((x) => x.tipo === "entrato").length === 2, "voci automatiche: creato + 2 entrati");
ok(((await X.c.from("feed_events").select("id").eq("group_id", gid)).data ?? []).length === 0, "un estraneo non legge il feed");
let r = await B.c.from("feed_events").insert({ group_id: gid, member_id: B.mid, tipo: "post", dati: { testo: "finto" } });
ok(!!r.error, "scrivere direttamente nel feed è vietato");

// censura
const casi = [
  ["Giulia porta il panettone", "****** porta il panettone"],
  ["G1ul14 e M4rc0", "****** e *****"],
  ["g.i.u.l.i.a", "*.*.*.*.*.*"],
  ["Hiulia e Narco", "****** e *****"],
  ["la Rossi!!", "la *******"], // copre anche i "!!": va bene così
  ["Giluia e Mracò", "****** e *****"],
  ["Alessadnra", "**********"],
  ["Ale ssandra", "*** *******"],
  ["Che bel brano, marmo e marea", "Che bel brano, marmo e marea"],
];
for (const [testo, atteso] of casi) {
  r = await B.c.rpc("pubblica_post", { p_group: gid, p_testo: testo, p_foto: null });
  ok(!r.error && r.data.dati.testo === atteso, `post «${testo}» → «${r.data?.dati.testo ?? r.error?.message}»`);
}
r = await B.c.rpc("pubblica_post", { p_group: gid, p_testo: "x".repeat(101), p_foto: null });
ok(r.error?.message.includes("100"), "post oltre 100 caratteri rifiutato");
r = await B.c.rpc("pubblica_post", { p_group: gid, p_testo: "", p_foto: null });
ok(!!r.error, "post vuoto rifiutato");
r = await B.c.rpc("pubblica_post", { p_group: gid, p_testo: "foto finta", p_foto: `${gid}/${A.mid}/${crypto.randomUUID()}.jpg` });
ok(r.error?.message.includes("Foto non valida"), "foto nella cartella di un altro rifiutata");
// foto vera
const png = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
const path = `${gid}/${B.mid}/${crypto.randomUUID()}.jpg`;
r = await B.c.storage.from("moodboard").upload(path, png, { contentType: "image/jpeg" });
ok(!r.error, "foto caricata");
r = await B.c.rpc("pubblica_post", { p_group: gid, p_testo: null, p_foto: path });
ok(!r.error && r.data.dati.foto === path, "post con sola foto");
const postFoto = r.data.id;
const url = (await C.c.storage.from("moodboard").createSignedUrls([path], 60)).data?.[0]?.signedUrl;
ok(!!url, "il gruppo vede la foto");
ok(!(await X.c.storage.from("moodboard").createSignedUrls([path], 60)).data?.[0]?.signedUrl, "un estraneo non vede la foto");

// reazioni
await C.c.rpc("reagisci", { p_event: postFoto, p_emoji: "🇮🇱" });
await C.c.rpc("reagisci", { p_event: postFoto, p_emoji: "😂" });
let rz = (await A.c.from("feed_reactions").select("member_id, emoji").eq("event_id", postFoto)).data;
ok(rz.length === 1 && rz[0].emoji === "😂", "una reazione a testa: la seconda sostituisce la prima");
await C.c.rpc("reagisci", { p_event: postFoto, p_emoji: "😂" });
rz = (await A.c.from("feed_reactions").select("emoji").eq("event_id", postFoto)).data;
ok(rz.length === 0, "stessa emoji di nuovo = tolta");
r = await C.c.rpc("reagisci", { p_event: postFoto, p_emoji: "💩" });
ok(!!r.error, "emoji fuori elenco rifiutata");
r = await X.c.rpc("reagisci", { p_event: postFoto, p_emoji: "🎄" });
ok(!!r.error, "un estraneo non reagisce");
await A.c.rpc("reagisci", { p_event: postFoto, p_emoji: "🇮🇱" });
ok(((await A.c.from("feed_reactions").select("emoji").eq("event_id", postFoto)).data ?? [])[0]?.emoji === "🇮🇱", "reazione 🇮🇱 salvata");

// cancellazione
await C.c.rpc("elimina_post", { p_event: postFoto });
ok(((await A.c.from("feed_events").select("id").eq("id", postFoto)).data ?? []).length === 1, "non si cancella il post di un altro");
await B.c.rpc("elimina_post", { p_event: postFoto });
ok(((await A.c.from("feed_events").select("id").eq("id", postFoto)).data ?? []).length === 0, "l'autore cancella il suo post");
await B.c.storage.from("moodboard").remove([path]);

// bacheca: tanti salvataggi = una voce
for (let i = 0; i < 3; i++) await C.c.from("moodboard_items").insert({ member_id: C.mid, kind: "toppa", content: { toppa: "neve", tipo: "simbolo" } });
t = await tipi();
ok(t.filter((x) => x.tipo === "bacheca" && x.member_id === C.mid).length === 1, "3 modifiche alla bacheca = 1 voce");

// estrazione, busta, chat censurata
const d = await A.c.rpc("run_draw", { p_group_id: gid });
if (d.error) throw d.error;
await B.c.from("group_members").update({ envelope_opened_at: new Date().toISOString() }).eq("id", B.mid);
t = await tipi();
ok(t.some((x) => x.tipo === "estrazione") && t.some((x) => x.tipo === "busta" && x.member_id === B.mid), "voci estrazione e busta aperta");
r = await B.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: true, p_testo: "Ciao! Indovina: sono M@rco? O forse Giuli4..." });
ok(!r.error && r.data.testo === "Ciao! Indovina: sono *****? O forse ******...", "Santa Chat censurata: " + (r.data?.testo ?? r.error?.message));
r = await X.c.rpc("prova_censura", { p_nomi: ["Giulia"], p_testo: "ciao G I U L I A" });
ok(r.data === "ciao * * * * * *", "prova_censura (sala prove) funziona anche senza accesso");

console.log("UTENTI", JSON.stringify([A.uid, B.uid, C.uid, X.uid]));
console.log("GRUPPO", gid);
process.exit();
