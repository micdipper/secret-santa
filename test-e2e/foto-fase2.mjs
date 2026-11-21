// Collaudo della fase 2 dei limiti delle foto (21/11), DOPO aver applicato 20261122110000_foto_storage.sql.
// Due passi, con una sola conferma del database in mezzo:
//   1) NODE_USE_ENV_PROXY=1 node test-e2e/foto-fase2.mjs prepara
//      → gruppo "Test E2E Natale" (Anna organizza, Bruno e Carla), controlli su bucket, tetti e foto dei totem;
//        stampa l'SQL che aggiunge a Bruno 2 foto "vecchie" (ne avrà 4, come chi le aveva prima del limite)
//   2) npx next start -p 3100 (in un altro terminale), poi NODE_USE_ENV_PROXY=1 node test-e2e/foto-fase2.mjs prova
//      → nel browser: popup per Bruno in ogni pagina del gruppo, non per Anna né per Carla; indirizzi firmati
//        riusati dopo il ricaricamento; due eliminazioni (una col file nello Storage) e il popup sparisce.
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
const FILE = new URL("./foto-fase2.json", import.meta.url);
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const nuovo = () => createClient(URL_DB, KEY, { auth: { persistSession: false } });
// JPEG minuscolo valido (2×2)
const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAACAAIBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==", "base64");

