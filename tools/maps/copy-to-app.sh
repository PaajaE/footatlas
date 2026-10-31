#!/usr/bin/env bash
# Zkopíruje vygenerovaný koridor (PMTiles) do aplikace, kde ho Metro přibalí (apps/mobile/assets/map).
# Soubor je v .gitignore (velká binárka); bez něj aplikace nejde sestavit.
# Vytvoření: tools/maps/extract.sh packages/content/data/vltavska-stezka/route.json 5 15
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/maps/out/vltava-koridor5.pmtiles"
[ -f "$SRC" ] || { echo "Chybí $SRC; spusťte nejdřív tools/maps/extract.sh (viz docs/mapy-osm.md)" >&2; exit 1; }
mkdir -p "$ROOT/apps/mobile/assets/map"
cp "$SRC" "$ROOT/apps/mobile/assets/map/vltava-koridor5.pmtiles"
echo "Hotovo: apps/mobile/assets/map/vltava-koridor5.pmtiles ($(du -h "$SRC" | cut -f1))"
