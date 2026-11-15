// Collaudo della disponibilità per lo scambio, con utenti finti nel gruppo "Test E2E Natale":
//   NODE_USE_ENV_PROXY=1 node test-e2e/disponibilita.mjs <sito> <cartella foto>
// Controlla il database (chi può fare cosa) e la pagina vera con due telefoni simulati (diretta, data fissata).
// Alla fine stampa gli id da ripulire (chiedere prima a Marzia).
import { createRequire } from "module";
import { mkdirSync } from "fs";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const URL = "https://gesihnbtflnpjxwmpxkd.supabase.co";
const KEY = "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
const PWD = "provaprova123";
const [, , sito, cartella = "foto-disponibilita"] = process.argv;
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const nuovo = () => createClient(URL, KEY, { auth: { persistSession: false } });
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
const giorno = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
mkdirSync(cartella, { recursive: true });

// 4 accessi: Anna organizza, Bruno e Carla entrano, Dario sta in un altro gruppo (estraneo)
const u = [];
for (let i = 0; i < 4; i++) {
  const c = nuovo();
  const { data, error } = await c.auth.signUp({ email: `${crypto.randomUUID()}@users.secretsanta.local`, password: PWD });
  if (error) throw error;
  u.push({ c, uid: data.user.id });
}
const [A, B, C, D] = u.map((x) => x.c);
const { data: g, error: eg } = await A.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: null, p_theme: "", p_my_name: "Anna", p_my_avatar: null, p_other_names: ["Bruno", "Carla", "Elena"] });
if (eg) throw eg;
const gid = g[0].group_id, code = g[0].invite_code;
const { data: g2 } = await D.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: null, p_theme: "", p_my_name: "Dario", p_my_avatar: null, p_other_names: ["X", "Y"] });
console.log("GRUPPI", gid, g2?.[0]?.group_id, "UTENTI", u.map((x) => x.uid).join(" ")); // da ripulire anche se la prova si ferma
const { data: membri } = await A.from("group_members").select("id, display_name").eq("group_id", gid);
const mid = Object.fromEntries(membri.map((m) => [m.display_name, m.id]));
const risposte = { 2: "a", 1: "b", "-1": "c", "-2": "d" };
const domande = ["impegno", "esigenza", "impegno", "esigenza"].map((parametro, i) => ({ parametro, testo: `Domanda ${i + 1}`, risposte }));
const totem = ["IMPEGNO_ALTO_RICEVE_TUTTO", "IMPEGNO_ALTO_ESIGENTE", "IMPEGNO_BASSO_RICEVE_TUTTO", "IMPEGNO_BASSO_ESIGENTE", "BONUS"].map((profilo) => ({ profilo, nome: profilo, descrizione: "", immagine: "" }));
if ((await A.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem })).error) throw new Error("sondaggio");
for (const [c, n] of [[B, "Bruno"], [C, "Carla"]]) {
  const e = (await c.rpc("claim_member", { p_invite_code: code, p_member_id: mid[n], p_avatar: null })).error;
  if (e) throw e;
}

// ---------- database ----------
const G = [giorno(10), giorno(12), giorno(13), giorno(16)];
ok((await B.rpc("imposta_disponibilita", { p_group_id: gid, p_giorni: [G[0]] })).error?.message.includes("chiuso"), "senza giorni proposti non si risponde");
await B.from("groups").update({ giorni_proposti: G }).eq("id", gid);
ok(!(await A.from("groups").select("giorni_proposti").eq("id", gid).single()).data.giorni_proposti, "chi non organizza non può proporre i giorni");
ok(!(await A.from("groups").update({ giorni_proposti: G }).eq("id", gid)).error, "l'organizzatrice propone 4 giorni");
ok(!(await B.rpc("imposta_disponibilita", { p_group_id: gid, p_giorni: [G[1], G[2]] })).error, "Bruno dice quando c'è");
ok(!(await C.rpc("imposta_disponibilita", { p_group_id: gid, p_giorni: [G[2]] })).error, "Carla dice quando c'è");
ok((await C.rpc("imposta_disponibilita", { p_group_id: gid, p_giorni: [giorno(30)] })).error?.message.includes("proposti"), "un giorno non proposto viene rifiutato");
ok((await D.rpc("imposta_disponibilita", { p_group_id: gid, p_giorni: [G[0]] })).error?.message.includes("Non fai parte"), "un estraneo non può rispondere");
ok(((await D.from("disponibilita").select("member_id").eq("group_id", gid)).data ?? []).length === 0, "un estraneo non legge le risposte");
await B.from("disponibilita").insert({ member_id: mid.Carla, group_id: gid, giorni: [G[0]] });
await B.from("disponibilita").update({ giorni: [G[0]] }).eq("member_id", mid.Carla);
const tutte = (await A.from("disponibilita").select("member_id, giorni").eq("group_id", gid)).data ?? [];
ok(tutte.length === 2 && tutte.find((r) => r.member_id === mid.Carla)?.giorni.join() === G[2], "nessuno scrive le risposte degli altri; l'organizzatrice le legge tutte");

