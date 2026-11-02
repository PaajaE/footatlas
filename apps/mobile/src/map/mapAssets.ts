import { Asset } from "expo-asset";
import { Directory, File, Paths } from "expo-file-system";
import { GLYPH_FILES } from "./glyphFiles";
import { MAP_FILE, mapFileUrl } from "./mapSource";

export interface MapAssets {
  /** Adresa zdroje dlaždic ve tvaru, který čte MapLibre (soubor v úložišti aplikace). */
  tilesUrl: string;
  /** Šablona písem pro MapLibre (`{fontstack}` a `{range}` doplní knihovna). */
  glyphs: string;
}

let ready: Promise<MapAssets> | null = null;

/**
 * Připraví mapová data: dlaždice se při prvním spuštění stáhnou ze serveru (26 MB) do úložiště aplikace, protože
 * MapLibre čte `pmtiles://` jen ze souboru; písma jsou malá a přibalená v APK. Stažený soubor se ověří podle velikosti
 * a dokončení se pozná podle značky `.ok`, nedokončené stahování se zopakuje. Při selhání se zkusí příště znovu.
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

  const target = new File(dir, MAP_FILE.name);
  const marker = new File(dir, `${MAP_FILE.name}.ok`);
  if (!(target.exists && marker.exists && target.size === MAP_FILE.sizeBytes)) {
    if (marker.exists) marker.delete();
    if (target.exists) target.delete();
    await File.downloadFileAsync(mapFileUrl(), target);
    if (target.size !== MAP_FILE.sizeBytes) {
      target.delete();
      throw new Error(`Stažená mapa má ${target.size} B místo ${MAP_FILE.sizeBytes} B.`);
    }
    marker.create({ overwrite: true });
  }
  for (const item of dir.list()) {
    if (item instanceof File && item.name.startsWith("vltava-koridor5-") && !item.name.startsWith(MAP_FILE.name)) item.delete();
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
