// Sestaví pěší trasu Vltavské stezky po souši (nábřeží, cesty a cyklostezky podél Vltavy).
//
//   node tools/route/build-walking-route.mjs        zapíše route.json a upraví expedition.json
//   DRY=1 node tools/route/build-walking-route.mjs  jen vypíše report, nic nezapisuje
//
// Postup: ručně vybrané body (WAYPOINTS) se pošlou veřejnému OSRM s pěším profilem, geometrie se
// zjednoduší (Douglas–Peucker 8 m) a zaokrouhlí na 5 desetinných míst, místa z expedition.json se
// promítnou na novou trasu v pořadí výpravy. Data © přispěvatelé OpenStreetMap (ODbL).
//
// Volitelné proměnné prostředí:
//   OSRM_CACHE=adresář   ukládá odpovědi OSRM (pro opakované ladění, šetří veřejný server)
//   OLD_REF=git-ref      commit se starou trasou (tok řeky) pro kontrolu koridoru, výchozí 4e3b856
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dataDir = path.join(root, "packages", "content", "data", "vltavska-stezka");
const DRY = process.env.DRY === "1";
const OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/foot/";

// Body trasy v pořadí. Řetězec je id místa z expedition.json, trojice [lon, lat, popisek] je pomocný bod.
// Jako body trasy jsou jen místa, která leží na straně, kudy se jde. Ostatní místa se jen promítnou
// (jsou to „výhledy přes řeku“ nebo leží dál od cesty): karluv-most, libensky-most, komora-troja,
// cisarsky-ostrov, sedlec, podmorani, klecany, husinec, dolany, lobecek, dvorak, lesik, rip, veprek,
// stara-vltava, lounky, nivy, tune, vyhled-melnik, horin.
// Zkoušené a zamítnuté: Libeňský most a Sedlec/Podbaba jako body (router se vrací po stejné cestě,
// +5 km zpětných úseků), Dvořákův dům (smyčka v jedné obci), Lužec před Vraňany (dvojitý průchod Lužcem).
const WAYPOINTS_RAW = [
  "vysehrad", // start, pravý břeh
  "vyton", // Rašínovo nábřeží (Výtoň a náplavka)
  "naplavka",
  [14.4195, 50.0922, "Čechův most (pravý břeh)"], // drží trasu u řeky; bez něj router řeže přes Staré Město
  "stvanice", // ostrov, pěší přístup z nábřeží
  "holesovice", // přístav; odtud po břehu k Troji
  "trojska-lavka", // lávka mezi Trojou a Císařským ostrovem
  "troja", // zámek, pravý břeh
  "roztoky", // přes přívoz v Podbabě (P2) na levý břeh, dál cyklostezka podél řeky
  "levy-hradec",
  "rez", // drží trasu v údolí u Řeže
  "libcice",
  "privoz-letky", // přívoz Libčice – Dolany na druhý břeh; dál po pravém břehu do Kralup
  "kralupy",
  "nelahozeves", // zpět přes mosty v Kralupech na levý břeh
  "veltrusy", // přes most u Veltrus
  "cerveny-mlyn", // zámecký park
  "vranany", // plavební kanál; přes Lužec (přívoz) na druhý břeh
  "melnik", // cíl, soutok
];

const R = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;
const hav = (a, b) => {
  const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};
const cum = (pts) => pts.reduce((o, p, i) => (o.push(i ? o[i - 1] + hav(pts[i - 1], p) : 0), o), []);
const LAT0 = 50.2;
const xy = ([lon, lat]) => [rad(lon) * Math.cos(rad(LAT0)) * R, rad(lat) * R];
function nearest(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return { t, d: Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy) };
}
function simplify(pts, tol) {
  const q = pts.map(xy), keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [s, e] = st.pop();
    let w = -1, wd = tol;
    for (let i = s + 1; i < e; i++) { const { d } = nearest(q[i], q[s], q[e]); if (d > wd) { wd = d; w = i; } }
    if (w >= 0) { keep[w] = 1; st.push([s, w], [w, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// Stejná sémantika jako projectOnto v packages/core (okno, dřívější shoda při rozdílu < 0,5 m).
function project(pts, c, lonlat, fromM, toM) {
  const p = xy(lonlat);
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    if (c[i + 1] < fromM || c[i] > toM) continue;
    const { t, d } = nearest(p, xy(pts[i]), xy(pts[i + 1]));
    if (!best || d < best.offsetM - 0.5) best = { atM: c[i] + t * (c[i + 1] - c[i]), offsetM: d };
  }
  return best;
}

async function fetchRoute(wps) {
  const coords = wps.map((w) => `${w[0]},${w[1]}`).join(";");
  const url = `${OSRM}${coords}?overview=full&geometries=geojson&continue_straight=true`;
  const cacheDir = process.env.OSRM_CACHE;
  const cacheFile = cacheDir && path.join(cacheDir, crypto.createHash("sha1").update(url).digest("hex") + ".json");
  if (cacheFile && fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  let wait = 2000;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "FootAtlas route builder (pajaecer@gmail.com)" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.code !== "Ok") throw new Error(`OSRM: ${json.code} ${json.message ?? ""}`);
      if (cacheFile) { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(json)); }
      return json;
    } catch (e) {
      console.error(`pokus ${attempt}: ${e.message}`);
      if (attempt === 6) throw e;
      await new Promise((r) => setTimeout(r, wait));
      wait *= 2;
    }
  }
}

