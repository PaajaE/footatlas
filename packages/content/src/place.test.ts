import { describe, expect, it } from "vitest";
import { PLACE_SYMBOLS, draftPlace, isPlaceSymbol, place } from "./index";

const stop = {
  kind: "stop",
  id: "s1",
  name: "Vyšehrad",
  lat: 50.064,
  lon: 14.419,
  unlockAtM: 0,
  text: "Pevnost nad Vltavou.",
  surprisingFact: "Příklad faktu.",
  image: { url: "https://commons.wikimedia.org/x.jpg", author: "A", license: "CC BY-SA 4.0" },
  sources: [
    { title: "Zdroj 1", url: "https://example.org/1" },
    { title: "Zdroj 2", url: "https://example.org/2" },
  ],
  factCheckedOn: "2026-10-30",
};

describe("místo", () => {
  it("přijme platnou zastávku", () => {
    expect(place.safeParse(stop).success).toBe(true);
  });
  it("odmítne zastávku s jedním zdrojem", () => {
    expect(place.safeParse({ ...stop, sources: [stop.sources[0]] }).success).toBe(false);
  });
  it("přijme povolený symbol a odmítne neznámý", () => {
    expect(place.safeParse({ ...stop, symbol: "hradiste" }).success).toBe(true);
    expect(place.safeParse({ ...stop, symbol: "hrad" }).success).toBe(false);
    const draft = { kind: "discovery", id: "d", name: "D", lat: 50, lon: 14, unlockAtM: 1, text: "T", draft: true };
    expect(draftPlace.safeParse({ ...draft, symbol: "soutok" }).success).toBe(true);
    expect(draftPlace.safeParse({ ...draft, symbol: "" }).success).toBe(false);
  });
  it("symbol je nepovinný (záloha je monogram)", () => {
    expect(place.safeParse(stop).success).toBe(true);
  });
  it("sada má 16 různých symbolů", () => {
    expect(PLACE_SYMBOLS).toHaveLength(16);
    expect(new Set(PLACE_SYMBOLS).size).toBe(16);
    expect(isPlaceSymbol("most")).toBe(true);
    expect(isPlaceSymbol("Most")).toBe(false);
    expect(isPlaceSymbol(3)).toBe(false);
  });
});
