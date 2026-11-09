import { describe, expect, it } from "vitest";
import { vltavska } from "./data/vltavska";
import { placeMonogram, uniqueMonograms } from "./monogram";

describe("placeMonogram", () => {
  it("víceslovné názvy: první a poslední významné slovo", () => {
    expect(placeMonogram("Červený mlýn")).toBe("ČM");
    expect(placeMonogram("Zámek Veltrusy")).toBe("ZV");
    expect(placeMonogram("Plavební komora Troja")).toBe("PT");
    expect(placeMonogram("Rodný dům Antonína Dvořáka")).toBe("RD");
  });

  it("předložky se přeskakují", () => {
    expect(placeMonogram("Výhled na Říp")).toBe("VŘ");
    expect(placeMonogram("Skály u Řeže")).toBe("SŘ");
    expect(placeMonogram("Přívoz v Podbabě")).toBe("PP");
  });

  it("upřesnění „nad …“ a „pod …“ se vynechá", () => {
    expect(placeMonogram("Libčice nad Vltavou")).toBe("Li");
    expect(placeMonogram("Lužec nad Vltavou")).toBe("Lu");
  });

  it("jednoslovný název: první dvě písmena", () => {
    expect(placeMonogram("Vepřek")).toBe("Ve");
    expect(placeMonogram("vyšehrad")).toBe("Vy");
    expect(placeMonogram("Ó")).toBe("Ó");
  });

  it("prázdný nebo nepísmenný název", () => {
    expect(placeMonogram("")).toBe("?");
    expect(placeMonogram("  – 12 ")).toBe("?");
  });
});

describe("uniqueMonograms", () => {
  it("shodný monogram dostane delší tvar", () => {
    expect(uniqueMonograms(["Zámek Hořín", "Zdymadlo Hořín", "Vepřek"])).toEqual(["ZH", "ZdH", "Ve"]);
  });

  it("když ani delší tvar nestačí, přidá se pořadí", () => {
    expect(uniqueMonograms(["Zámek Veltrusy", "Zámek Vranov", "Zámek Velhartice"])).toEqual(["ZV", "ZáV", "ZV²"]);
  });

  it("místa Vltavské stezky mají monogram z písmen, nejvýš tři znaky", () => {
    const all = uniqueMonograms(vltavska.places.map((p) => p.name));
    expect(all).toHaveLength(vltavska.places.length);
    for (const m of all) expect(m).toMatch(/^\p{L}\p{L}?\p{L}?[²³⁴⁵]?$/u);
    expect(new Set(all).size).toBe(all.length);
    expect(all.some((m) => /[²³⁴⁵]/u.test(m))).toBe(false);
  });
});
