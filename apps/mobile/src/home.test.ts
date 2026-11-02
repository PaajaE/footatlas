import { describe, expect, it } from "vitest";
import {
  formatMinutes,
  formatWhen,
  pluralNewPlaces,
  reachQuip,
  shiftDay,
  stageLabel,
  sumLastDays,
  tileDistance,
  walkEstimate,
} from "./home";

describe("stageLabel", () => {
  it("první etapa je Praha, ostatní podle cíle", () => {
    expect(stageLabel(0, 4, "Zámek Roztoky")).toBe("Etapa 1 ze 4 · Praha");
    expect(stageLabel(1, 4, "Kralupy nad Vltavou")).toBe("Etapa 2 ze 4 · Kralupy nad Vltavou");
    expect(stageLabel(2, 4, undefined)).toBe("Etapa 3 ze 4");
  });
});

describe("tileDistance", () => {
  it("kilometry s čárkou, pod kilometr metry, nikdy 0,0 km", () => {
    expect(tileDistance(300)).toEqual({ value: "300", unit: "m" });
    expect(tileDistance(0)).toEqual({ value: "0", unit: "m" });
    expect(tileDistance(11_240)).toEqual({ value: "11,2", unit: "km" });
    expect(tileDistance(999)).toEqual({ value: "1000", unit: "m" });
    expect(tileDistance(120_000)).toEqual({ value: "120", unit: "km" });
    expect(tileDistance(Number.NaN)).toEqual({ value: "0", unit: "m" });
  });
});

describe("pluralNewPlaces", () => {
  it("skloňuje", () => {
    expect(pluralNewPlaces(1)).toBe("1 nové místo");
    expect(pluralNewPlaces(3)).toBe("3 nová místa");
    expect(pluralNewPlaces(7)).toBe("7 nových míst");
  });
});

describe("walkEstimate", () => {
  it("odpovídá prototypu: 2 km = asi 2 670 kroků a 24 minut", () => {
    expect(walkEstimate(2000, 0.75)).toBe("asi 2 670 kroků · 24 minut");
    expect(walkEstimate(1000, 0.75)).toBe("asi 1 330 kroků · 12 minut");
    expect(walkEstimate(6100, 0.75)).toBe("asi 8 130 kroků · 1 h 13 min");
  });
  it("formatMinutes", () => {
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(24)).toBe("24 minut");
  });
});

describe("sumLastDays", () => {
  const daily = [
    { day: "2026-10-25", distanceM: 1000 },
    { day: "2026-10-28", distanceM: 2000 },
    { day: "2026-11-02", distanceM: 300 },
  ];
  it("sedm dní včetně dneška", () => {
    expect(sumLastDays(daily, "2026-11-02", 7)).toBe(2300);
    expect(sumLastDays(daily, "2026-11-02", 1)).toBe(300);
    expect(sumLastDays(daily, "2026-11-02", 10)).toBe(3300);
  });
});

describe("dny", () => {
  it("shiftDay přes hranici měsíce", () => {
    expect(shiftDay("2026-11-02", -2)).toBe("2026-10-31");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("formatWhen", () => {
    expect(formatWhen("2026-11-02", "2026-11-02")).toBe("dnes");
    expect(formatWhen("2026-11-01", "2026-11-02")).toBe("včera");
    expect(formatWhen("2026-10-31", "2026-11-02")).toBe("sobota");
    expect(formatWhen("2026-10-24", "2026-11-02")).toBe("24. 10. 2026");
  });
});

describe("reachQuip", () => {
  it("hlášky z prototypu", () => {
    expect(reachQuip(2000, [])).toBe("Akorát na odpoledne s výhledem.");
    expect(reachQuip("stage", [])).toContain("pohlednice");
    expect(reachQuip(4000, ["Trojský zámek"])).toBeUndefined();
    expect(reachQuip(4000, ["Přívoz v Podbabě"])).toContain("převozníka");
  });
});

import { zOf } from "./home";
describe("zOf", () => {
  it("z / ze podle čísla", () => {
    expect(zOf(4, 5)).toBe("4 z 5");
    expect(zOf(3, 6)).toBe("3 ze 6");
    expect(zOf(1, 4)).toBe("1 ze 4");
  });
});

import { isWithinLastDays } from "./home";
describe("isWithinLastDays", () => {
  it("hranice týdne", () => {
    expect(isWithinLastDays("2026-10-27", "2026-11-02", 7)).toBe(true);
    expect(isWithinLastDays("2026-10-26", "2026-11-02", 7)).toBe(false);
    expect(isWithinLastDays("2026-11-03", "2026-11-02", 7)).toBe(false);
  });
});

import { approachFraction, neighbours } from "./home";
describe("okolí místa", () => {
  const places = [{ id: "a" }, { id: "b" }, { id: "c" }];
  it("neighbours", () => {
    expect(neighbours(places, "b")).toEqual({ prev: { id: "a" }, next: { id: "c" } });
    expect(neighbours(places, "a")).toEqual({ prev: undefined, next: { id: "b" } });
    expect(neighbours(places, "x")).toEqual({});
  });
  it("approachFraction", () => {
    expect(approachFraction(9_800, 9_832, 10_477)).toBe(0);
    expect(approachFraction(10_437, 9_832, 10_477)).toBeCloseTo(0.94, 2);
    expect(approachFraction(5, undefined, 100)).toBeCloseTo(0.05, 2);
    expect(approachFraction(500, 0, 100)).toBe(1);
  });
});
