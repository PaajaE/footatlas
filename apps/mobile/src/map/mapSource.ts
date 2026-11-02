import Constants from "expo-constants";

/**
 * Mapa se stahuje ze serveru (Cloudflare R2 přes `apps/api`), ne z APK (rozhodnutí 0013).
 * Soubor má otisk obsahu v názvu, takže se nemění; nová verze dat = nový název a nová verze aplikace.
 * Hodnoty vytváří `tools/maps/publish.sh` při nahrání do R2, neupravovat ručně.
 */
export const MAP_FILE = {
  key: "maps/vltava-koridor5-6d4c3f7f0be6.pmtiles",
  name: "vltava-koridor5-6d4c3f7f0be6.pmtiles",
  sizeBytes: 26198416,
  sha256: "6d4c3f7f0be6f12f6084c42a3a5d80a34eb97b0c812ce45952331e86b9058c19",
} as const;

/** Adresa serveru z `extra.apiBaseUrl` v app.json (bez koncového lomítka). */
export function apiBaseUrl(): string {
  const base = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  if (!base) throw new Error("Adresa serveru není nastavena (extra.apiBaseUrl v app.json).");
  return base.replace(/\/+$/, "");
}

export function mapFileUrl(): string {
  return `${apiBaseUrl()}/content/${MAP_FILE.key}`;
}
