// Vykreslí ilustrovaný atlas (balík B) v MapLibre GL JS v Chromiu: styl, pečeti a masku z kódu aplikace.
//   node tools/maps/render-atlas.mjs [výstupní složka]     (výchozí docs/mapa-atlas)
// Data OSM: lokální koridor tools/maps/out/vltava-koridor5.pmtiles, jinak se čte přímo z veřejného buildu Protomaps
// přes HTTP Range (adresa v PMTILES_URL, výchozí build z docs/mapy-osm.md); dlaždice přes místní server a `curl`
// (ten respektuje proxy a certifikáty prostředí). Potřebuje: out/vendor (fetch-assets.mjs), Playwright s Chromiem.
// Nativní vykreslení (Android) tím ověřeno NENÍ: je to stejný styl a stejné obrázky v jiném enginu.
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const require = createRequire(import.meta.url);
const esbuild = require(path.join(root, "node_modules", "esbuild"));
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? "playwright");
const outDir = path.resolve(process.argv[2] ?? path.join(root, "docs", "mapa-atlas"));
fs.mkdirSync(outDir, { recursive: true });
const tmp = path.join(here, "out");
fs.mkdirSync(tmp, { recursive: true });

// 1) kód aplikace a stylu svázaný do jednoho modulu
const bundle = path.join(tmp, "atlas-bundle.mjs");
await esbuild.build({ entryPoints: [path.join(here, "render-atlas-entry.ts")], bundle: true, format: "esm", outfile: bundle, logLevel: "error" });
const A = await import(pathToFileURL(bundle).href + `?t=${Date.now()}`);

// 2) data výpravy
const expedition = JSON.parse(fs.readFileSync(path.join(root, "packages/content/data/vltavska-stezka/expedition.json"), "utf8"));
const routeCoords = JSON.parse(fs.readFileSync(path.join(root, "packages/content/data/vltavska-stezka/route.json"), "utf8")).coordinates;
const route = routeCoords.map(([lon, lat]) => ({ lat, lon }));
const cumulative = A.cumulativeM(route);
const places = expedition.places.map((p) => ({ id: p.id, kind: p.kind, name: p.name, lat: p.lat, lon: p.lon, atM: p.unlockAtM })).sort((a, b) => a.atM - b.atM);

