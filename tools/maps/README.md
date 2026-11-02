# tools/maps

Nástroje pro vlastní OSM mapu (rozhodnutí 0001). Celý postup, měření a omezení jsou v `docs/mapy-osm.md`.

| Soubor | Účel |
|---|---|
| `extract.sh` | z buildu Protomaps vyřízne koridor kolem trasy do PMTiles |
| `koridor.mjs` | GeoJSON polygon koridoru (potřebuje `@turf/buffer`, `@turf/helpers`) |
| `fetch-assets.mjs` | stáhne MapLibre, pmtiles.js a písma pro lokální vykreslení |
| `build-style.ts` | vygeneruje styl den a noc z `packages/map-style` |
| `render.mjs`, `render.html`, `serve.mjs` | vykreslí výřezy do PNG (Playwright + Chromium) |
| `render-atlas.mjs`, `render-atlas.html`, `render-atlas-entry.ts` | vykreslí **ilustrovaný atlas** (balík B, rozhodnutí 0020) v MapLibre GL JS: styl, vzory, pečeti a maska z kódu aplikace; data z `out/vltava-koridor5.pmtiles` nebo přímo z buildu Protomaps přes Range; výstup PNG (výchozí `docs/mapa-atlas/`, v repu převedeno do JPEG) |
| `make-medallions.py` | pečeti a razítka míst, štítek metrů, kresby (loď, zámek, most) → `apps/mobile/assets/map/medallions`, `src/map/medallionFiles.ts` |
| `make-patterns.py` | vzory výplní (čtverečky zástavby, stromy, vinice, šrafy; skica a kolorovaná varianta, den a noc) → `apps/mobile/assets/map/patterns`, `src/map/patternFiles.ts` |
| `make-glyphs.py` | glyfy (PBF) písma IM Fell English Italic pro popisky → `apps/mobile/assets/map/glyphs`, `src/map/glyphFiles.ts` |

Výstupy a PMTiles jsou v `tools/maps/out/` (v `.gitignore`).