const expPath = path.join(dataDir, "expedition.json");
const exp = JSON.parse(fs.readFileSync(expPath, "utf8"));

const WAYPOINTS = WAYPOINTS_RAW.map((w) => {
  if (typeof w !== "string") return w;
  const pl = exp.places.find((p) => p.id === w);
  if (!pl) throw new Error(`Neznámé místo ${w}`);
  return [pl.lon, pl.lat, pl.name];
});
const json = await fetchRoute(WAYPOINTS);
const rt = json.routes[0];
const raw = rt.geometry.coordinates;
console.log(`OSRM: ${rt.distance.toFixed(0)} m, ${raw.length} bodů, ${WAYPOINTS.length - 1} úseků`);

// Úseky: OSRM vzdálenost vs vzdušná čára.
console.log("\nÚseky (OSRM / vzdušně / poměr):");
let worst = 0;
rt.legs.forEach((leg, i) => {
  const a = WAYPOINTS[i], b = WAYPOINTS[i + 1];
  const air = hav(a, b), ratio = leg.distance / air;
  worst = Math.max(worst, ratio);
  console.log(`  ${String(i + 1).padStart(2)} ${a[2].padEnd(28)} -> ${b[2].padEnd(28)} ${(leg.distance / 1000).toFixed(2).padStart(6)} km / ${(air / 1000).toFixed(2).padStart(5)} km = ${ratio.toFixed(2)}${ratio > 1.6 ? "  !!" : ""}`);
});
console.log(`  nejhorší poměr: ${worst.toFixed(2)}`);

// Zjednodušení a zaokrouhlení; po zaokrouhlení odstraníme případné shodné sousední body.
let line = simplify(raw, 8).map(([lon, lat]) => [Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]);
line = line.filter((p, i) => i === 0 || p[0] !== line[i - 1][0] || p[1] !== line[i - 1][1]);
const c = cum(line);
const totalM = Math.round(c.at(-1));
console.log(`\nTrasa: ${line.length} bodů (z ${raw.length}), ${totalM} m (${(totalM / 1000).toFixed(2)} km)`);

// Kontrola zpětných úseků: bod trasy, ke kterému se trasa o více než 300 m později vrátí na 15 m.
{
  const pq = line.map(xy);
  let back = 0, first = null;
  for (let i = 0; i < line.length - 1; i++) {
    for (let j = i + 1; j < line.length - 1; j++) {
      if (c[j] - c[i] < 300) continue;
      if (Math.hypot(pq[i][0] - pq[j][0], pq[i][1] - pq[j][1]) < 15) { back += c[j] - c[i]; first ??= i; break; }
    }
  }
  console.log(`Zpětné úseky (vrací se po stejné cestě): ${back > 0 ? `${Math.round(back)} m (první u ${line[first][1].toFixed(4)},${line[first][0].toFixed(4)}, ${Math.round(c[first])} m)` : "žádné"}`);
}

// Promítnutí míst v pořadí výpravy. Okno začíná kousek před předchozím místem, aby se trasa
// nevracela, ale drobná chyba pořadí neutekla.
console.log("\nMísta (unlockAtM, kolmá odchylka od trasy):");
let prev = 0;
const unlock = new Map();
const far = [];
for (const [i, pl] of exp.places.entries()) {
  const last = i === exp.places.length - 1;
  let pr = project(line, c, [pl.lon, pl.lat], Math.max(0, prev - 300), Infinity);
  let at = Math.round(pr.atM);
  if (last) at = totalM; // cíl je přesně na konci trasy
  at = Math.max(at, prev); // monotónně
  unlock.set(pl.id, at);
  prev = at;
  if (pr.offsetM > 500) far.push(`${pl.id} ${Math.round(pr.offsetM)} m`);
  console.log(`  ${pl.id.padEnd(16)} ${pl.kind.padEnd(10)} ${String(at).padStart(6)} m   odchylka ${Math.round(pr.offsetM)} m`);
}
console.log(`\nOdchylka > 500 m: ${far.length ? far.join(", ") : "žádná"}`);

