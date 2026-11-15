// "Viaggio nel tempo" dei Mini giochi: tre amici finti (Anna organizza, Bruno, Carla) nel gruppo "Test E2E Natale",
// fotografati in ogni momento del calendario con telefoni simulati. Il tempo si sposta cambiando la data dello scambio
// nel database (execute_sql come postgres, SQL in fondo a questo commento), così tutto il resto (database compreso) ci crede.
//
// 1) NODE_USE_ENV_PROXY=1 node test-e2e/giochi-tempo.mjs prepara <file.json>
// 2) per ogni momento: SQL (D = oggi a Roma) e poi
//    NODE_USE_ENV_PROXY=1 node test-e2e/giochi-tempo.mjs <momento> <file.json> <sito> <cartella foto>
//    momento   data dello scambio   cosa si vede
//    prima     D + 7                calendario ancora chiuso
//    apertura  D + 5                il calendario si apre (benvenuto), giochi da domani
//    gioco1    D + 4                si scarta il regalo, diretta (Bruno e Carla giocano), Anna gioca
//    dopo1     D + 3                gioco 1 chiuso: annuncio (Bruno ha vinto) e premio nel guardaroba; gioco 2 aperto
//    scambio   D                    giorno dello scambio: gioco 5 aperto, Anna gioca a Palle di neve
//
//    SQL per spostare la data (il trigger che blocca la data da T−5 va spento solo per questo aggiornamento):
//    begin;
//    alter table public.groups disable trigger groups_data_e_giochi;
//    update public.groups set exchange_date = (now() at time zone 'Europe/Rome')::date + <giorni>, giochi_attivi = true where id = '<gruppo>';
//    alter table public.groups enable trigger groups_data_e_giochi;
//    commit;
// Alla fine: cancellare il gruppo e i suoi 3 accessi (chiedere prima a Marzia).
import { createRequire } from "module";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const URL = "https://gesihnbtflnpjxwmpxkd.supabase.co";
const KEY = "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
const PWD = "provaprova123";
const NOMI = ["Anna", "Bruno", "Carla"];
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const nuovo = () => createClient(URL, KEY, { auth: { persistSession: false } });
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
const [, , fase, file, sito, cartella = "foto"] = process.argv;

if (fase === "prepara") {
  const u = [];
  for (let i = 0; i < 3; i++) {
    const c = nuovo();
    const email = `${crypto.randomUUID()}@users.secretsanta.local`;
    const { data, error } = await c.auth.signUp({ email, password: PWD });
    if (error) throw error;
    u.push({ c, uid: data.user.id, email });
  }
  const fra10 = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const { data: g, error: eg } = await u[0].c.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: fra10, p_theme: "", p_my_name: "Anna", p_my_avatar: null, p_other_names: ["Bruno", "Carla"] });
  if (eg) throw eg;
  const gid = g[0].group_id, code = g[0].invite_code;
  const { data: membri } = await u[0].c.from("group_members").select("id, display_name").eq("group_id", gid);
  const mid = Object.fromEntries(membri.map((m) => [m.display_name, m.id]));
  // il link d'invito vale solo dopo aver salvato il sondaggio: ne salvo uno minimo
  const risposte = { 2: "a", 1: "b", "-1": "c", "-2": "d" };
  const domande = ["impegno", "esigenza", "impegno", "esigenza"].map((parametro, i) => ({ parametro, testo: `Domanda ${i + 1}`, risposte }));
  const totem = ["IMPEGNO_ALTO_RICEVE_TUTTO", "IMPEGNO_ALTO_ESIGENTE", "IMPEGNO_BASSO_RICEVE_TUTTO", "IMPEGNO_BASSO_ESIGENTE", "BONUS"].map((profilo) => ({ profilo, nome: profilo, descrizione: "", immagine: "" }));
  const sq = await u[0].c.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem });
  if (sq.error) throw sq.error;
  for (const i of [1, 2]) {
    const e = (await u[i].c.rpc("claim_member", { p_invite_code: code, p_member_id: mid[NOMI[i]], p_avatar: null })).error;
    if (e) throw e;
  }
  writeFileSync(file, JSON.stringify({ gid, code, mid, utenti: u.map(({ uid, email }) => ({ uid, email })) }, null, 2));
  console.log("GRUPPO", gid);
  process.exit();
}

// ---------- foto di un momento ----------
const { gid, code, utenti } = JSON.parse(readFileSync(file, "utf8"));
mkdirSync(cartella, { recursive: true });
const { chromium, devices } = require("playwright");
const browser = await chromium.launch();
const errori = [];
let n = 0;
const foto = async (p, nome, intera = false) => {
  await attendi(700);
  await p.screenshot({ path: `${cartella}/${fase}-${String(++n).padStart(2, "0")}-${nome}.png`, fullPage: intera });
};

