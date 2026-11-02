#!/usr/bin/env bash
# Nahraje koridor (PMTiles) do Cloudflare R2 pod názvem s otiskem obsahu a přepíše apps/mobile/src/map/mapSource.ts.
# Použití: tools/maps/publish.sh [soubor.pmtiles]   (výchozí tools/maps/out/vltava-koridor5.pmtiles)
# Potřebuje přihlášený wrangler (npx wrangler login) a bucket footatlas-content. Soubor v gitu není (viz .gitignore).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="${1:-$ROOT/tools/maps/out/vltava-koridor5.pmtiles}"
BUCKET="footatlas-content"
[ -f "$SRC" ] || { echo "Chybí $SRC; vytvořte ho přes tools/maps/extract.sh (docs/mapy-osm.md)" >&2; exit 1; }

SHA="$(shasum -a 256 "$SRC" | cut -c1-64)"
SIZE="$(stat -f%z "$SRC" 2>/dev/null || stat -c%s "$SRC")"
BASE="$(basename "$SRC" .pmtiles)"
NAME="$BASE-${SHA:0:12}.pmtiles"

(cd "$ROOT/apps/api" && npx wrangler r2 object put "$BUCKET/maps/$NAME" --file "$SRC" --content-type application/octet-stream --remote)

cat > "$ROOT/apps/mobile/src/map/mapSource.ts" <<TS
import Constants from "expo-constants";

/**
 * Mapa se stahuje ze serveru (Cloudflare R2 přes \`apps/api\`), ne z APK (rozhodnutí 0013).
 * Soubor má otisk obsahu v názvu, takže se nemění; nová verze dat = nový název a nová verze aplikace.
 * Hodnoty vytváří \`tools/maps/publish.sh\` při nahrání do R2, neupravovat ručně.
 */
export const MAP_FILE = {
  key: "maps/$NAME",
  name: "$NAME",
  sizeBytes: $SIZE,
  sha256: "$SHA",
} as const;

/** Adresa serveru z \`extra.apiBaseUrl\` v app.json (bez koncového lomítka). */
export function apiBaseUrl(): string {
  const base = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  if (!base) throw new Error("Adresa serveru není nastavena (extra.apiBaseUrl v app.json).");
  return base.replace(/\/+\$/, "");
}

export function mapFileUrl(): string {
  return \`\${apiBaseUrl()}/content/\${MAP_FILE.key}\`;
}
TS
echo "Nahráno: maps/$NAME ($SIZE B). Nezapomeňte zvýšit versionCode a sestavit aplikaci."