// 3) místní server: statika, glyfy, obrázky a dlaždice
const PMTILES_URL = process.env.PMTILES_URL ?? "https://build.protomaps.com/20261029.pmtiles";
const localTiles = path.join(tmp, "vltava-koridor5.pmtiles");
const vendor = fs.existsSync(path.join(tmp, "vendor")) ? path.join(tmp, "vendor") : process.env.VENDOR;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".pbf": "application/x-protobuf" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const rel = decodeURIComponent(url.pathname);
  const cors = { "access-control-allow-origin": "*" };
  if (process.env.DEBUG_RENDER) console.log("REQ", rel, req.headers.range ?? "");
  if (rel === "/tiles.pmtiles") {
    const range = req.headers.range ?? "";
    if (fs.existsSync(localTiles)) {
      const size = fs.statSync(localTiles).size;
      const m = /^bytes=(\d+)-(\d+)$/.exec(range);
      const [s, e] = m ? [Number(m[1]), Number(m[2])] : [0, size - 1];
      res.writeHead(206, { ...cors, "content-range": `bytes ${s}-${e}/${size}`, "content-length": e - s + 1, "content-type": "application/octet-stream", "accept-ranges": "bytes" });
      return void fs.createReadStream(localTiles, { start: s, end: e }).pipe(res);
    }
    const m = /^bytes=(\d+)-(\d+)$/.exec(range);
    if (!m) return void res.writeHead(416, cors).end();
    const total = process.env.PMTILES_TOTAL; // volitelné; jinak se neuvádí (pmtiles.js ho nepotřebuje)
    res.writeHead(206, { ...cors, "content-range": `bytes ${m[1]}-${m[2]}/${total ?? "*"}`, "content-type": "application/octet-stream", "accept-ranges": "bytes" });
    const curl = spawn("curl", ["-sS", "-f", "-m", "60", "-r", `${m[1]}-${m[2]}`, PMTILES_URL], { stdio: ["ignore", "pipe", "inherit"] });
    curl.stdout.pipe(res);
    return;
  }
  let file = null;
  if (rel.startsWith("/vendor/") && vendor) file = path.join(vendor, rel.slice(8));
  else if (rel.startsWith("/glyphs/")) file = path.join(root, "apps/mobile/assets/map/glyphs", rel.slice(8));
  else if (rel.startsWith("/img/")) file = path.join(root, "apps/mobile/assets/map", rel.slice(5));
  else if (rel === "/render-atlas.html" || rel === "/") file = path.join(here, "render-atlas.html");
  if (!file || file.includes("..") || !fs.existsSync(file)) return void res.writeHead(404, cors).end("not found");
  res.writeHead(200, { ...cors, "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(8788, "127.0.0.1", r));

// 4) pohledy: Výprava (40 m před Trojským zámkem, jako v prototypu), Praha a celá trasa
const nextStop = places.find((p) => p.name === "Trojský zámek");
const views = [
  ...(process.env.ONLY_VIEW ? [] : []),
  { name: "vyprava", walkedM: nextStop.atM - 40, w: 390, h: 640, center: [14.4185, 50.1155], zoom: 13.4 },
  { name: "vyprava-detail", walkedM: nextStop.atM - 40, w: 390, h: 640, center: [14.4085, 50.1215], zoom: 14.8 },
  { name: "praha", walkedM: 16000, w: 390, h: 640, center: [14.4185, 50.0825], zoom: 13.0 },
  { name: "prehled", walkedM: 35600, w: 390, h: 640, bounds: [[14.28, 50.04], [14.5, 50.37]], pad: 24 },
];
if (process.env.ONLY_VIEW) views.splice(0, views.length, ...views.filter((v) => v.name === process.env.ONLY_VIEW));
const browser = await chromium.launch();
const report = [];
try {
  for (const theme of process.env.ONLY_DAY ? [A.parchmentDay] : [A.parchmentDay, A.parchmentNight]) {
    const mode = theme.mode;
    const style = A.buildAtlasStyle({ theme, tilesUrl: "http://127.0.0.1:8788/tiles.pmtiles", glyphs: "http://127.0.0.1:8788/glyphs/{fontstack}/{range}.pbf" });
    const images = {};
    const med = (key) => (images[key] = `http://127.0.0.1:8788/img/medallions/${mode}-${key}@3x.png`);
    for (const p of places) if (p.kind === "stop") for (const k of ["reached", "next"]) med(`${k}-${p.id}`);
    for (const k of ["locked", "stamp-reached", "stamp-locked", "pill", "drawing-boat", "drawing-castle", "drawing-bridge"]) med(k);
    for (const pat of A.ATLAS_PATTERNS) images[A.patternName(theme, pat)] = `http://127.0.0.1:8788/img/patterns/${mode}-${pat}@3x.png`;
    for (const v of views) {
      const you = A.positionAt(route, cumulative, v.walkedM);
      const done = [...routeCoords.slice(0, you.segment + 1), [you.lon, you.lat]];
      const nextId = places.find((p) => p.kind === "stop" && p.atM > v.walkedM)?.id;
      const feat = (g) => ({ type: "Feature", properties: {}, geometry: g });
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 2 });
      const logs = [];
      page.on("console", (m) => { if (["error"].includes(m.type())) logs.push(m.text()); });
      page.on("pageerror", (e) => logs.push(String(e)));
      if (process.env.DEBUG_RENDER) page.on("requestfailed", (r) => console.log("FAIL", r.url().slice(0, 120), r.failure()?.errorText));
      if (process.env.DEBUG_RENDER) page.on("console", (m) => console.log("console", m.type(), m.text().slice(0, 200)));
      await page.goto("http://127.0.0.1:8788/render-atlas.html");
      const t0 = Date.now();
      const mask = { outer: A.revealMask(done, 650), inner: A.revealMask(done, 380) };
      const maskMs = Date.now() - t0;
      const res = await page.evaluate((o) => Promise.race([window.setup(o), new Promise((r) => setTimeout(() => r({ errors: ["časový limit 60 s", ...window.__errors] }), 60000))]), {
        ...v, style, images, reveal: mask, beforeId: A.ATLAS_SKETCH_START, revealLayers: A.revealLayers(theme),
        routeLayers: A.routeLayers(theme).map((l) => l), routeDone: feat({ type: "LineString", coordinates: done }),
        routeRest: feat({ type: "LineString", coordinates: routeCoords }),
        places: { type: "FeatureCollection", features: places.map((p) => ({ type: "Feature", id: p.id, properties: A.placeProps(p, v.walkedM, nextId), geometry: { type: "Point", coordinates: [p.lon, p.lat] } })) },
        placeLayers: A.placeLayers(theme), you: feat({ type: "Point", coordinates: [you.lon, you.lat] }), youLayers: A.youLayers(theme),
      });
      const file = path.join(outDir, `${v.name}-${mode === "day" ? "den" : "noc"}.png`);
      await page.locator("#map").screenshot({ path: file });
      report.push({ soubor: path.basename(file), kB: Math.round(fs.statSync(file).size / 1024), maskaMs: maskMs, chyby: [...new Set([...res.errors, ...logs])].slice(0, 3).join(" | ") });
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.table(report);
