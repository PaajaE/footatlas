/// <reference types="node" />
import { DatabaseSync } from "node:sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { describe, expect, it } from "vitest";
import { chronicleDays, pauseSession, resumeSession, startSession } from "@footatlas/core";
import { adoptLegacy, loadEvents, loadRunning, recordEvents, saveRunning } from "./expeditionStore";
import { lastReadAt, loadAllDays, recomputeStale, saveRaw } from "./chronicleStore";
import { SCHEMA_VERSION } from "./migrations";
import { migrate } from "./schema";

/** Nejmenší náhrada `SQLiteDatabase` nad `node:sqlite`, aby se SQL z aplikace ověřilo bez telefonu. */
function fakeDb(): { db: SQLiteDatabase; raw: DatabaseSync } {
  const raw = new DatabaseSync(":memory:");
  const api = {
    execAsync: async (sql: string) => void raw.exec(sql),
    getFirstAsync: async (sql: string, ...p: unknown[]) => (raw.prepare(sql).get(...(p as never[])) as unknown) ?? null,
    getAllAsync: async (sql: string, ...p: unknown[]) => raw.prepare(sql).all(...(p as never[])) as unknown[],
    runAsync: async (sql: string, ...p: unknown[]) => {
      const r = raw.prepare(sql).run(...(p as never[]));
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    prepareAsync: async (sql: string) => {
      const st = raw.prepare(sql);
      return { executeAsync: async (...p: unknown[]) => void st.run(...(p as never[])), finalizeAsync: async () => {} };
    },
    withExclusiveTransactionAsync: async (task: (txn: unknown) => Promise<void>) => {
      raw.exec("BEGIN");
      try {
        await task(api);
        raw.exec("COMMIT");
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db: api as unknown as SQLiteDatabase, raw };
}

const NOW = new Date("2026-10-30T12:00:00.000Z");

describe("databáze kroniky", () => {
  it("migrace nastaví verzi a je opakovatelná", async () => {
    const { db, raw } = fakeDb();
    await migrate(db as never);
    await migrate(db as never);
    expect((raw.prepare("PRAGMA user_version").get() as { user_version: number }).user_version).toBe(SCHEMA_VERSION);
    expect(raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r: unknown) => (r as { name: string }).name)).toEqual(["daily_motion", "expedition_event", "expedition_period", "expedition_run", "source_state"]);
  });

  it("novější databáze než aplikace se odmítne", async () => {
    const { db, raw } = fakeDb();
    raw.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    await expect(migrate(db as never)).rejects.toThrow(/novější/);
  });

  it("uložení surových dnů, opakované čtení přepíše a nezdvojí, den bez pohybu se neukládá", async () => {
    const { db } = fakeDb();
    await migrate(db as never);
    const raw = [
      { day: "2026-10-29", steps: 10_000, distanceM: 0 },
      { day: "2026-10-30", steps: 1150, distanceM: 72 },
      { day: "2026-10-28", steps: 0, distanceM: 500 },
    ];
    expect(await saveRaw(db, "android", "health_connect", raw, 0.75, NOW)).toBe(2);
    expect(await saveRaw(db, "android", "health_connect", [{ day: "2026-10-30", steps: 1500, distanceM: 72 }], 0.75, NOW)).toBe(1);
    const days = chronicleDays(await loadAllDays(db));
    expect(days).toEqual([
      { date: "2026-10-29", distanceM: 7500, confidence: "estimated" },
      { date: "2026-10-30", distanceM: 1125, confidence: "estimated" },
    ]);
    expect(await lastReadAt(db, "health_connect")).toBe(NOW.toISOString());
  });

  it("změna délky kroku přepočítá uložené dny ze surových hodnot, bez nového čtení", async () => {
    const { db } = fakeDb();
    await migrate(db as never);
    await saveRaw(db, "android", "health_connect", [{ day: "2026-10-29", steps: 10_000, distanceM: 0 }], 0.75, NOW);
    expect(await recomputeStale(db, "android", 0.75)).toBe(0);
    expect(await recomputeStale(db, "android", 0.8)).toBe(1);
    expect(chronicleDays(await loadAllDays(db))[0]!.distanceM).toBe(8000);
    expect(await recomputeStale(db, "android", 0.8)).toBe(0);
  });

  it("přerušená transakce nezanechá polovinu dat", async () => {
    const { db } = fakeDb();
    await migrate(db as never);
    await expect(saveRaw(db, "android", "health_connect", [{ day: "2026-10-29", steps: 1000, distanceM: 0 }, { day: "x", steps: Number.NaN, distanceM: 0 }], 0.75, NOW)).resolves.toBeTypeOf("number");
    await expect(saveRaw(db, "android", "bad" as never, [{ day: "2026-10-30", steps: 1000, distanceM: 0 }], 0.75, NOW)).rejects.toThrow();
    expect((await loadAllDays(db)).map((r) => r.day)).toEqual(["2026-10-29"]);
  });

  it("výprava: uložení, pozastavení, obnovení a smazání", async () => {
    const { db, raw } = fakeDb();
    await migrate(db as never);
    expect(await loadRunning(db)).toBeNull();
    const started = startSession("vltavska-stezka", new Date("2026-10-30T08:00:00.000Z"));
    await saveRunning(db, started);
    expect(await loadRunning(db)).toEqual(started);
    const paused = pauseSession({ ...started, lastSeenWalkedM: 1200 }, new Date("2026-10-30T10:00:00.000Z"));
    await saveRunning(db, paused);
    expect(await loadRunning(db)).toEqual(paused);
    const resumed = resumeSession(paused, new Date("2026-10-30T12:00:00.000Z"));
    await saveRunning(db, resumed);
    expect(await loadRunning(db)).toEqual(resumed);
    expect(raw.prepare("SELECT COUNT(*) AS n FROM expedition_run").get()).toEqual({ n: 1 });
    expect(raw.prepare("SELECT status FROM expedition_run").get()).toEqual({ status: "active" });
    await saveRunning(db, null);
    expect(await loadRunning(db)).toBeNull();
    expect(raw.prepare("SELECT COUNT(*) AS n FROM expedition_period").get()).toEqual({ n: 0 });
  });

  it("výprava: jiná výprava nahradí rozjetou, souběžně může běžet jen jedna", async () => {
    const { db, raw } = fakeDb();
    await migrate(db as never);
    await saveRunning(db, startSession("a", new Date("2026-10-30T08:00:00.000Z")));
    await saveRunning(db, startSession("b", new Date("2026-10-31T08:00:00.000Z")));
    expect((await loadRunning(db))?.expeditionId).toBe("b");
    expect(raw.prepare("SELECT COUNT(*) AS n FROM expedition_run").get()).toEqual({ n: 1 });
    expect(() => raw.exec("INSERT INTO expedition_run (expedition_id, status) VALUES ('c', 'paused')")).toThrow(/UNIQUE/);
    raw.exec("INSERT INTO expedition_run (expedition_id, status) VALUES ('d', 'completed')");
  });

  it("starý stav z AsyncStorage se převede, starý klíč se smaže až po ověření; stav v databázi má přednost", async () => {
    const { db } = fakeDb();
    await migrate(db as never);
    expect(await adoptLegacy(db, null)).toEqual({ session: null, dropLegacy: false });
    const legacy = startSession("vltavska-stezka", new Date("2026-10-20T08:00:00.000Z"));
    const r = await adoptLegacy(db, legacy);
    expect(r).toEqual({ session: legacy, dropLegacy: true });
    const newer = pauseSession(legacy, new Date("2026-10-21T08:00:00.000Z"));
    await saveRunning(db, newer);
    expect(await adoptLegacy(db, legacy)).toEqual({ session: newer, dropLegacy: true });
  });

  it("události výpravy: zápis je idempotentní a první den dosažení se nepřepisuje", async () => {
    const { db, raw } = fakeDb();
    await migrate(db as never);
    const now = new Date("2026-10-31T08:00:00.000Z");
    expect(await recordEvents(db, [{ kind: "place", ref: "a", atM: 100, reachedDay: "2026-10-30" }], now)).toBe(0); // žádná výprava
    await saveRunning(db, startSession("vltavska-stezka", new Date("2026-10-30T08:00:00.000Z")));
    const ev = [
      { kind: "place" as const, ref: "b", atM: 2500, reachedDay: "2026-10-31" },
      { kind: "place" as const, ref: "a", atM: 100, reachedDay: "2026-10-30" },
    ];
    expect(await recordEvents(db, ev, now)).toBe(2);
    expect(await recordEvents(db, [{ kind: "place", ref: "a", atM: 100, reachedDay: "2026-11-05" }, ...ev], now)).toBe(0);
    expect(await loadEvents(db)).toEqual([
      { kind: "place", ref: "a", atM: 100, reachedDay: "2026-10-30" },
      { kind: "place", ref: "b", atM: 2500, reachedDay: "2026-10-31" },
    ]);
    await saveRunning(db, null);
    expect(await loadEvents(db)).toEqual([]);
    expect(raw.prepare("SELECT COUNT(*) AS n FROM expedition_event").get()).toEqual({ n: 0 });
  });
});
