import { describe, expect, it } from "vitest";
import { chronicleDays, chronicleStats, needsRecompute, RULE_VERSION, syncFrom, toStoredDay, type StoredDay } from "./index";

const row = (day: string, source: StoredDay["source"], distanceM: number, confidence: StoredDay["confidence"] = "estimated"): StoredDay => ({
  day, source, steps: null, rawDistanceM: null, distanceM, confidence, ruleVersion: RULE_VERSION, stepLengthM: 0.75, readAt: "2026-10-30T10:00:00.000Z",
});

describe("kronika: uložené dny", () => {
  it("surový den na Androidu: kroky hlavní, délka kroku se uloží", () => {
    const r = toStoredDay("android", "health_connect", { day: "2026-10-30", steps: 10_000, distanceM: 72 }, 0.8, "t")!;
    expect(r).toMatchObject({ distanceM: 8000, confidence: "estimated", steps: 10_000, rawDistanceM: 72, stepLengthM: 0.8, ruleVersion: RULE_VERSION });
  });

  it("iOS: vzdálenost má přednost; den bez pohybu se neukládá", () => {
    expect(toStoredDay("ios", "healthkit", { day: "d", steps: 5000, distanceM: 3600 }, 0.75, "t")).toMatchObject({ distanceM: 3600, confidence: "verified" });
    expect(toStoredDay("android", "health_connect", { day: "d", steps: 0, distanceM: 500 }, 0.75, "t")).toBeNull();
  });

  it("přepočet je potřeba po změně délky kroku nebo verze pravidla", () => {
    expect(needsRecompute(row("d", "health_connect", 1), 0.75)).toBe(false);
    expect(needsRecompute(row("d", "health_connect", 1), 0.8)).toBe(true);
    expect(needsRecompute({ ...row("d", "health_connect", 1), ruleVersion: RULE_VERSION - 1 }, 0.75)).toBe(true);
  });

  it("jeden řádek na den, systémový zdroj má přednost, výsledek je seřazený", () => {
    const days = chronicleDays([
      row("2026-10-02", "health_connect", 2000),
      row("2026-10-01", "health_connect", 1000),
      row("2026-10-01", "healthkit", 9999),
    ]);
    expect(days.map((d) => [d.date, d.distanceM])).toEqual([["2026-10-01", 1000], ["2026-10-02", 2000]]);
  });

  it("Takeout jen pro dny před nejstarším systémovým dnem, GPX nikdy", () => {
    const days = chronicleDays([
      row("2026-09-01", "takeout", 5000),
      row("2026-09-18", "takeout", 6000),
      row("2026-09-18", "health_connect", 4000),
      row("2026-09-19", "takeout", 7000),
      row("2026-08-01", "gpx", 8000),
    ]);
    expect(days.map((d) => [d.date, d.distanceM])).toEqual([["2026-09-01", 5000], ["2026-09-18", 4000]]);
  });

  it("od kdy číst: poprvé vše, potom 7 dní zpět", () => {
    expect(syncFrom(null, new Date(2026, 9, 30)).getFullYear()).toBe(2000);
    const d = syncFrom(new Date(2026, 9, 30, 12).toISOString(), new Date(2026, 9, 31));
    expect([d.getMonth(), d.getDate()]).toEqual([9, 23]);
    expect(syncFrom("nesmysl", new Date(2026, 9, 30)).getDate()).toBe(23);
  });

  it("statistiky: součty, důvěra, nejdelší den, po letech", () => {
    const s = chronicleStats([
      { date: "2025-12-31", distanceM: 4000, confidence: "verified" },
      { date: "2026-01-01", distanceM: 9000, confidence: "estimated" },
      { date: "2026-01-02", distanceM: 0, confidence: "estimated" },
      { date: "2026-01-03", distanceM: 1000, confidence: "manual" },
    ]);
    expect(s.totalM).toBe(14000);
    expect(s.byConfidence).toEqual({ verified: 4000, estimated: 9000, manual: 1000 });
    expect(s.daysWithRecord).toBe(3);
    expect(s.firstDay).toBe("2025-12-31");
    expect(s.longestDay).toEqual({ day: "2026-01-01", distanceM: 9000 });
    expect(s.byYear).toEqual([{ year: "2025", distanceM: 4000, days: 1 }, { year: "2026", distanceM: 10000, days: 2 }]);
  });
});
