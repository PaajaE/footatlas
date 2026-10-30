// Vyrobí GeoJSON polygon koridoru kolem trasy (buffer v km) pro `pmtiles extract --region`.
//   node koridor.mjs <route.json> <km> <out.geojson>
// Potřebuje @turf/buffer a @turf/helpers (viz README v tools/maps).
import fs from "node:fs";
import buffer from "@turf/buffer";
import { lineString } from "@turf/helpers";

const [, , inFile, km, out] = process.argv;
if (!inFile || !km || !out) {
  console.error("použití: node koridor.mjs <route.json> <km> <out.geojson>");
  process.exit(1);
}
const route = JSON.parse(fs.readFileSync(inFile, "utf8"));
const poly = buffer(lineString(route.coordinates), Number(km), { units: "kilometers" });
fs.writeFileSync(out, JSON.stringify(poly));
console.log("body polygonu:", poly.geometry.coordinates[0].length);
