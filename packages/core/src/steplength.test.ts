import { describe, expect, it } from "vitest";
import { calibrateStepLength, parseStepProfile, resolveStepLength, stepLengthFromHeight, toDailyRecordStepsFirst } from "./index";

describe("délka kroku", () => {
  it("výchozí hodnota bez údajů", () => {
    expect(resolveStepLength(undefined)).toEqual({ meters: 0.75, source: "default" });
    expect(resolveStepLength({})).toEqual({ meters: 0.75, source: "default" });
  });

  it("z výšky podle pohlaví", () => {
    expect(stepLengthFromHeight(180, "male")).toBe(0.75);
    expect(stepLengthFromHeight(165, "female")).toBe(0.68);
    expect(stepLengthFromHeight(170)).toBe(0.7);
    expect(stepLengthFromHeight(50)).toBeNull();
    expect(resolveStepLength({ heightCm: 190, sex: "male" })).toEqual({ meters: 0.79, source: "height" });
  });

  it("zadaná nebo naměřená hodnota má přednost před výškou", () => {
    const at = "2026-10-30T10:00:00.000Z";
    expect(resolveStepLength({ heightCm: 190, override: { meters: 0.8, source: "calibrated", at } })).toEqual({ meters: 0.8, source: "calibrated" });
    expect(resolveStepLength({ heightCm: 190, override: { meters: 9, source: "manual", at } })).toEqual({ meters: 0.79, source: "height" });
  });

  it("kalibrace: 1 km na 1 250 kroků je 0,8 m", () => {
    expect(calibrateStepLength(1000, 1250)).toBe(0.8);
  });

  it("kalibrace odmítne málo kroků a nevěrohodné hodnoty", () => {
    expect(calibrateStepLength(100, 120)).toBeNull();
    expect(calibrateStepLength(5000, 1000)).toBeNull();
    expect(calibrateStepLength(100, 1000)).toBeNull();
    expect(calibrateStepLength(0, 1000)).toBeNull();
  });

  it("načtení profilu zahodí neplatné části", () => {
    expect(parseStepProfile(null)).toEqual({});
    expect(parseStepProfile({ heightCm: 9999, sex: "x", override: { meters: 0.8 } })).toEqual({});
    expect(parseStepProfile({ heightCm: 180, sex: "male" })).toEqual({ heightCm: 180, sex: "male" });
  });

  it("odhad z kroků i okno důvěry sledují osobní délku kroku", () => {
    // 10 000 kroků × 0,8 m = 8 km; vzdálenost 7,5 km leží v okně, vezme se jako ověřená.
    expect(toDailyRecordStepsFirst("d", 7500, 10_000, 0.8)).toEqual({ date: "d", distanceM: 7500, confidence: "verified" });
    expect(toDailyRecordStepsFirst("d", 100, 10_000, 0.8)).toEqual({ date: "d", distanceM: 8000, confidence: "estimated" });
  });
});
