import { describe, expect, it } from "vitest";
import {
  INTRO_AHEAD,
  INTRO_INK,
  importOutcome,
  introRiverPoints,
  onboardingGate,
  pointAt,
  polylineLength,
  polylinePath,
  type GateInput,
} from "./onboarding";

const base: GateInput = {
  flagLoaded: true,
  done: false,
  expeditionReady: true,
  hasSession: false,
  chronicleReady: true,
  hasHistory: false,
  chronicleTimedOut: false,
};

describe("onboardingGate", () => {
  it("čeká, dokud se nenačte příznak i výprava", () => {
    expect(onboardingGate({ ...base, flagLoaded: false })).toBe("wait");
    expect(onboardingGate({ ...base, expeditionReady: false })).toBe("wait");
  });
  it("hotový úvod se nikdy neukáže znovu, ani když se nic nenačetlo", () => {
    expect(onboardingGate({ ...base, done: true, expeditionReady: false })).toBe("skip");
  });
  it("nový uživatel vidí úvod", () => {
    expect(onboardingGate(base)).toBe("show");
  });
  it("existující uživatel s relací nebo historií úvod nevidí", () => {
    expect(onboardingGate({ ...base, hasSession: true })).toBe("skip");
    expect(onboardingGate({ ...base, hasHistory: true })).toBe("skip");
  });
  it("čeká na kroniku, ale ne donekonečna", () => {
    expect(onboardingGate({ ...base, chronicleReady: false })).toBe("wait");
    expect(onboardingGate({ ...base, chronicleReady: false, chronicleTimedOut: true })).toBe("show");
  });
});

describe("importOutcome", () => {
  it("rozliší odmítnutí, nedostupnost, chybu, prázdná a načtená data", () => {
    expect(importOutcome({ kind: "unavailable", reason: "denied" }, 0)).toEqual({ kind: "denied" });
    expect(importOutcome({ kind: "unavailable", reason: "no-health-connect" }, 0)).toEqual({ kind: "unavailable", reason: "no-health-connect" });
    expect(importOutcome({ kind: "error", message: "x" }, 0)).toEqual({ kind: "error", message: "x" });
    expect(importOutcome({ kind: "idle" }, 0)).toEqual({ kind: "empty" });
    expect(importOutcome({ kind: "idle" }, 14_200_000)).toEqual({ kind: "ok", totalM: 14_200_000 });
  });
});

describe("kresba úvodu", () => {
  it("délka a bod na lomené čáře", () => {
    const l: [number, number][] = [[0, 0], [30, 40], [30, 140]];
    expect(polylineLength(l)).toBe(150);
    expect(pointAt(l, 0)).toEqual([0, 0]);
    expect(pointAt(l, 1)).toEqual([30, 140]);
    expect(pointAt(l, 50 / 150)).toEqual([30, 40]);
    expect(polylinePath(l)).toBe("M0 0 L30 40 L30 140");
  });
  it("pokračování navazuje na konec ušlého úseku", () => {
    expect(INTRO_AHEAD[0]).toEqual(INTRO_INK[INTRO_INK.length - 1]);
  });
  it("trasa vede po břehu: od osy řeky má všude aspoň 18 jednotek (šířka řeky je 26)", () => {
    const river = introRiverPoints();
    for (const line of [INTRO_INK, INTRO_AHEAD]) {
      for (let t = 0; t <= 1; t += 0.01) {
        const [x, y] = pointAt(line, t);
        const d = Math.min(...river.map(([rx, ry]) => Math.hypot(rx - x, ry - y)));
        expect(d).toBeGreaterThan(18);
      }
    }
  });
});
