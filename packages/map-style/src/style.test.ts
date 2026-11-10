import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ATLAS_LABEL_FONT,
  ATLAS_PATTERNS,
  ATLAS_SKETCH_START,
  ATTRIBUTION,
  WATER_WASH_OPACITY,
  REVEAL_INNER,
  REVEAL_OUTER,
  REVEAL_PENDING,
  metersToPixels,
  patternDimLayers,
  revealPendingLayers,
  buildAtlasStyle,
  buildStyle,
  placeLayers,
  youLayers,
  parchmentDay,
  parchmentNight,
  patternName,
  revealLayers,
  revealMask,
  routeLayers,
  themes,
  type LonLat,
  type MapTheme,
} from "./index";

const opts = (theme: MapTheme) => ({
  theme,
  tilesUrl: "https://tiles.example.com/vltava.pmtiles",
  glyphs: "https://tiles.example.com/fonts/{fontstack}/{range}.pbf",
});

const HEX = /#[0-9a-fA-F]{6}/g;

describe.each(Object.values(themes))("styl $id", (theme) => {
  const style = buildStyle(opts(theme));

  it("má unikátní id vrstev a existující zdroj", () => {
    const ids = style.layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of style.layers) {
      if (l.source) expect(style.sources[l.source]).toBeDefined();
    }
  });

  it("odkazuje na PMTiles a nese atribuci OSM", () => {
    expect(style.sources.osm!.url).toBe("pmtiles://https://tiles.example.com/vltava.pmtiles");
    expect(style.sources.osm!.attribution).toBe(ATTRIBUTION);
    expect(ATTRIBUTION).toContain("OpenStreetMap");
  });

  it("všechny barvy pocházejí z tokenů motivu", () => {
    const allowed = new Set([
      ...Object.values(theme.palette),
      ...Object.values(theme.route).filter((x): x is string => typeof x === "string"),
      ...Object.values(theme.atlas),
    ].map((x) => x.toLowerCase()));
    const used = (JSON.stringify(style) + JSON.stringify(routeLayers(theme))).match(HEX) ?? [];
    expect(used.length).toBeGreaterThan(10);
    for (const color of used) expect(allowed.has(color.toLowerCase())).toBe(true);
  });

  it("popisky preferují český název", () => {
    const labels = style.layers.filter((l) => l.type === "symbol");
    expect(labels.length).toBeGreaterThan(3);
    for (const l of labels) expect(JSON.stringify(l.layout!["text-field"])).toContain("name:cs");
  });

  it("písma jsou jen z dostupné sady", () => {
    const fonts = new Set(style.layers.flatMap((l) => (l.layout?.["text-font"] as string[] | undefined) ?? []));
    expect([...fonts].sort()).toEqual(["Noto Sans Italic", "Noto Sans Regular"].filter((f) => fonts.has(f)).sort());
  });
});

describe("motivy", () => {
  it("den a noc mají stejnou sadu tokenů", () => {
    expect(Object.keys(parchmentNight.palette).sort()).toEqual(Object.keys(parchmentDay.palette).sort());
  });
  it("den a noc dávají stejné vrstvy, liší se jen barvy", () => {
    const a = buildStyle(opts(parchmentDay)).layers.map((l) => l.id);
    const b = buildStyle(opts(parchmentNight)).layers.map((l) => l.id);
    expect(a).toEqual(b);
  });
  it("vrstvy trasy používají barvy motivu", () => {
    const r = routeLayers(parchmentNight);
    expect(r.map((l) => l.id)).toEqual(["route-rest-halo", "route-rest", "route-done-halo", "route-done"]);
    expect(r.at(-1)!.paint["line-color"]).toBe(parchmentNight.route.done);
  });
});