// un telefono simulato per persona (memoria separata = accesso separato), entrato dal link d'invito
async function telefono(nome) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errori.push(`${nome}: ${e.message}`));
  await p.goto(`${sito}/invito/${code}`);
  await p.getByRole("button", { name: nome }).click();
  await p.locator("#password").fill(PWD);
  await p.getByRole("button", { name: "Entra" }).click();
  await p.waitForURL(`**/gruppo/${gid}**`, { timeout: 20000 });
  await chiudiPopup(p);
  return p;
}
// pop-up di benvenuto/sblocchi/premi che non sono il soggetto della foto
async function chiudiPopup(p) {
  // (i pop-up compaiono quando arrivano i dati: si guarda per qualche secondo)
  for (let i = 0; i < 5; i++) {
    await attendi(1200);
    const tasto = p.getByRole("dialog").getByRole("button").last();
    if (await tasto.isVisible().catch(() => false)) await tasto.click();
  }
}
const accesso = async (i) => {
  const c = nuovo();
  await c.auth.signInWithPassword({ email: utenti[i].email, password: PWD });
  return c;
};
const giocaDaQui = async (c, gioco, punti, durata) => {
  const run = (await c.rpc("start_game_run", { p_group_id: gid, p_game: gioco })).data;
  await attendi(durata);
  return (await c.rpc("finish_game_run", { p_run_id: run.id, p_score: punti, p_stats: { prova: 1 } })).data;
};
// tocchi a caso sul canvas finché la partita non finisce (o per un po')
async function giocaNelBrowser(p, nomeFoto, tocchiPerSecondo = 4, maxSecondi = 70) {
  await p.getByRole("button", { name: "Gioca" }).click();
  await attendi(3600);
  const box = await p.locator("canvas").boundingBox();
  for (let s = 0; s < maxSecondi * tocchiPerSecondo; s++) {
    await p.mouse.click(box.x + box.width * (0.15 + Math.random() * 0.7), box.y + box.height * (0.2 + Math.random() * 0.55));
    await attendi(1000 / tocchiPerSecondo);
    if (s === tocchiPerSecondo * 12) await foto(p, `${nomeFoto}-partita`);
    if (await p.getByText("Fine!").isVisible()) break;
  }
  await p.getByRole("button", { name: /Torna alla classifica/ }).waitFor({ timeout: 30000 });
  await foto(p, `${nomeFoto}-fine`);
  await p.getByRole("button", { name: /Torna alla classifica/ }).click();
}

if (fase === "prima") {
  const anna = await telefono("Anna");
  await foto(anna, "gruppo", true);
  await anna.goto(`${sito}/gruppo/${gid}/giochi`);
  await anna.getByText("Non è ancora il momento").waitFor({ timeout: 15000 });
  await foto(anna, "calendario-chiuso");
}

if (fase === "apertura") {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 2 });
  const anna = await ctx.newPage();
  anna.on("pageerror", (e) => errori.push(`Anna: ${e.message}`));
  await anna.goto(`${sito}/invito/${code}`);
  await anna.getByRole("button", { name: "Anna" }).click();
  await anna.locator("#password").fill(PWD);
  await anna.getByRole("button", { name: "Entra" }).click();
  await anna.waitForURL(`**/gruppo/${gid}**`, { timeout: 20000 });
  await attendi(1500);
  await foto(anna, "gruppo-popup-sblocco"); // il pop-up "si sono sbloccati i mini giochi"
  await chiudiPopup(anna);
  await foto(anna, "gruppo", true);
  await anna.goto(`${sito}/gruppo/${gid}/giochi`);
  await anna.getByText("Si gioca!").waitFor({ timeout: 15000 });
  await foto(anna, "benvenuto");
  await anna.getByRole("button", { name: "Si gioca!" }).click();
  await foto(anna, "calendario", true);
}

