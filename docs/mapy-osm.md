# Vlastní OSM mapa (rozhodnutí 0001)

Stav: ověřený prototyp na dosažitelných datech, zatím jen v prohlížeči (MapLibre GL JS). Na telefonu v aplikaci nezkoušeno. Datum měření: 30. 10. 2026.

## Shrnutí
- Z veřejného buildu Protomaps (data OpenStreetMap, schéma Protomaps Basemap 4.15.2) se přes HTTP Range stáhne jen koridor kolem trasy. Koridor Vltavské stezky ±5 km do zoomu 15 má **26 MB**.
- Pergamenový styl (den, noc) je generovaný z tokenů v `packages/map-style` (13 testů). Vykreslení výřezů proběhlo bez chyb v Chromiu přes Playwright, výsledky jsou v `docs/mapy-osm/`.
- Velké binárky (PMTiles) se do gitu nedávají (`.gitignore`), patří na Cloudflare R2.

## Co bylo z kontejneru dosažitelné
| Zdroj | Výsledek |
|---|---|
| `build.protomaps.com/<datum>.pmtiles` (HTTP Range) | funguje; použito (build 20261029) |
| `go install github.com/protomaps/go-pmtiles@latest` (proxy.golang.org) | funguje; `extract` s `--region` (GeoJSON) a `--dry-run` |
| `tiles.openfreemap.org` (styl, písma PBF) | funguje; použita jen písma Noto Sans pro lokální vykreslení |
| `unpkg.com` (MapLibre GL JS 4.7.1, pmtiles 3.2.1) | funguje |
| `download.geofabrik.de` (Planetiler z extraktu Česka) | **nedostupné** (spojení zrušeno proxy), nezkoušeno dál |
| `overpass-api.de` | **nedostupné** |
| API GitHubu mimo repo projektu | zamítnuto |

Planetiler z vlastního extraktu proto nebyl vyzkoušen. Protomaps build stačí, nic dalšího nepotřebujeme.

## Postup (reprodukovatelný)
```bash
# 1) nástroje
GOBIN=$HOME/bin go install github.com/protomaps/go-pmtiles@latest
cd tools/maps && npm i @turf/buffer@7 @turf/helpers@7        # jen pro tvorbu koridoru

# 2) koridor: ±5 km kolem trasy, zoomy 0-15 (~9 s, stáhne ~27 MB)
tools/maps/extract.sh packages/content/data/vltavska-stezka/route.json 5 15
#    -> tools/maps/out/vltava-koridor5.pmtiles

# 3) vykreslení (den a noc) do docs/mapy-osm/
node tools/maps/fetch-assets.mjs                              # MapLibre, pmtiles.js, písma do tools/maps/out
pnpm dlx tsx tools/maps/build-style.ts                        # styl z tokenů -> tools/maps/out/style-*.json
node tools/maps/render.mjs                                    # potřebuje Playwright s Chromiem
```
`extract.sh` hledá nejnovější denní build Protomaps (zkouší dnešek a 14 dní zpět). Alternativně `pmtiles extract <build> <výstup> --region=koridor.geojson --maxzoom=15`.

## Velikosti a náklady (orientačně)
Měřeno `pmtiles extract --dry-run` na buildu 20261029.

| Rozsah | maxzoom 14 | maxzoom 15 |
|---|---|---|
| Koridor Vltavské stezky ±2 km (62 km) | 9,1 MB | 16 MB |
| Koridor ±5 km | 13 MB | **26 MB** |
| Koridor ±10 km | 20 MB | 42 MB |
| Česko (obdélník 12,09–18,86 / 48,55–51,06, zahrnuje části sousedů) | 875 MB | 1,7 GB (maxzoom 12: 238 MB) |

Odhad pro koridor 100 km: přibližně 0,4 MB na km při ±5 km a zoomu 15, tedy **40 MB** (rozptyl 25–45 MB; úsek přes Prahu je hustší než venkov). Zoom 15 je v Protomaps nejvyšší, vyšší se přibližuje (overzoom).

Předpoklady k nákladům (ověřit v aktuálním ceníku Cloudflare R2; z paměti): úložiště přibližně 0,015 USD / GB / měsíc s bezplatnou částí 10 GB, odchozí data (egress) zdarma, čtecí operace (Class B) s velkým bezplatným objemem. Z toho:
- Celé Česko ve zoomu 15 (≈1,7 GB) se podle uvedených předpokladů vejde do bezplatné části úložiště.
- Hlavní náklad nebude úložiště, ale počet čtecích operací: jeden pohled na mapu = desítky Range požadavků. Cachovat na Cloudflare (hlavičky, Cache API), aby se k R2 nechodilo pokaždé.
- Aktualizace dat: build Protomaps je denní; pro nás stačí obnovovat jednou za měsíc nebo čtvrtletí.