// Etapy: 4 etapy, každá končí zastávkou, kromě poslední. Vybereme zastávky tak, aby byla
// největší etapa co nejmenší (a pak součet čtverců odchylek od ideálu co nejmenší).
const stops = exp.places.filter((p) => p.kind === "stop").map((p) => ({ id: p.id, m: unlock.get(p.id) }));
const N = 4;
const inner = stops.filter((s) => s.m < totalM);
let bestSel = null, bestScore = Infinity;
(function pick(start, chosen) {
  if (chosen.length === N - 1) {
    const ends = [...chosen.map((s) => s.m), totalM];
    const lens = ends.map((e, i) => e - (i ? ends[i - 1] : 0));
    const ideal = totalM / N;
    const score = Math.max(...lens) * 1e6 + lens.reduce((a, l) => a + (l - ideal) ** 2, 0) / 1e3;
    if (score < bestScore) { bestScore = score; bestSel = chosen; }
    return;
  }
  for (let i = start; i < inner.length; i++) pick(i + 1, [...chosen, inner[i]]);
})(0, []);
const stageEnds = [...bestSel.map((s) => s.m), totalM];
const stageNames = [...bestSel.map((s) => s.id), "melnik"];
console.log("\nEtapy:");
stageEnds.forEach((e, i) => console.log(`  ${i + 1}. konec ${stageNames[i].padEnd(12)} ${e} m, délka ${((e - (i ? stageEnds[i - 1] : 0)) / 1000).toFixed(2)} km`));

// Koridor: nejvyšší vzdálenost bodu nové trasy od staré trasy (tok řeky), na které jsou dlaždice mapy.
try {
  const ref = process.env.OLD_REF ?? "4e3b856";
  const old = JSON.parse(
    execFileSync("git", ["show", `${ref}:packages/content/data/vltavska-stezka/route.json`], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 }),
  ).coordinates;
  const oq = old.map(xy);
  const dist = (p) => { let m = Infinity; for (let i = 0; i < oq.length - 1; i++) m = Math.min(m, nearest(p, oq[i], oq[i + 1]).d); return m; };
  let max = 0, at = null;
  for (let i = 0; i < line.length - 1; i++) {
    const n = Math.max(1, Math.ceil(hav(line[i], line[i + 1]) / 50));
    for (let k = 0; k <= n; k++) {
      const p = [line[i][0] + ((line[i + 1][0] - line[i][0]) * k) / n, line[i][1] + ((line[i + 1][1] - line[i][1]) * k) / n];
      const d = dist(xy(p));
      if (d > max) { max = d; at = p; }
    }
  }
  if (process.env.PROFILE === "1") {
    console.log("\nProfil (km, poloha, vzdálenost od řeky):");
    for (let i = 0, next = 0; i < line.length; i++) {
      if (c[i] >= next) {
        next += 1500;
        console.log(`  ${(c[i] / 1000).toFixed(1).padStart(5)} km  ${line[i][1].toFixed(4)},${line[i][0].toFixed(4)}  ${Math.round(dist(xy(line[i])))} m`);
      }
    }
  }
  console.log(`\nKoridor: nejvzdálenější bod nové trasy je ${Math.round(max)} m od staré čáry (${at[1].toFixed(5)}, ${at[0].toFixed(5)})`);
} catch (e) {
  console.log(`\nKoridor: kontrola přeskočena (${e.message.split("\n")[0]})`);
}

if (DRY) {
  console.log("\nDRY=1: nic nezapsáno.");
} else {
  fs.writeFileSync(path.join(dataDir, "route.json"), JSON.stringify({ type: "LineString", coordinates: line }) + "\n");
  exp.totalM = totalM;
  exp.stageEndsM = stageEnds;
  exp.routeSource =
    "Pěší trasa po souši vypočtená pěším routingem OSRM nad daty OpenStreetMap (ODbL), © přispěvatelé OpenStreetMap, zjednodušeno; není to vyznačená stezka";
  for (const p of exp.places) p.unlockAtM = unlock.get(p.id);
  fs.writeFileSync(expPath, JSON.stringify(exp, null, 2) + "\n");
  console.log("\nZapsáno: route.json, expedition.json");
}
