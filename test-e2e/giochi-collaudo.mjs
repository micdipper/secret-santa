// Collaudo finale dei mini giochi (blocco 6) con UNA sola conferma del database:
// più gruppi di prova "Test E2E Natale", ognuno fermo in un momento diverso del calendario.
// 1) NODE_USE_ENV_PROXY=1 node test-e2e/giochi-collaudo.mjs prepara <file.json>
//    → crea i gruppi e stampa l'SQL da eseguire (execute_sql, come postgres) che sposta le date e mette le partite finite.
// 2) NODE_USE_ENV_PROXY=1 node test-e2e/giochi-collaudo.mjs foto <file.json> <sito> <cartella>
//    Gruppi:  g2 = gioco 2 aperto (3 tentativi e rifiuto) · g3 = gioco 3 aperto (data bloccata in Organizza)
//             g4 = gioco 4 aperto · premi = scambio ieri: 5 giochi chiusi, un vincitore diverso per gioco
//             (gioco 1 a pari merito: vince chi ha fatto 500 per primo)
// Alla fine: cancellare i gruppi "Test E2E Natale" e i loro accessi (chiedere prima a Marzia).
import { createRequire } from "module";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const URL = "https://gesihnbtflnpjxwmpxkd.supabase.co";
const KEY = "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
const PWD = "provaprova123";
const NOMI = ["Anna", "Bruno", "Carla", "Dario", "Elena"];
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const nuovo = () => createClient(URL, KEY, { auth: { persistSession: false } });
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
const [, , fase, file, sito, cartella = "foto-collaudo"] = process.argv;
const GIORNI = { g2: 3, g3: 2, g4: 1, premi: -1 }; // scambio tra N giorni (gioco k aperto quando N = 5 − k)

async function creaGruppo() {
  const u = [];
  for (let i = 0; i < NOMI.length; i++) {
    const c = nuovo();
    const email = `${crypto.randomUUID()}@users.secretsanta.local`;
    const { data, error } = await c.auth.signUp({ email, password: PWD });
    if (error) throw error;
    u.push({ c, uid: data.user.id, email });
  }
  const fra10 = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const { data: g, error } = await u[0].c.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: fra10, p_theme: "", p_my_name: "Anna", p_my_avatar: null, p_other_names: NOMI.slice(1) });
  if (error) throw error;
  const gid = g[0].group_id, code = g[0].invite_code;
  const risposte = { 2: "a", 1: "b", "-1": "c", "-2": "d" };
  const domande = ["impegno", "esigenza", "impegno", "esigenza"].map((parametro, i) => ({ parametro, testo: `Domanda ${i + 1}`, risposte }));
  const totem = ["IMPEGNO_ALTO_RICEVE_TUTTO", "IMPEGNO_ALTO_ESIGENTE", "IMPEGNO_BASSO_RICEVE_TUTTO", "IMPEGNO_BASSO_ESIGENTE", "BONUS"].map((profilo) => ({ profilo, nome: profilo, descrizione: "", immagine: "" }));
  if ((await u[0].c.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem })).error) throw new Error("sondaggio");
  const { data: membri } = await u[0].c.from("group_members").select("id, display_name").eq("group_id", gid);
  const mid = Object.fromEntries(membri.map((m) => [m.display_name, m.id]));
  for (let i = 1; i < NOMI.length; i++) {
    const e = (await u[i].c.rpc("claim_member", { p_invite_code: code, p_member_id: mid[NOMI[i]], p_avatar: null })).error;
    if (e) throw e;
  }
  return { gid, code, mid, utenti: u.map(({ uid, email }) => ({ uid, email })) };
}