## Styl (`packages/map-style`)
- `tokens.ts`: palety `parchmentDay`, `parchmentNight` (barvy z mockupů) a barvy trasy. Žádná barva není ve stylu natvrdo (test to hlídá).
- `style.ts`: `buildStyle({ theme, tilesUrl, glyphs })` vrací styl MapLibre nad schématem Protomaps (vrstvy `earth`, `landcover`, `landuse`, `water`, `buildings`, `roads`, `places`), popisky `name:cs` s rezervou `name`, atribuce © přispěvatelé OpenStreetMap ve zdroji. `routeLayers(theme)` přidává vrstvy trasy nad mapu (zdroje `route-done`, `route-rest` doplní aplikace).
- **Druhý vizuální styl** (rozhodnutí 0002) = další objekt `MapTheme` s jinou paletou; pokud se změní i tvar vrstev, nová funkce vedle `buildStyle`.

## Porovnání s mockupy
Obrázky: `docs/mapy-osm/` (`vyprava`, `zastavka`, `praha`, `cela-trasa`, každý `-den` a `-noc`). Mockupy ve `docs/mockupy/assets` jsou z OpenFreeMap (schéma OpenMapTiles), styl tu je přepsaný pro jiné schéma, proto se **liší v detailu**:
- Celkový dojem (pergamen, ušlý úsek červeně, zbytek čárkovaně, popisky kurzívou) odpovídá.
- Naše vrstvy jsou jednodušší: nejsou stíny (hillshade), bez poznávacích ikon a štítků silnic, méně druhů ploch. Zeleň a pole jsou slabší než u mockupů.
- Řeka na hlavní trase je tenká modrá linka; plocha Vltavy je vykreslená jen tam, kde je v OSM polygon (v Praze ano).
- Ladění barev a hustoty (zejména vedlejší cesty, ty jsem skryl do zoomu 12) je záležitost pro designéra a pro zkoušku na telefonu.

## Spike na telefonu (Android, 30. 10. 2026)
Zařízení: motorola edge 50 fusion, Android 16. `@maplibre/maplibre-react-native` 11.5.1 (nativní MapLibre 13.6.1), obrazovka `apps/mobile/src/app/mapa-spike.tsx` (jen pro vývoj, ExpeditionMap se nemění). Koridor Vltavské stezky ±5 km, zoom 0–15, 26 MB.
- **`pmtiles://` čte knihovna přímo, bez Workeru a bez převodu na MBTiles.** Vykreslilo se z HTTP s Range (`pmtiles://http://127.0.0.1:8787/...`, `tools/maps/serve.mjs` + `adb reverse`) i ze souboru v úložišti aplikace (`pmtiles://file:///data/user/0/cz.footatlas.app/files/...`).
- Pergamenový styl z `packages/map-style` se vykreslil včetně českých popisků (Praha, zoom 12).
- Soubor v `/storage/emulated/0/Android/data/<balíček>/files/` nahraný přes `adb push` se nenačetl (`Cannot read file`); v úložišti aplikace (`files/`) ano. Offline soubory proto stahovat do `files/` aplikace.
- Písma v spiku jdou z OpenFreeMap (síť). Pro produkci vlastní kopie, viz níže.
- Neověřeno: iOS (u knihovny je otevřený problém s `pmtiles://` na iOS), výkon na slabších telefonech, hustota popisků, vrstvy trasy a značky nad mapou, R2 s Range a cache.

## Co není ověřené
- **Zobrazení na telefonu:** na Androidu ověřeno (viz spike výše), `pmtiles://` funguje přímo. Na iOS neověřeno; kdyby selhalo, záloha je Worker nad R2 vracející dlaždice `/tiles/{z}/{x}/{y}` nebo převod na MBTiles.
- **Písma.** Při renderu se používají Noto Sans (OFL) z OpenFreeMap. Pro produkci je nutná vlastní kopie (např. na R2) a oddělit se od služby třetí strany.
- **Offline.** Koridor 26 MB se dá stáhnout jako jeden soubor na zařízení (spec 11.2). Postup stahování, aktualizací a ověření licence dat (ODbL) zbývá.
- **Hustota popisků a výkon** na slabších telefonech.
- Přesnost a úplnost dat OSM v okolí trasy (např. názvy, cesty).
- Právo na údaje: OSM data jsou pod ODbL, atribuce „© přispěvatelé OpenStreetMap“ je povinná a je součástí stylu. Samostatné posouzení podmínek hostování souborů Protomaps buildu (jde o odvozená data OSM) nebylo provedeno.

## Doporučení pro hostování
1. Soubory PMTiles na **R2** (bez přímého hostingu v gitu). Jeden soubor na koridor výpravy, např. `maps/<id-vyprave>.pmtiles`.
2. Doručení přes **Worker** nebo veřejnou doménu bucketu s Range požadavky; nastavit CORS a `Cache-Control` (dlouhá doba, soubor má verzi v názvu). Kdyby klient neuměl `pmtiles://`, stejný Worker může servírovat dlaždice.
3. Písma (PBF) a styl (JSON) hostovat vedle; styl generovat z `packages/map-style` při sestavení.
4. Pro Česko jako celek zvolit zoom 12–14 jako základ (238–875 MB) a podrobnější koridory (zoom 15) stahovat podle výprav.
5. Mapy.com zůstává volitelným druhým podkladem přes `apps/api` (rozhodnutí 0001).
