import { describe, expect, it } from "vitest";
import { ferryInfo, ferryTexts, isFerry } from "./privoz";

const places = [
  { id: "x", name: "Výtoň", atM: 600 },
  { id: "p1", name: "Přívoz v Podbabě", atM: 13_756, hook: "Háček.", context: "Kontext.", text: "Věta." },
  { id: "lib", name: "Libčice nad Vltavou", atM: 26_521 },
  { id: "p2", name: "Přívoz do Letek", atM: 28_537, text: "Přívoz převáží chodce a kola na druhý břeh." },
];

describe("přívozy", () => {
  it("poznají se podle názvu „Přívoz …“", () => {
    expect(isFerry({ name: "Přívoz v Podbabě" })).toBe(true);
    expect(isFerry({ name: "přívoz do Letek" })).toBe(true);
    expect(isFerry({ name: "Lužec nad Vltavou" })).toBe(false);
    expect(isFerry({ name: "Zámek s přívozem" })).toBe(false);
  });
  it("pořadí a další břeh ze skutečných míst", () => {
    expect(ferryInfo(places, "p1")).toMatchObject({ index: 1, total: 2, next: { distanceM: 14_781 } });
    expect(ferryInfo(places, "p1")!.next!.place.id).toBe("p2");
    expect(ferryInfo(places, "p2")).toMatchObject({ index: 2, total: 2, next: null });
    expect(ferryInfo(places, "x")).toBeNull();
  });
  it("texty jen z existujících dat", () => {
    expect(ferryTexts(places[1]!)).toEqual({ quote: "Háček.", body: "Kontext." });
    expect(ferryTexts(places[3]!)).toEqual({ quote: undefined, body: "Přívoz převáží chodce a kola na druhý břeh." });
    expect(ferryTexts({ id: "z", name: "Přívoz", atM: 1 })).toEqual({ quote: undefined, body: undefined });
  });
});
