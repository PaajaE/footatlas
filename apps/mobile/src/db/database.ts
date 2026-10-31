import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { migrate } from "./schema";

let opening: Promise<SQLiteDatabase> | null = null;

/** Jediná otevřená a zmigrovaná databáze aplikace; při chybě se příští volání pokusí znovu. */
export function getDatabase(): Promise<SQLiteDatabase> {
  opening ??= (async () => {
    const db = await openDatabaseAsync("footatlas.db");
    await migrate(db);
    return db;
  })().catch((e) => {
    opening = null;
    throw e;
  });
  return opening;
}
