// Collaudo del 17/11: Santa Chat dopo tutte le buste, una toppa per tipo, max 5 foto,
// gruppo modificabile dopo l'estrazione, e (nel browser) un accesso separato per ogni gruppo.
// Uso: npx next start -p 3100 (in un altro terminale), poi NODE_USE_ENV_PROXY=1 node test-e2e/gruppi-separati.mjs
// Crea gruppi "Test E2E Natale": alla fine stampa gli id da ripulire (chiedere prima a Marzia).
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const { chromium, devices } = require("playwright");
const URL = "https://gesihnbtflnpjxwmpxkd.supabase.co";
const KEY = "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
const SITO = process.env.SITO ?? "http://localhost:3100";
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const nuovo = () => createClient(URL, KEY, { auth: { persistSession: false } });
const accesso = async () => {
  const c = nuovo();
  const { data, error } = await c.auth.signUp({ email: `${crypto.randomUUID()}@users.secretsanta.local`, password: "provaprova123" });
  if (error) throw error;
  return { c, uid: data.user.id };
};
const gruppiCreati = [];

// ---------- 1) database ----------
const [A, B, C] = [await accesso(), await accesso(), await accesso()];
const { data: g, error: eg } = await A.c.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: null, p_theme: "", p_my_name: "Giulia Rossi", p_my_avatar: null, p_other_names: ["Marco", "Alessandra"] });
if (eg) throw eg;
const gid = g[0].group_id, code = g[0].invite_code;
gruppiCreati.push(gid);
const { data: membri } = await A.c.from("group_members").select("id, display_name").eq("group_id", gid);
const mid = Object.fromEntries(membri.map((m) => [m.display_name, m.id]));
A.mid = mid["Giulia Rossi"]; B.mid = mid["Marco"]; C.mid = mid["Alessandra"];
for (const [x, n] of [[B, "Marco"], [C, "Alessandra"]]) {
  const e = (await x.c.rpc("claim_member", { p_invite_code: code, p_member_id: mid[n], p_avatar: null })).error;
  if (e) throw e;
}

// bacheca: una toppa per tipo
let r = await B.c.from("moodboard_items").insert({ member_id: B.mid, kind: "toppa", content: { toppa: "stella", tipo: "simbolo" }, width: 26, height: 26 });
ok(!r.error, "prima toppa attaccata");
r = await B.c.from("moodboard_items").insert({ member_id: B.mid, kind: "toppa", content: { toppa: "stella", tipo: "simbolo" }, width: 26, height: 26 });
ok(!!r.error, "la stessa toppa una seconda volta è rifiutata");
// max 5 foto/immagini
for (let i = 0; i < 5; i++) {
  r = await B.c.from("moodboard_items").insert({ member_id: B.mid, kind: "immagine_link", content: { url: `https://example.com/${i}.jpg`, rapporto: 1 }, width: 36, height: 36 });
  if (r.error) break;
}
ok(!r.error, "5 immagini attaccate");
r = await B.c.from("moodboard_items").insert({ member_id: B.mid, kind: "immagine_link", content: { url: "https://example.com/6.jpg", rapporto: 1 }, width: 36, height: 36 });
ok(r.error?.message.includes("5 foto"), "la sesta immagine è rifiutata");

// estrazione, poi chat bloccata finché non aprono tutti
r = await A.c.rpc("run_draw", { p_group_id: gid });
ok(!r.error, "estrazione fatta");
r = await A.c.from("groups").update({ budget_eur: 35, theme: "Fatto a mano" }).eq("id", gid).select("budget_eur, theme").single();
ok(r.data?.budget_eur === 35 && r.data?.theme === "Fatto a mano", "dopo l'estrazione l'organizzatore cambia budget e tema");
r = await B.c.from("groups").update({ budget_eur: 1 }).eq("id", gid).select("id");
ok(!r.error && r.data.length === 0, "chi non organizza non cambia il gruppo");

await A.c.from("group_members").update({ envelope_opened_at: new Date().toISOString() }).eq("id", A.mid);
await B.c.from("group_members").update({ envelope_opened_at: new Date().toISOString() }).eq("id", B.mid);
r = await A.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: true, p_testo: "ciao!" });
ok(r.error?.message.includes("tutti avranno aperto"), "chat chiusa finché qualcuno non ha aperto la busta (da Babbo)");
r = await C.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: false, p_testo: "ciao!" });
ok(!!r.error, "chat chiusa anche per chi riceve");
await C.c.from("group_members").update({ envelope_opened_at: new Date().toISOString() }).eq("id", C.mid);
r = await A.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: true, p_testo: "ciao!" });
ok(!r.error, "quando tutti hanno aperto la busta la chat si apre");

