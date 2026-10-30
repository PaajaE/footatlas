// Vykreslí výřezy mapy (den a noc) do PNG přes Playwright + Chromium.
//   node render.mjs [výstupní složka]    (výchozí docs/mapy-osm)
// Předpoklad: out/vltava-koridor5.pmtiles, out/style-*.json (build-style.ts), out/vendor a out/glyphs (fetch-assets.mjs).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startServer } from "./serve.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] ?? path.join(here, "..", "..", "docs", "mapy-osm"));
fs.mkdirSync(outDir, { recursive: true });

const route = JSON.parse(fs.readFileSync(path.join(here, "..", "..", "packages", "content", "data", "vltavska-stezka", "route.json"), "utf8")).coordinates;
const hav = (a, b) => {
  const r = Math.PI / 180, dLa = (b[1] - a[1]) * r, dLo = (b[0] - a[0]) * r;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(s));
};
// Ušlý úsek jako v mockupech: 35,6 km od startu.
let acc = 0, cut = route.length - 1;
for (let i = 1; i < route.length; i++) { acc += hav(route[i - 1], route[i]); if (acc >= 35_600) { cut = i; break; } }
const done = route.slice(0, cut + 1), rest = route.slice(cut);

const views = [
  { name: "vyprava", w: 390, h: 470, center: route[cut], zoom: 11.6 },
  { name: "zastavka", w: 390, h: 280, center: [14.3715, 50.2335], zoom: 14.2 },
  { name: "praha", w: 390, h: 470, center: [14.4185, 50.0825], zoom: 13.6 },
  { name: "cela-trasa", w: 390, h: 844, bounds: [[14.28, 50.04], [14.5, 50.37]], pad: 24 },
];

const server = await startServer(8787);
const browser = await chromium.launch();
const report = [];
try {
  for (const theme of ["parchment-day", "parchment-night"]) {
    const { style, route: routeLayers } = JSON.parse(fs.readFileSync(path.join(here, "out", `style-${theme}.json`), "utf8"));
    for (const v of views) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 2 });
      const logs = [];
      page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(m.text()); });
      page.on("pageerror", (e) => logs.push(String(e)));
      await page.goto("http://127.0.0.1:8787/render.html");
      const res = await page.evaluate((o) => window.setup(o), { ...v, style, routeLayers, doneCoords: done, restCoords: rest });
      const file = path.join(outDir, `${v.name}-${theme === "parchment-day" ? "den" : "noc"}.png`);
      await page.locator("#map").screenshot({ path: file });
      report.push({ file: path.basename(file), size: fs.statSync(file).size, errors: [...res.errors, ...logs].slice(0, 3) });
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.table(report);
