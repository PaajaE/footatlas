// Vygeneruje styl MapLibre (den a noc) do tools/maps/out/style-*.json.
//   pnpm dlx tsx tools/maps/build-style.ts [adresa pmtiles] [adresa písem]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStyle, routeLayers, themes } from "../../packages/map-style/src/index";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "out");
const tilesUrl = process.argv[2] ?? "http://127.0.0.1:8787/vltava-koridor5.pmtiles";
const glyphs = process.argv[3] ?? "http://127.0.0.1:8787/glyphs/{fontstack}/{range}.pbf";

fs.mkdirSync(out, { recursive: true });
for (const theme of Object.values(themes)) {
  const style = buildStyle({ theme, tilesUrl, glyphs });
  const file = path.join(out, `style-${theme.id}.json`);
  fs.writeFileSync(file, JSON.stringify({ style, route: routeLayers(theme) }, null, 1));
  console.log(file, style.layers.length, "vrstev");
}
