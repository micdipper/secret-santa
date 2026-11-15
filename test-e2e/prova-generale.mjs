// PROVA GENERALE + CONTROLLO DELLA SEGRETEZZA (STATO.md, punti 2 e 3 verso la pubblicazione).
// Un gruppo "Test E2E Natale" da 12 persone percorso dall'inizio alla fine come farà il gruppo vero:
// alcuni passaggi nel browser (telefoni simulati, con le foto), il resto con le stesse chiamate del sito.
// In mezzo, a ogni passaggio, si prova a "fare il furbo": il database deve dire sempre di no.
//   NODE_USE_ENV_PROXY=1 node test-e2e/prova-generale.mjs <sito> <cartella foto>
// Nessuna operazione da confermare sul database: si usa solo quello che usa il sito.
// Alla fine: cancellare i gruppi "Test E2E Natale" e i loro accessi (chiedendo prima a Marzia).
import { createRequire } from "module";
import { mkdirSync } from "fs";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const { chromium, devices } = require("playwright");
const URL = "https://gesihnbtflnpjxwmpxkd.supabase.co";
const KEY = "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
const [, , SITO = "http://localhost:3123", CARTELLA = "foto-prova-generale"] = process.argv;
const PWD = "provaprova123";
const NOMI = ["Giulia Rossi", "Bruno Verdi", "Carla Neri", "Dario Gallo", "Elena Conti", "Fabio Ricci", "Gianna Moro", "Luca Bassi", "Marta Fabbri", "Nico Serra", "Olga Longo", "Paolo Riva"];
let falliti = 0;
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) { falliti++; process.exitCode = 1; } };
const no = (r) => !!r.error || (Array.isArray(r.data) && r.data.length === 0); // rifiutato o senza effetto
const nuovo = () => createClient(URL, KEY, { auth: { persistSession: false } });
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
const giorno = (n) => new Date(Date.now() + n * 86400000).toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
const accesso = async () => {
  const c = nuovo();
  const { data, error } = await c.auth.signUp({ email: `${crypto.randomUUID()}@users.secretsanta.local`, password: PWD });
  if (error) throw error;
  return { c, uid: data.user.id };
};
mkdirSync(CARTELLA, { recursive: true });
const browser = await chromium.launch();
const errori = [];
let nf = 0;
const foto = async (p, nome, intera = true) => {
  await attendi(800);
  await p.screenshot({ path: `${CARTELLA}/${String(++nf).padStart(2, "0")}-${nome}.png`, fullPage: intera });
};
async function telefono(nome, opzioni = {}) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 2, ...opzioni });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: SITO });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errori.push(`${nome}: ${e.message}`));
  p.on("dialog", (d) => d.accept()); // "Fare l'estrazione adesso?"
  return p;
}
async function chiudiPopup(p, volte = 3) {
  for (let i = 0; i < volte; i++) {
    await attendi(1200);
    const t = p.getByRole("dialog").getByRole("button").last();
    if (await t.isVisible().catch(() => false)) await t.click().catch(() => {});
  }
}
async function entraDallInvito(p, codice, nome, password, nuovo) {
  await p.goto(`${SITO}/invito/${codice}`);
  await p.getByRole("button", { name: nome, exact: true }).click();
  await p.locator("#password").fill(password);
  await p.getByRole("button", { name: "Entra" }).click();
  await p.waitForURL(nuovo ? /guardaroba/ : /\/gruppo\//, { timeout: 30000 });
}
// l'accesso del telefono simulato (il sito lo tiene nei cookie sb-…-auth-token, a volte spezzato in .0 .1 …)
async function sessioneDa(p) {
  const pezzi = (await p.context().cookies()).filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  let v = decodeURIComponent(pezzi.map((c) => c.value).join(""));
  if (v.startsWith("base64-")) v = Buffer.from(v.slice(7), "base64").toString("utf8");
  return JSON.parse(v);
}
const gruppi = [];

// =====================================================================
// 1. L'organizzatrice crea il gruppo dal telefono (senza data: la decideranno insieme)
// =====================================================================
const org = await telefono("Giulia");
await org.goto(`${SITO}/nuovo`);
await org.fill("#nome", "Test E2E Natale");
await org.fill("#mio-nome", NOMI[0]);
for (const n of NOMI.slice(1)) {
  await org.fill("#nuovo-nome", n);
  await org.getByRole("button", { name: "Aggiungi la persona" }).click();
}
await org.fill("#password", PWD);
await foto(org, "01-crea-gruppo");
await org.getByRole("button", { name: "Crea il gruppo" }).click();
await org.waitForURL(/\/gruppo\/[^/]+\/sondaggio/, { timeout: 30000 });
const gid = org.url().match(/gruppo\/([^/]+)/)[1];
gruppi.push(gid);
console.log("GRUPPO", gid);
await foto(org, "02-sondaggio-predefinito", false);
await org.getByRole("button", { name: "Salva il sondaggio" }).click();
await org.waitForURL(/organizza/, { timeout: 30000 });
await attendi(1500);
await foto(org, "03-organizza-invito", false);
const invito = await org.evaluate(() => JSON.parse(localStorage.getItem("portachiavi") ?? "[]")[0]?.invito);
ok(!!invito, "gruppo creato, sondaggio salvato, link d'invito pronto");
// lo stesso accesso dell'organizzatrice, per le chiamate dirette
const sessione = await sessioneDa(org);
const G = nuovo();
await G.auth.setSession({ access_token: sessione.access_token, refresh_token: sessione.refresh_token });
const { data: membri } = await G.from("group_members").select("id, display_name, user_id").eq("group_id", gid);
const mid = Object.fromEntries(membri.map((m) => [m.display_name, m.id]));
ok(membri.length === 12, "12 persone nella lista");

// =====================================================================
// 2. Gli amici entrano. Bruno e Carla dal telefono, gli altri come farebbe il sito.
//    Dario prende per sbaglio il nome di Elena: l'organizzatrice lo libera.
// =====================================================================
const amici = {}; // nome → { c, uid, mid }
const bruno = await telefono("Bruno");
await entraDallInvito(bruno, invito, NOMI[1], PWD, true);
await attendi(1500);
await foto(bruno, "04-bruno-appena-entrato-guardaroba", false);
const carla = await telefono("Carla");
await entraDallInvito(carla, invito, NOMI[2], PWD, true);
for (const [p, n] of [[bruno, NOMI[1]], [carla, NOMI[2]]]) {
  const s = await sessioneDa(p);
  const c = nuovo();
  await c.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token });
  amici[n] = { c, uid: s.user.id, mid: mid[n] };
}
// Dario sbaglia nome
const sbaglio = await accesso();
ok(!(await sbaglio.c.rpc("claim_member", { p_invite_code: invito, p_member_id: mid["Elena Conti"], p_avatar: null })).error, "Dario prende per sbaglio il posto di Elena");
const altro = await accesso();
ok(!!(await altro.c.rpc("claim_member", { p_invite_code: invito, p_member_id: mid["Elena Conti"], p_avatar: null })).error, "un nome già preso è bloccato");
ok(no(await amici[NOMI[1]].c.rpc("release_member", { p_member_id: mid["Elena Conti"] })), "FURBO: chi non organizza non libera i nomi");
await org.reload();
await org.getByRole("button", { name: "Opzioni per Elena Conti" }).click();
await org.getByRole("button", { name: "Libera il nome" }).click();
await attendi(1500);
ok(!(await G.from("group_members").select("user_id").eq("id", mid["Elena Conti"]).single()).data.user_id, "l'organizzatrice libera il nome di Elena dal telefono");
// gli altri 9 entrano (Dario col suo nome, con l'accesso sbagliato di prima ormai fuori dal gruppo)
for (const n of NOMI.slice(3)) {
  const x = n === "Dario Gallo" ? sbaglio : await accesso();
  const e = (await x.c.rpc("claim_member", { p_invite_code: invito, p_member_id: mid[n], p_avatar: null })).error;
  ok(!e, `${n.split(" ")[0]} entra`);
  amici[n] = { ...x, mid: mid[n] };
}
amici[NOMI[0]] = { c: G, uid: sessione.user.id, mid: mid[NOMI[0]] };
const tutti = NOMI.map((n) => amici[n]);
const estraneo = await accesso(); // non è nel gruppo
const B = amici[NOMI[1]], C = amici[NOMI[2]];