if (fase === "prepara") {
  const gruppi = {};
  for (const k of Object.keys(GIORNI)) gruppi[k] = await creaGruppo();
  writeFileSync(file, JSON.stringify(gruppi, null, 2));
  const p = gruppi.premi;
  // partite finite del gruppo "premi": vincitori diversi; gioco 1 a pari merito (Anna prima di Bruno)
  const partite = [
    ["Anna", 1, 500, "3 days"], ["Bruno", 1, 500, "2 days 23 hours"], ["Carla", 1, 300, "3 days"],
    ["Bruno", 2, 400, "2 days"], ["Carla", 3, 300, "1 day 12 hours"], ["Dario", 4, 30520, "1 day"], ["Elena", 5, 900, "2 hours"],
  ];
  const sql = `begin;
alter table public.groups disable trigger groups_data_e_giochi;
${Object.entries(GIORNI).map(([k, n]) => `update public.groups set exchange_date = (now() at time zone 'Europe/Rome')::date + (${n}), giochi_attivi = true where id = '${gruppi[k].gid}' and name = 'Test E2E Natale';`).join("\n")}
alter table public.groups enable trigger groups_data_e_giochi;
insert into public.game_runs (group_id, member_id, game, tentativo, seme, started_at, finished_at, score) values
${partite.map(([n, k, s, fa]) => `('${p.gid}', '${p.mid[n]}', ${k}, 1, 1, now() - interval '${fa}' - interval '1 minute', now() - interval '${fa}', ${s})`).join(",\n")};
commit;
select name, exchange_date, giochi_attivi from public.groups where name = 'Test E2E Natale' order by exchange_date;`;
  console.log(sql);
  process.exit();
}

// ---------- foto ----------
const gruppi = JSON.parse(readFileSync(file, "utf8"));
mkdirSync(cartella, { recursive: true });
const { chromium, devices } = require("playwright");
const browser = await chromium.launch();
const errori = [];
let n = process.env.SOLO_PREMI ? 15 : 0;
const foto = async (p, nome, intera = true) => {
  await attendi(800);
  await p.screenshot({ path: `${cartella}/${String(++n).padStart(2, "0")}-${nome}.png`, fullPage: intera });
};
async function telefono(g, nome) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errori.push(`${nome}: ${e.message}`));
  await p.goto(`${sito}/invito/${g.code}`);
  await p.getByRole("button", { name: nome }).click();
  await p.locator("#password").fill(PWD);
  await p.getByRole("button", { name: "Entra" }).click();
  await p.waitForURL(`**/gruppo/${g.gid}**`, { timeout: 20000 });
  await chiudi(p);
  return p;
}
// pop-up di benvenuto / sblocchi (non sono il soggetto della foto)
async function chiudi(p, volte = 4) {
  for (let i = 0; i < volte; i++) {
    await attendi(1200);
    const t = p.getByRole("dialog").getByRole("button").last();
    if (await t.isVisible().catch(() => false)) await t.click();
  }
}
// una partita nella pagina vera: tocchi e trascinamenti a caso finché non finisce
async function partita(p, nome) {
  await p.getByRole("button", { name: /^(Gioca|Riprova)/ }).first().click();
  await attendi(3600);
  const box = await p.locator("canvas").boundingBox();
  for (let s = 0; s < 400; s++) {
    const x = box.x + box.width * (0.2 + Math.random() * 0.6), y = box.y + box.height * (0.3 + Math.random() * 0.5);
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x + (Math.random() - 0.5) * 120, y, { steps: 3 });
    await p.mouse.up();
    await attendi(150);
    if (s === 6) await foto(p, `${nome}-partita`, false);
    if (await p.getByText("Fine!").isVisible()) break;
  }
  await p.getByRole("button", { name: /Torna alla classifica/ }).waitFor({ timeout: 60000 });
  await foto(p, `${nome}-fine`, false);
  await p.getByRole("button", { name: /Torna alla classifica/ }).click();
  await attendi(1000);
}
async function apriGioco(p, g, k) {
  await p.goto(`${sito}/gruppo/${g.gid}/giochi`);
  await chiudi(p, 3);
  const scarta = p.getByRole("button", { name: "Scarta il regalo di oggi" });
  if (await scarta.isVisible().catch(() => false)) {
    await scarta.click();
    await attendi(1600);
  }
  await p.goto(`${sito}/gruppo/${g.gid}/giochi/${k}`);
  await p.getByText("Classifica").first().waitFor({ timeout: 15000 });
  await attendi(1500);
}

