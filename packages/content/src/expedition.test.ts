import { describe, expect, it } from "vitest";
import { expedition, routeTypeLabel } from "./index";

const source = [
  { title: "Zdroj 1", url: "https://example.org/1" },
  { title: "Zdroj 2", url: "https://example.org/2" },
];
const stop = {
  kind: "stop" as const,
  id: "s1",
  name: "Zastávka",
  lat: 50,
  lon: 14,
  unlockAtM: 5_000,
  text: "Text.",
  surprisingFact: "Fakt.",
  image: { url: "https://commons.wikimedia.org/x.jpg", author: "A", license: "CC BY-SA 4.0" },
  sources: source,
  factCheckedOn: "2026-10-30",
  chapterId: "k1",
};
const base = {
  id: "vltavska",
  name: "Vltavská stezka",
  summary: "Pro test.",
  status: "published" as const,
  routeType: "simplified" as const,
  routeSource: "OpenStreetMap, ODbL",
  routeFile: "vltavska.json",
  totalM: 62_000,
  chapters: [{ id: "k1", title: "Kapitola" }],
  places: [stop],
};

describe("výprava", () => {
  it("přijme platnou výpravu", () => {
    expect(expedition.safeParse(base).success).toBe(true);
  });
  it("odmítne místo za koncem trasy", () => {
    expect(expedition.safeParse({ ...base, places: [{ ...stop, unlockAtM: 70_000 }] }).success).toBe(false);
  });
  it("odmítne duplicitní id", () => {
    expect(expedition.safeParse({ ...base, places: [stop, stop] }).success).toBe(false);
  });
  it("odmítne neznámou kapitolu", () => {
    expect(expedition.safeParse({ ...base, places: [{ ...stop, chapterId: "x" }] }).success).toBe(false);
  });
  it("skutečná a zjednodušená trasa musí mít zdroj", () => {
    const { routeSource: _omit, ...noSource } = base;
    expect(expedition.safeParse(noSource).success).toBe(false);
    expect(expedition.safeParse({ ...noSource, routeType: "virtual" }).success).toBe(true);
  });
  it("poslední etapa končí v cíli", () => {
    expect(expedition.safeParse({ ...base, stageEndsM: [30_000, 50_000] }).success).toBe(false);
    expect(expedition.safeParse({ ...base, stageEndsM: [30_000, 62_000] }).success).toBe(true);
  });
  it("rozpracované místo projde jen v konceptu", () => {
    const draft = { kind: "stop" as const, id: "d1", name: "Koncept", lat: 50, lon: 14, unlockAtM: 100, text: "Text.", draft: true as const };
    expect(expedition.safeParse({ ...base, status: "draft", places: [draft] }).success).toBe(true);
    expect(expedition.safeParse({ ...base, status: "published", places: [draft] }).success).toBe(false);
  });
  it("každý typ trasy má štítek", () => {
    expect(Object.keys(routeTypeLabel)).toHaveLength(5);
  });
});