// ---------- 2) browser: un accesso per ogni gruppo ----------
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices[process.env.TELEFONO ?? "iPhone 13"] });
const page = await ctx.newPage();

async function creaGruppo(nomeGruppo, password, data) {
  await page.goto(`${SITO}/nuovo`);
  await page.fill("#nome", nomeGruppo);
  if (data) await page.fill("#data", data);
  await page.fill("#mio-nome", "Organizzatrice Prova");
  for (const n of ["Amico Uno", "Amico Due"]) {
    await page.fill("#nuovo-nome", n);
    await page.getByRole("button", { name: "Aggiungi la persona" }).click();
  }
  ok(await page.locator("#password").isVisible(), `${nomeGruppo}: la password si chiede sempre`);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Crea il gruppo" }).click();
}

await creaGruppo("Test E2E Natale", "primapassword1");
await page.waitForURL(/\/gruppo\/[^/]+\/sondaggio/, { timeout: 30000 });
const gA = page.url().match(/gruppo\/([^/]+)/)[1];
gruppiCreati.push(gA);
await page.getByRole("button", { name: "Salva il sondaggio" }).click(); // senza sondaggio salvato l'invito non vale
await page.waitForURL(/organizza/, { timeout: 30000 });
const invitoA = await page.evaluate(() => JSON.parse(localStorage.getItem("portachiavi") ?? "[]")[0]?.invito);
const uA = await page.evaluate(() => JSON.parse(localStorage.getItem("portachiavi") ?? "[]"));
ok(uA.length === 1 && uA[0].groupId === gA, "il primo gruppo è nel portachiavi");

// secondo gruppo, data troppo vicina: prima il pop-up
const vicina = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
await creaGruppo("Test E2E Natale", "secondapassword2", vicina);
await page.getByText("Questa data è troppo vicina").waitFor({ timeout: 5000 });
ok(await page.getByText("chettefrega").isVisible(), "pop-up della data vicina con il consiglio");
await page.getByRole("button", { name: "Continua senza minigiochi" }).click();
await page.waitForURL(/\/gruppo\/[^/]+\/sondaggio/, { timeout: 30000 });
const gB = page.url().match(/gruppo\/([^/]+)/)[1];
gruppiCreati.push(gB);
ok(gB !== gA, "secondo gruppo creato");
const chiavi = await page.evaluate(() => JSON.parse(localStorage.getItem("portachiavi") ?? "[]"));
ok(chiavi.length === 2 && chiavi[0].userId !== chiavi[1].userId, "due gruppi, due accessi diversi");

// torno al primo dalla home: il sito passa da solo all'accesso giusto
await page.goto(SITO);
await page.getByRole("link", { name: /Test E2E Natale/ }).nth(1).click();
await page.waitForURL(new RegExp(`/gruppo/${gA}$`));
await page.getByText("Organizza il gruppo").waitFor({ timeout: 15000 });
ok(true, "dalla home si rientra nel primo gruppo senza password");
await page.goto(`${SITO}/gruppo/${gB}`);
await page.getByText("Organizza il gruppo").waitFor({ timeout: 15000 });
ok(true, "e si torna nel secondo");
ok(await page.getByRole("link", { name: /Guardaroba/ }).isVisible(), "guardaroba in evidenza nella pagina del gruppo");
ok(await page.getByRole("link", { name: "Santa Chat (ancora bloccata)" }).isVisible(), "Santa Chat presente ma bloccata");
await page.screenshot({ path: process.env.FOTO ?? "/tmp/gruppo.png", fullPage: true });

// un invitato già entrato nel gruppo B apre l'invito del gruppo del test 1: deve scegliere una password nuova
// (l'organizzatore di B apre l'invito di A: con l'accesso del portachiavi entrerebbe come organizzatore di A,
//  quindi per la prova tolgo A dal portachiavi, come su un telefono che non è mai entrato in A)
await page.evaluate((g) => localStorage.setItem("portachiavi", JSON.stringify(JSON.parse(localStorage.getItem("portachiavi")).filter((c) => c.groupId !== g))), gA);
await page.goto(`${SITO}/invito/${invitoA}`);
await page.getByRole("button", { name: "Amico Uno" }).click();
ok(await page.locator("#password").isVisible(), "invito di un altro gruppo: si sceglie una password");

await browser.close();
console.log("Gruppi di test da ripulire:", gruppiCreati.join(", "));
