// Collaudo della pagina vera di un gioco (blocco 2 di PIANO-GIOCHI.md): due utenti finti nel gruppo "Test E2E Natale".
// 1) NODE_USE_ENV_PROXY=1 node test-e2e/giochi-diretta.mjs prepara <file.json>
//    → crea Anna e Bruno e il gruppo con la data tra 10 giorni (giochi attivi).
// 2) con execute_sql (come postgres) spostare la data in modo che il gioco 3 sia aperto oggi:
//    update groups set exchange_date = (now() at time zone 'Europe/Rome')::date + 2 where id = '<gruppo>';
//    update groups set giochi_attivi = true where id = '<gruppo>';
// 3) NODE_USE_ENV_PROXY=1 node test-e2e/giochi-diretta.mjs prova <file.json> <url del sito>
//    → Anna guarda la classifica dal telefono simulato mentre Bruno gioca da qui; poi Anna gioca davvero.
// Alla fine stampa gli id da ripulire (chiedere prima a Marzia).
import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const URL = "https://gesihnbtflnpjxwmpxkd.supabase.co";
const KEY = "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
const PWD = "provaprova123";
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const nuovo = () => createClient(URL, KEY, { auth: { persistSession: false } });
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
const [, , fase, file, sito] = process.argv;

if (fase === "prepara") {
  const u = [];
  for (let i = 0; i < 2; i++) {
    const c = nuovo();
    const email = `${crypto.randomUUID()}@users.secretsanta.local`;
    const { data, error } = await c.auth.signUp({ email, password: PWD });
    if (error) throw error;
    u.push({ c, uid: data.user.id, email });
  }
  const [A, B] = u;
  const fra10 = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const { data: g, error: eg } = await A.c.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: fra10, p_theme: "", p_my_name: "Anna", p_my_avatar: null, p_other_names: ["Bruno"] });
  if (eg) throw eg;
  const gid = g[0].group_id, code = g[0].invite_code;
  const { data: membri } = await A.c.from("group_members").select("id, display_name").eq("group_id", gid);
  const mid = Object.fromEntries(membri.map((m) => [m.display_name, m.id]));
  // il link d'invito vale solo dopo aver salvato il sondaggio: ne salvo uno minimo
  const risposte = { 2: "a", 1: "b", "-1": "c", "-2": "d" };
  const domande = ["impegno", "esigenza", "impegno", "esigenza"].map((parametro, i) => ({ parametro, testo: `Domanda ${i + 1}`, risposte }));
  const totem = ["IMPEGNO_ALTO_RICEVE_TUTTO", "IMPEGNO_ALTO_ESIGENTE", "IMPEGNO_BASSO_RICEVE_TUTTO", "IMPEGNO_BASSO_ESIGENTE", "BONUS"].map((profilo) => ({ profilo, nome: profilo, descrizione: "", immagine: "" }));
  const sq = await A.c.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem });
  if (sq.error) throw sq.error;
  const { data: gg } = await A.c.from("groups").select("giochi_attivi").eq("id", gid).single();
  ok(gg.giochi_attivi === true, "data tra 10 giorni → giochi attivi");
  writeFileSync(file, JSON.stringify({ gid, code, mid, utenti: u.map(({ uid, email }) => ({ uid, email })) }, null, 2));
  console.log("GRUPPO", gid);
  process.exit();
}

