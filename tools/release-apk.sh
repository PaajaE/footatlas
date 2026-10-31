#!/usr/bin/env bash
# Sestaví podepsané release APK pro instalaci mimo Google Play.
# Použití: tools/release-apk.sh            (výstup dist/footatlas-<verze>-<versionCode>.apk)
# Potřebuje klíč a hesla v ~/.gradle/gradle.properties (FOOTATLAS_*), viz docs/release-apk.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/apps/mobile"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
PROPS="$HOME/.gradle/gradle.properties"

for key in FOOTATLAS_KEYSTORE FOOTATLAS_KEY_ALIAS FOOTATLAS_STORE_PASSWORD FOOTATLAS_KEY_PASSWORD; do
  grep -q "^$key=" "$PROPS" 2>/dev/null || { echo "Chybí $key v $PROPS" >&2; exit 1; }
done
KS="$(grep '^FOOTATLAS_KEYSTORE=' "$PROPS" | cut -d= -f2-)"
[ -f "$KS" ] || { echo "Klíč $KS neexistuje" >&2; exit 1; }
[ -d "$ANDROID_HOME" ] || { echo "ANDROID_HOME ($ANDROID_HOME) neexistuje" >&2; exit 1; }

# Mapová data se přibalují do APK; velký soubor PMTiles není v gitu (viz docs/mapy-osm.md).
[ -f "$MOBILE/assets/map/vltava-koridor5.pmtiles" ] || "$ROOT/tools/maps/copy-to-app.sh"

cd "$MOBILE"
# Složka android/ je generovaná; --clean zaručí, že vznikne ze šablony a pluginů, ne z minulého stavu.
npx expo prebuild --platform android --clean --no-install
# Jen arm64-v8a (všechny dnešní telefony); ostatní architektury zdvojnásobují velikost APK.
(cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a)

VERSION="$(node -p "require('./app.json').expo.version")"
CODE="$(node -p "require('./app.json').expo.android.versionCode")"
OUT="$ROOT/dist/footatlas-$VERSION-$CODE.apk"
mkdir -p "$ROOT/dist"
cp android/app/build/outputs/apk/release/app-release.apk "$OUT"
echo "Hotovo: $OUT ($(du -h "$OUT" | cut -f1))"
"$(ls -d "$ANDROID_HOME"/build-tools/*/apksigner | sort -V | tail -1)" verify --print-certs "$OUT" | grep -E "Signer: certificate (DN|SHA-256)"
