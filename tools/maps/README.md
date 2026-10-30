# tools/maps

Nástroje pro vlastní OSM mapu (rozhodnutí 0001). Celý postup, měření a omezení jsou v `docs/mapy-osm.md`.

| Soubor | Účel |
|---|---|
| `extract.sh` | z buildu Protomaps vyřízne koridor kolem trasy do PMTiles |
| `koridor.mjs` | GeoJSON polygon koridoru (potřebuje `@turf/buffer`, `@turf/helpers`) |
| `fetch-assets.mjs` | stáhne MapLibre, pmtiles.js a písma pro lokální vykreslení |
| `build-style.ts` | vygeneruje styl den a noc z `packages/map-style` |
| `render.mjs`, `render.html`, `serve.mjs` | vykreslí výřezy do PNG (Playwright + Chromium) |

Výstupy a PMTiles jsou v `tools/maps/out/` (v `.gitignore`).
