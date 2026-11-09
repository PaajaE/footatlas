// Náhled všech 16 symbolů razítek do docs/razitka/ (PNG): velký, střední, 28 px a v kroužku razítka.
// Spuštění: node apps/mobile/scripts/razitka-nahled.mjs (Node 22.18+ kvůli načtení .ts; Playwright s Chromiem musí být
// dosažitelný, např. NODE_PATH=$(npm root -g)).
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const { GLYPHS, GLYPH_STROKE, HATCH_STROKE } = await import(join(here, "../src/components/stamps/glyphs.ts"));
const LABEL = {
  hradiste: "hradiště", zamek: "zámek", most: "most", lavka: "lávka", ostrov: "ostrov", zdymadlo: "zdymadlo",
  pristav: "přístav", privoz: "přívoz", vor: "vor", skala: "skála", obec: "obec", nota: "nota",
  mlyn: "mlýn", vyhled: "výhled", rakos: "rákos", soutok: "soutok",
};
const INK = "#B5402F";
const PAPER = "#F3EBDD";
const MUTED = "#9A8B76";

const glyph = (name, color) =>
  GLYPHS[name]
    .map((g) => `<path d="${g.d}" fill="none" stroke="${color}" stroke-width="${g.hatch ? HATCH_STROKE : GLYPH_STROKE}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("");
const icon = (name, px, color = INK) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24">${glyph(name, color)}</svg>`;
const stamp = (name, px, color, dashed) =>
  `<svg width="${px}" height="${px}" viewBox="0 0 132 132" style="transform:rotate(-8deg)">
    <circle cx="66" cy="66" r="54" fill="none" stroke="${color}" stroke-width="3.5" ${dashed ? 'stroke-dasharray="3 6" stroke-linecap="round"' : ""}/>
    <circle cx="66" cy="66" r="47" fill="none" stroke="${color}" stroke-width="1.2" ${dashed ? 'opacity="0.5"' : ""}/>
    <g transform="translate(36 34) scale(2.5)" opacity="${dashed ? 0.55 : 1}">${glyph(name, color)}</g>
  </svg>`;

const cells = Object.keys(GLYPHS)
  .map(
    (k) => `<div class="cell">
      <div class="row">${icon(k, 96)}<div class="col">${icon(k, 48)}${icon(k, 28)}</div></div>
      <div class="row">${stamp(k, 72, INK, false)}${stamp(k, 72, MUTED, true)}</div>
      <div class="name"><code>${k}</code> · ${LABEL[k]}</div>
    </div>`,
  )
  .join("");
const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:${PAPER};font:14px Georgia,serif;color:#3A2E22}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding:22px;width:900px}
  .cell{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;border:1px solid #D8CBB4;border-radius:12px}
  .row{display:flex;align-items:center;gap:8px}.col{display:flex;flex-direction:column;align-items:center;gap:8px}
  h1{font-weight:normal;font-size:22px;margin:22px 22px 0}
  p{margin:4px 22px 0;color:#6B5B48}
</style><h1>Symboly razítek · 16 typů míst</h1>
<p>Velikost 96, 48 a 28 px; vpravo dole odemčené razítko a zamčený slepý obrys se stejným symbolem.</p>
<div class="grid">${cells}</div>`;

const out = join(here, "../../../docs/razitka");
mkdirSync(out, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 944, height: 800 }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.screenshot({ path: join(out, "symboly.png"), fullPage: true });
await browser.close();
console.log("docs/razitka/symboly.png");
