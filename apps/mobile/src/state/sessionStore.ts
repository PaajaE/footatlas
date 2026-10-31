import { adoptLegacy, saveRunning } from "../db/expeditionStore";
import { getDatabase } from "../db/database";
import { dropLegacySession, loadSession as loadLegacySession } from "./storage";
import type { ExpeditionSession } from "@footatlas/core";

/**
 * Stav výpravy v SQLite (rozhodnutí 0007). Při prvním načtení se stav ze starého úložiště
 * (AsyncStorage) převede do databáze a starý klíč se smaže až potom, co je převod ověřený čtením zpět.
 */
export async function loadSession(): Promise<ExpeditionSession | null> {
  const db = await getDatabase();
  const { session, dropLegacy } = await adoptLegacy(db, await loadLegacySession());
  if (dropLegacy) await dropLegacySession();
  return session;
}

export async function saveSession(s: ExpeditionSession | null): Promise<void> {
  await saveRunning(await getDatabase(), s);
}
