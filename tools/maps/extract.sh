#!/usr/bin/env bash
# Vyřízne z veřejného buildu Protomaps (OpenStreetMap) koridor kolem trasy do souboru PMTiles.
#   tools/maps/extract.sh [route.json] [km] [maxzoom] [výstup.pmtiles]
# Potřebuje: go-pmtiles (`go install github.com/protomaps/go-pmtiles@latest`, binárka `go-pmtiles`
# nebo `pmtiles` v PATH) a node s balíčky @turf/buffer a @turf/helpers (viz README.md).
# Přes HTTP Range stáhne jen potřebné dlaždice (desítky MB), ne celý build (~100+ GB).
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
route="${1:-$here/../../packages/content/data/vltavska-stezka/route.json}"
km="${2:-5}"
maxzoom="${3:-15}"
out="${4:-$here/out/vltava-koridor${km}.pmtiles}"

bin="$(command -v pmtiles || command -v go-pmtiles || true)"
[ -n "$bin" ] || { echo "Chybí pmtiles / go-pmtiles v PATH." >&2; exit 1; }

# Nejnovější denní build (zveřejňují se s malým zpožděním, zkusí se pár dní zpět).
build=""
for i in $(seq 0 14); do
  d="$(date -u -d "-$i day" +%Y%m%d)"
  code="$(curl -s -o /dev/null -I -w '%{http_code}' "https://build.protomaps.com/$d.pmtiles" || true)"
  if [ "$code" = "200" ]; then build="https://build.protomaps.com/$d.pmtiles"; break; fi
done
[ -n "$build" ] || { echo "Nenalezen žádný build Protomaps za posledních 14 dní." >&2; exit 1; }
echo "Zdroj: $build"

mkdir -p "$(dirname "$out")"
region="$(dirname "$out")/koridor${km}.geojson"
node "$here/koridor.mjs" "$route" "$km" "$region"
"$bin" extract "$build" "$out" --region="$region" --maxzoom="$maxzoom"
ls -l "$out"
