import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildPlan, computeState, densityReport, routeLengthM, type RoutePoint } from "@footatlas/core";
import { expedition } from "./index";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "vltavska-stezka");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));

const parsed = expedition.safeParse(read("expedition.json"));
const route = read("route.json") as { type: string; coordinates: [number, number][] };

describe("pilotní výprava Vltavská stezka", () => {
  it("odpovídá schématu", () => {
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error.issues, null, 1));
    expect(parsed.data.status).toBe("draft");
    expect(parsed.data.routeType).toBe("virtual");
    expect(parsed.data.places).toHaveLength(39);
  });

  it("délka v metadatech odpovídá geometrii", () => {
    const pts: RoutePoint[] = route.coordinates.map(([lon, lat]) => ({ lat, lon }));
    expect(route.type).toBe("LineString");
    expect(Math.abs(routeLengthM(pts) - parsed.data!.totalM) / parsed.data!.totalM).toBeLessThan(0.001);
  });

  it("místa jsou seřazená podle polohy na trase", () => {
    const at = parsed.data!.places.map((p) => p.unlockAtM);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it("čtyři etapy končí zastávkou a poslední v cíli", () => {
    const e = parsed.data!;
    expect(e.stageEndsM).toHaveLength(4);
    expect(e.stageEndsM!.at(-1)).toBe(e.totalM);
    for (const end of e.stageEndsM!.slice(0, 3)) {
      expect(e.places.some((p) => p.kind === "stop" && p.unlockAtM === end)).toBe(true);
    }
  });

  it("hustota míst splňuje cíle spec 7.2", () => {
    const e = parsed.data!;
    const plan = buildPlan({
      totalM: e.totalM,
      stageEndsM: e.stageEndsM,
      places: e.places.map((p) => ({ id: p.id, kind: p.kind, atM: p.unlockAtM })),
    });
    const r = densityReport(plan);
    expect(r.stops).toBe(10);
    expect(r.discoveries).toBe(29);
    expect(r.avgGapM).toBeLessThan(2_000);
    expect(r.issues).toEqual([]);
  });

  it("po konci druhé etapy (Kralupy) je další zastávka Zámek Nelahozeves", () => {
    const e = parsed.data!;
    const plan = buildPlan({
      totalM: e.totalM,
      stageEndsM: e.stageEndsM,
      places: e.places.map((p) => ({ id: p.id, kind: p.kind, atM: p.unlockAtM })),
    });
    const kralupy = e.places.find((p) => p.id === "kralupy")!.unlockAtM;
    expect(e.stageEndsM![1]).toBe(kralupy);
    const s = computeState(plan, kralupy + 200, { previousWalkedM: kralupy - 3_000 });
    expect(s.stagesCompleted).toBe(2);
    expect(s.newlyCompletedStages.map((x) => x.index)).toEqual([1]);
    expect(s.nextStop?.id).toBe("nelahozeves");
    expect(s.toNextStopM!).toBeGreaterThan(1_000);
    expect(s.toNextStopM!).toBeLessThan(4_000);
  });

  // Etapa se dokončí až na konci, ne dřív: těsně před koncem každé etapy je dokončeno o jednu méně.
  it("etapa není dokončena těsně před svým koncem", () => {
    const e = parsed.data!;
    const plan = buildPlan({
      totalM: e.totalM,
      stageEndsM: e.stageEndsM,
      places: e.places.map((p) => ({ id: p.id, kind: p.kind, atM: p.unlockAtM })),
    });
    e.stageEndsM!.forEach((end, i) => {
      expect(computeState(plan, end - 100).stagesCompleted).toBe(i);
      expect(computeState(plan, end).stagesCompleted).toBe(i + 1);
    });
  });

  it("trasa je pěší po souši: délka 60 až 90 km a čtyři etapy 10 až 20 km", () => {
    const e = parsed.data!;
    expect(e.totalM).toBeGreaterThan(60_000);
    expect(e.totalM).toBeLessThan(90_000);
    e.stageEndsM!.forEach((end, i) => {
      const len = end - (i ? e.stageEndsM![i - 1]! : 0);
      expect(len).toBeGreaterThan(10_000);
      expect(len).toBeLessThan(20_000);
    });
  });
});