// FURBI prima dell'estrazione
ok(((await estraneo.c.from("groups").select("id").eq("id", gid)).data ?? []).length === 0, "FURBO: un estraneo non vede il gruppo");
ok(((await estraneo.c.from("group_members").select("id").eq("group_id", gid)).data ?? []).length === 0, "FURBO: un estraneo non vede chi c'è");
ok(no(await B.c.from("groups").update({ budget_eur: 1 }).eq("id", gid).select("id")), "FURBO: chi non organizza non cambia il gruppo");
ok(no(await B.c.from("group_members").update({ display_name: "Pippo" }).eq("id", mid["Carla Neri"]).select("id")), "FURBO: nessuno rinomina gli altri");
ok(no(await B.c.from("group_members").update({ user_id: B.uid }).eq("id", mid["Carla Neri"]).select("id")), "FURBO: nessuno si prende il posto di un altro");
ok(no(await B.c.from("group_members").insert({ group_id: gid, display_name: "Intruso" }).select("id")), "FURBO: chi non organizza non aggiunge persone");
ok(no(await B.c.rpc("create_password_reset", { p_member_id: mid["Carla Neri"] })), "FURBO: chi non organizza non crea link per cambiare password");

// =====================================================================
// 3. Password dimenticata: l'organizzatrice crea il link, Bruno sceglie la nuova password
// =====================================================================
await org.getByRole("button", { name: "Opzioni per Bruno Verdi" }).click();
await org.getByRole("button", { name: "Reimposta password" }).click();
await org.getByRole("button", { name: "Manda il link" }).click();
await attendi(800);
const linkReset = await org.evaluate(() => navigator.clipboard.readText());
await foto(org, "05-organizza-link-password", false);
ok(linkReset.includes("/reimposta/"), "link usa-e-getta per la nuova password");
const brunoNuovoTelefono = await telefono("Bruno (telefono nuovo)");
await brunoNuovoTelefono.goto(linkReset);
await brunoNuovoTelefono.locator("#password").fill("nuovapassword9");
await foto(brunoNuovoTelefono, "06-bruno-nuova-password", false);
await brunoNuovoTelefono.getByRole("button").filter({ hasText: /Salva|Cambia|Conferma|Entra/ }).first().click();
await attendi(3000);
await entraDallInvito(brunoNuovoTelefono, invito, NOMI[1], "nuovapassword9", false).catch(() => {});
ok(/\/gruppo\//.test(brunoNuovoTelefono.url()), "Bruno rientra da un telefono nuovo con la nuova password");
const codice = linkReset.split("/reimposta/")[1];
ok(no(await estraneo.c.rpc("use_password_reset", { p_token: codice, p_password: "rubatarubata1" })), "FURBO: il link non si usa due volte");

// =====================================================================
// 4. Quando facciamo lo scambio? L'organizzatrice propone 4 giorni, rispondono, fissa la data
// =====================================================================
const GIORNI = [giorno(19), giorno(20), giorno(23), giorno(26)];
ok(!(await G.from("groups").update({ giorni_proposti: GIORNI }).eq("id", gid)).error, "giorni proposti");
for (const [i, x] of tutti.entries()) await x.c.rpc("imposta_disponibilita", { p_group_id: gid, p_giorni: i % 3 === 0 ? [GIORNI[0]] : [GIORNI[1], GIORNI[2]] });
await carla.goto(`${SITO}/gruppo/${gid}/disponibilita`);
await carla.getByText("Quando ci sei?").waitFor({ timeout: 15000 });
await foto(carla, "07-carla-disponibilita");
ok(!(await G.from("groups").update({ exchange_date: GIORNI[1], giorni_proposti: null }).eq("id", gid)).error, "l'organizzatrice fissa la data più probabile");
ok((await G.from("groups").select("giochi_attivi").eq("id", gid).single()).data.giochi_attivi, "data a 20 giorni: i mini giochi partiranno");

// =====================================================================
// 5. Sondaggio totem e bacheca (Carla dal telefono), toppe e ricamo
// =====================================================================
await carla.goto(`${SITO}/gruppo/${gid}/bacheca/${C.mid}`);
await carla.getByRole("button", { name: "Iniziamo" }).click({ timeout: 20000 });
for (let i = 0; i < 6; i++) {
  await attendi(900);
  const r = carla.locator("main button").filter({ hasNotText: /Adesso no|Iniziamo/ }).first();
  await r.click().catch(() => {});
  if (i === 1) await foto(carla, "08-carla-sondaggio-domanda", false);
}
await carla.getByText("Il tuo totem è").waitFor({ timeout: 20000 });
await attendi(2500);
await foto(carla, "09-carla-totem", false);
ok(((await B.c.from("quiz_results").select("profilo").eq("group_id", gid)).data ?? []).length === 1, "il totem di Carla è visibile al gruppo");
ok(((await B.c.from("quiz_questions").select("id").eq("group_id", gid)).data ?? []).length === 0, "FURBO: chi non organizza non legge le domande del sondaggio");
ok(((await B.c.from("quiz_answers").select("id, punti")).data ?? []).length === 0, "FURBO: nessuno legge i punti delle risposte");
ok(no(await B.c.from("quiz_results").update({ profilo: "BONUS" }).eq("group_id", gid).select("user_id")), "FURBO: nessuno cambia il totem degli altri");
await carla.getByRole("button", { name: "Apri la bacheca" }).click();
await attendi(2000);
// toppe attaccate (come fa la cassettiera) e un ricamo
for (const [k, t] of [["stella", "simbolo"], ["cuore", "simbolo"]].entries()) {
  const r = await C.c.from("moodboard_items").insert({ member_id: C.mid, kind: "toppa", content: { toppa: t[0], tipo: t[1] }, x: 20 + k * 30, y: 30, width: 26, height: 26 });
  ok(!r.error, `Carla attacca la toppa ${t[0]}`);
}
ok(no(await B.c.from("moodboard_items").insert({ member_id: C.mid, kind: "toppa", content: { toppa: "albero", tipo: "simbolo" }, width: 26, height: 26 }).select("id")), "FURBO: nessuno attacca cose sulla bacheca degli altri");
ok(no(await B.c.from("moodboard_items").delete().eq("member_id", C.mid).select("id")), "FURBO: nessuno stacca le toppe degli altri");
await carla.reload();
await chiudiPopup(carla, 2);
await foto(carla, "10-carla-bacheca", false);
await bruno.goto(`${SITO}/gruppo/${gid}/bacheca/${C.mid}`);
await attendi(3000);
await foto(bruno, "11-bruno-guarda-bacheca-carla", false);
// foto: si carica solo nella propria cartella
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
ok(!(await C.c.storage.from("moodboard").upload(`${gid}/${C.mid}/prova.png`, png, { contentType: "image/png" })).error, "Carla carica una foto nella sua cartella");
ok(!!(await B.c.storage.from("moodboard").upload(`${gid}/${C.mid}/intrusa.png`, png, { contentType: "image/png" })).error, "FURBO: nessuno carica foto nella cartella degli altri");
const fotoEstraneo = await estraneo.c.storage.from("moodboard").createSignedUrl(`${gid}/${C.mid}/prova.png`, 60);
ok(!fotoEstraneo.data?.signedUrl, "FURBO: un estraneo non vede le foto del gruppo");

// =====================================================================
// 6. Esclusioni (una dal telefono, le altre come fa il sito) ed estrazione dal telefono
// =====================================================================
await org.goto(`${SITO}/gruppo/${gid}/organizza`);
await org.getByText("Chi non deve pescarsi").scrollIntoViewIfNeeded();
await org.getByRole("button", { name: "Aggiungi", exact: true }).click();
await org.getByRole("radio", { name: /Si amano/ }).click();
const scelte = org.locator("select");
await scelte.nth(0).selectOption({ label: "Bruno Verdi" });
await scelte.nth(1).selectOption({ label: "Carla Neri" });
await org.getByRole("button", { name: "Salva" }).last().click();
await attendi(1500);
ok(!(await G.from("exclusions").insert({ group_id: gid, member_a: mid["Dario Gallo"], member_b: mid["Elena Conti"], reason: "anno_scorso" })).error, "esclusione: Dario → Elena l'anno scorso");
const [oa, ob] = [mid["Fabio Ricci"], mid["Gianna Moro"]].sort();
ok(!(await G.from("exclusions").insert({ group_id: gid, member_a: oa, member_b: ob, reason: "odio" })).error, "esclusione: Fabio e Gianna si odiano");
await org.getByText("Chi non deve pescarsi").scrollIntoViewIfNeeded();
await foto(org, "12-organizza-esclusioni", false);
ok(((await G.from("exclusions").select("reason").eq("group_id", gid)).data ?? []).length === 3, "3 esclusioni salvate");
ok(((await B.c.from("exclusions").select("reason").eq("group_id", gid)).data ?? []).length === 0, "FURBO: chi non organizza non vede le esclusioni (neanche la sua)");
ok(no(await B.c.from("exclusions").insert({ group_id: gid, member_a: mid["Bruno Verdi"], member_b: mid["Paolo Riva"], reason: "odio" }).select("group_id")), "FURBO: chi non organizza non aggiunge esclusioni");
ok(no(await B.c.rpc("run_draw", { p_group_id: gid })), "FURBO: chi non organizza non fa l'estrazione");
ok(((await B.c.from("assignments").select("*").eq("group_id", gid)).data ?? []).length === 0, "prima dell'estrazione nessun abbinamento");
await org.getByRole("button", { name: "Fai l'estrazione" }).click();
await org.waitForURL(new RegExp(`/gruppo/${gid}$`), { timeout: 30000 });
await chiudiPopup(org, 2);
await foto(org, "13-giulia-gruppo-dopo-estrazione", false);

// controllo dell'estrazione: ognuno legge SOLO il suo abbinamento
const regala = {};
for (const x of tutti) {
  const r = (await x.c.from("assignments").select("*").eq("group_id", gid)).data ?? [];
  ok(r.length === 1, `segreto: ${NOMI.find((n) => amici[n] === x).split(" ")[0]} legge solo il suo abbinamento`);
  if (r[0]) regala[x.mid] = r[0].receiver_member_id;
}
const riceve = Object.values(regala);
ok(new Set(riceve).size === 12 && Object.keys(regala).every((g) => regala[g] !== g), "tutti regalano e ricevono una volta, nessuno pesca se stesso");
ok(Object.keys(regala).every((g) => regala[regala[g]] !== g), "nessuno si scambia il regalo a vicenda");
let giro = 1, x0 = Object.keys(regala)[0], x = regala[x0];
while (x !== x0 && giro < 20) { x = regala[x]; giro++; }
ok(giro === 12, "catena unica da 12");
const vietate = [[mid["Bruno Verdi"], mid["Carla Neri"]], [mid["Carla Neri"], mid["Bruno Verdi"]], [mid["Dario Gallo"], mid["Elena Conti"]], [oa, ob], [ob, oa]];
ok(vietate.every(([a, b]) => regala[a] !== b), "esclusioni rispettate");
ok(((await estraneo.c.from("assignments").select("*")).data ?? []).length === 0, "FURBO: un estraneo non legge abbinamenti");
ok(no(await B.c.from("assignments").update({ receiver_member_id: mid["Paolo Riva"] }).eq("giver_member_id", B.mid).select("*")), "FURBO: nessuno cambia il proprio abbinamento");
ok(no(await G.rpc("run_draw", { p_group_id: gid })), "FURBO: l'estrazione non si rifà");
const tardi = await accesso();
ok(!!(await tardi.c.rpc("claim_member", { p_invite_code: invito, p_member_id: mid["Paolo Riva"], p_avatar: null })).error, "FURBO: dopo l'estrazione l'invito non fa entrare nessuno");
ok(no(await G.from("group_members").insert({ group_id: gid, display_name: "Ritardatario" }).select("id")), "dopo l'estrazione non si aggiungono persone");

// =====================================================================
// 7. Le buste: Bruno la apre dal telefono (versione senza 3D, "riduci movimento"), gli altri come fa il sito
// =====================================================================
const brunoBusta = await telefono("Bruno busta", { reducedMotion: "reduce" });
await entraDallInvito(brunoBusta, invito, NOMI[1], "nuovapassword9", false);
await brunoBusta.goto(`${SITO}/gruppo/${gid}/busta`);
await attendi(4000);
await foto(brunoBusta, "14-bruno-busta", false);
ok(no(await B.c.from("group_members").update({ envelope_opened_at: new Date().toISOString() }).eq("id", C.mid).select("id")), "FURBO: nessuno apre la busta degli altri");
let r = await B.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: true, p_testo: "ciao" });
ok(!!r.error, "Santa Chat chiusa finché non hanno aperto tutti");
for (const y of tutti) await y.c.from("group_members").update({ envelope_opened_at: new Date().toISOString() }).eq("id", y.mid);
await brunoBusta.goto(`${SITO}/gruppo/${gid}`);
await chiudiPopup(brunoBusta, 3);
await foto(brunoBusta, "15-bruno-gruppo-il-tuo-regalo-e-per", false);