if (process.argv[2] === "prepara") {
  const accesso = async () => {
    const c = nuovo();
    const email = `${crypto.randomUUID()}@users.secretsanta.local`;
    const { data, error } = await c.auth.signUp({ email, password: PWD });
    if (error) throw error;
    return { c, uid: data.user.id, email };
  };
  const [A, B, C] = [await accesso(), await accesso(), await accesso()];
  const { data: g, error: eg } = await A.c.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: null, p_theme: "", p_my_name: "Anna Prova", p_my_avatar: null, p_other_names: ["Bruno Prova", "Carla Prova"] });
  if (eg) throw eg;
  const gid = g[0].group_id, code = g[0].invite_code;
  const { data: membri } = await A.c.from("group_members").select("id, display_name").eq("group_id", gid);
  const mid = Object.fromEntries(membri.map((m) => [m.display_name.split(" ")[0], m.id]));
  const risposte = { 2: "a", 1: "b", "-1": "c", "-2": "d" };
  const domande = ["impegno", "esigenza", "impegno", "esigenza"].map((parametro, i) => ({ parametro, testo: `Domanda ${i + 1}`, risposte }));
  const PROFILI = ["IMPEGNO_ALTO_RICEVE_TUTTO", "IMPEGNO_ALTO_ESIGENTE", "IMPEGNO_BASSO_RICEVE_TUTTO", "IMPEGNO_BASSO_ESIGENTE", "BONUS"];
  const totem = (immagini) => PROFILI.map((profilo, i) => ({ profilo, nome: profilo, descrizione: "", immagine: immagini[i] ?? "" }));
  let r = await A.c.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem([]) });
  if (r.error) throw r.error;
  for (const [x, n] of [[B, "Bruno"], [C, "Carla"]]) {
    r = await x.c.rpc("claim_member", { p_invite_code: code, p_member_id: mid[n], p_avatar: null });
    if (r.error) throw r.error;
  }
  const carica = (x, membro, corpo = JPEG, tipo = "image/jpeg") =>
    x.c.storage.from("moodboard").upload(`${gid}/${membro}/${crypto.randomUUID()}.jpg`, corpo, { contentType: tipo, cacheControl: "31536000" });

  // bucket: solo JPEG, massimo 70 KB
  r = await carica(B, mid.Bruno, Buffer.from("iVBORw0KGgo=", "base64"), "image/png");
  ok(!!r.error, "un file non JPEG è rifiutato");
  r = await carica(B, mid.Bruno, Buffer.concat([JPEG, Buffer.alloc(80 * 1024)]));
  ok(!!r.error, "un file da 80 KB è rifiutato");

  // totem: 5 foto nello Storage, nella cartella dell'organizzatrice
  const percorsi = [];
  for (let i = 0; i < 5; i++) {
    r = await carica(A, mid.Anna);
    percorsi.push(r.data?.path);
  }
  r = await A.c.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem(percorsi) });
  ok(!r.error, "l'organizzatrice salva 5 foto dei totem nello Storage");
  const { data: t } = await C.c.from("quiz_totems").select("immagine").eq("group_id", gid);
  ok(t?.filter((x) => percorsi.includes(x.immagine)).length === 5, "il gruppo legge i 5 percorsi delle foto dei totem");
  const fotoDiBruno = (await carica(B, mid.Bruno)).data?.path;
  r = await A.c.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem([fotoDiBruno, ...percorsi.slice(1)]) });
  ok(r.error?.message.includes("non valida"), "una foto del totem fuori dalla cartella dell'organizzatrice è rifiutata");
  r = await A.c.rpc("save_quiz", { p_group_id: gid, p_domande: domande, p_totem: totem([`${gid}/${mid.Anna}/${crypto.randomUUID()}.jpg`]) });
  ok(r.error?.message.includes("non valida"), "una foto del totem che non esiste è rifiutata");

  // tetti di file: Carla 40, Anna (organizzatrice, ha già 5 foto dei totem) 60
  let n = 0;
  for (let i = 0; i < 41; i++) if (!(await carica(C, mid.Carla)).error) n++;
  ok(n === 40, `una persona carica al massimo 40 file (caricati: ${n})`);
  n = 5;
  for (let i = 0; i < 56; i++) if (!(await carica(A, mid.Anna)).error) n++;
  ok(n === 60, `l'organizzatrice arriva a 60 file (ne ha: ${n})`);
  const { data: lista } = await C.c.storage.from("moodboard").list(`${gid}/${mid.Carla}`, { limit: 100 });
  await C.c.storage.from("moodboard").remove(lista.map((f) => `${gid}/${mid.Carla}/${f.name}`));
  ok(!(await carica(C, mid.Carla)).error, "tolti i file, Carla può caricare di nuovo");

  // bacheca di Bruno: una foto vera (Storage) e un'immagine da link; il limite di 2 è pieno
  r = await B.c.from("moodboard_items").insert([
    { member_id: mid.Bruno, kind: "foto", content: { path: fotoDiBruno, rapporto: 1 }, width: 36, height: 36, z: 1 },
    { member_id: mid.Bruno, kind: "immagine_link", content: { url: "data:image/gif;base64,R0lGODlhAQABAIAAAP8AAP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", rapporto: 1 }, width: 36, height: 36, z: 2 },
  ]);
  ok(!r.error, "Bruno attacca 2 foto");
  r = await C.c.from("moodboard_items").insert({ member_id: mid.Carla, kind: "immagine_link", content: { url: "https://example.com/1.jpg", rapporto: 1 }, width: 36, height: 36 });
  ok(!r.error, "Carla attacca 1 immagine");

  writeFileSync(FILE, JSON.stringify({ gid, code, mid, fotoDiBruno, utenti: [A.uid, B.uid, C.uid] }, null, 2));
  console.log(`\nSQL da eseguire (una conferma): Bruno riceve 2 foto "vecchie", come chi le aveva prima del limite\n
begin;
alter table public.moodboard_items disable trigger bacheca_max_foto;
insert into public.moodboard_items (member_id, kind, content, width, height, z) values
  ('${mid.Bruno}', 'immagine_link', '{"url":"https://example.com/vecchia1.jpg","rapporto":1}', 36, 36, 3),
  ('${mid.Bruno}', 'immagine_link', '{"url":"https://example.com/vecchia2.jpg","rapporto":1}', 36, 36, 4);
alter table public.moodboard_items enable trigger bacheca_max_foto;
commit;`);
  process.exit();
}

// ---------- prova nel browser ----------
const { gid, code, mid, fotoDiBruno, utenti } = JSON.parse(readFileSync(FILE, "utf8"));
const browser = await chromium.launch();
const errori = [];
async function telefono(nome) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errori.push(`${nome}: ${e.message}`));
  await p.goto(`${SITO}/invito/${code}`);
  await p.getByRole("button", { name: `${nome} Prova`, exact: true }).click();
  await p.locator("#password").fill(PWD);
  await p.getByRole("button", { name: "Entra" }).click();
  await p.waitForURL(/\/gruppo\//, { timeout: 30000 });
  return p;
}
const popup = (p) => p.getByRole("alertdialog", { name: "Troppe foto in bacheca" });

