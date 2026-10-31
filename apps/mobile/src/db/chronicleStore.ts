import type { SQLiteDatabase } from "expo-sqlite";
import { needsRecompute, toStoredDay, type RawDay, type SourceId, type StoredDay } from "@footatlas/core";

interface Row {
  day: string;
  source: SourceId;
  steps: number | null;
  raw_distance_m: number | null;
  distance_m: number;
  confidence: "verified" | "estimated";
  rule_version: number;
  step_length_m: number;
  read_at: string;
}

const fromRow = (r: Row): StoredDay => ({
  day: r.day,
  source: r.source,
  steps: r.steps,
  rawDistanceM: r.raw_distance_m,
  distanceM: r.distance_m,
  confidence: r.confidence,
  ruleVersion: r.rule_version,
  stepLengthM: r.step_length_m,
  readAt: r.read_at,
});

export async function loadAllDays(db: SQLiteDatabase): Promise<StoredDay[]> {
  return (await db.getAllAsync<Row>("SELECT * FROM daily_motion ORDER BY day")).map(fromRow);
}

export async function lastReadAt(db: SQLiteDatabase, source: SourceId): Promise<string | null> {
  const r = await db.getFirstAsync<{ last_read_at: string | null }>("SELECT last_read_at FROM source_state WHERE source = ?", source);
  return r?.last_read_at ?? null;
}

const UPSERT = `INSERT INTO daily_motion (day, source, steps, raw_distance_m, distance_m, confidence, rule_version, step_length_m, read_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (day, source) DO UPDATE SET steps = excluded.steps, raw_distance_m = excluded.raw_distance_m,
    distance_m = excluded.distance_m, confidence = excluded.confidence, rule_version = excluded.rule_version,
    step_length_m = excluded.step_length_m, read_at = excluded.read_at`;

/**
 * Uloží přečtené dny a stav zdroje v jedné transakci. Dny, které zdroj už nevrací, se nemažou
 * (Health Connect data po čase „zapomene“, kronika ne).
 */
export async function saveRaw(
  db: SQLiteDatabase,
  platform: "android" | "ios",
  source: SourceId,
  raw: readonly RawDay[],
  stepLengthM: number,
  now: Date,
): Promise<number> {
  const readAt = now.toISOString();
  let saved = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const stmt = await txn.prepareAsync(UPSERT);
    try {
      for (const r of raw) {
        const s = toStoredDay(platform, source, r, stepLengthM, readAt);
        if (!s) continue;
        await stmt.executeAsync(s.day, s.source, s.steps, s.rawDistanceM, s.distanceM, s.confidence, s.ruleVersion, s.stepLengthM, s.readAt);
        saved++;
      }
    } finally {
      await stmt.finalizeAsync();
    }
    await txn.runAsync(
      `INSERT INTO source_state (source, oldest_day, last_read_at) VALUES (?, (SELECT MIN(day) FROM daily_motion WHERE source = ?), ?)
       ON CONFLICT (source) DO UPDATE SET oldest_day = excluded.oldest_day, last_read_at = excluded.last_read_at`,
      source,
      source,
      readAt,
    );
  });
  return saved;
}

/**
 * Přepočítá z uložených surových hodnot dny, jejichž pravidlo nebo délka kroku už neplatí.
 * Žádné čtení zdravotních dat. Vrací počet přepočítaných dnů.
 */
export async function recomputeStale(db: SQLiteDatabase, platform: "android" | "ios", stepLengthM: number): Promise<number> {
  const all = await loadAllDays(db);
  const stale = all.filter((r) => needsRecompute(r, stepLengthM) && (r.source === "health_connect" || r.source === "healthkit"));
  if (stale.length === 0) return 0;
  const readAt = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const stmt = await txn.prepareAsync(UPSERT);
    try {
      for (const r of stale) {
        const s = toStoredDay(platform, r.source, { day: r.day, steps: r.steps ?? 0, distanceM: r.rawDistanceM ?? 0 }, stepLengthM, readAt);
        // Pravidlo už den nezapočítává: zůstane s původní hodnotou, ať se zbytečně nemaže.
        if (!s) continue;
        await stmt.executeAsync(s.day, s.source, s.steps, s.rawDistanceM, s.distanceM, s.confidence, s.ruleVersion, s.stepLengthM, r.readAt);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
  return stale.length;
}
