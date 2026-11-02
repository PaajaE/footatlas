import type { MapTheme } from "./tokens";

/** Minimální popis stylu MapLibre; záměrně bez závislosti na knihovně. */
export interface StyleLayer {
  id: string;
  type: "background" | "fill" | "line" | "symbol";
  source?: string;
  "source-layer"?: string;
  filter?: unknown;
  minzoom?: number;
  maxzoom?: number;
  layout?: Record<string, unknown>;
  paint: Record<string, unknown>;
}

export interface MapStyle {
  version: 8;
  name: string;
  sources: Record<string, { type: "vector"; url: string; attribution: string }>;
  glyphs: string;
  layers: StyleLayer[];
}

export interface BuildStyleOptions {
  theme: MapTheme;
  /** Adresa PMTiles, např. "https://tiles.example.com/vltava.pmtiles" (předpona pmtiles:// se doplní). */
  tilesUrl: string;
  /** Šablona písem, např. "https://.../fonts/{fontstack}/{range}.pbf". */
  glyphs: string;
}

export const ATTRIBUTION = '<a href="https://www.openstreetmap.org/copyright">© přispěvatelé OpenStreetMap</a>';
export const SOURCE_ID = "osm";
const REGULAR = ["Noto Sans Regular"];
const ITALIC = ["Noto Sans Italic"];
const NAME = ["coalesce", ["get", "name:cs"], ["get", "name"]];

const kindIn = (...kinds: string[]) => ["in", ["get", "kind"], ["literal", kinds]];
const detailIn = (...kinds: string[]) => ["in", ["get", "kind_detail"], ["literal", kinds]];
const isPolygon = ["==", ["geometry-type"], "Polygon"];
const isLine = ["==", ["geometry-type"], "LineString"];
const zoomWidth = (...stops: number[]) => ["interpolate", ["exponential", 1.4], ["zoom"], ...stops];

