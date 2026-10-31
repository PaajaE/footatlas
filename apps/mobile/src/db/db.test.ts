/// <reference types="node" />
import { DatabaseSync } from "node:sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { describe, expect, it } from "vitest";
import { chronicleDays } from "@footatlas/core";
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
    runAsync: async (sql: string, ...p: unknown[]) => void raw.prepare(sql).run(...(p as never[])),
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
    expect(raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r: unknown) => (r as { name: string }).name)).toEqual(["daily_motion", "source_state"]);
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
});
