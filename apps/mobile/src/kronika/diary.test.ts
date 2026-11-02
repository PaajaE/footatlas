import { describe, expect, it } from "vitest";
import type { JourneyEvent } from "@footatlas/core";
import { buildDiary, dayTitle, diaryCards, diaryInsight, miniMap, rangeLabel, type DiaryDay } from "./diary";

const name = (id: string) => ({ a: "Císařský ostrov", b: "Trojská lávka", c: "Karlův most", d: "Výtoň" })[id] ?? id;
const ev = (kind: JourneyEvent["kind"], ref: string, atM: number, reachedDay: string): JourneyEvent => ({ kind, ref, atM, reachedDay });

describe("buildDiary", () => {
  const slices = [
    { day: "2026-10-30", distanceM: 2_700 },
    { day: "2026-10-31", distanceM: 3_000 },
    { day: "2026-10-31", distanceM: 100 },
    { day: "2026-11-01", distanceM: 0 },
    { day: "2026-11-02", distanceM: 300 },
  ];
  const events = [
    ev("place", "b", 5_900, "2026-10-31"),
    ev("place", "a", 4_800, "2026-10-31"),
    ev("stage", "0", 5_900, "2026-10-31"),
    ev("place", "c", 2_000, "2026-10-30"),
  ];
  const days = buildDiary(slices, events, name, 0.75);

  it("nejnovější den první, dny bez vzdálenosti se vynechají, úseky dne se sečtou", () => {
    expect(days.map((d) => d.day)).toEqual(["2026-11-02", "2026-10-31", "2026-10-30"]);
    expect(days[1]!.distanceM).toBe(3_100);
  });
  it("km před a po dni navazují", () => {
    expect(days[2]).toMatchObject({ fromM: 0, toM: 2_700 });
    expect(days[1]).toMatchObject({ fromM: 2_700, toM: 5_800 });
    expect(days[0]).toMatchObject({ fromM: 5_800, toM: 6_100 });
  });
  it("místa dne v pořadí po trase a dokončená etapa od 1", () => {
    expect(days[1]!.places.map((p) => p.name)).toEqual(["Císařský ostrov", "Trojská lávka"]);
    expect(days[1]!.stagesDone).toEqual([1]);
    expect(days[0]!.places).toEqual([]);
  });
  it("kroky jen s délkou kroku", () => {
    expect(days[2]!.steps).toBeCloseTo(3_600, 5);
    expect(buildDiary(slices, events, name, 0)[0]!.steps).toBeNull();
  });
  it("prázdný vstup", () => {
    expect(buildDiary([], [], name, 0.75)).toEqual([]);
  });
});

describe("minimapa a popisky", () => {
  const d = { fromM: 9_100, toM: 12_200, places: [{ id: "a", name: "A", atM: 12_030 }, { id: "b", name: "B", atM: 12_160 }] };
  it("podíly na pruhu", () => {
    const m = miniMap(d, 12_500);
    expect(m.from).toBeCloseTo(0.728, 3);
    expect(m.len).toBeCloseTo(0.248, 3);
    expect(m.marks[1]).toBeCloseTo(0.9728, 3);
  });
  it("krátký úsek je aspoň vidět, mimo rozsah se ořízne", () => {
    expect(miniMap({ fromM: 0, toM: 1, places: [{ id: "x", name: "x", atM: 99_999 }] }, 1_000).len).toBeGreaterThan(0.01);
    expect(miniMap({ fromM: 0, toM: 1, places: [{ id: "x", name: "x", atM: 99_999 }] }, 1_000).marks).toEqual([1]);
  });
  it("rozsah km a název dne", () => {
    expect(rangeLabel(d)).toBe("km 9,1 → 12,2");
    expect(dayTitle("2026-11-02", "2026-11-02")).toBe("Dnes");
    expect(dayTitle("2026-11-01", "2026-11-02")).toBe("Neděle 1. listopadu");
    expect(dayTitle("2025-12-24", "2026-11-02")).toBe("Středa 24. prosince 2025");
  });
});

describe("postřehy", () => {
  const base: DiaryDay = { day: "2026-10-31", distanceM: 3_000, fromM: 0, toM: 3_000, steps: 4_000, places: [], stagesDone: [], finished: false };
  const place = (n: string) => ({ id: n, name: n, atM: 1 });
  const ctx = { isToday: false, isLongest: false };

  it("cíl a etapa mají přednost", () => {
    expect(diaryInsight({ ...base, finished: true, places: [place("A")] }, ctx)).toContain("Cíl výpravy");
    expect(diaryInsight({ ...base, stagesDone: [2] }, ctx)).toContain("Konec 2. etapy");
  });
  it("podle počtu míst", () => {
    expect(diaryInsight({ ...base, places: [place("Karlův most")] }, ctx)).toBe("Objev dne: Karlův most.");
    expect(diaryInsight({ ...base, places: [place("Karlův most")] }, { ...ctx, isToday: true })).toBe("Dnes jste objevili: Karlův most.");
    expect(diaryInsight({ ...base, places: [place("A"), place("B")] }, ctx)).toBe("Dvě místa za jeden den: A a B.");
    expect(diaryInsight({ ...base, places: [place("A"), place("B"), place("C")] }, ctx)).toBe("3 místa za jediný den. Deník se plní.");
    expect(diaryInsight({ ...base, places: Array.from({ length: 5 }, (_, i) => place(`m${i}`)) }, ctx)).toContain("5 míst");
  });
  it("dnešek bez objevu ukáže další místo, jen pokud není na dosah ruky", () => {
    const today = { isToday: true, isLongest: false };
    expect(diaryInsight({ ...base, distanceM: 300 }, { ...today, nextStop: { name: "Trojský zámek", remainingM: 40 } })).toBe(
      "Bez objevu zatím. Trojský zámek čeká 40 m od vás.",
    );
    expect(diaryInsight({ ...base, distanceM: 300 }, { ...today, nextStop: { name: "Trojský zámek", remainingM: 5 } })).toContain("Krátká procházka");
  });
  it("nejdelší a dlouhý den, jinak podle délky", () => {
    expect(diaryInsight(base, { ...ctx, isLongest: true })).toContain("Nejdelší den výpravy zatím");
    expect(diaryInsight({ ...base, distanceM: 12_000 }, ctx)).toContain("Pořádný den");
    expect(diaryInsight({ ...base, distanceM: 300 }, ctx)).toBe("Krátká procházka bez objevu. I tak se cesta prodloužila o 300 m.");
    expect(diaryInsight({ ...base, distanceM: 600 }, ctx)).toBe("Den bez objevu, ale cesta se prodloužila o 600 m.");
    expect(diaryInsight(base, ctx)).toBe("Den bez objevu, ale cesta se prodloužila o 3,0 km.");
  });
  it("karty: nejdelší den se označí jen při aspoň 3 dnech, další místo jen u dneška", () => {
    const mk = (day: string, m: number): DiaryDay => ({ ...base, day, distanceM: m });
    const two = diaryCards([mk("2026-11-02", 300), mk("2026-11-01", 3_000)], "2026-11-02", null);
    expect(two[1]!.insight).not.toContain("Nejdelší");
    const three = diaryCards([mk("2026-11-02", 300), mk("2026-11-01", 3_000), mk("2026-10-31", 1_000)], "2026-11-02", { name: "Zámek", remainingM: 40 });
    expect(three[0]!.insight).toContain("Zámek čeká 40 m");
    expect(three[1]!.insight).toContain("Nejdelší den výpravy");
    expect(three[0]!.title).toBe("Dnes");
  });
});
