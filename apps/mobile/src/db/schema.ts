import { SCHEMA_VERSION, MIGRATIONS } from "./migrations";

/** Minimální rozhraní databáze, které migrace potřebují; `SQLiteDatabase` z expo-sqlite ho splňuje. */
export interface Exec {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
}

/**
 * Spustí chybějící migrace podle `PRAGMA user_version`. Každá migrace běží v transakci spolu
 * s nastavením verze, takže přerušení nenechá databázi v polovině.
 */
export async function migrate(db: Exec): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const current = row?.user_version ?? 0;
  if (current > SCHEMA_VERSION) throw new Error(`Databáze je novější (v${current}) než aplikace (v${SCHEMA_VERSION}).`);
  if (current === 0) await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  for (let v = current; v < SCHEMA_VERSION; v++) {
    await db.execAsync(`BEGIN; ${MIGRATIONS[v]} PRAGMA user_version = ${v + 1}; COMMIT;`);
  }
}
