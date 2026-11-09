import { ATTRIBUTION, SOURCE_ID, type BuildStyleOptions, type MapStyle, type StyleLayer } from "./style";
import type { MapTheme } from "./tokens";

/**
 * Ilustrovaný atlas (balík B, docs/design-prototyp.md §4). Dvě vrstvy nad stejnými dlaždicemi:
 *  1. **kolorovaná** (okrové bloky zástavby, zelené lesy, akvarelová řeka) – kreslí se všude dospod,
 *  2. **krycí** vrstva v barvě papíru, která kolorovanou vrstvu skryje všude mimo okolí ušlé části trasy
 *     (`revealLayers`, geometrii dodá `revealMask` z `reveal.ts`; MapLibre nemá ořezovou masku, proto se
 *     maska dělá „obráceně“: papír s dírou kolem trasy),
 *  3. **skica** (tužkové šrafování bloků, stromové a vinicové vzory, linky cest a řek, bez výplní) nad krytím,
 *     takže je vidět všude, i ve vybarvené části (shoduje se s jejími vzory, jen jí dává obrys).
 * Nad tím jsou popisky (IM Fell English kurzívou) a trasa (`routeLayers`).
 */

/** Začátek skicové vrstvy: sem aplikace vkládá krycí vrstvy (`beforeId`). Je to prázdná vrstva pozadí. */
export const ATLAS_SKETCH_START = "atlas-sketch-start";
/** Zdroje GeoJSON krycích vrstev (vnější a vnitřní okraj, viz `revealLayers`). Doplňuje aplikace. */
export const REVEAL_OUTER = "reveal-outer";
export const REVEAL_INNER = "reveal-inner";

/** Názvy vzorů (obrázků) bez předpony dne a noci; vyrábí je `tools/maps/make-patterns.py`. */
export const ATLAS_PATTERNS = ["blk-sketch", "blk-ink", "tree-sketch", "tree-ink", "vine-sketch", "vine-ink", "hatch-ink"] as const;
export type AtlasPattern = (typeof ATLAS_PATTERNS)[number];
/** Název obrázku ve stylu: `day-blk-ink`, `night-tree-sketch`, … */
export const patternName = (theme: MapTheme, pattern: AtlasPattern): string => `${theme.mode}-${pattern}`;

/**
 * Písmo popisků: kurzíva IM Fell (glyfy z `tools/maps/make-glyphs.py`; obsahuje všechna česká písmena a typografické
 * uvozovky a pomlčky). Záměrně jediné písmo v sadě: s více písmy by se glyfy žádaly pod názvem „A,B“ a soubory
 * v úložišti aplikace jsou po jednotlivých písmech.
 */
export const ATLAS_LABEL_FONT = ["IM Fell English Italic"];

const NAME = ["coalesce", ["get", "name:cs"], ["get", "name"]];
const kindIn = (...kinds: string[]) => ["in", ["get", "kind"], ["literal", kinds]];
const detailIn = (...kinds: string[]) => ["in", ["get", "kind_detail"], ["literal", kinds]];
const isPolygon = ["==", ["geometry-type"], "Polygon"];
const isLine = ["==", ["geometry-type"], "LineString"];
const zoomWidth = (...stops: number[]) => ["interpolate", ["exponential", 1.4], ["zoom"], ...stops];

/** Krytí akvarelové vody (plochy i rozpitý podklad řeky): papír pod ní prosvítá při každém přiblížení. */
export const WATER_WASH_OPACITY = 0.42;
/**
 * Jádro čárové řeky: do zoomu 12 sytý tah, pak slábne, protože od zoomu kolem 13 má Vltava v dlaždicích i plochu
 * koryta a sytý pruh uprostřed by z ní udělal plnou modrou.
 */
export const RIVER_CORE_OPACITY = ["interpolate", ["linear"], ["zoom"], 12, 0.95, 14, 0.45, 16, 0.3];

const URBAN = ["residential", "commercial", "industrial", "retail", "railway", "hospital", "school", "university", "college", "kindergarten", "military"];
const GREEN = ["park", "garden", "grass", "meadow", "grassland", "village_green", "recreation_ground", "playground", "pitch", "golf_course", "dog_park", "cemetery", "allotments", "nature_reserve", "national_park", "zoo", "wetland", "farmland"];
const WOOD = ["forest", "wood", "scrub"];
const VINE = ["vineyard", "orchard", "plant_nursery"];

