import { describe, expect, it } from "vitest";
import { buildPlan, computeState, densityReport, distanceInPeriodsM, type DailyRecord, type PlanPlace } from "./index";

const place = (id: string, kind: PlanPlace["kind"], atM: number): PlanPlace => ({ id, kind, atM });

const plan = buildPlan({
  totalM: 20_000,
  stageEndsM: [8_000, 20_000],
  places: [
    place("o1", "discovery", 600),
    place("s1", "stop", 3_000),
    place("o2", "discovery", 5_500),
    place("s2", "stop", 9_000),
    place("m", "milestone", 10_000),
    place("s3", "stop", 20_000),
    place("mimo", "stop", 25_000),
  ],
});

describe("plán", () => {
  it("ořízne místa za koncem a seřadí", () => {
    expect(plan.places.map((p) => p.id)).toEqual(["o1", "s1", "o2", "s2", "m", "s3"]);
  });
  it("etapy navazují", () => {
    expect(plan.stages).toEqual([
      { index: 0, startM: 0, endM: 8_000 },
      { index: 1, startM: 8_000, endM: 20_000 },
    ]);
  });
  it("bez zadaných etap je rozdělí rovnoměrně", () => {
    expect(buildPlan({ totalM: 62_000, places: [] }).stages).toHaveLength(3);
  });
  it("odmítne nulovou délku", () => {
    expect(() => buildPlan({ totalM: 0, places: [] })).toThrow();
  });
});

describe("stav výpravy", () => {
  it("na startu", () => {
    const s = computeState(plan, 0);
    expect(s.reached).toEqual([]);
    expect(s.next?.id).toBe("o1");
    expect(s.toNextM).toBe(600);
    expect(s.stage.index).toBe(0);
    expect(s.completed).toBe(false);
  });
  it("uprostřed etapy ukáže další místo, další zastávku a výhled", () => {
    const s = computeState(plan, 4_000);
    expect(s.reached.map((p) => p.id)).toEqual(["o1", "s1"]);
    expect(s.next?.id).toBe("o2");
    expect(s.nextStop?.id).toBe("s2");
    expect(s.toNextStopM).toBe(5_000);
    expect(s.upcoming.map((p) => p.id)).toEqual(["o2", "s2"]);
    expect(s.stageWalkedM).toBe(4_000);
  });
  it("přechod do druhé etapy", () => {
    const s = computeState(plan, 8_000);
    expect(s.stagesCompleted).toBe(1);
    expect(s.stage.index).toBe(1);
    expect(s.stageWalkedM).toBe(0);
  });
  it("od posledního otevření: nově odemčená místa a etapy", () => {
    const s = computeState(plan, 9_500, { previousWalkedM: 2_000 });
    expect(s.newlyReached.map((p) => p.id)).toEqual(["s1", "o2", "s2"]);
    expect(s.newlyCompletedStages.map((x) => x.index)).toEqual([0]);
  });
  it("přesně na hraně se místo odemkne", () => {
    expect(computeState(plan, 3_000).reached.map((p) => p.id)).toContain("s1");
  });
  it("dokončení ořízne vzdálenost a nemá další místo", () => {
    const s = computeState(plan, 99_999);
    expect(s.walkedM).toBe(20_000);
    expect(s.completed).toBe(true);
    expect(s.next).toBeNull();
    expect(s.nextStop).toBeNull();
    expect(s.stage.index).toBe(1);
    expect(s.stagesCompleted).toBe(2);
  });
  it("záporná vzdálenost se bere jako nula", () => {
    expect(computeState(plan, -5).walkedM).toBe(0);
  });
});

describe("hustota obsahu", () => {
  it("najde mezery a chybějící zastávky", () => {
    const r = densityReport(plan);
    expect(r.stops).toBe(3);
    expect(r.discoveries).toBe(2);
    expect(r.firstPlaceM).toBe(600);
    expect(r.maxGapM).toBe(11_000);
    expect(r.issues.some((i) => i.includes("mezera"))).toBe(true);
  });
  it("hustá výprava nemá výhrady", () => {
    const dense = buildPlan({
      totalM: 20_000,
      stageEndsM: [10_000, 20_000],
      places: Array.from({ length: 19 }, (_, i) => place(`p${i}`, i % 4 === 3 ? "stop" : "discovery", 800 + i * 1_000)),
    });
    expect(densityReport(dense).issues).toEqual([]);
  });
  it("první místo daleko od startu je chyba", () => {
    const p = buildPlan({ totalM: 5_000, places: [place("a", "stop", 2_500)] });
    expect(densityReport(p).issues.some((i) => i.includes("První místo"))).toBe(true);
  });
});

describe("období výpravy", () => {
  const recs: DailyRecord[] = [
    { date: "2026-10-01", distanceM: 1_000, confidence: "verified" },
    { date: "2026-10-05", distanceM: 2_000, confidence: "verified" },
    { date: "2026-10-10", distanceM: 4_000, confidence: "verified" },
    { date: "2026-10-15", distanceM: 8_000, confidence: "verified" },
  ];
  it("jedno běžící období", () => {
    expect(distanceInPeriodsM(recs, [{ from: "2026-10-05" }])).toBe(14_000);
  });
  it("pozastavení nepočítá den pozastavení a dny po něm", () => {
    expect(distanceInPeriodsM(recs, [{ from: "2026-10-05", until: "2026-10-10" }])).toBe(2_000);
  });
  it("obnovení přidá druhé období", () => {
    expect(
      distanceInPeriodsM(recs, [
        { from: "2026-10-01", until: "2026-10-05" },
        { from: "2026-10-15" },
      ]),
    ).toBe(9_000);
  });
});
