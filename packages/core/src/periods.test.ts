import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { periodSlices, walkedInSlicesM, type DailyRecord, type DaySlice } from "./index";

const origTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Europe/Prague";
});
afterAll(() => {
  if (origTz === undefined) delete process.env.TZ;
  else process.env.TZ = origTz;
});

/** Lokální čas v Praze. */
const at = (day: string, time = "00:00") => new Date(`${day}T${time}:00`);
const iso = (day: string, time?: string) => at(day, time).toISOString();
const brief = (s: DaySlice[]) =>
  s.map((x) => `${x.day} ${x.from.toTimeString().slice(0, 5)}-${x.to.toTimeString().slice(0, 5)}${x.whole ? " celý" : ""}`);

describe("úseky období po dnech", () => {
  it("běžící výprava: den zahájení od okamžiku startu, další dny celé, dnešek do teď", () => {
    const s = periodSlices([{ start: iso("2026-10-28", "14:30") }], at("2026-10-30", "09:15"));
    expect(brief(s)).toEqual(["2026-10-28 14:30-00:00", "2026-10-29 00:00-00:00 celý", "2026-10-30 00:00-09:15 celý"]);
  });

  it("zahájení a pozastavení téhož dne dá jeden úsek mezi nimi", () => {
    const s = periodSlices([{ start: iso("2026-10-30", "10:00"), end: iso("2026-10-30", "11:00") }], at("2026-10-30", "20:00"));
    expect(brief(s)).toEqual(["2026-10-30 10:00-11:00"]);
  });

  it("pozastavení jiný den: den pozastavení do okamžiku pozastavení, potom nic", () => {
    const s = periodSlices([{ start: iso("2026-10-27", "08:00"), end: iso("2026-10-29", "12:00") }], at("2026-11-02", "10:00"));
    expect(brief(s)).toEqual(["2026-10-27 08:00-00:00", "2026-10-28 00:00-00:00 celý", "2026-10-29 00:00-12:00"]);
  });

  it("pozastavení a obnovení téhož dne dá dva úseky bez mezery navíc", () => {
    const s = periodSlices(
      [{ start: iso("2026-10-30", "08:00"), end: iso("2026-10-30", "10:00") }, { start: iso("2026-10-30", "12:00") }],
      at("2026-10-30", "18:00"),
    );
    expect(brief(s)).toEqual(["2026-10-30 08:00-10:00", "2026-10-30 12:00-18:00"]);
  });

  it("pozastavení a obnovení v různé dny", () => {
    const s = periodSlices(
      [{ start: iso("2026-10-20", "18:00"), end: iso("2026-10-21", "07:00") }, { start: iso("2026-10-23", "20:00") }],
      at("2026-10-24", "06:00"),
    );
    expect(brief(s)).toEqual([
      "2026-10-20 18:00-00:00",
      "2026-10-21 00:00-07:00",
      "2026-10-23 20:00-00:00",
      "2026-10-24 00:00-06:00 celý",
    ]);
  });

  it("den se změnou času (25 hodin) je pořád jeden celý den", () => {
    const s = periodSlices([{ start: iso("2026-10-24", "12:00") }], at("2026-10-26", "08:00"));
    expect(s.map((x) => x.day)).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
    expect(s[1]!.whole).toBe(true);
    expect(s[1]!.to.getTime() - s[1]!.from.getTime()).toBe(25 * 3600_000);
  });

  it("start přesně o půlnoci je celý den, budoucnost se ořízne", () => {
    const s = periodSlices([{ start: iso("2026-10-30"), end: iso("2026-11-05") }], at("2026-10-30", "15:00"));
    expect(brief(s)).toEqual(["2026-10-30 00:00-15:00 celý"]);
  });
});

describe("vzdálenost z úseků", () => {
  const daily: DailyRecord[] = [
    { date: "2026-10-28", distanceM: 6_000, confidence: "estimated" },
    { date: "2026-10-29", distanceM: 8_000, confidence: "estimated" },
    { date: "2026-10-30", distanceM: 900, confidence: "estimated" },
  ];

  it("celé dny z kroniky, části dne ze čtení intervalu", () => {
    const s = periodSlices([{ start: iso("2026-10-28", "14:30") }], at("2026-10-30", "09:15"));
    expect(walkedInSlicesM(s, daily, [2_500, null, null])).toBe(2_500 + 8_000 + 900);
  });

  it("telefon z ověření: start i pozastavení dnes, ušlých 72 m se po pozastavení neztratí", () => {
    const s = periodSlices([{ start: iso("2026-10-30", "10:00"), end: iso("2026-10-30", "10:40") }], at("2026-10-30", "21:00"));
    expect(walkedInSlicesM(s, daily, [72])).toBe(72);
  });

  it("pozastavení a obnovení téhož dne sečte obě části", () => {
    const s = periodSlices(
      [{ start: iso("2026-10-30", "08:00"), end: iso("2026-10-30", "10:00") }, { start: iso("2026-10-30", "12:00") }],
      at("2026-10-30", "18:00"),
    );
    expect(walkedInSlicesM(s, daily, [300, 450])).toBe(750);
  });

  it("bez čtení intervalu se den počítá celý a jen jednou", () => {
    const s = periodSlices(
      [{ start: iso("2026-10-30", "08:00"), end: iso("2026-10-30", "10:00") }, { start: iso("2026-10-30", "12:00") }],
      at("2026-10-30", "18:00"),
    );
    expect(walkedInSlicesM(s, daily)).toBe(900);
  });

  it("dny bez záznamu přispějí nulou, záporné čtení se nepočítá", () => {
    const s = periodSlices([{ start: iso("2026-10-31", "08:00") }], at("2026-11-01", "08:00"));
    expect(walkedInSlicesM(s, daily, [-5])).toBe(0);
  });
});