// =====================================================================
// 8. Santa Chat (Bruno dal telefono): i nomi diventano asterischi, chi riceve non sa chi scrive
// =====================================================================
await brunoBusta.goto(`${SITO}/gruppo/${gid}/chat?con=pescato`);
await brunoBusta.locator("#messaggio").fill("Ciao! G1ulia dice che ami i gatti");
await brunoBusta.getByRole("button", { name: "Invia" }).click();
await attendi(2500);
await foto(brunoBusta, "16-bruno-santa-chat", false);
const destB = regala[B.mid];
const R = tutti.find((y) => y.mid === destB);
const letti = (await R.c.from("santa_messages").select("*").eq("receiver_member_id", destB)).data ?? [];
ok(letti.length === 1 && !letti[0].testo.toLowerCase().includes("g1ulia") && letti[0].testo.includes("*"), `censura: "G1ulia" coperto (${letti[0]?.testo})`);
ok(letti.every((m) => !JSON.stringify(m).includes(B.mid) && !JSON.stringify(m).includes(B.uid)), "chi riceve non ha nessuna traccia di chi scrive");
const terzo = tutti.find((y) => y !== B && y !== R && regala[y.mid] !== destB);
ok(((await terzo.c.from("santa_messages").select("id").eq("receiver_member_id", destB)).data ?? []).length === 0, "FURBO: gli altri non leggono la chat");
ok(no(await terzo.c.from("santa_messages").insert({ group_id: gid, receiver_member_id: destB, dal_babbo: true, testo: "finto" }).select("id")), "FURBO: nessuno scrive fingendosi il Babbo di un altro");
ok(!!(await B.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: true, p_testo: "x".repeat(51) })).error, "limite di 50 caratteri");
for (let i = 0; i < 4; i++) await B.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: true, p_testo: `messaggio ${i + 2}` });
ok(!!(await B.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: true, p_testo: "il sesto" })).error, "limite di 5 messaggi al giorno");
// chi riceve risponde dal suo telefono? (qui come fa il sito)
ok(!(await R.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: false, p_testo: "Chi sei??" })).error, "chi riceve risponde al suo Babbo");