if (fase === "prova") {
  const { gid, code, mid, utenti } = JSON.parse(readFileSync(file, "utf8"));
  const B = nuovo();
  if (process.argv[5] === "sondaggio") {
    // (gruppi preparati prima che lo script salvasse il sondaggio)
    const A = nuovo();
    await A.auth.signInWithPassword({ email: utenti[0].email, password: PWD });
    const risposte = { 2: "a", 1: "b", "-1": "c", "-2": "d" };
    const domande = ["impegno", "esigenza", "impegno", "esigenza"].map((parametro, i) => ({ parametro, testo: `Domanda ${i + 1}`, risposte }));
    const totem = ["IMPEGNO_ALTO_RICEVE_TUTTO", "IMPEGNO_ALTO_ESIGENTE", "IMPEGNO_BASSO_RICEVE_TUTTO", "IMPEGNO_BASSO_ESIGENTE", "BONUS"].map((profilo) => ({ profilo, nome: profilo, descrizione: "", immagine: "" }));
    const sq = await A.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem });
    if (sq.error) throw sq.error;
  }
  await B.auth.signInWithPassword({ email: utenti[1].email, password: PWD });
  if (!(await B.from("group_members").select("id").eq("id", mid.Bruno).not("user_id", "is", null)).data?.length) {
    const e = (await B.rpc("claim_member", { p_invite_code: code, p_member_id: mid.Bruno, p_avatar: null })).error;
    if (e) throw e;
  }
  const giochi = (await B.rpc("get_giochi", { p_group_id: gid })).data;
  ok(giochi?.giochi?.[2]?.stato === "aperto", "il gioco 3 è aperto oggi");

  const { chromium, devices } = require("playwright");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errori = [];
  p.on("pageerror", (e) => errori.push(e.message));
  // Anna entra dal link d'invito: tocca il suo nome e scrive la password
  await p.goto(`${sito}/invito/${code}`);
  await p.getByRole("button", { name: "Anna" }).click();
  await p.locator("#password").fill(PWD);
  await p.getByRole("button", { name: "Entra" }).click();
  await p.waitForURL(`**/gruppo/${gid}**`, { timeout: 20000 });
  await p.goto(`${sito}/gruppo/${gid}`);
  await p.getByText("Impila i regali").first().waitFor({ timeout: 15000 });
  ok(true, "pagina del gruppo: riquadro del gioco di oggi");
  await p.screenshot({ path: `${file}-gruppo.png`, fullPage: true });
  await p.goto(`${sito}/gruppo/${gid}/giochi`);
  await p.getByText("Oggi!").waitFor({ timeout: 15000 });
  await p.screenshot({ path: `${file}-calendario.png`, fullPage: true });
  await p.goto(`${sito}/gruppo/${gid}/giochi/3`);
  await p.getByRole("button", { name: "Gioca" }).waitFor({ timeout: 15000 });
  await attendi(2500); // il canale della diretta si collega

  // Bruno gioca da qui: Anna lo vede "sta giocando…" e poi il punteggio, senza ricaricare
  const run = (await B.rpc("start_game_run", { p_group_id: gid, p_game: 3 })).data;
  ok(!!run?.seme, "Bruno inizia una partita");
  const vistoGiocare = await p.getByText("sta giocando…").waitFor({ timeout: 6000 }).then(() => true, () => false);
  ok(vistoGiocare, "diretta: Anna vede Bruno che sta giocando");
  await attendi(2500);
  const fine = (await B.rpc("finish_game_run", { p_run_id: run.id, p_score: 70, p_stats: { prova: 1 } })).data;
  ok(fine?.valida && fine.score === 70 && fine.posizione === 1, "Bruno finisce con 70 punti, primo");
  const vistoPunteggio = await p.locator("li", { hasText: "Bruno" }).getByText("70").waitFor({ timeout: 6000 }).then(() => true, () => false);
  ok(vistoPunteggio, "diretta: il punteggio di Bruno compare da solo");
  await p.screenshot({ path: `${file}-diretta.png`, fullPage: true });

  // Anna gioca davvero (tocca le stelline cercandole nel canvas)
  await p.getByRole("button", { name: "Gioca" }).click();
  await attendi(3500);
  for (let i = 0; i < 90; i++) {
    const pt = await p.evaluate(() => {
      const cv = document.querySelector("canvas");
      if (!cv) return null;
      const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      for (let k = 0; k < d.length; k += 28) if (d[k] > 220 && d[k + 1] > 150 && d[k + 1] < 185 && d[k + 2] < 60) {
        const r = cv.getBoundingClientRect(), px = (k / 4) % cv.width, py = Math.floor(k / 4 / cv.width);
        return { x: r.left + (px * r.width) / cv.width, y: r.top + (py * r.height) / cv.height + 6 };
      }
      return null;
    });
    if (pt) await p.mouse.click(pt.x, pt.y);
    await attendi(200);
    if (await p.getByText("Fine!").isVisible()) break;
  }
  await p.getByRole("button", { name: /Torna alla classifica/ }).waitFor({ timeout: 20000 });
  await p.screenshot({ path: `${file}-fine.png` });
  const mie = (await B.from("game_runs").select("score, tentativo").eq("member_id", mid.Anna).eq("game", 3)).data ?? [];
  ok(mie.length === 1 && mie[0].score > 0, `partita di Anna salvata nel database (${mie[0]?.score} punti, visibile anche a Bruno)`);
  ok(await p.getByRole("button", { name: /Riprova \(2 rimasti\)/ }).last().isVisible(), "fine partita: Riprova (2 rimasti)");
  await p.getByRole("button", { name: /Torna alla classifica/ }).click();
  await attendi(1000);
  ok((await p.getByRole("button", { name: /Riprova \(2 rimasti\)/ }).count()) === 1, "pagina: Riprova (2 rimasti)");
  await p.screenshot({ path: `${file}-dopo.png`, fullPage: true });
  ok(errori.length === 0, "nessun errore nella pagina " + errori.join(" | "));
  await browser.close();
  console.log("UTENTI", JSON.stringify(utenti.map((u) => u.uid)));
  console.log("GRUPPO", gid);
  process.exit();
}
