import { describe, expect, it } from "vitest";
import { ATTRIBUTION, buildStyle, parchmentDay, parchmentNight, routeLayers, themes, type MapTheme } from "./index";

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
