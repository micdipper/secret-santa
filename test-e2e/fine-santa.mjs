// Collaudo della fine del Secret Santa (fase 4, 21/11), DOPO aver applicato 20261122130000_fine_santa.sql.
// Parte 1 (date e cancellazione, senza aspettare i giorni): test-e2e/fine-santa.sql, con l'ora finta, tutto annullato.
// Parte 2 (browser): un gruppo "Test E2E Natale" con lo scambio 5 giorni fa → avviso "Mancano 7 giorni" (7 dal primo avviso).
//   1) NODE_USE_ENV_PROXY=1 node test-e2e/fine-santa.mjs prepara   → crea il gruppo, stampa l'SQL che sposta la data
//   2) npx next start -p 3100, poi NODE_USE_ENV_PROXY=1 node test-e2e/fine-santa.mjs prova
// Alla fine stampa gli id da ripulire (chiedere prima a Marzia).
import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const { chromium, devices } = require("playwright");
const URL_DB = "https://gesihnbtflnpjxwmpxkd.supabase.co";
const KEY = "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
const SITO = process.env.SITO ?? "http://localhost:3100";
const PWD = "provaprova123";
const FILE = new URL("./fine-santa.json", import.meta.url);
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };

if (process.argv[2] === "prepara") {
  const c = createClient(URL_DB, KEY, { auth: { persistSession: false } });
  const { data: u, error } = await c.auth.signUp({ email: `${crypto.randomUUID()}@users.secretsanta.local`, password: PWD });
  if (error) throw error;
  const { data: g, error: eg } = await c.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: null, p_theme: "", p_my_name: "Anna Fine", p_my_avatar: null, p_other_names: ["Bruno Fine", "Carla Fine"] });
  if (eg) throw eg;
  const risposte = { 2: "a", 1: "b", "-1": "c", "-2": "d" };
  const domande = ["impegno", "esigenza", "impegno", "esigenza"].map((parametro, i) => ({ parametro, testo: `Domanda ${i + 1}`, risposte }));
  const totem = ["IMPEGNO_ALTO_RICEVE_TUTTO", "IMPEGNO_ALTO_ESIGENTE", "IMPEGNO_BASSO_RICEVE_TUTTO", "IMPEGNO_BASSO_ESIGENTE", "BONUS"].map((profilo) => ({ profilo, nome: profilo, descrizione: "", immagine: "" }));
  await c.rpc("save_quiz", { p_group_id: g[0].group_id, p_domande: domande, p_totem: totem });
  writeFileSync(FILE, JSON.stringify({ gid: g[0].group_id, code: g[0].invite_code, uid: u.user.id }, null, 2));
  console.log(`SQL: update public.groups set exchange_date = (now() at time zone 'Europe/Rome')::date - 5 where id = '${g[0].group_id}' and name = 'Test E2E Natale';`);
  process.exit();
}

const { gid, code, uid } = JSON.parse(readFileSync(FILE, "utf8"));
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const p = await ctx.newPage();
const errori = [];
p.on("pageerror", (e) => errori.push(e.message));
await p.goto(`${SITO}/invito/${code}`);
await p.getByRole("button", { name: "Anna Fine", exact: true }).click();
await p.locator("#password").fill(PWD);
await p.getByRole("button", { name: "Entra" }).click();
await p.waitForURL(/\/gruppo\//, { timeout: 30000 });
await p.goto(`${SITO}/gruppo/${gid}`);
const avviso = p.getByRole("complementary", { name: "Fine del Secret Santa" });
ok(await avviso.waitFor({ timeout: 10000 }).then(() => true, () => false), "nella pagina del gruppo compare l'avviso di fine Secret Santa");
// lo scambio era 5 giorni fa (cancellazione tra 5 giorni), ma l'avviso compare oggi per la prima volta:
// per la regola "mai prima di 7 giorni dal primo avviso" i giorni sono 7
const fine = new Date(Date.now() + 7 * 864e5).toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "Europe/Rome" });
ok(((await avviso.textContent()) ?? "").includes(fine), `striscia: "Il gruppo sparisce / il ${fine}"`);
await avviso.getByRole("button", { name: /sparisce/ }).click();
const scheda = p.getByRole("dialog");
const testo = (await scheda.textContent()) ?? "";
ok(testo.includes("Mancano 7 giorni") && testo.includes(fine), `scheda: "Mancano 7 giorni" e la data giusta (${fine}), non 5`);
ok(testo.includes("Fai uno screenshot della tua bacheca e del tuo personaggio"), "ricorda di fare lo screenshot");
await scheda.getByRole("button", { name: "Ho capito" }).click();
await p.goto(`${SITO}/gruppo/${gid}/guardaroba`);
await p.waitForTimeout(2000);
ok(!(await avviso.isVisible()), "nel guardaroba no (solo nella pagina principale)");
await p.goto(`${SITO}/gruppo/${gid}`);
await avviso.waitFor({ timeout: 10000 });
await avviso.getByRole("button", { name: /Chiudi l'avviso/ }).click();
ok(!(await avviso.isVisible()), "il primo giorno la X chiude subito (fino a domani)");
await p.reload();
await p.waitForTimeout(2000);
ok(!(await avviso.isVisible()), "chiuso oggi, non ricompare oggi");
// "domani": la chiave del telefono è per giorno
await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("fine-santa-visto:")).forEach((k) => localStorage.setItem(k.replace(/:\d{4}-\d{2}-\d{2}$/, ":2000-01-01"), "true") || localStorage.removeItem(k)));
await p.reload();
ok(await avviso.waitFor({ timeout: 10000 }).then(() => true, () => false), "il giorno dopo ricompare (la chiusura vale solo per quel giorno)");
// 3 giorni dopo la prima volta: la X chiede, "Non mostrare più" la toglie per sempre
await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("fine-santa-dal:")).forEach((k) => localStorage.setItem(k, JSON.stringify("2000-01-01"))));
await p.reload();
await avviso.waitFor({ timeout: 10000 });
await avviso.getByRole("button", { name: /Chiudi l'avviso/ }).click();
ok(await p.getByRole("button", { name: "Non mostrare più" }).isVisible(), "dal 3° giorno la X offre \"Non mostrare più\"");
await p.getByRole("button", { name: "Non mostrare più" }).click();
await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("fine-santa-visto:")).forEach((k) => localStorage.removeItem(k)));
await p.reload();
await p.waitForTimeout(2000);
ok(!(await avviso.isVisible()), "dopo \"Non mostrare più\" non torna, neanche il giorno dopo");
await p.goto(`${SITO}/prove/fine-santa`);
ok((await p.getByText("stanotte", { exact: true }).count()) === 1 && (await p.getByText("domani", { exact: true }).count()) === 1, "sala prove: i casi 7, 2, 1 e oggi");
ok(errori.length === 0, `nessun errore nelle pagine${errori.length ? ": " + errori.join(" | ") : ""}`);
await browser.close();
console.log(`\nGruppo di prova da ripulire (chiedere prima a Marzia): ${gid}\nAccesso di prova: ${uid}`);
