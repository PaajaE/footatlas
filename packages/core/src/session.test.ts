import { describe, expect, it } from "vitest";
import {
  isPaused,
  markSeen,
  parseSession,
  pauseSession,
  resumeSession,
  sessionWalkedM,
  startSession,
  type DailyRecord,
} from "./index";

const recs: DailyRecord[] = [
  { date: "2026-10-10", distanceM: 1_000, confidence: "verified" },
  { date: "2026-10-12", distanceM: 2_000, confidence: "verified" },
  { date: "2026-10-15", distanceM: 4_000, confidence: "verified" },
  { date: "2026-10-20", distanceM: 8_000, confidence: "verified" },
];

describe("stav výpravy", () => {
  it("nová výprava počítá jen od zahájení", () => {
    const s = startSession("v", "2026-10-12");
    expect(sessionWalkedM(recs, s)).toBe(14_000);
    expect(isPaused(s)).toBe(false);
  });

  it("pozastavení zachová postup a nepočítá další dny", () => {
    const s = pauseSession(startSession("v", "2026-10-10"), "2026-10-15");
    expect(isPaused(s)).toBe(true);
    expect(sessionWalkedM(recs, s)).toBe(3_000);
  });

  it("obnovení po pauze přidá nové období", () => {
    const s = resumeSession(pauseSession(startSession("v", "2026-10-10"), "2026-10-13"), "2026-10-20");
    expect(s.periods).toEqual([{ from: "2026-10-10", until: "2026-10-13" }, { from: "2026-10-20" }]);
    expect(sessionWalkedM(recs, s)).toBe(1_000 + 2_000 + 8_000);
  });

  it("obnovení týž den znovu otevře období bez mezery", () => {
    const s = resumeSession(pauseSession(startSession("v", "2026-10-10"), "2026-10-15"), "2026-10-15");
    expect(s.periods).toEqual([{ from: "2026-10-10" }]);
  });

  it("pozastavit pozastavené nebo obnovit běžící nic nezmění", () => {
    const running = startSession("v", "2026-10-10");
    expect(resumeSession(running, "2026-10-11")).toBe(running);
    const paused = pauseSession(running, "2026-10-11");
    expect(pauseSession(paused, "2026-10-12")).toBe(paused);
  });

  it("poslední zobrazená vzdálenost nikdy neklesá", () => {
    const s = markSeen(markSeen(startSession("v", "2026-10-10"), 5_000), 3_000);
    expect(s.lastSeenWalkedM).toBe(5_000);
  });
});

describe("načtení uloženého stavu", () => {
  it("round trip", () => {
    const s = pauseSession(markSeen(startSession("v", "2026-10-10"), 123), "2026-10-15");
    expect(parseSession(JSON.parse(JSON.stringify(s)))).toEqual(s);
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
  ])("odmítne neplatná data %#", (raw) => {
    expect(parseSession(raw)).toBeNull();
  });
});