/** Sestaví styl ilustrovaného atlasu nad schématem Protomaps Basemap (v4). */
export function buildAtlasStyle({ theme, tilesUrl, glyphs }: BuildStyleOptions): MapStyle {
  const a = theme.atlas;
  const layers: StyleLayer[] = [];
  const add = (l: StyleLayer) => layers.push(l);
  const v = (layer: string) => ({ source: SOURCE_ID, "source-layer": layer });
  const pat = (p: AtlasPattern) => patternName(theme, p);

  add({ id: "background", type: "background", paint: { "background-color": a.paper } });

  // ── 1. Kolorovaná vrstva (viditelná jen v masce kolem ušlé trasy) ────────────────────────────
  add({ id: "ink-wash", type: "fill", ...v("earth"), filter: isPolygon, paint: { "fill-color": a.wash } });
  add({
    id: "ink-green",
    type: "fill",
    ...v("landuse"),
    filter: kindIn(...GREEN),
    paint: { "fill-color": a.green, "fill-opacity": 0.45 },
  });
  add({
    id: "ink-wood",
    type: "fill",
    ...v("landuse"),
    filter: kindIn(...WOOD),
    paint: { "fill-pattern": pat("tree-ink") },
  });
  add({
    id: "ink-wood-low",
    type: "fill",
    ...v("landcover"),
    filter: kindIn("forest"),
    maxzoom: 8,
    paint: { "fill-pattern": pat("tree-ink") },
  });
  add({ id: "ink-wood-line", type: "line", ...v("landuse"), filter: kindIn(...WOOD), paint: { "line-color": a.forestLine, "line-width": 0.7, "line-opacity": 0.8 } });
  add({ id: "ink-vine", type: "fill", ...v("landuse"), filter: kindIn(...VINE), paint: { "fill-pattern": pat("vine-ink") } });
  add({ id: "ink-vine-line", type: "line", ...v("landuse"), filter: kindIn(...VINE), paint: { "line-color": a.vineLine, "line-width": 0.7 } });
  add({ id: "ink-urban", type: "fill", ...v("landuse"), filter: kindIn(...URBAN), paint: { "fill-pattern": pat("blk-ink") } });
  add({ id: "ink-urban-line", type: "line", ...v("landuse"), filter: kindIn(...URBAN), paint: { "line-color": a.blockLine, "line-width": 0.8 } });
  // Vodní plochy (při velkém přiblížení i koryto Vltavy) jako akvarel, ne plná modrá: stejná barva a krytí jako
  // rozpitý podklad čárové řeky, rozpitý břeh a pod ním světlejší pruh, aby plocha navázala na řeku z menších zoomů.
  add({ id: "ink-water", type: "fill", ...v("water"), filter: isPolygon, paint: { "fill-color": a.river, "fill-opacity": WATER_WASH_OPACITY, "fill-antialias": false } });
  add({
    id: "ink-water-bank",
    type: "line",
    ...v("water"),
    filter: isPolygon,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": a.river, "line-width": zoomWidth(10, 2, 14, 6, 18, 14), "line-offset": zoomWidth(10, 1, 14, 3, 18, 7), "line-opacity": 0.35, "line-blur": zoomWidth(10, 1, 14, 3, 18, 6) },
  });
  add({
    id: "ink-water-edge",
    type: "line",
    ...v("water"),
    filter: isPolygon,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": a.riverEdge, "line-width": 1.1, "line-opacity": 0.55, "line-blur": 0.8, "line-dasharray": [6, 1.4, 3, 1.1] },
  });
  // Akvarelová řeka (čárová): široký rozpitý podklad, hustší jádro a nepravidelný okraj z krátkých čárek.
  const river = ["all", isLine, kindIn("river", "stream", "canal")];
  add({
    id: "ink-river-wash",
    type: "line",
    ...v("water"),
    filter: river,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": a.river, "line-width": zoomWidth(8, 3, 12, 11, 14, 20, 18, 60), "line-opacity": WATER_WASH_OPACITY, "line-blur": zoomWidth(8, 1, 14, 6, 18, 14) },
  });
  add({
    id: "ink-river",
    type: "line",
    ...v("water"),
    filter: river,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": a.river, "line-width": zoomWidth(8, 1.4, 12, 6, 14, 11, 18, 36), "line-opacity": RIVER_CORE_OPACITY, "line-blur": 0.6 },
  });
  add({
    id: "ink-river-edge",
    type: "line",
    ...v("water"),
    filter: river,
    layout: { "line-cap": "butt", "line-join": "round" },
    paint: {
      "line-color": a.riverEdge,
      "line-width": 0.9,
      "line-opacity": 0.5,
      "line-gap-width": zoomWidth(8, 1.4, 12, 6, 14, 11, 18, 36),
      "line-dasharray": [6, 1.4, 3, 1.1],
    },
  });
  add({
    id: "ink-buildings",
    type: "fill",
    ...v("buildings"),
    filter: ["all", isPolygon, kindIn("building")],
    minzoom: 14.5,
    paint: { "fill-color": a.building, "fill-opacity": 0.65, "fill-outline-color": a.blockLine },
  });

  // ── 3. Skica (nad krytím; krycí vrstvy se vkládají před `ATLAS_SKETCH_START`) ─────────────────
  add({ id: ATLAS_SKETCH_START, type: "background", paint: { "background-color": a.paper, "background-opacity": 0 } });
  add({ id: "sk-urban", type: "fill", ...v("landuse"), filter: kindIn(...URBAN), paint: { "fill-pattern": pat("blk-sketch"), "fill-opacity": 0.85 } });
  add({ id: "sk-urban-line", type: "line", ...v("landuse"), filter: kindIn(...URBAN), paint: { "line-color": a.pencil, "line-width": 0.6, "line-opacity": 0.8 } });
  add({ id: "sk-wood", type: "fill", ...v("landuse"), filter: kindIn(...WOOD), paint: { "fill-pattern": pat("tree-sketch"), "fill-opacity": 0.85 } });
  add({ id: "sk-wood-low", type: "fill", ...v("landcover"), filter: kindIn("forest"), maxzoom: 8, paint: { "fill-pattern": pat("tree-sketch"), "fill-opacity": 0.85 } });
  add({ id: "sk-wood-line", type: "line", ...v("landuse"), filter: kindIn(...WOOD), paint: { "line-color": a.pencil, "line-width": 0.6, "line-opacity": 0.8 } });
  add({ id: "sk-vine", type: "fill", ...v("landuse"), filter: kindIn(...VINE), paint: { "fill-pattern": pat("vine-sketch"), "fill-opacity": 0.85 } });
  add({ id: "sk-green-line", type: "line", ...v("landuse"), filter: kindIn(...GREEN), paint: { "line-color": a.pencilSoft, "line-width": 0.5, "line-dasharray": [3, 2] } });
  add({ id: "sk-water-edge", type: "line", ...v("water"), filter: isPolygon, paint: { "line-color": a.pencil, "line-width": 0.7, "line-opacity": 0.7 } });
  // Druhá, přerušovaná tužková linka kousek od břehu: vodní plocha ve skice je kresba, ne výplň.
  add({
    id: "sk-water-ripple",
    type: "line",
    ...v("water"),
    filter: isPolygon,
    minzoom: 12,
    paint: { "line-color": a.pencilSoft, "line-width": 0.6, "line-opacity": 0.8, "line-offset": zoomWidth(12, 2, 18, 8), "line-dasharray": [5, 3] },
  });
  add({
    id: "sk-river",
    type: "line",
    ...v("water"),
    filter: river,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": a.pencil, "line-width": zoomWidth(8, 0.5, 14, 1.2, 18, 3), "line-opacity": 0.8 },
  });
  add({
    id: "sk-buildings",
    type: "line",
    ...v("buildings"),
    filter: ["all", isPolygon, kindIn("building")],
    minzoom: 14.5,
    paint: { "line-color": a.pencil, "line-width": 0.5, "line-opacity": 0.8 },
  });

  const road = (id: string, filter: unknown, color: string, width: unknown, extra: Partial<StyleLayer> = {}) =>
    add({
      id,
      type: "line",
      ...v("roads"),
      filter: ["all", isLine, filter],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": color, "line-width": width, "line-opacity": 0.85 },
      ...extra,
    });
  road("sk-roads-minor", ["all", kindIn("minor_road", "other"), ["!", detailIn("service", "alley", "parking_aisle")]], a.pencilSoft, zoomWidth(12, 0.4, 14, 1, 18, 4), { minzoom: 12 });
  road("sk-roads-service", ["all", kindIn("minor_road"), detailIn("service", "alley", "parking_aisle")], a.pencilSoft, zoomWidth(14, 0.4, 18, 2), { minzoom: 14 });
  road("sk-roads-major", kindIn("major_road"), a.pencil, zoomWidth(9, 0.4, 11, 1.2, 14, 2, 18, 7), { minzoom: 9.5 });
  road("sk-roads-highway", kindIn("highway"), a.pencil, zoomWidth(5, 0.7, 11, 1.8, 14, 2.6, 18, 8));
  road("sk-roads-path", kindIn("path"), a.pencil, zoomWidth(14, 0.5, 18, 1.8), {
    minzoom: 14,
    paint: { "line-color": a.pencil, "line-width": zoomWidth(14, 0.5, 18, 1.8), "line-opacity": 0.85, "line-dasharray": [2, 1.5] },
  });
  road("sk-roads-rail", ["all", kindIn("rail"), detailIn("rail", "narrow_gauge", "tram")], a.pencil, zoomWidth(8, 0.5, 14, 1, 18, 2.4), {
    minzoom: 10,
    paint: { "line-color": a.pencil, "line-width": zoomWidth(8, 0.5, 14, 1, 18, 2.4), "line-opacity": 0.85, "line-dasharray": [3, 2] },
  });

  // ── Popisky: kurzíva IM Fell, názvy čtvrtí a míst; řeka šikmo podél toku ─────────────────────
  const place = (id: string, filter: unknown, minzoom: number, size: unknown) =>
    add({
      id,
      type: "symbol",
      ...v("places"),
      filter,
      minzoom,
      layout: { "text-field": NAME, "text-font": ATLAS_LABEL_FONT, "text-size": size, "text-max-width": 8, "text-padding": 4 },
      paint: { "text-color": a.label, "text-halo-color": a.labelHalo, "text-halo-width": 1.6 },
    });
  place("places-city", ["all", kindIn("locality"), detailIn("city")], 5, ["interpolate", ["linear"], ["zoom"], 5, 14, 12, 24]);
  place("places-town", ["all", kindIn("locality"), detailIn("town")], 8, ["interpolate", ["linear"], ["zoom"], 8, 13, 13, 20]);
  place("places-village", ["all", kindIn("locality"), detailIn("village")], 10, ["interpolate", ["linear"], ["zoom"], 10, 12, 14, 17]);
  place("places-small", ["all", kindIn("locality"), detailIn("hamlet", "locality", "isolated_dwelling")], 12, 12);
  place("places-quarter", kindIn("neighbourhood", "macrohood"), 12, ["interpolate", ["linear"], ["zoom"], 12, 11, 15, 15]);

  add({
    id: "water-label",
    type: "symbol",
    ...v("water"),
    filter: ["all", isLine, kindIn("river")],
    minzoom: 10.5,
    layout: {
      "text-field": NAME,
      "text-font": ATLAS_LABEL_FONT,
      "text-size": ["interpolate", ["linear"], ["zoom"], 10.5, 13, 15, 19],
      "symbol-placement": "line",
      "text-letter-spacing": 0.18,
    },
    paint: { "text-color": a.labelWater, "text-halo-color": a.labelHalo, "text-halo-width": 1.4 },
  });

  return {
    version: 8,
    name: `FootAtlas atlas ${theme.id}`,
    sources: { [SOURCE_ID]: { type: "vector", url: `pmtiles://${tilesUrl}`, attribution: ATTRIBUTION } },
    glyphs,
    layers,
  };
}