describe.each(Object.values(themes))("atlas $id", (theme) => {
  const style = buildAtlasStyle(opts(theme));
  const ids = style.layers.map((l) => l.id);
  const cut = ids.indexOf(ATLAS_SKETCH_START);
  const colored = style.layers.slice(0, cut).filter((l) => l.id !== "background");
  const sketch = style.layers.slice(cut + 1);

  it("má unikátní id vrstev, zdroj a značku začátku skici", () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(cut).toBeGreaterThan(0);
    for (const l of style.layers) if (l.source) expect(style.sources[l.source]).toBeDefined();
    expect(style.sources.osm!.attribution).toBe(ATTRIBUTION);
  });

  it("kolorovaná vrstva je pod skicou: ink-* před značkou, sk-* a popisky za ní", () => {
    expect(colored.length).toBeGreaterThan(8);
    for (const l of colored) expect(l.id.startsWith("ink-")).toBe(true);
    expect(sketch.some((l) => l.id.startsWith("sk-"))).toBe(true);
    expect(sketch.some((l) => l.type === "symbol")).toBe(true);
  });

  it("skica nemá plné výplně, jen vzory a linky", () => {
    for (const l of sketch.filter((l) => l.type === "fill")) {
      expect(l.paint["fill-color"], l.id).toBeUndefined();
      expect(l.paint["fill-pattern"], l.id).toBeDefined();
    }
  });

  it("kolorovaná vrstva má bloky, lesy, vinice a akvarelovou řeku", () => {
    const byId = Object.fromEntries(style.layers.map((l) => [l.id, l]));
    expect(byId["ink-urban"]!.paint["fill-pattern"]).toBe(patternName(theme, "blk-ink"));
    expect(byId["ink-wood"]!.paint["fill-pattern"]).toBe(patternName(theme, "tree-ink"));
    expect(byId["ink-vine"]!.paint["fill-pattern"]).toBe(patternName(theme, "vine-ink"));
    expect(byId["sk-urban"]!.paint["fill-pattern"]).toBe(patternName(theme, "blk-sketch"));
    expect(byId["ink-river"]!.paint["line-color"]).toBe(theme.atlas.river);
    expect(byId["ink-river-wash"]!.paint["line-blur"]).toBeDefined();
  });

  it("voda je napříč zoomy akvarel v paletě atlasu, ne plná plocha", () => {
    const water = style.layers.filter((l) => l["source-layer"] === "water" && l.type !== "symbol");
    expect(water.length).toBeGreaterThan(5);
    const palette = new Set([theme.atlas.river, theme.atlas.riverEdge, theme.atlas.pencil, theme.atlas.pencilSoft].map((c) => c.toLowerCase()));
    for (const l of water) {
      const color = (l.paint["fill-color"] ?? l.paint["line-color"]) as string;
      expect(palette.has(color.toLowerCase()), l.id).toBe(true);
      // Žádná vodní vrstva nemá zoomové omezení shora: vzhled se při přiblížení nepřepíná na jiný styl.
      expect(l.maxzoom, l.id).toBeUndefined();
    }
    // Vodní plochy (koryto Vltavy od zoomu kolem 13) jsou průsvitné jako rozpitý podklad čárové řeky.
    const fills = water.filter((l) => l.type === "fill");
    expect(fills.map((l) => l.id)).toEqual(["ink-water"]);
    const byId = Object.fromEntries(style.layers.map((l) => [l.id, l]));
    expect(byId["ink-water"]!.paint["fill-opacity"]).toBe(WATER_WASH_OPACITY);
    expect(byId["ink-river-wash"]!.paint["line-opacity"]).toBe(WATER_WASH_OPACITY);
    expect(WATER_WASH_OPACITY).toBeLessThan(0.6);
    // Jádro řeky při velkém přiblížení slábne, aby uvnitř plochy nevznikl sytý pruh.
    const core = byId["ink-river"]!.paint["line-opacity"] as unknown[];
    expect(core[0]).toBe("interpolate");
    const stops = core.slice(3) as number[];
    const at = (z: number) => stops[stops.indexOf(z) + 1]!;
    expect(at(12)).toBeGreaterThan(0.9);
    expect(stops[stops.length - 1]).toBeLessThanOrEqual(0.5);
    // Skica kreslí břeh tužkou, bez výplně.
    expect(byId["sk-water-edge"]!.paint["line-color"]).toBe(theme.atlas.pencil);
    expect(byId["sk-water-ripple"]!.paint["line-dasharray"]).toBeDefined();
  });

  it("vzory ve stylu existují jako obrázky v aplikaci", () => {
    const used = new Set<string>();
    for (const l of style.layers) if (typeof l.paint["fill-pattern"] === "string") used.add(l.paint["fill-pattern"]);
    expect(used.size).toBeGreaterThan(4);
    const base = fileURLToPath(new URL("../../../apps/mobile/assets/map/patterns/", import.meta.url));
    for (const name of ATLAS_PATTERNS) expect(existsSync(`${base}${patternName(theme, name)}@3x.png`), name).toBe(true);
    for (const u of used) expect(ATLAS_PATTERNS.map((p) => patternName(theme, p))).toContain(u);
  });

  it("popisky jsou kurzívou IM Fell a preferují český název; řeka se píše podél toku", () => {
    const labels = style.layers.filter((l) => l.type === "symbol");
    expect(labels.length).toBeGreaterThan(5);
    for (const l of labels) {
      expect(l.layout!["text-font"]).toEqual(ATLAS_LABEL_FONT);
      expect(JSON.stringify(l.layout!["text-field"])).toContain("name:cs");
    }
    expect(ATLAS_LABEL_FONT).toEqual(["IM Fell English Italic"]); // jedno písmo: glyfy se v aplikaci hledají po písmech
    expect(style.layers.find((l) => l.id === "water-label")!.layout!["symbol-placement"]).toBe("line");
  });

  it("všechny barvy atlasu (styl, místa, poloha, krytí) pocházejí z tokenů motivu", () => {
    const allowed = new Set(
      [...Object.values(theme.atlas), ...Object.values(theme.route).filter((x): x is string => typeof x === "string")].map((x) => x.toLowerCase()),
    );
    const used = (JSON.stringify(style) + JSON.stringify([...placeLayers(theme), ...youLayers(theme), ...revealLayers(theme)])).match(HEX) ?? [];
    expect(used.length).toBeGreaterThan(20);
    for (const color of used) expect(allowed.has(color.toLowerCase()), color).toBe(true);
  });

  it("vrstvy míst: kresby, razítka objevů, pečeti zastávek a štítek metrů, popisky IM Fell", () => {
    const layers = placeLayers(theme);
    expect(layers.map((l) => l.id)).toEqual(["places-drawing", "places-discovery", "places-stop", "places-next-label"]);
    for (const l of layers) {
      expect(l.source).toBe("places");
      expect(l.layout!["icon-image"]).toBeDefined();
    }
    for (const l of layers.filter((l) => l.layout!["text-field"])) expect(l.layout!["text-font"]).toEqual(ATLAS_LABEL_FONT);
    expect(JSON.stringify(layers.find((l) => l.id === "places-stop")!.layout!["icon-size"])).toContain("zoom");
    expect(youLayers(theme).map((l) => l.source)).toEqual(["you", "you"]);
  });

  it("krycí vrstvy mají papírovou barvu a vlastní zdroje", () => {
    const [inner, outer] = revealLayers(theme);
    expect(inner!.source).toBe(REVEAL_INNER);
    expect(outer!.source).toBe(REVEAL_OUTER);
    expect(outer!.paint["fill-color"]).toBe(theme.atlas.paper);
    expect(outer!.paint["fill-opacity"]).toBe(1);
    expect(inner!.paint["fill-opacity"] as number).toBeLessThan(1);
  });
});

