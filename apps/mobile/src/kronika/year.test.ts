import { describe, expect, it } from "vitest";
import type { DailyRecord } from "@footatlas/core";
import { bestMonthSentence, dayLevel, monthTotals, records, weekdayAverages, yearGrid, yearsWithRecords, yearTotalM } from "./year";

const r = (date: string, km: number): DailyRecord => ({ date, distanceM: km * 1000, confidence: "verified" });

describe("rok po dnech", () => {
  it("úrovně podle hranic", () => {
    expect([0, 1, 2, 4.4, 4.5, 6.9, 7, 20].map((km) => dayLevel(km * 1000))).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });
  it("mřížka: 2026 začíná ve čtvrtek, 53 týdnů, 365 dnů, den s záznamem na správném místě", () => {
    const g = yearGrid([r("2026-01-01", 5), r("2026-11-02", 3)], 2026);
    expect(g).toHaveLength(53);
    expect(g.flat().filter((c) => c.day !== null)).toHaveLength(365);
    expect(g[0]![3]).toMatchObject({ day: "2026-01-01", level: 3 });
    expect(g[0]![0]!.day).toBeNull();
    const nov2 = g.flat().find((c) => c.day === "2026-11-02")!;
    expect(nov2.level).toBe(2);
    // 2. 11. 2026 je pondělí, tedy první řádek
    const col = g.findIndex((c) => c.some((x) => x.day === "2026-11-02"));
    expect(g[col]![0]!.day).toBe("2026-11-02");
  });
  it("přestupný rok má 366 dnů", () => {
    expect(yearGrid([], 2024).flat().filter((c) => c.day !== null)).toHaveLength(366);
  });
  it("roky a součty", () => {
    const days = [r("2025-12-31", 2), r("2026-01-01", 3), r("2026-02-01", 5), r("2026-02-02", 0)];
    expect(yearsWithRecords(days)).toEqual([2025, 2026]);
    expect(yearTotalM(days, 2026)).toBe(8000);
    expect(monthTotals(days, 2026).slice(0, 3)).toEqual([3000, 5000, 0]);
    expect(bestMonthSentence(days, 2026)).toBe("Nejsilnější měsíc roku 2026 je únor: 5 km.");
    expect(bestMonthSentence(days, 2024)).toBeNull();
  });
});

describe("dny v týdnu", () => {
  const sat = Array.from({ length: 8 }, (_, i) => r(`2026-03-${String(7 + i * 7 > 31 ? 0 : 7 + i * 7).padStart(2, "0")}`, 8)).filter((d) => !d.date.endsWith("-00"));
  it("málo dnů = bez grafu", () => {
    expect(weekdayAverages([r("2026-03-07", 8)], 2026, new Date(2026, 5, 1))).toBeNull();
  });
  it("sobota vítězí", () => {
    // soboty 7., 14., 21., 28. března a 4., 11., 18., 25. dubna + ostatní dny po 1 km
    const days: DailyRecord[] = [];
    for (let d = new Date(2026, 2, 2); d <= new Date(2026, 3, 26); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push(r(key, d.getDay() === 6 ? 8 : 1));
    }
    const out = weekdayAverages(days, 2026, new Date(2026, 3, 26))!;
    expect(out.sentence).toBe("Nejvíc chodíte v sobotu.");
    expect(out.stats[5]!.avgM).toBe(8000);
    expect(out.stats[0]!.avgM).toBe(1000);
    expect(sat.length).toBeGreaterThan(0);
  });
});

describe("rekordy", () => {
  const days = [r("2026-05-04", 6), r("2026-05-05", 4), r("2026-05-09", 14), r("2026-05-20", 2)];
  it("nejdelší den, nejlepší týden, průměr, pauza", () => {
    const rec = records(days, 0.75);
    expect(rec.map((x) => x.label)).toEqual(["Nejdelší den", "Nejlepší týden", "Průměr na den", "Nejdelší pauza"]);
    expect(rec[0]).toMatchObject({ value: "14,0 km", note: "9. května 2026" });
    expect(rec[1]).toMatchObject({ value: "24,0 km", note: "týden od 4. května 2026" });
    expect(rec[2]!.value).toBe("6,5 km");
    expect(rec[3]).toMatchObject({ value: "10 dní", note: "10. května 2026 až 19. května 2026" });
  });
  it("bez pauzy od 2 dnů se nepíše, bez dat nic", () => {
    expect(records([r("2026-05-04", 1), r("2026-05-05", 1), r("2026-05-07", 1)]).some((x) => x.label === "Nejdelší pauza")).toBe(false);
    expect(records([])).toEqual([]);
    expect(records([r("2026-05-04", 0)])).toEqual([]);
  });
});
