import { Asset } from "expo-asset";
import { Directory, File, Paths } from "expo-file-system";
import { GLYPH_FILES } from "./glyphFiles";

/** Koridor Vltavské stezky ±5 km, zoom 0–15 (`tools/maps/copy-to-app.sh` ho zkopíruje do `assets/map`). */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TILES_MODULE: number = require("../../assets/map/vltava-koridor5.pmtiles");

export interface MapAssets {
  /** Adresa zdroje dlaždic ve tvaru, který čte MapLibre (soubor v úložišti aplikace). */
  tilesUrl: string;
  /** Šablona písem pro MapLibre (`{fontstack}` a `{range}` doplní knihovna). */
  glyphs: string;
}

let ready: Promise<MapAssets> | null = null;

/**
 * Připraví mapová data: přibalené soubory se zkopírují z balíčku do úložiště aplikace, protože MapLibre
 * čte `pmtiles://` jen ze souboru (z APK ne). Kopie nese otisk souboru v názvu, takže nová verze dat
 * se zkopíruje znovu a stará se smaže. Dokončená kopie se pozná podle značky `.ok`, přerušená se zopakuje.
 * Selhání se zkusí příště znovu.
 */
export function prepareMapAssets(): Promise<MapAssets> {
  ready ??= doPrepare().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

async function localFile(module: number): Promise<{ file: File; hash: string }> {
  const asset = await Asset.fromModule(module).downloadAsync();
  if (!asset.localUri) throw new Error("Přibalený soubor nemá místní adresu.");
  return { file: new File(asset.localUri), hash: asset.hash ?? asset.name };
}

async function doPrepare(): Promise<MapAssets> {
  const dir = new Directory(Paths.document, "map");
  dir.create({ intermediates: true, idempotent: true });

  const tiles = await localFile(TILES_MODULE);
  const name = `vltava-koridor5-${tiles.hash.slice(0, 12)}.pmtiles`;
  const target = new File(dir, name);
  const marker = new File(dir, `${name}.ok`);
  if (!(target.exists && marker.exists)) {
    if (marker.exists) marker.delete();
    if (target.exists) target.delete();
    await tiles.file.copy(target);
    if (tiles.file.size && target.size !== tiles.file.size) {
      target.delete();
      throw new Error("Kopie mapových dat je neúplná.");
    }
    marker.create({ overwrite: true });
  }
  for (const item of dir.list()) {
    if (item instanceof File && item.name.startsWith("vltava-koridor5-") && !item.name.startsWith(name)) item.delete();
  }

  const glyphDir = new Directory(dir, "glyphs");
  for (const g of GLYPH_FILES) {
    const fontDir = new Directory(glyphDir, g.font);
    fontDir.create({ intermediates: true, idempotent: true });
    const dest = new File(fontDir, `${g.range}.pbf`);
    if (dest.exists) continue;
    await (await localFile(g.module)).file.copy(dest);
  }

  return { tilesUrl: target.uri, glyphs: `${glyphDir.uri}/{fontstack}/{range}.pbf` };
}
