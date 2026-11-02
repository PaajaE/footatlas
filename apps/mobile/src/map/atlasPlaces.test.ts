import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import expedition from "@footatlas/content/data/vltavska-stezka/expedition.json";
import { ATLAS_PATTERNS } from "@footatlas/map-style";
import { describe, expect, it } from "vitest";
import type { AppPlace } from "../data/vltavska";
import { distanceLabel, drawingFor, imageKey, placeProps, placeState, scaleBar } from "./atlasPlaces";
import { nextFerry, placesOfStage, placesWord, roman, stageStamps, stampsWord } from "./vypravaInfo";

const place = (id: string, atM: number, kind: AppPlace["kind"] = "discovery", name = id): AppPlace =>
  ({ id, kind, name, text: "", lat: 50, lon: 14, atM, draft: false }) as AppPlace;

describe("stav a obrázek místa", () => {
  it("dosažené, další zastávka, zamčené", () => {
    expect(placeState({ id: "a", atM: 100 }, 100, "b")).toBe("reached");
    expect(placeState({ id: "b", atM: 200 }, 100, "b")).toBe("next");
    expect(placeState({ id: "c", atM: 300 }, 100, "b")).toBe("locked");
  });
  it("zastávky mají pečeť a medailon s fotkou, zamčené sdílený kroužek, objevy razítko", () => {
    expect(imageKey(place("troja", 1, "stop"), "reached")).toBe("reached-troja");
    expect(imageKey(place("troja", 1, "stop"), "next")).toBe("next-troja");
    expect(imageKey(place("troja", 1, "stop"), "locked")).toBe("locked");
    expect(imageKey(place("x", 1), "reached")).toBe("stamp-reached");
    expect(imageKey(place("x", 1), "locked")).toBe("stamp-locked");
  });
  it("štítek metrů jen u další zastávky; přednost další > dosažená > zamčená", () => {
    const stop = place("troja", 10477, "stop", "Trojský zámek");
    expect(placeProps(stop, 10437, "troja")).toMatchObject({ state: "next", label: "40 m", rank: 0, drawing: "castle", stop: true });
    expect(placeProps(stop, 20000, undefined)).toMatchObject({ state: "reached", label: "", rank: 1 });
    expect(placeProps(stop, 0, "x")).toMatchObject({ state: "locked", label: "", rank: 2 });
  });
});

describe("distanceLabel", () => {
  it("metry po desítkách a kilometry s čárkou", () => {
    expect(distanceLabel(42)).toBe("40 m");
    expect(distanceLabel(960)).toBe("960 m");
    expect(distanceLabel(1234)).toBe("1,2 km");
    expect(distanceLabel(23_000)).toBe("23 km");
    expect(distanceLabel(3)).toBe("tady");
  });
});

describe("drawingFor", () => {
  it("jen podle názvu", () => {
    expect(drawingFor("Přívoz v Podbabě")).toBe("boat");
    expect(drawingFor("Zámek Roztoky")).toBe("castle");
    expect(drawingFor("Trojský zámek")).toBe("castle");
    expect(drawingFor("Karlův most")).toBe("bridge");
    expect(drawingFor("Trojská lávka")).toBe("bridge");
    expect(drawingFor("Vyšehrad")).toBeNull();
    expect(drawingFor("Plavební kanál Vraňany")).toBeNull();
  });
});

describe("scaleBar", () => {
  it("vybere kulatou délku, která se vejde", () => {
    const s = scaleBar(13, 50);
    expect(s.widthPt).toBeLessThanOrEqual(96);
    expect([1, 2, 5].includes(Number(s.meters / 10 ** Math.floor(Math.log10(s.meters))))).toBe(true);
    expect(s.label).toMatch(/^(\d+ m|[\d,]+ km)$/);
  });
  it("při větším přiblížení kratší úsek", () => {
    expect(scaleBar(16, 50).meters).toBeLessThan(scaleBar(11, 50).meters);
  });
});

describe("údaje výpravy", () => {
  const stage = { index: 0, startM: 0, endM: 1000 };
  const places = [place("a", 0, "stop"), place("b", 400), place("c", 1000, "stop"), place("d", 1200)];
  it("římské číslice", () => {
    expect([1, 2, 4, 9, 14].map(roman)).toEqual(["I", "II", "IV", "IX", "XIV"]);
  });
  it("místa etapy včetně nuly i konce", () => {
    expect(placesOfStage(places, stage).map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(placesOfStage(places, { index: 1, startM: 1000, endM: 2000 }).map((p) => p.id)).toEqual(["d"]);
  });
  it("razítka etapy", () => {
    expect(stageStamps(places, stage, 500)).toEqual({ reached: 2, total: 3 });
  });
  it("skloňování", () => {
    expect([1, 3, 10].map(stampsWord)).toEqual(["razítko", "razítka", "razítek"]);
    expect([1, 3, 10].map(placesWord)).toEqual(["místo", "místa", "míst"]);
  });
  it("další přívoz podle názvu", () => {
    const ps = [place("p1", 500, "discovery", "Přívoz v Podbabě"), place("p2", 900, "discovery", "Přívoz do Letek")];
    expect(nextFerry(ps, 100)?.id).toBe("p1");
    expect(nextFerry(ps, 600)?.id).toBe("p2");
    expect(nextFerry(ps, 1000)).toBeNull();
  });
});

describe("obrázky pro mapu existují", () => {
  const dir = (sub: string) => fileURLToPath(new URL(`../../assets/map/${sub}/`, import.meta.url));
  const stops = (expedition as { places: Array<{ id: string; kind: string }> }).places.filter((p) => p.kind === "stop").map((p) => p.id);

  it.each(["day", "night"])("pečeti, medailony, razítka, štítek a kresby (%s)", (mode) => {
    const files = new Set(readdirSync(dir("medallions")));
    const keys = [
      ...stops.flatMap((id) => [`reached-${id}`, `next-${id}`]),
      "locked", "stamp-reached", "stamp-locked", "pill", "drawing-boat", "drawing-castle", "drawing-bridge",
    ];
    for (const k of keys) expect(files.has(`${mode}-${k}@3x.png`), k).toBe(true);
    // každý klíč, který `imageKey` může vrátit, je mezi nimi
    for (const kind of ["stop", "discovery"] as const)
      for (const st of ["reached", "next", "locked"] as const) {
        const k = imageKey({ id: stops[0]!, kind }, st);
        if (kind === "stop" || st !== "next") expect(files.has(`${mode}-${k}@3x.png`), k).toBe(true);
      }
  });

  it.each(["day", "night"])("vzory výplní stylu (%s)", (mode) => {
    const files = new Set(readdirSync(dir("patterns")));
    for (const p of ATLAS_PATTERNS) expect(files.has(`${mode}-${p}@3x.png`), p).toBe(true);
  });

  it("zastávky mají vlastní seznam souborů v medallionFiles.ts (generovaný)", () => {
    const src = readFileSync(fileURLToPath(new URL("./medallionFiles.ts", import.meta.url)), "utf8");
    for (const id of stops) expect(src).toContain(`"day-reached-${id}"`);
  });
});