// =====================================================================
// 9. Novità: Carla scrive un post dal telefono, gli altri reagiscono
// =====================================================================
await carla.goto(`${SITO}/gruppo/${gid}/novita`);
await carla.locator("#post").fill("Ho già il regalo per Br*no... forse");
await carla.getByRole("button", { name: "Pubblica" }).click();
await attendi(2500);
const post = ((await B.c.from("feed_events").select("id, member_id, tipo, dati").eq("group_id", gid).eq("tipo", "post")).data ?? [])[0];
ok(!!post && !post.dati.testo.includes("Br*no"), `post pubblicato con il nome coperto (${post?.dati?.testo})`);
for (const [i, y] of tutti.slice(3, 9).entries()) await y.c.rpc("reagisci", { p_event: post.id, p_emoji: ["🎄", "❤️", "😂", "🔥", "👀", "🇮🇱"][i] });
await carla.reload();
await attendi(2500);
await foto(carla, "17-carla-novita", false);
ok(no(await B.c.rpc("elimina_post", { p_event: post.id })) || !!(await B.c.from("feed_events").select("id").eq("id", post.id)).data?.length, "FURBO: nessuno cancella il post degli altri");
ok(((await B.c.from("feed_events").select("id").eq("id", post.id)).data ?? []).length === 1, "il post di Carla è ancora lì");
ok(no(await B.c.from("feed_events").insert({ group_id: gid, member_id: C.mid, tipo: "post", dati: { testo: "finto" } }).select("id")), "FURBO: nessuno scrive post a nome di un altro");
ok(((await estraneo.c.from("feed_events").select("id").eq("group_id", gid)).data ?? []).length === 0, "FURBO: un estraneo non legge le Novità");