/** Sestaví styl mapy v pergamenové paletě nad schématem Protomaps Basemap (v4). */
export function buildStyle({ theme, tilesUrl, glyphs }: BuildStyleOptions): MapStyle {
  const c = theme.palette;
  const layers: StyleLayer[] = [];
  const add = (l: StyleLayer) => layers.push(l);
  const v = (layer: string) => ({ source: SOURCE_ID, "source-layer": layer });

  add({ id: "background", type: "background", paint: { "background-color": c.bg } });

  add({ id: "earth", type: "fill", ...v("earth"), filter: isPolygon, paint: { "fill-color": c.land } });

  add({
    id: "landcover-wood",
    type: "fill",
    ...v("landcover"),
    filter: kindIn("forest"),
    paint: { "fill-color": c.wood },
    maxzoom: 8,
  });
  add({
    id: "landcover-green",
    type: "fill",
    ...v("landcover"),
    filter: kindIn("grassland", "farmland"),
    paint: { "fill-color": c.park, "fill-opacity": 0.6 },
    maxzoom: 8,
  });

  add({
    id: "landuse-urban",
    type: "fill",
    ...v("landuse"),
    filter: kindIn("residential", "commercial", "industrial", "retail", "railway", "hospital", "school", "university", "college", "kindergarten", "military"),
    paint: { "fill-color": c.urban, "fill-opacity": 0.75 },
  });
  add({
    id: "landuse-green",
    type: "fill",
    ...v("landuse"),
    filter: kindIn("park", "garden", "grass", "meadow", "grassland", "village_green", "recreation_ground", "playground", "pitch", "golf_course", "dog_park", "cemetery", "allotments", "nature_reserve", "national_park", "zoo", "wetland", "farmland"),
    paint: { "fill-color": c.park, "fill-opacity": 0.7 },
  });
  add({
    id: "landuse-wood",
    type: "fill",
    ...v("landuse"),
    filter: kindIn("forest", "wood", "scrub"),
    paint: { "fill-color": c.wood },
  });

  add({
    id: "water-fill",
    type: "fill",
    ...v("water"),
    filter: isPolygon,
    paint: { "fill-color": c.water },
  });
  add({
    id: "water-line",
    type: "line",
    ...v("water"),
    filter: ["all", isLine, kindIn("river", "stream", "canal")],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": c.waterLine,
      "line-width": zoomWidth(8, 0.6, 14, 2.2, 18, 7),
    },
  });

  add({
    id: "buildings",
    type: "fill",
    ...v("buildings"),
    filter: ["all", isPolygon, kindIn("building")],
    minzoom: 14,
    paint: { "fill-color": c.bld, "fill-outline-color": c.bldLine },
  });

  const road = (id: string, filter: unknown, color: string, width: unknown, extra: Partial<StyleLayer> = {}) =>
    add({
      id,
      type: "line",
      ...v("roads"),
      filter: ["all", isLine, filter],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": color, "line-width": width },
      ...extra,
    });

  road("roads-minor", ["all", kindIn("minor_road", "other"), ["!", detailIn("service", "alley", "parking_aisle")]], c.roadMinor, zoomWidth(12, 0.4, 14, 1.2, 18, 6), { minzoom: 12 });
  road("roads-service", ["all", kindIn("minor_road"), detailIn("service", "alley", "parking_aisle")], c.roadMinor, zoomWidth(14, 0.5, 18, 3), { minzoom: 14 });
  road("roads-major", kindIn("major_road"), c.road, zoomWidth(9, 0.4, 11, 1.4, 14, 2.6, 18, 10), { minzoom: 9.5 });
  road("roads-highway", kindIn("highway"), c.road, zoomWidth(5, 0.8, 11, 2.2, 14, 3.6, 18, 12));
  road("roads-path", kindIn("path"), c.path, zoomWidth(14, 0.6, 18, 2.4), {
    minzoom: 14,
    paint: { "line-color": c.path, "line-width": zoomWidth(14, 0.6, 18, 2.4), "line-dasharray": [2, 1.5] },
  });
  road("roads-rail", ["all", kindIn("rail"), detailIn("rail", "narrow_gauge", "tram")], c.rail, zoomWidth(8, 0.5, 14, 1.2, 18, 3), {
    minzoom: 10,
    paint: { "line-color": c.rail, "line-width": zoomWidth(8, 0.5, 14, 1.2, 18, 3), "line-dasharray": [3, 2] },
  });

  const place = (id: string, filter: unknown, minzoom: number, size: unknown, font = REGULAR) =>
    add({
      id,
      type: "symbol",
      ...v("places"),
      filter,
      minzoom,
      layout: {
        "text-field": NAME,
        "text-font": font,
        "text-size": size,
        "text-max-width": 8,
        "text-padding": 4,
      },
      paint: { "text-color": c.text, "text-halo-color": c.halo, "text-halo-width": 1.4 },
    });

  place("places-city", ["all", kindIn("locality"), detailIn("city")], 5, ["interpolate", ["linear"], ["zoom"], 5, 13, 12, 22], ITALIC);
  place("places-town", ["all", kindIn("locality"), detailIn("town")], 8, ["interpolate", ["linear"], ["zoom"], 8, 12, 13, 18], ITALIC);
  place("places-village", ["all", kindIn("locality"), detailIn("village")], 10, ["interpolate", ["linear"], ["zoom"], 10, 11, 14, 16], ITALIC);
  place("places-small", ["all", kindIn("locality"), detailIn("hamlet", "locality", "isolated_dwelling")], 12, 11, ITALIC);
  place("places-quarter", kindIn("neighbourhood", "macrohood"), 12, ["interpolate", ["linear"], ["zoom"], 12, 10, 15, 13]);

  add({
    id: "water-label",
    type: "symbol",
    ...v("water"),
    filter: ["all", isLine, kindIn("river")],
    minzoom: 11,
    layout: {
      "text-field": NAME,
      "text-font": ITALIC,
      "text-size": 12,
      "symbol-placement": "line",
      "text-letter-spacing": 0.1,
    },
    paint: { "text-color": c.textWater, "text-halo-color": c.halo, "text-halo-width": 1.2 },
  });

  return {
    version: 8,
    name: `FootAtlas ${theme.id}`,
    sources: {
      [SOURCE_ID]: { type: "vector", url: `pmtiles://${tilesUrl}`, attribution: ATTRIBUTION },
    },
    glyphs,
    layers,
  };
}

/** Vrstvy trasy výpravy nad mapou: zdroje `route-done` a `route-rest` (GeoJSON LineString) doplní aplikace. */
export function routeLayers(theme: MapTheme): StyleLayer[] {
  const r = theme.route;
  const line = (id: string, source: string, color: string, width: number, extra: Record<string, unknown> = {}, opacity = 1): StyleLayer => ({
    id,
    type: "line",
    source,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": color, "line-width": width, "line-opacity": opacity, ...extra },
  });
  return [
    line("route-rest-halo", "route-rest", r.halo, r.width + 3, {}, 0.7),
    line("route-rest", "route-rest", r.plan, r.width - 0.6, { "line-dasharray": [1, 2] }),
    line("route-done-halo", "route-done", r.halo, r.width + 3, {}, 0.85),
    line("route-done", "route-done", r.done, r.width),
  ];
}
