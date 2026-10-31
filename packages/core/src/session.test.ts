import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  isPaused,
  markSeen,
  parseSession,
  pauseSession,
  resumeSession,
  sessionSlices,
  sessionStart,
  startSession,
  walkedInSlicesM,
  type DailyRecord,
} from "./index";

const origTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Europe/Prague";
});
afterAll(() => {
  if (origTz === undefined) delete process.env.TZ;
  else process.env.TZ = origTz;
});

const at = (day: string, time = "00:00") => new Date(`${day}T${time}:00`);

const recs: DailyRecord[] = [
  { date: "2026-10-10", distanceM: 1_000, confidence: "verified" },
  { date: "2026-10-12", distanceM: 2_000, confidence: "verified" },
  { date: "2026-10-15", distanceM: 4_000, confidence: "verified" },
  { date: "2026-10-20", distanceM: 8_000, confidence: "verified" },
];

describe("stav výpravy", () => {
  it("zahájení uloží přesný okamžik", () => {
    const s = startSession("v", at("2026-10-12", "14:30"));
    expect(s.periods).toEqual([{ start: at("2026-10-12", "14:30").toISOString() }]);
    expect(isPaused(s)).toBe(false);
    expect(sessionStart(s)).toEqual(at("2026-10-12", "14:30"));
  });

  it("pohyb před zahájením téhož dne se nepočítá", () => {
    const s = startSession("v", at("2026-10-12", "14:30"));
    const slices = sessionSlices(s, at("2026-10-20", "22:00"));
    // 12. 10. jen od 14:30 (čtení intervalu 500 m), dál celé dny.
    const interval = slices.map((x) => (x.whole ? null : 500));
    expect(walkedInSlicesM(slices, recs, interval)).toBe(500 + 4_000 + 8_000);
  });

  it("pozastavení zachová pohyb až do okamžiku pozastavení a další nepočítá", () => {
    const s = pauseSession(startSession("v", at("2026-10-10", "07:00")), at("2026-10-15", "12:00"));
    expect(isPaused(s)).toBe(true);
    const slices = sessionSlices(s, at("2026-10-20", "22:00"));
    expect(slices.map((x) => x.day)).toEqual(["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]);
    const interval = slices.map((x) => (x.whole ? null : x.day === "2026-10-10" ? 900 : 1_500));
    expect(walkedInSlicesM(slices, recs, interval)).toBe(900 + 2_000 + 1_500);
  });

  it("obnovení jiný den přidá nové období od okamžiku obnovení", () => {
    const s = resumeSession(
      pauseSession(startSession("v", at("2026-10-10", "07:00")), at("2026-10-13", "09:00")),
      at("2026-10-20", "16:00"),
    );
    expect(s.periods).toEqual([
      { start: at("2026-10-10", "07:00").toISOString(), end: at("2026-10-13", "09:00").toISOString() },
      { start: at("2026-10-20", "16:00").toISOString() },
    ]);
    expect(isPaused(s)).toBe(false);
  });

  it("pozastavení a obnovení téhož dne: mezera mezi nimi se nepočítá, nic jiného se neztratí", () => {
    let s = startSession("v", at("2026-10-20", "08:00"));
    s = pauseSession(s, at("2026-10-20", "10:00"));
    s = resumeSession(s, at("2026-10-20", "12:00"));
    const slices = sessionSlices(s, at("2026-10-20", "18:00"));
    expect(slices).toHaveLength(2);
    expect(walkedInSlicesM(slices, recs, [3_000, 2_500])).toBe(5_500);
  });

  it("pozastavení nemůže být před zahájením ani obnovení před pozastavením", () => {
    const s = pauseSession(startSession("v", at("2026-10-20", "08:00")), at("2026-10-20", "07:00"));
    expect(s.periods[0]!.end).toBe(s.periods[0]!.start);
    const r = resumeSession(s, at("2026-10-19"));
    expect(r.periods[1]!.start).toBe(s.periods[0]!.end);
  });

  it("pozastavit pozastavené nebo obnovit běžící nic nezmění", () => {
    const running = startSession("v", at("2026-10-10"));
    expect(resumeSession(running, at("2026-10-11"))).toBe(running);
    const paused = pauseSession(running, at("2026-10-11"));
    expect(pauseSession(paused, at("2026-10-12"))).toBe(paused);
  });

  it("poslední zobrazená vzdálenost nikdy neklesá", () => {
    const s = markSeen(markSeen(startSession("v", at("2026-10-10")), 5_000), 3_000);
    expect(s.lastSeenWalkedM).toBe(5_000);
  });
});

describe("načtení uloženého stavu", () => {
  it("round trip", () => {
    const s = pauseSession(markSeen(startSession("v", at("2026-10-10", "09:00")), 123), at("2026-10-15", "18:00"));
    expect(parseSession(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it("starý formát po dnech převede na lokální půlnoci a počítá stejně jako dřív", () => {
    const s = parseSession({
      expeditionId: "v",
      periods: [{ from: "2026-10-10", until: "2026-10-13" }, { from: "2026-10-20" }],
      lastSeenWalkedM: 10,
    });
    expect(s?.periods).toEqual([
      { start: at("2026-10-10").toISOString(), end: at("2026-10-13").toISOString() },
      { start: at("2026-10-20").toISOString() },
    ]);
    const slices = sessionSlices(s!, at("2026-10-20", "23:00"));
    expect(slices.every((x) => x.whole)).toBe(true);
    expect(walkedInSlicesM(slices, recs)).toBe(1_000 + 2_000 + 8_000);
  });

  it.each([
    [null],
    ["x"],
    [{}],
    [{ expeditionId: "v", periods: [], lastSeenWalkedM: 0 }],
    [{ expeditionId: "v", periods: [{ from: "10.10.2026" }], lastSeenWalkedM: 0 }],
    [{ expeditionId: "v", periods: [{ from: "2026-10-10", until: "2026-10-01" }], lastSeenWalkedM: 0 }],
    [{ expeditionId: "v", periods: [{ from: "2026-10-10" }], lastSeenWalkedM: -1 }],
    [{ expeditionId: "", periods: [{ from: "2026-10-10" }], lastSeenWalkedM: 0 }],
    [{ expeditionId: "v", periods: [{ start: "neplatné" }], lastSeenWalkedM: 0 }],
    [{ expeditionId: "v", periods: [{ start: "2026-10-10" }], lastSeenWalkedM: 0 }],
    [{ expeditionId: "v", periods: [{ start: "2026-10-10T10:00:00Z", end: "2026-10-10T09:00:00Z" }], lastSeenWalkedM: 0 }],
    // otevřené období uprostřed
    [{ expeditionId: "v", periods: [{ start: "2026-10-10T10:00:00Z" }, { start: "2026-10-11T10:00:00Z" }], lastSeenWalkedM: 0 }],
    // překryv období
    [
      {
        expeditionId: "v",
        periods: [{ start: "2026-10-10T10:00:00Z", end: "2026-10-12T10:00:00Z" }, { start: "2026-10-11T10:00:00Z" }],
        lastSeenWalkedM: 0,
      },
    ],
  ])("odmítne neplatná data %#", (raw) => {
    expect(parseSession(raw)).toBeNull();
  });
});
