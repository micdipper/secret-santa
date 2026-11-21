// Collaudo dei posti (fase 3 dei limiti, 21/11), DOPO aver applicato 20261122120000_posti_e_notte.sql.
// Per non creare 1000 persone finte, per qualche minuto si abbassano i tetti (UNA conferma prima, UNA dopo):
//   prima:  update private.impostazioni set valore = case chiave
//             when 'persone_per_gruppo' then 4
//             when 'posti_sito' then (select count(*) from public.group_members) + 6
//             when 'accessi_sito' then (select count(*) from auth.users) + 5 else valore end;
//   dopo:   rimettere 50 / 1000 / 1200 e ripulire i gruppi "Test E2E Natale" stampati alla fine.
// Uso: npx next start -p 3100 (in un altro terminale), poi NODE_USE_ENV_PROXY=1 node test-e2e/posti.mjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const { chromium, devices } = require("playwright");
const URL_DB = "https://gesihnbtflnpjxwmpxkd.supabase.co";
const KEY = "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
const SITO = process.env.SITO ?? "http://localhost:3100";
const PWD = "provaprova123";
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const nuovo = () => createClient(URL_DB, KEY, { auth: { persistSession: false } });
const accesso = async () => {
  const c = nuovo();
  const email = `${crypto.randomUUID()}@users.secretsanta.local`;
  const { data, error } = await c.auth.signUp({ email, password: PWD });
  return { c, uid: data?.user?.id, email, error };
};
const gruppi = [];
const crea = async (x, nome, altri) => {
  const r = await x.c.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: null, p_theme: "", p_my_name: nome, p_my_avatar: null, p_other_names: altri });
  if (r.data?.[0]) gruppi.push(r.data[0].group_id);
  return r;
};
const liberi = async () => (await nuovo().rpc("posti_sito")).data;

// tetto degli accessi: se ne possono creare ancora 5
const [A, C, D, E, F] = [await accesso(), await accesso(), await accesso(), await accesso(), await accesso()];
ok(![A, C, D, E, F].some((x) => x.error), "5 accessi nuovi creati (fino al tetto)");
const G = await accesso();
ok(!!G.error, `il 6° accesso è rifiutato (${G.error?.message ?? "nessun errore"})`);
ok((await liberi())?.accessi_pieni === true, "posti_sito dice che gli accessi sono pieni");
const rientro = nuovo();
ok(!(await rientro.auth.signInWithPassword({ email: A.email, password: PWD })).error, "chi ha già un accesso rientra con nome e password");

// massimo di persone in un gruppo (4 per la prova)
let r = await crea(A, "Anna Posti", ["Bruno Posti", "Carla Posti", "Dario Posti", "Elena Posti"]);
ok(r.error?.message.includes("Il gruppo è al completo"), "un gruppo da 5 (con massimo 4) non si crea");
r = await crea(A, "Anna Posti", ["Bruno Posti", "Carla Posti", "Dario Posti"]);
ok(!r.error, "un gruppo da 4 si crea (restano 2 posti sul sito)");
const gA = r.data[0];
r = await A.c.from("group_members").insert({ group_id: gA.group_id, display_name: "Quinta Persona" });
ok(r.error?.message.includes("Il gruppo è al completo"), "in Organizza la quinta persona è rifiutata (\"Il gruppo è al completo\")");
ok((await liberi())?.posti_liberi === 2, "posti_sito: 2 posti liberi");

// due gruppi da 2 creati nello stesso momento con 2 posti liberi: ne passa uno solo
const [rc, rd] = await Promise.all([crea(C, "Ciro Posti", ["Cira Posti"]), crea(D, "Dina Posti", ["Dino Posti"])]);
ok([rc, rd].filter((x) => !x.error).length === 1, "due gruppi creati insieme non superano i posti (ne passa uno)");
ok([rc, rd].some((x) => x.error?.message.includes("Il sito è al completo")), "l'altro riceve \"Il sito è al completo\"");
ok((await liberi())?.posti_liberi === 0, "posti_sito: 0 posti liberi");
const vincitore = !rc.error ? { x: C, g: rc.data[0] } : { x: D, g: rd.data[0] };
r = await vincitore.x.c.from("group_members").insert({ group_id: vincitore.g.group_id, display_name: "Ospite Posti" });
ok(r.error?.message.includes("Il sito è al completo"), "con il sito pieno non si aggiungono nomi in Organizza");

// tetto fluido: chi è già invitato entra anche col sito pieno; "Libera il nome" non consuma posti
const risposte = { 2: "a", 1: "b", "-1": "c", "-2": "d" };
const domande = ["impegno", "esigenza", "impegno", "esigenza"].map((parametro, i) => ({ parametro, testo: `Domanda ${i + 1}`, risposte }));
const totem = ["IMPEGNO_ALTO_RICEVE_TUTTO", "IMPEGNO_ALTO_ESIGENTE", "IMPEGNO_BASSO_RICEVE_TUTTO", "IMPEGNO_BASSO_ESIGENTE", "BONUS"].map((profilo) => ({ profilo, nome: profilo, descrizione: "", immagine: "" }));
await A.c.rpc("save_quiz", { p_group_id: gA.group_id, p_domande: domande, p_totem: totem });
const { data: membri } = await A.c.from("group_members").select("id, display_name").eq("group_id", gA.group_id);
const bruno = membri.find((m) => m.display_name === "Bruno Posti").id;
r = await E.c.rpc("claim_member", { p_invite_code: gA.invite_code, p_member_id: bruno, p_avatar: null });
ok(!r.error, "con il sito pieno chi è già invitato entra lo stesso (tetto fluido)");
r = await A.c.rpc("release_member", { p_member_id: bruno });
ok(!r.error && (await liberi())?.posti_liberi === 0, "\"Libera il nome\" non consuma un posto in più");

// nel browser: "Crea un gruppo" ferma la persona in più; l'invito col tetto degli accessi pieno avvisa
const browser = await chromium.launch();
const p = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
const errori = [];
p.on("pageerror", (e) => errori.push(e.message));
await p.goto(`${SITO}/nuovo`);
await p.waitForTimeout(1500);
await p.fill("#nuovo-nome", "Persona In Piu");
await p.getByRole("button", { name: "Aggiungi la persona" }).click();
ok(await p.getByText("Il sito è quasi al completo: non c'è posto per un'altra persona").isVisible(), "\"Crea un gruppo\": la persona in più è fermata col messaggio gentile");
ok(await p.getByText(/Sul sito restano 0 posti/).isVisible().catch(() => false), "\"Crea un gruppo\" mostra i posti rimasti quando sono pochi");
await p.goto(`${SITO}/invito/${gA.invite_code}`);
await p.getByRole("button", { name: "Bruno Posti", exact: true }).click();
await p.locator("#password").fill("unapassword1");
await p.getByRole("button", { name: "Entra" }).click();
ok(await p.getByText("Siamo al completo, riprova più tardi.").waitFor({ timeout: 10000 }).then(() => true, () => false), "invito con gli accessi pieni: \"Siamo al completo, riprova più tardi.\"");
ok(errori.length === 0, `nessun errore nelle pagine${errori.length ? ": " + errori.join(" | ") : ""}`);
await browser.close();

console.log(`\nGruppi di prova da ripulire (chiedere prima a Marzia): ${gruppi.join(", ")}`);
console.log(`Accessi di prova: ${[A, C, D, E, F].map((x) => x.uid).join(", ")}`);
