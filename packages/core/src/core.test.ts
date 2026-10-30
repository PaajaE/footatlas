import { describe, expect, it } from "vitest";
import { expeditionDistanceM, progress, stepsToDistanceM, totals, type DailyRecord } from "./index";
import { lifeCardSentence, localDateKey, toDailyRecord } from "./index";

const recs: DailyRecord[] = [
  { date: "2020-01-01", distanceM: 5000, confidence: "verified" },
  { date: "2026-10-30", distanceM: 3000, confidence: "verified" },
  { date: "2026-10-31", distanceM: 2000, confidence: "estimated" },
];

describe("kronika", () => {
  it("sčítá podle úrovně důvěry", () => {
    expect(totals(recs)).toEqual({
      totalM: 10000,
      byConfidence: { verified: 8000, estimated: 2000, manual: 0 },
    });
  });
  it("kroky přepočítá na vzdálenost", () => {
    expect(stepsToDistanceM(1000)).toBe(750);
  });
});

describe("výprava", () => {
  it("nezapočítává historii před zahájením", () => {
    expect(expeditionDistanceM(recs, "2026-10-30")).toBe(5000);
  });
  it("najde další zastávku a zbývající vzdálenost", () => {
    const p = progress([{ id: "b", atM: 8000 }, { id: "a", atM: 2000 }], 3000);
    expect(p.reached.map((w) => w.id)).toEqual(["a"]);
    expect(p.next?.id).toBe("b");
    expect(p.toNextM).toBe(5000);
  });
  it("po dokončení nemá další zastávku", () => {
    expect(progress([{ id: "a", atM: 2000 }], 2000).toNextM).toBeNull();
  });
});

describe("zdraví", () => {
  it("vzdálenost má přednost před kroky", () => {
    expect(toDailyRecord("2026-10-30", 5000, 9000)).toEqual({ date: "2026-10-30", distanceM: 5000, confidence: "verified" });
  });
  it("kroky jsou jen odhad", () => {
    expect(toDailyRecord("2026-10-30", 0, 1000)).toEqual({ date: "2026-10-30", distanceM: 750, confidence: "estimated" });
  });
  it("prázdný den se nevrací", () => {
    expect(toDailyRecord("2026-10-30", 0, 0)).toBeNull();
  });
  it("lokální datum", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("karta života", () => {
  it("14 200 km je Tokio a 5 100 navíc", () => {
    expect(lifeCardSentence(14200)).toBe("To je z Prahy do Tokia a ještě 5 100 km navíc.");
  });
  it("pod prvním městem", () => {
    expect(lifeCardSentence(100)).toContain("začátku");
  });
});