/**
 * Krycí vrstvy: papír s dírou kolem ušlé části trasy (zdroje `reveal-outer` a `reveal-inner` doplní aplikace
 * z `revealMask`). Vnější vrstva je plně krycí, vnitřní jen zčásti, takže okraj vybarvené části je měkký.
 * Aplikace je vkládá před vrstvu `ATLAS_SKETCH_START`.
 */
export function revealLayers(theme: MapTheme): StyleLayer[] {
  const fill = (id: string, source: string, opacity: number): StyleLayer => ({
    id,
    type: "fill",
    source,
    paint: { "fill-color": theme.atlas.paper, "fill-opacity": opacity, "fill-antialias": false },
  });
  return [fill("reveal-cover-inner", REVEAL_INNER, 0.55), fill("reveal-cover-outer", REVEAL_OUTER, 1)];
}

/** Zdroj GeoJSON míst (zastávky a malé objevy); vlastnosti viz `PlaceFeatureProps` v aplikaci. */
export const PLACES_SOURCE = "places";
/** Zdroj GeoJSON polohy výpravy. */
export const YOU_SOURCE = "you";

/**
 * Vrstvy míst nad mapou: kresby (loď, zámek, most), razítka malých objevů, pečeti zastávek a štítek s metry
 * u další zastávky. Obrázky pojmenovává `tools/maps/make-medallions.py`, vlastnosti dodává aplikace
 * (`image`, `drawing`, `label`, `state`, `stop`, `rank`, `name`). Velikost ikon roste s přiblížením
 * (přehled / trasa / detail).
 */