const bruno = await telefono("Bruno");
await bruno.goto(`${SITO}/gruppo/${gid}`);
await popup(bruno).waitFor({ timeout: 15000 });
ok(await popup(bruno).getByText("Hai 4 foto: ne devi eliminare 2").isVisible(), "Bruno con 4 foto vede il popup col contatore giusto");
for (const pagina of ["novita", `bacheca/${mid.Bruno}`, "guardaroba"]) {
  await bruno.goto(`${SITO}/gruppo/${gid}/${pagina}`);
  ok(await popup(bruno).waitFor({ timeout: 15000 }).then(() => true, () => false), `il popup c'è anche in /${pagina.split("/")[0]}`);
}
await bruno.goBack();
ok(await popup(bruno).waitFor({ timeout: 15000 }).then(() => true, () => false), "tornando indietro col browser il popup resta");
ok((await popup(bruno).getByRole("button", { name: /chiudi/i }).count()) === 0, "il popup non ha un tasto per chiuderlo");

// indirizzo firmato riusato dopo il ricaricamento, file con cache di un anno
await bruno.waitForFunction((p) => !!JSON.parse(localStorage.getItem("foto-firmate") ?? "{}")[p], fotoDiBruno, { timeout: 15000 });
const primo = await bruno.evaluate((p) => JSON.parse(localStorage.getItem("foto-firmate"))[p].url, fotoDiBruno);
await bruno.reload();
await popup(bruno).waitFor({ timeout: 15000 });
const risposta = bruno.waitForResponse((r) => r.url().includes("/object/sign/moodboard/"), { timeout: 15000 }).catch(() => null);
const secondo = await bruno.evaluate((p) => JSON.parse(localStorage.getItem("foto-firmate"))[p].url, fotoDiBruno);
ok(primo === secondo, "dopo il ricaricamento l'indirizzo della foto è lo stesso (il browser non la riscarica)");
const r1 = await risposta;
const cache = r1 ? (await r1.allHeaders())["cache-control"] ?? "" : "";
ok(!r1 || cache.includes("31536000"), `il file della foto ha la cache lunga (${cache || "già in cache, nessuna richiesta"})`);

// le altre persone: niente popup
const anna = await telefono("Anna");
await anna.goto(`${SITO}/gruppo/${gid}/bacheca/${mid.Bruno}`);
await anna.waitForTimeout(2500);
ok(!(await popup(anna).isVisible()), "Anna che guarda la bacheca di Bruno non vede il popup");
const carla = await telefono("Carla");
await carla.goto(`${SITO}/gruppo/${gid}`);
await carla.waitForTimeout(2500);
ok(!(await popup(carla).isVisible()), "Carla (1 foto) non vede il popup");

// due eliminazioni: prima la foto vera (col file), poi una vecchia
await bruno.goto(`${SITO}/gruppo/${gid}`);
await popup(bruno).waitFor({ timeout: 15000 });
const voceFoto = popup(bruno).locator("li").filter({ has: bruno.locator('img[src*="/object/sign/moodboard/"]') });
await voceFoto.getByRole("button", { name: "Elimina questa foto" }).click();
ok(await popup(bruno).getByText("Questa foto verrà eliminata per sempre.").isVisible(), "prima di eliminare chiede conferma");
await popup(bruno).getByRole("button", { name: "Tienila" }).click();
ok(await popup(bruno).getByText("Hai 4 foto: ne devi eliminare 2").isVisible(), "\"Tienila\" non elimina niente");
await voceFoto.getByRole("button", { name: "Elimina questa foto" }).click();
await popup(bruno).getByRole("button", { name: "Elimina", exact: true }).click();
await popup(bruno).getByText("Hai 3 foto: ne devi eliminare 1").waitFor({ timeout: 10000 });
ok(true, "dopo la prima eliminazione: \"Hai 3 foto: ne devi eliminare 1\"");
await popup(bruno).getByRole("button", { name: "Elimina questa foto" }).first().click();
await popup(bruno).getByRole("button", { name: "Elimina", exact: true }).click();
ok(await popup(bruno).waitFor({ state: "detached", timeout: 20000 }).then(() => true, () => false), "con 2 foto il popup sparisce");
await bruno.waitForLoadState("networkidle");
ok(!(await popup(bruno).isVisible()), "dopo il ricaricamento il popup non torna");

const { data: rimasti } = await nuovo().from("moodboard_items").select("id").eq("member_id", mid.Bruno); // senza accesso: rifiutato o vuoto
ok(!rimasti?.length, "chi non è nel gruppo non legge la bacheca");
ok(errori.length === 0, `nessun errore nelle pagine${errori.length ? ": " + errori.join(" | ") : ""}`);
await browser.close();
console.log(`\nGruppo di prova da ripulire (chiedere prima a Marzia): ${gid}\nAccessi di prova: ${utenti.join(", ")}\nFile di Bruno da controllare: ${fotoDiBruno} (deve essere sparito)`);
