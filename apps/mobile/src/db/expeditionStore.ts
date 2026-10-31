import type { SQLiteDatabase } from "expo-sqlite";
import { isPaused, parseSession, type ExpeditionSession, type JourneyEvent } from "@footatlas/core";
import { serialized } from "./lock";

const RUNNING = "status IN ('active', 'paused')";

/** Rozjetá (aktivní nebo pozastavená) výprava, nebo `null`. Poškozená data se berou jako žádná. */
export async function loadRunning(db: SQLiteDatabase): Promise<ExpeditionSession | null> {
  const run = await db.getFirstAsync<{ id: number; expedition_id: string; last_seen_walked_m: number }>(
    `SELECT id, expedition_id, last_seen_walked_m FROM expedition_run WHERE ${RUNNING}`,
  );
  if (!run) return null;
  const periods = await db.getAllAsync<{ start_at: string; end_at: string | null }>(
    "SELECT start_at, end_at FROM expedition_period WHERE run_id = ? ORDER BY start_at",
    run.id,
  );
  return parseSession({
    expeditionId: run.expedition_id,
    lastSeenWalkedM: run.last_seen_walked_m,
    periods: periods.map((p) => (p.end_at === null ? { start: p.start_at } : { start: p.start_at, end: p.end_at })),
  });
}

/** Uloží stav rozjeté výpravy; `null` ji smaže. Vše v jedné transakci, zápisy po jednom. */
export function saveRunning(db: SQLiteDatabase, s: ExpeditionSession | null): Promise<void> {
  return serialized(() =>
    db.withExclusiveTransactionAsync(async (txn) => {
      const existing = await txn.getFirstAsync<{ id: number; expedition_id: string }>(
        `SELECT id, expedition_id FROM expedition_run WHERE ${RUNNING}`,
      );
      // Cizí klíče jsou zapnuté jen na jednom spojení, proto se období mažou výslovně.
      if (existing && (!s || existing.expedition_id !== s.expeditionId)) {
        await txn.runAsync("DELETE FROM expedition_event WHERE run_id = ?", existing.id);
        await txn.runAsync("DELETE FROM expedition_period WHERE run_id = ?", existing.id);
        await txn.runAsync("DELETE FROM expedition_run WHERE id = ?", existing.id);
      }
      if (!s) return;
      const status = isPaused(s) ? "paused" : "active";
      let id: number;
      if (existing && existing.expedition_id === s.expeditionId) {
        id = existing.id;
        await txn.runAsync("UPDATE expedition_run SET status = ?, last_seen_walked_m = ? WHERE id = ?", status, s.lastSeenWalkedM, id);
        await txn.runAsync("DELETE FROM expedition_period WHERE run_id = ?", id);
      } else {
        const r = await txn.runAsync(
          "INSERT INTO expedition_run (expedition_id, status, last_seen_walked_m) VALUES (?, ?, ?)",
          s.expeditionId,
          status,
          s.lastSeenWalkedM,
        );
        id = r.lastInsertRowId;
      }
      for (const p of s.periods) {
        await txn.runAsync("INSERT INTO expedition_period (run_id, start_at, end_at) VALUES (?, ?, ?)", id, p.start, p.end ?? null);
      }
    }),
  );
}

/**
 * Převede stav ze starého úložiště (AsyncStorage) do databáze. Výsledek říká, zda se má starý klíč smazat:
 * ano, když je stav v databázi (převedený, nebo tam už byl); ne, když převod nebyl potřeba ani možný.
 */
export async function adoptLegacy(db: SQLiteDatabase, legacy: ExpeditionSession | null): Promise<{ session: ExpeditionSession | null; dropLegacy: boolean }> {
  const current = await loadRunning(db);
  if (current) return { session: current, dropLegacy: true };
  if (!legacy) return { session: null, dropLegacy: false };
  await saveRunning(db, legacy);
  const saved = await loadRunning(db);
  return { session: saved, dropLegacy: saved !== null };
}

/**
 * Zapíše události rozjeté výpravy. Už zapsané se nepřepisují: den, kdy se místa poprvé dosáhlo, zůstane,
 * i kdyby se později změnila data (pozdní synchronizace, jiná délka kroku). Vrací počet nově zapsaných.
 */
export async function recordEvents(db: SQLiteDatabase, events: readonly JourneyEvent[], now: Date): Promise<number> {
  if (events.length === 0) return 0;
  let added = 0;
  await serialized(() =>
    db.withExclusiveTransactionAsync(async (txn) => {
      const run = await txn.getFirstAsync<{ id: number }>(`SELECT id FROM expedition_run WHERE ${RUNNING}`);
      if (!run) return;
      for (const e of events) {
        const r = await txn.runAsync(
          "INSERT OR IGNORE INTO expedition_event (run_id, kind, ref, at_m, reached_day, noticed_at) VALUES (?, ?, ?, ?, ?, ?)",
          run.id,
          e.kind,
          e.ref,
          e.atM,
          e.reachedDay,
          now.toISOString(),
        );
        added += r.changes;
      }
    }),
  );
  return added;
}

/** Události rozjeté výpravy, seřazené podle dne a kilometru. */
export async function loadEvents(db: SQLiteDatabase): Promise<JourneyEvent[]> {
  const rows = await db.getAllAsync<{ kind: JourneyEvent["kind"]; ref: string; at_m: number; reached_day: string }>(
    `SELECT e.kind, e.ref, e.at_m, e.reached_day FROM expedition_event e
     JOIN expedition_run r ON r.id = e.run_id WHERE r.status IN ('active', 'paused')
     ORDER BY e.at_m, e.kind`,
  );
  return rows.map((r) => ({ kind: r.kind, ref: r.ref, atM: r.at_m, reachedDay: r.reached_day }));
}