// ---------- pagina vera, due telefoni ----------
const { chromium, devices } = require("playwright");
const browser = await chromium.launch();
const errori = [];
let n = 0;
const foto = async (p, nome, intera = true) => {
  await attendi(700);
  await p.screenshot({ path: `${cartella}/${String(++n).padStart(2, "0")}-${nome}.png`, fullPage: intera });
};
async function telefono(nome) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errori.push(`${nome}: ${e.message}`));
  await p.goto(`${sito}/invito/${code}`);
  await p.getByRole("button", { name: nome }).click();
  await p.locator("#password").fill(PWD);
  await p.getByRole("button", { name: "Entra" }).click();
  await p.waitForURL(`**/gruppo/${gid}**`, { timeout: 20000 });
  for (let i = 0; i < 4; i++) {
    await attendi(1200);
    const t = p.getByRole("dialog").getByRole("button").last();
    if (await t.isVisible().catch(() => false)) await t.click();
  }
  return p;
}
const bruno = await telefono("Bruno");
ok(await bruno.getByText("Quando facciamo lo scambio?").isVisible(), "pagina del gruppo: riquadro della disponibilità");
await foto(bruno, "bruno-gruppo", false);
await bruno.getByRole("link", { name: "Cambia i tuoi giorni" }).click();
await bruno.getByText("Quando ci sei?").waitFor({ timeout: 15000 });
await foto(bruno, "bruno-disponibilita");

const anna = await telefono("Anna");
await anna.goto(`${sito}/gruppo/${gid}/organizza`);
await anna.getByText("Risposte e data").first().waitFor({ timeout: 15000 });
await anna.getByText("Giorno dello scambio").first().scrollIntoViewIfNeeded();
await foto(anna, "anna-organizza", false);
await anna.goto(`${sito}/gruppo/${gid}/disponibilita`);
await anna.getByText("Fissa la data").waitFor({ timeout: 15000 });
await attendi(2500); // la diretta si collega
// Bruno tocca un altro giorno dal suo telefono: Anna lo vede senza ricaricare
await bruno.locator('li button[aria-pressed="false"]').first().click(); // un giorno (non il tasto dell'audio)
await bruno.getByText("Salvato ✓").waitFor({ timeout: 10000 });
const diretta = await anna.locator("li").filter({ hasText: "1 persona" }).first().waitFor({ timeout: 10000 }).then(() => true, () => false);
ok(diretta, "diretta: Anna vede la nuova risposta di Bruno senza ricaricare");
await foto(anna, "anna-disponibilita");
// Anna fissa la data (il giorno più probabile)
await anna.getByRole("button", { name: /^Fissa / }).click();
const avviso = anna.getByRole("button", { name: "Continua senza minigiochi" });
if (await avviso.isVisible({ timeout: 2000 }).catch(() => false)) await avviso.click();
await anna.getByText("La data è fissata!").waitFor({ timeout: 15000 });
await foto(anna, "anna-data-fissata");
const gruppo = (await A.from("groups").select("exchange_date, giorni_proposti, giochi_attivi").eq("id", gid).single()).data;
ok(gruppo.exchange_date === G[2] && gruppo.giorni_proposti === null, `data fissata al giorno più probabile (${gruppo.exchange_date}) e sondaggio chiuso`);
ok(gruppo.giochi_attivi === true, "con la data a 13 giorni partono anche i mini giochi");
ok((await B.rpc("imposta_disponibilita", { p_group_id: gid, p_giorni: [G[0]] })).error?.message.includes("chiuso"), "a sondaggio chiuso non si risponde più");
await bruno.goto(`${sito}/gruppo/${gid}`);
await attendi(2000);
ok(!(await bruno.getByText("Quando facciamo lo scambio?").isVisible()), "pagina del gruppo: il riquadro sparisce e c'è la data");
await foto(bruno, "bruno-gruppo-con-data", false);
// un sondaggio nuovo riparte da zero
await A.from("groups").update({ giorni_proposti: [G[0], G[1]], exchange_date: null }).eq("id", gid);
ok(((await A.from("disponibilita").select("member_id").eq("group_id", gid)).data ?? []).length === 0, "un sondaggio nuovo cancella le risposte del precedente");

ok(errori.length === 0, "nessun errore nelle pagine " + errori.join(" | "));
await browser.close();
console.log("GRUPPI", gid, g2?.[0]?.group_id);
console.log("UTENTI", u.map((x) => x.uid).join(" "));
process.exit();
