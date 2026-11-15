// Collaudo Santa Chat (database + Realtime): 3 utenti finti nel gruppo "Test E2E Natale".
// Uso: NODE_USE_ENV_PROXY=1 node test-e2e/santa-chat.mjs  — alla fine stampa gli id da ripulire (chiedere prima a Marzia).
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const URL = "https://gesihnbtflnpjxwmpxkd.supabase.co";
const KEY = "sb_publishable_y9_c_tHshgvA87UzUna-4Q_VsjBJaOh";
const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const nuovo = () => createClient(URL, KEY, { auth: { persistSession: false } });

const u = [];
for (let i = 0; i < 3; i++) {
  const c = nuovo();
  const { data, error } = await c.auth.signUp({ email: `${crypto.randomUUID()}@users.secretsanta.local`, password: "provaprova123" });
  if (error) throw error;
  u.push({ c, uid: data.user.id });
}
const [A, B, C] = u;
const { data: g, error: eg } = await A.c.rpc("create_group", { p_name: "Test E2E Natale", p_budget_eur: 20, p_exchange_date: null, p_theme: "", p_my_name: "Anna", p_my_avatar: null, p_other_names: ["Bruno", "Carla"] });
if (eg) throw eg;
const gid = g[0].group_id, code = g[0].invite_code;
console.log("gruppo", gid);
const { data: membri } = await A.c.from("group_members").select("id, display_name").eq("group_id", gid);
const mid = Object.fromEntries(membri.map((m) => [m.display_name, m.id]));
// prima dell'estrazione la chat è chiusa
let r = await A.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: false, p_testo: "ciao" });
ok(r.error?.message.includes("dopo l'estrazione"), "chat chiusa prima dell'estrazione: " + r.error?.message);
for (const [x, n] of [[B, "Bruno"], [C, "Carla"]]) {
  const e = (await x.c.rpc("claim_member", { p_invite_code: code, p_member_id: mid[n], p_avatar: null })).error;
  if (e) throw e;
}
const d = await A.c.rpc("run_draw", { p_group_id: gid });
if (d.error) throw d.error;
for (const [x, n] of [[A, "Anna"], [B, "Bruno"], [C, "Carla"]]) {
  x.nome = n; x.mid = mid[n];
  x.dest = (await x.c.from("assignments").select("receiver_member_id").eq("group_id", gid).single()).data.receiver_member_id;
}
// dal 17/11 la chat si apre solo quando tutti hanno aperto la busta (collaudato in gruppi-separati.mjs)
for (const x of [A, B, C]) await x.c.from("group_members").update({ envelope_opened_at: new Date().toISOString() }).eq("id", x.mid);
const per = (memberId) => u.find((x) => x.mid === memberId);
const R = per(A.dest);           // chi riceve da Anna
const T = u.find((x) => x !== A && x !== R); // il terzo
console.log(`Anna regala a ${R.nome}; terzo: ${T.nome}`);

// realtime: chi riceve ascolta la sua conversazione
const arrivati = [];
let pronto;
const prontoP = new Promise((res) => (pronto = res));
const canale = R.c.channel("t")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "santa_messages", filter: `receiver_member_id=eq.${R.mid}` }, (p) => arrivati.push(p.new))
  .on("system", {}, (p) => { console.log("system", p.message); if (p.extension === "postgres_changes") pronto(); });
canale.subscribe();
await prontoP;
const spia = [];
const canaleT = T.c.channel("t2")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "santa_messages", filter: `receiver_member_id=eq.${R.mid}` }, (p) => spia.push(p.new));
canaleT.subscribe();
await new Promise((res) => setTimeout(res, 2000));

r = await A.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: true, p_testo: "  Ciao, sono il tuo Babbo!  " });
ok(!r.error && r.data.testo === "Ciao, sono il tuo Babbo!", "Babbo invia (testo ripulito)");
ok(!("giver_member_id" in r.data) && Object.keys(r.data).sort().join() === "created_at,dal_babbo,group_id,id,receiver_member_id,testo", "riga senza id di chi regala: " + Object.keys(r.data).join());
r = await R.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: false, p_testo: "Chi sei??" });
ok(!r.error, "chi riceve risponde");

let lettiR = (await R.c.from("santa_messages").select("*").eq("receiver_member_id", R.mid)).data;
ok(lettiR.length === 2, "chi riceve legge i 2 messaggi");
ok(lettiR.every((m) => !JSON.stringify(m).includes(A.mid) && !JSON.stringify(m).includes(A.uid)), "nessuna traccia di Anna nei dati di chi riceve");
let lettiA = (await A.c.from("santa_messages").select("*").eq("receiver_member_id", R.mid)).data;
ok(lettiA.length === 2, "Anna (Babbo) legge la conversazione");
let lettiT = (await T.c.from("santa_messages").select("*").eq("group_id", gid)).data;
ok(lettiT.every((m) => m.receiver_member_id === T.mid || m.receiver_member_id === T.dest), `il terzo vede solo le sue conversazioni (${lettiT.length})`);
ok(!lettiT.some((m) => m.receiver_member_id === R.mid && T.dest !== R.mid), "il terzo non legge la chat Anna→" + R.nome);
// scrivere direttamente nella tabella è vietato
r = await T.c.from("santa_messages").insert({ group_id: gid, receiver_member_id: R.mid, dal_babbo: true, testo: "finto" });
ok(!!r.error, "insert diretto rifiutato");
r = await T.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: false, p_testo: "x".repeat(501) });
ok(r.error?.message.includes("troppo lungo"), "messaggio troppo lungo rifiutato");
r = await T.c.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: false, p_testo: "   " });
ok(!!r.error, "messaggio vuoto rifiutato");
const estraneo = nuovo();
await estraneo.auth.signUp({ email: `${crypto.randomUUID()}@users.secretsanta.local`, password: "provaprova123" });
r = await estraneo.rpc("invia_santa_message", { p_group: gid, p_dal_babbo: false, p_testo: "ciao" });
ok(r.error?.message.includes("Non fai parte"), "chi non è nel gruppo non scrive");
ok(((await estraneo.from("santa_messages").select("id").eq("group_id", gid)).data ?? []).length === 0, "chi non è nel gruppo non legge");

await new Promise((res) => setTimeout(res, 2500));
ok(arrivati.length >= 1 && arrivati.some((m) => m.dal_babbo), `realtime: arrivati ${arrivati.length} messaggi a chi riceve`);
ok(spia.length === 0, "realtime: il terzo che ascolta la chat altrui non riceve niente");
ok(arrivati.every((m) => !JSON.stringify(m).includes(A.mid)), "realtime senza id di chi regala");

const premi = async (x) => (await x.c.rpc("my_unlocked_accessories")).data;
ok((await premi(A)).includes("super"), "Taglio Super ad Anna (ha scritto da Babbo)");
ok((await premi(R)).includes("super"), `Taglio Super a ${R.nome} (ha scritto al suo Babbo)`);
ok(!(await premi(T)).includes("super"), `${T.nome} non ha scritto: niente Taglio Super`);
await R.c.removeChannel(canale);
console.log("UTENTI", JSON.stringify([...u.map((x) => x.uid), (await estraneo.auth.getUser()).data.user.id]));
console.log("GRUPPO", gid);
process.exit();