// =====================================================================
// 10. Premi e personaggio
// =====================================================================
const premiB = (await B.c.rpc("my_unlocked_accessories")).data ?? [];
ok(premiB.includes("occhiali") && premiB.includes("super"), `premi di Bruno: ${premiB.join(", ")}`);
ok(!!(await terzo.c.rpc("save_avatar", { p_look: { pelle: 1, capelli: 12, coloreCapelli: 0, barba: 0, occhiali: 0, maglione: 0, accessori: [] } })).error, "FURBO: un premio non vinto non si indossa (Taglio Super)");
ok(no(await B.c.from("profiles").update({ look: { pelle: 0 } }).eq("user_id", C.uid).select("user_id")), "FURBO: nessuno cambia il personaggio degli altri");
await brunoBusta.goto(`${SITO}/gruppo/${gid}/guardaroba`);
await attendi(2500);
await chiudiPopup(brunoBusta, 2);
await foto(brunoBusta, "18-bruno-guardaroba", false);
ok(((await estraneo.c.from("game_runs").select("id").eq("group_id", gid)).data ?? []).length === 0, "FURBO: un estraneo non legge le partite");
ok(((await estraneo.c.from("disponibilita").select("member_id").eq("group_id", gid)).data ?? []).length === 0, "FURBO: un estraneo non legge le disponibilità");

ok(errori.length === 0, "nessun errore nelle pagine " + errori.join(" | "));
console.log(`\n${falliti ? `${falliti} controlli FALLITI` : "Tutti i controlli OK"}`);
await browser.close();
process.exit();
