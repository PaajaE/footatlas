import { describe, expect, it } from "vitest";
import { PLACE_SYMBOLS } from "@footatlas/content/src/symbols";
import { vltavska } from "./data/vltavska";
import { chapterSymbol, fromRoman, resolvePlaceSymbol, stageSymbol, type SymbolLookup } from "./razitka";

const lookup: SymbolLookup = { places: vltavska.places, stageEndsM: vltavska.plan.stages.map((s) => s.endM) };

describe("symboly razítek", () => {
  it("každé místo Vltavské stezky má v aplikaci symbol", () => {
    expect(vltavska.places.filter((p) => !p.symbol).map((p) => p.id)).toEqual([]);
    expect(vltavska.places).toHaveLength(39);
  });

  it("aplikace používá všech 16 symbolů", () => {
    expect(new Set(vltavska.places.map((p) => p.symbol))).toEqual(new Set(PLACE_SYMBOLS));
  });

  it("symbol se dohledá podle výslovné hodnoty, id nebo názvu", () => {
    expect(resolvePlaceSymbol(lookup, { placeId: "karluv-most" })).toBe("most");
    expect(resolvePlaceSymbol(lookup, { name: "Červený mlýn" })).toBe("mlyn");
    expect(resolvePlaceSymbol(lookup, { symbol: "vor", name: "Červený mlýn" })).toBe("vor");
    expect(resolvePlaceSymbol(lookup, { name: "Neznámé místo" })).toBeUndefined();
    expect(resolvePlaceSymbol(lookup, { symbol: "neznamy" })).toBeUndefined();
  });

  it("pečeť etapy nese symbol cíle etapy", () => {
    expect(stageSymbol(lookup, 0)).toBe("zamek"); // Zámek Roztoky
    expect(stageSymbol(lookup, 1)).toBe("obec"); // Kralupy nad Vltavou
    expect(stageSymbol(lookup, 3)).toBe("soutok"); // Soutok v Mělníku
    expect(stageSymbol(lookup, 9)).toBeUndefined();
  });

  it("římské číslo se převede zpět", () => {
    expect([fromRoman("I"), fromRoman("IV"), fromRoman("ix"), fromRoman("XIV")]).toEqual([1, 4, 9, 14]);
    expect(fromRoman("")).toBeUndefined();
    expect(fromRoman("ab")).toBeUndefined();
  });

  it("kapitoly mají symbol podle id i názvu", () => {
    for (const c of vltavska.chapters) expect(chapterSymbol(c)).toBeDefined();
    expect(chapterSymbol({ title: "Voraři" })).toBe("vor");
    expect(chapterSymbol({ id: "mosty" })).toBe("most");
    expect(chapterSymbol({ title: "Ostrovy" })).toBe("ostrov");
    expect(chapterSymbol({ title: "Počátky Čech" })).toBe("hradiste");
    expect(chapterSymbol({ title: "Šlechtická sídla" })).toBe("zamek");
    expect(chapterSymbol({ title: "Jiná" })).toBeUndefined();
  });
});