export function placeLayers(theme: MapTheme): StyleLayer[] {
  const a = theme.atlas;
  const sym = (id: string, layout: Record<string, unknown>, paint: Record<string, unknown>, extra: Partial<StyleLayer> = {}): StyleLayer => ({
    id,
    type: "symbol",
    source: PLACES_SOURCE,
    layout,
    paint,
    ...extra,
  });
  const labelPaint = (halo: number) => ({ "text-color": a.label, "text-halo-color": a.labelHalo, "text-halo-width": halo });
  return [
    sym(
      "places-drawing",
      {
        "icon-image": ["concat", "drawing-", ["get", "drawing"]],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 11.5, 0.5, 15, 0.85],
        "icon-offset": ["literal", [0, -34]],
        "icon-allow-overlap": true,
        "symbol-sort-key": ["get", "rank"],
      },
      { "icon-opacity": 0.85 },
      { minzoom: 11.5, filter: ["!=", ["get", "drawing"], ""] },
    ),
    sym(
      "places-discovery",
      {
        "icon-image": ["get", "image"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 8, 0.3, 10.5, 0.5, 13, 0.72, 15, 0.9],
        "icon-allow-overlap": true,
        "symbol-sort-key": ["get", "rank"],
        "text-field": ["step", ["zoom"], "", 12.3, ["get", "name"]],
        "text-font": ATLAS_LABEL_FONT,
        "text-size": 13,
        "text-anchor": "left",
        "text-offset": ["literal", [1.5, 0]],
        "text-optional": true,
      },
      labelPaint(1.8),
      { filter: ["!", ["get", "stop"]] },
    ),
    sym(
      "places-stop",
      {
        "icon-image": ["get", "image"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.4, 10.5, 0.62, 12, 0.92, 13.5, 1.1],
        "icon-allow-overlap": true,
        "symbol-sort-key": ["get", "rank"],
        "text-field": ["get", "name"],
        "text-font": ATLAS_LABEL_FONT,
        "text-size": 14,
        "text-anchor": "left",
        "text-offset": ["interpolate", ["linear"], ["zoom"], 9, ["literal", [1.0, 0]], 12, ["literal", [2.0, 0]]],
        "text-optional": true,
      },
      labelPaint(2),
      { filter: ["get", "stop"] },
    ),
    sym(
      "places-next-label",
      {
        "icon-image": "pill",
        "icon-text-fit": "both",
        "icon-text-fit-padding": ["literal", [1, 7, 1, 7]],
        "icon-allow-overlap": true,
        "text-field": ["get", "label"],
        "text-font": ATLAS_LABEL_FONT,
        "text-size": 12,
        "text-anchor": "top",
        "text-offset": ["interpolate", ["linear"], ["zoom"], 10, ["literal", [0, 1.5]], 13.5, ["literal", [0, 2.5]]],
        "text-allow-overlap": true,
      },
      { "text-color": a.paper },
      { minzoom: 10, filter: ["==", ["get", "state"], "next"] },
    ),
  ];
}

/** Poloha výpravy: rumělkový bod s papírovým kroužkem a měkkou svatozáří (zdroj `you`). */
export function youLayers(theme: MapTheme): StyleLayer[] {
  return [
    { id: "you-halo", type: "circle", source: YOU_SOURCE, paint: { "circle-radius": 15, "circle-color": theme.route.done, "circle-opacity": 0.2 } },
    {
      id: "you-dot",
      type: "circle",
      source: YOU_SOURCE,
      paint: { "circle-radius": 8, "circle-color": theme.route.done, "circle-stroke-color": theme.atlas.paper, "circle-stroke-width": 3 },
    },
  ];
}
