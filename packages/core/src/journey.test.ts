import { describe, expect, it } from "vitest";
import { buildPlan, journeyEvents, walkedBySlice, walkedInSlicesM, type DaySlice } from "./index";

const slice = (day: string, whole = true): DaySlice => ({ day, from: new Date(`${day}T00:00:00`), to: new Date(`${day}T23:59:59`), whole });
const plan = buildPlan({
  totalM: 10_000,
  stageEndsM: [4000, 10_000],
  places: [
    { id: "a", kind: "stop", atM: 0 },
    { id: "b", kind: "discovery", atM: 2500 },
    { id: "c", kind: "stop", atM: 6000 },
    { id: "m", kind: "milestone", atM: 5000 },
  ],
});

describe("dny dosažení míst výpravy", () => {
  it("místo patří dni, kdy součet překročil jeho kilometr", () => {
    const ev = journeyEvents(plan, [
      { day: "2026-10-01", distanceM: 2000 },
      { day: "2026-10-02", distanceM: 1500 },
      { day: "2026-10-03", distanceM: 3000 },
    ]);
    const day = (kind: string, ref: string) => ev.find((e) => e.kind === kind && e.ref === ref)?.reachedDay;
    expect(day("place", "a")).toBe("2026-10-01");
    expect(day("place", "b")).toBe("2026-10-02");
    expect(day("stage", "0")).toBe("2026-10-03");
    expect(day("place", "c")).toBe("2026-10-03");
    expect(ev.some((e) => e.ref === "m")).toBe(false);
    expect(ev.some((e) => e.kind === "finish")).toBe(false);
  });

  it("výprava bez pohybu nemá žádné události, ani místo na kilometru 0", () => {
    expect(journeyEvents(plan, [])).toEqual([]);
    expect(journeyEvents(plan, [{ day: "2026-10-01", distanceM: 0 }])).toEqual([]);
  });

  it("přesné dosažení hranice a cíl", () => {
    const ev = journeyEvents(plan, [{ day: "2026-10-01", distanceM: 4000 }, { day: "2026-10-02", distanceM: 6000 }]);
    expect(ev.find((e) => e.kind === "stage" && e.ref === "0")?.reachedDay).toBe("2026-10-01");
    expect(ev.find((e) => e.kind === "finish")).toEqual({ kind: "finish", ref: "finish", atM: 10_000, reachedDay: "2026-10-02" });
  });

  it("více úseků téhož dne (pozastavení a obnovení) se sečte, den zůstává jeden", () => {
    const ev = journeyEvents(plan, [
      { day: "2026-10-01", distanceM: 1500 },
      { day: "2026-10-01", distanceM: 1500 },
    ]);
    expect(ev.find((e) => e.ref === "b")?.reachedDay).toBe("2026-10-01");
  });

  it("walkedBySlice dává v součtu totéž co walkedInSlicesM a opakovaný den bez intervalu započítá jednou", () => {
    const slices = [slice("2026-10-01", false), slice("2026-10-01", false), slice("2026-10-02")];
    const daily = [
      { date: "2026-10-01", distanceM: 3000, confidence: "estimated" as const },
      { date: "2026-10-02", distanceM: 1000, confidence: "estimated" as const },
    ];
    const per = walkedBySlice(slices, daily);
    expect(per.map((p) => p.distanceM)).toEqual([3000, 0, 1000]);
    expect(per.reduce((a, p) => a + p.distanceM, 0)).toBe(walkedInSlicesM(slices, daily));
    expect(walkedBySlice(slices, daily, [500, 700, null]).map((p) => p.distanceM)).toEqual([500, 700, 1000]);
  });
});
