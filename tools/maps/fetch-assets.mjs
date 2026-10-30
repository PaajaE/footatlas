// Stáhne knihovny a písma pro lokální vykreslení mapy do tools/maps/out/{vendor,glyphs}.
//   node fetch-assets.mjs
// Písma jsou Noto Sans (SIL OFL) ve formátu PBF z OpenFreeMap; pro produkci je nutné hostovat vlastní kopii (viz docs/mapy-osm.md).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "out");
const files = [
  ["https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js", "vendor/maplibre-gl.js"],
  ["https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css", "vendor/maplibre-gl.css"],
  ["https://unpkg.com/pmtiles@3.2.1/dist/pmtiles.js", "vendor/pmtiles.js"],
];
// 0-255 latinka, 256-511 rozšířená latinka (české znaky), 8192-8447 interpunkce (pomlčky, uvozovky).
for (const font of ["Noto Sans Regular", "Noto Sans Italic"]) {
  for (const range of ["0-255", "256-511", "8192-8447", "8448-8703"]) {
    files.push([`https://tiles.openfreemap.org/fonts/${encodeURIComponent(font)}/${range}.pbf`, `glyphs/${font}/${range}.pbf`]);
  }
}

for (const [url, rel] of files) {
  const dest = path.join(out, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(res.status, rel, fs.statSync(dest).size);
}