describe("atlas den a noc", () => {
  it("dávají stejné vrstvy a stejnou sadu tokenů", () => {
    expect(buildAtlasStyle(opts(parchmentDay)).layers.map((l) => l.id)).toEqual(buildAtlasStyle(opts(parchmentNight)).layers.map((l) => l.id));
    expect(Object.keys(parchmentNight.atlas).sort()).toEqual(Object.keys(parchmentDay.atlas).sort());
  });
});

describe("revealMask", () => {
  // Trasa na sever od 50° s.š.: 0,01° šířky ≈ 1,11 km.
  const route: LonLat[] = [
    [14.4, 50.0],
    [14.4, 50.01],
    [14.41, 50.02],
    [14.42, 50.02],
  ];
  const inside = (ring: number[][], [x, y]: number[]) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (yi! > y! !== yj! > y! && x! < ((xj! - xi!) * (y! - yi!)) / (yj! - yi!) + xi!) c = !c;
    }
    return c;
  };

  it("bez trasy je celý svět kryt", () => {
    const m = revealMask([], 500);
    expect(m.geometry.coordinates).toHaveLength(1);
    expect(m.geometry.coordinates[0]).toHaveLength(1);
  });

  it("díra obsahuje body trasy a okolí do poloměru, vzdálené body ne", () => {
    const m = revealMask(route, 500);
    const [world, ...holes] = m.geometry.coordinates[0]!;
    expect(world).toBeDefined();
    expect(holes).toHaveLength(1);
    const hole = holes[0]!;
    for (const p of route) expect(inside(hole, p)).toBe(true);
    expect(inside(hole, [14.4 + 0.004, 50.005])).toBe(true); // ≈ 290 m od trasy
    expect(inside(hole, [14.4 + 0.02, 50.005])).toBe(false); // ≈ 1,4 km od trasy
    expect(inside(hole, [14.45, 50.05])).toBe(false);
  });

  it("jeden bod dává kruh", () => {
    const hole = revealMask([[14.4, 50]], 300).geometry.coordinates[0]![1]!;
    expect(inside(hole, [14.4, 50])).toBe(true);
    expect(inside(hole, [14.41, 50])).toBe(false);
  });

  it("zvládne dlouhou trasu rychle", () => {
    const long: LonLat[] = Array.from({ length: 4000 }, (_, i) => [14.4 + i * 0.0001 + Math.sin(i / 40) * 0.01, 50 + i * 0.0001]);
    const t = Date.now();
    const m = revealMask(long, 600);
    expect(Date.now() - t).toBeLessThan(3000);
    expect(m.geometry.coordinates[0]!.length).toBeGreaterThanOrEqual(2);
  });
});