if (fase === "gioco1") {
  const anna = await telefono("Anna");
  await anna.goto(`${sito}/gruppo/${gid}/giochi`);
  await chiudiPopup(anna);
  await foto(anna, "calendario-regalo-di-oggi", true);
  await anna.getByRole("button", { name: "Scarta il regalo di oggi" }).click();
  await attendi(1600);
  await foto(anna, "regalo-scartato", true);
  await anna.getByRole("link", { name: /Gioca: / }).click();
  await anna.getByRole("button", { name: "Gioca" }).waitFor({ timeout: 15000 });
  await attendi(2500); // la diretta si collega
  await foto(anna, "pagina-gioco", true);
  // Bruno e Carla giocano "da un altro telefono": Anna li vede in diretta
  const bruno = await accesso(1);
  const carla = await accesso(2);
  const run = (await bruno.rpc("start_game_run", { p_group_id: gid, p_game: 1 })).data;
  const vistoGiocare = await anna.getByText("sta giocando…").waitFor({ timeout: 8000 }).then(() => true, () => false);
  ok(vistoGiocare, "diretta: Anna vede Bruno che sta giocando");
  await foto(anna, "diretta-bruno-sta-giocando", true);
  await attendi(2000);
  await bruno.rpc("finish_game_run", { p_run_id: run.id, p_score: 420, p_stats: { prova: 1 } });
  await giocaDaQui(carla, 1, 310, 3000);
  const vistoPunti = await anna.locator("li", { hasText: "Bruno" }).getByText("420").waitFor({ timeout: 8000 }).then(() => true, () => false);
  ok(vistoPunti, "diretta: il punteggio di Bruno compare senza ricaricare");
  await foto(anna, "diretta-classifica", true);
  await giocaNelBrowser(anna, "anna-palline", 5, 50);
  await foto(anna, "classifica-dopo", true);
}

if (fase === "dopo1") {
  // Bruno: "Hai vinto tu!" e il premio nel guardaroba
  const bruno = await telefono("Bruno");
  await bruno.goto(`${sito}/gruppo/${gid}/giochi`);
  // il benvenuto del calendario (primo accesso di Bruno) e poi l'annuncio
  const benvenuto = bruno.getByRole("button", { name: "Si gioca!" });
  if (await benvenuto.waitFor({ timeout: 12000 }).then(() => true, () => false)) await benvenuto.click();
  const annuncio = await bruno.getByText("Hai vinto tu!").waitFor({ timeout: 10000 }).then(() => true, () => false);
  ok(annuncio, "Bruno vede l'annuncio: Hai vinto tu!");
  await attendi(1200);
  await foto(bruno, "bruno-annuncio");
  await bruno.getByRole("button", { name: "Vai al guardaroba" }).click();
  await bruno.waitForURL("**/guardaroba", { timeout: 15000 });
  await attendi(1500);
  await foto(bruno, "bruno-guardaroba", true);
  // Anna: "Ha vinto Bruno!", calendario col vincitore, gioco 2 aperto
  const anna = await telefono("Anna");
  await anna.goto(`${sito}/gruppo/${gid}/giochi`);
  const benvenutoAnna = anna.getByRole("button", { name: "Si gioca!" });
  if (await benvenutoAnna.waitFor({ timeout: 12000 }).then(() => true, () => false)) await benvenutoAnna.click();
  const annuncioAnna = await anna.getByText("Ha vinto Bruno!").waitFor({ timeout: 10000 }).then(() => true, () => false);
  ok(annuncioAnna, "Anna vede l'annuncio: Ha vinto Bruno!");
  await attendi(1200);
  await foto(anna, "anna-annuncio");
  await anna.getByRole("button", { name: "Complimenti!" }).click();
  await foto(anna, "anna-calendario", true);
  await anna.goto(`${sito}/gruppo/${gid}/giochi/1`);
  ok(await anna.getByText("Ha vinto").first().waitFor({ timeout: 15000 }).then(() => true, () => false), "pagina del gioco 1 chiuso: Ha vinto Bruno");
  await foto(anna, "anna-gioco1-chiuso", true);
  await anna.goto(`${sito}/gruppo/${gid}`);
  await chiudiPopup(anna);
  await foto(anna, "anna-gruppo", true);
}

if (fase === "scambio") {
  const anna = await telefono("Anna");
  await anna.goto(`${sito}/gruppo/${gid}/giochi`);
  await chiudiPopup(anna);
  await foto(anna, "calendario-giorno-scambio", true);
  await anna.getByRole("button", { name: "Scarta il regalo di oggi" }).click();
  await attendi(1600);
  await anna.getByRole("link", { name: /Gioca: / }).click();
  await anna.getByRole("button", { name: "Gioca" }).waitFor({ timeout: 15000 });
  await foto(anna, "pagina-gioco5", true);
  await giocaNelBrowser(anna, "anna-palle-di-neve", 4, 70);
  await foto(anna, "classifica-gioco5", true);
}

ok(errori.length === 0, "nessun errore nelle pagine " + errori.join(" | "));
await browser.close();
process.exit();