// Gioco 2: tre tentativi, poi niente più "Gioca"
if (!process.env.SOLO_PREMI) {
  const g = gruppi.g2;
  const anna = await telefono(g, "Anna");
  await foto(anna, "g2-pagina-gruppo");
  await apriGioco(anna, g, 2);
  for (let t = 1; t <= 3; t++) await partita(anna, `g2-campanelli-${t}`);
  ok(await anna.getByText("Hai usato i 3 tentativi").isVisible(), "gioco 2: dopo 3 partite niente più tentativi");
  await foto(anna, "g2-tentativi-finiti");
  const A = nuovo();
  await A.auth.signInWithPassword({ email: g.utenti[0].email, password: PWD });
  const quarto = await A.rpc("start_game_run", { p_group_id: g.gid, p_game: 2 });
  ok(!!quarto.error, "gioco 2: il database rifiuta il quarto tentativo");
}
// Gioco 3: partita vera e data bloccata in Organizza
if (!process.env.SOLO_PREMI) {
  const g = gruppi.g3;
  const anna = await telefono(g, "Anna");
  await apriGioco(anna, g, 3);
  await foto(anna, "g3-pagina-gioco");
  await partita(anna, "g3-regali");
  await anna.goto(`${sito}/gruppo/${g.gid}/organizza`);
  await anna.getByText("La data è bloccata").first().waitFor({ timeout: 15000 });
  await anna.getByText("Quando e quanto").scrollIntoViewIfNeeded();
  ok(await anna.locator("#data").isDisabled(), "Organizza: data bloccata durante i giochi");
  await foto(anna, "g3-organizza-data-bloccata", false);
}
// Gioco 4: partita vera
if (!process.env.SOLO_PREMI) {
  const g = gruppi.g4;
  const bruno = await telefono(g, "Bruno");
  await apriGioco(bruno, g, 4);
  await partita(bruno, "g4-slitta");
  await foto(bruno, "g4-classifica");
}
// Tutti i giochi chiusi: 5 vincitori diversi, ognuno vede il suo premio
{
  const g = gruppi.premi;
  const premi = [["Anna", 1, "Capelli neon"], ["Bruno", 2, "Taglio Esplosione"], ["Carla", 3, "Maglione GODO"], ["Dario", 4, "Cornici ricamate"], ["Elena", 5, "Cappello da cowboy"]];
  for (const [nome, k, premio] of premi) {
    const p = await telefono(g, nome);
    if (nome === "Anna") await foto(p, "premi-pagina-gruppo");
    await p.goto(`${sito}/gruppo/${g.gid}/giochi`);
    const benvenuto = p.getByRole("button", { name: "Si gioca!" });
    if (await benvenuto.waitFor({ timeout: 12000 }).then(() => true, () => false)) await benvenuto.click();
    // gli annunci arrivano uno dopo l'altro (5): quello mio dice "Hai vinto tu!", gli altri "Complimenti!"
    let mio = false;
    for (let i = 0; i < 40 && !mio; i++) {
      await attendi(500);
      if (await p.getByText("Hai vinto tu!").isVisible()) {
        await attendi(900);
        mio = await p.getByRole("dialog").getByText(premio).isVisible();
        await foto(p, `premi-${nome}-annuncio`, false);
        await p.getByRole("button", { name: "Chiudi" }).last().click();
      } else if (await p.getByRole("button", { name: "Complimenti!" }).last().isVisible()) await p.getByRole("button", { name: "Complimenti!" }).last().click().catch(() => {});
    }
    ok(mio, `${nome} vince il gioco ${k}: "Hai vinto tu!" con ${premio}`);
    if (nome === "Anna") await foto(p, "premi-calendario");
    await p.goto(`${sito}/gruppo/${g.gid}/guardaroba`);
    await p.getByText("Guardaroba").first().waitFor({ timeout: 15000 });
    await attendi(1500);
    await foto(p, `premi-${nome}-guardaroba`);
  }
  // pari merito nel gioco 1: vince chi ha fatto 500 per primo (Anna)
  const p = await telefono(g, "Carla");
  await p.goto(`${sito}/gruppo/${g.gid}/giochi/1`);
  ok(await p.getByText("Ha vinto").first().waitFor({ timeout: 15000 }).then(() => p.getByRole("heading", { name: "Anna", exact: true }).isVisible()), "pari merito a 500: vince Anna, che l'ha fatto per prima");
  await chiudi(p, 2);
  await foto(p, "premi-gioco1-pari-merito");
}

ok(errori.length === 0, "nessun errore nelle pagine " + errori.join(" | "));
await browser.close();
process.exit();