describe("nový let: plynulé barvení a ztlumené vzory (rozhodnutí 0033)", () => {
  it("šířka v metrech: na 50° s. š. je 1000 m při zoomu 13 asi 162 bodů a s každým zoomem dvakrát víc", () => {
    const e = metersToPixels(1000, 50) as [string, unknown, unknown, number, number, number, number];
    expect(e[0]).toBe("interpolate");
    expect(e[1]).toEqual(["exponential", 2]);
    const at13 = e[4] * 2 ** 13;
    expect(at13).toBeGreaterThan(150);
    expect(at13).toBeLessThan(175);
    expect(e[6] / e[4]).toBeCloseTo(2 ** 22, 0);
  });
  it.each(Object.values(themes))("krytí nevybarvené části je papírová rozmazaná čára na vlastním zdroji ($id)", (theme) => {
    const [l] = revealPendingLayers(theme, 50.2, 650);
    expect(l!.type).toBe("line");
    expect(l!.source).toBe(REVEAL_PENDING);
    expect(l!.paint["line-color"]).toBe(theme.atlas.paper);
    expect(l!.paint["line-blur"]).toBeDefined();
    expect(l!.layout?.["line-cap"]).toBe("round");
  });
  it.each(Object.values(themes))("ztlumí všechny vzory (šrafy, stromy, vinice) a nic jiného ($id)", (theme) => {
    const style = buildAtlasStyle(opts(theme));
    const dim = patternDimLayers(style, 0.5);
    const ids = dim.map((d) => d.id);
    expect(ids).toEqual(expect.arrayContaining(["sk-urban", "sk-wood", "sk-vine", "ink-wood", "ink-urban", "ink-vine"]));
    for (const d of dim) {
      const layer = style.layers.find((l) => l.id === d.id)!;
      expect(layer.paint["fill-pattern"]).toBeDefined();
      const base = (layer.paint["fill-opacity"] as number | undefined) ?? 1;
      expect(d.paint["fill-opacity"]).toBeCloseTo(base * 0.5, 9);
    }
    expect(patternDimLayers(style, 1).every((d) => d.paint["fill-opacity"] > 0.8)).toBe(true);
  });
});

// Vrstvy, které aplikace předává komponentě <Layer> z @maplibre/maplibre-react-native. Na iOS knihovna převede posun
// (icon-offset, text-offset) a odsazení (icon-text-fit-padding) jen z holého pole čísel; výraz ["literal", [..]] na
// nejvyšší úrovni předá nativní vrstvě beze změny a aplikace spadne (EXC_CRASH, -[MLRNStyle setIconOffset:…]).
describe.each(Object.values(themes))("vrstvy pro aplikaci $id", (theme) => {
  const layers = [
    ...placeLayers(theme),
    ...youLayers(theme),
    ...routeLayers(theme),
    ...revealLayers(theme),
    ...revealPendingLayers(theme, 50, 650),
  ];
  it("nemají na nejvyšší úrovni layoutu ani paintu výraz literal", () => {
    const bad = layers.flatMap((l) =>
      Object.entries({ ...(l.layout ?? {}), ...(l.paint ?? {}) })
        .filter(([, v]) => Array.isArray(v) && v[0] === "literal")
        .map(([k]) => `${l.id}.${k}`),
    );
    expect(bad).toEqual([]);
  });
});
