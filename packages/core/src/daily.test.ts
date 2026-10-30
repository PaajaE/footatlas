import { afterEach, describe, expect, it } from "vitest";
import { addToDay, mergeDaily, periodStartDayKey, yearChunks } from "./index";

const origTz = process.env.TZ;
afterEach(() => {
  if (origTz === undefined) delete process.env.TZ;
  else process.env.TZ = origTz;
});

describe("periodStartDayKey", () => {
  it("lokální čas bez zóny je přímo den", () => {
    expect(periodStartDayKey("2026-10-26T00:00:00")).toBe("2026-10-26");
    expect(periodStartDayKey("2026-10-26T13:33:40.701")).toBe("2026-10-26");
  });

  it("nezávisí na zóně zařízení u řetězce bez zóny", () => {
    for (const tz of ["America/Vancouver", "Europe/Prague", "Pacific/Auckland"]) {
      process.env.TZ = tz;
      expect(periodStartDayKey("2026-10-26T00:00:00")).toBe("2026-10-26");
    }
  });

  it("instant se zónou se převede do lokálního dne zařízení", () => {
    process.env.TZ = "Europe/Prague";
    expect(periodStartDayKey("2026-10-25T22:30:00Z")).toBe("2026-10-25");
    expect(periodStartDayKey("2026-10-25T23:30:00Z")).toBe("2026-10-26");
    expect(periodStartDayKey("2026-10-26T01:30:00+02:00")).toBe("2026-10-26");
    process.env.TZ = "America/Vancouver";
    expect(periodStartDayKey("2026-10-26T02:00:00Z")).toBe("2026-10-25");
  });

  it("den s přechodem letního času (2026-10-25 v Praze) zůstává ten samý", () => {
    process.env.TZ = "Europe/Prague";
    expect(periodStartDayKey("2026-10-25T00:00:00")).toBe("2026-10-25");
    expect(periodStartDayKey("2026-10-26T00:00:00")).toBe("2026-10-26");
  });
});

describe("yearChunks", () => {
  it("rozdělí rozsah po letech a poslední úsek končí v `to`", () => {
    process.env.TZ = "Europe/Prague";
    const to = new Date(2026, 9, 30, 13, 0);
    const chunks = yearChunks(new Date(2024, 5, 15, 18, 0), to);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]![0]).toEqual(new Date(2024, 5, 15));
    expect(chunks[1]![0]).toEqual(chunks[0]![1]);
    expect(chunks[2]![1]).toEqual(to);
  });

  it("úseky na sebe navazují bez mezer i přes přechod letního času", () => {
    for (const tz of ["America/Vancouver", "Europe/Prague"]) {
      process.env.TZ = tz;
      const chunks = yearChunks(new Date(2000, 0, 1), new Date(2026, 9, 30));
      expect(chunks).toHaveLength(27);
      for (let i = 1; i < chunks.length; i++) expect(chunks[i]![0]).toEqual(chunks[i - 1]![1]);
      for (const [a] of chunks) expect([a.getHours(), a.getMinutes()]).toEqual([0, 0]);
    }
  });

  it("prázdný rozsah nevrací nic", () => {
    const d = new Date(2026, 0, 1);
    expect(yearChunks(d, d)).toEqual([]);
    expect(yearChunks(new Date(2026, 5, 1), new Date(2026, 0, 1))).toEqual([]);
  });
});

describe("mergeDaily", () => {
  it("kroky jsou hlavní zdroj, spolehlivá vzdálenost je přebije", () => {
    const dist = new Map([["2026-10-02", 6000], ["2026-10-30", 72]]);
    const steps = new Map([
      ["2026-10-01", 1000],
      ["2026-10-02", 9000],
      ["2026-10-30", 1147],
    ]);
    expect(mergeDaily(dist, steps)).toEqual([
      { date: "2026-10-01", distanceM: 750, confidence: "estimated" },
      { date: "2026-10-02", distanceM: 6000, confidence: "verified" },
      { date: "2026-10-30", distanceM: 1147 * 0.75, confidence: "estimated" },
    ]);
  });

  it("vynechá dny bez kroků a řadí podle dne", () => {
    const dist = new Map([["2026-10-03", 100], ["2026-10-01", 0]]);
    const steps = new Map([["2026-10-04", 200], ["2026-10-02", 0]]);
    expect(mergeDaily(dist, steps).map((r) => r.date)).toEqual(["2026-10-04"]);
  });
});

describe("addToDay", () => {
  it("sčítá hodnoty stejného dne", () => {
    const m = new Map<string, number>();
    addToDay(m, "2026-10-01", 5);
    addToDay(m, "2026-10-01", 7);
    expect(m.get("2026-10-01")).toBe(12);
  });
});
