import { describe, expect, it } from "vitest";
import { joinNames, parseTips, placesWithin, tipOutcome } from "./riddle";

describe("tipOutcome", () => {
  it("bez tipu nic nehlásí", () => expect(tipOutcome(1, undefined)).toBe("none"));
  it("shoda je správně", () => expect(tipOutcome(2, 2)).toBe("correct"));
  it("tip 0 se bere jako tip, ne jako žádný", () => expect(tipOutcome(1, 0)).toBe("wrong"));
});

describe("parseTips", () => {
  it("přijme jen možnosti 0 až 2", () => {
    expect(parseTips({ a: 0, b: 2, c: 3, d: "1", e: null })).toEqual({ a: 0, b: 2 });
  });
  it("neplatný vstup dá prázdný objekt", () => {
    expect(parseTips(null)).toEqual({});
    expect(parseTips([1, 2])).toEqual({});
    expect(parseTips("x")).toEqual({});
  });
});

describe("placesWithin", () => {
  const places = [{ atM: 500 }, { atM: 1000 }, { atM: 3000 }, { atM: 2000 }];
  it("bere místa za začátkem a včetně konce, seřazená", () => {
    expect(placesWithin(places, 500, 2000).map((p) => p.atM)).toEqual([1000, 2000]);
  });
  it("nic v dosahu dá prázdný seznam", () => expect(placesWithin(places, 3000, 4000)).toEqual([]));
});

describe("joinNames", () => {
  it("skládá výčet po česku", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B"])).toBe("A a B");
    expect(joinNames(["A", "B", "C"])).toBe("A, B a C");
  });
});
