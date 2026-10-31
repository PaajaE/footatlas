import type { ChronicleStats, DailyRecord } from "@footatlas/core";

export type SyncState = { kind: "idle" } | { kind: "syncing" } | { kind: "error"; message: string } | { kind: "unavailable"; reason: string };

export interface ChronicleValue {
  /** Databáze je otevřená a načtená. */
  ready: boolean;
  days: DailyRecord[];
  stats: ChronicleStats;
  /** Okamžik posledního čtení zdravotních dat, `null` = kronika je prázdná a nic se nečetlo. */
  lastReadAt: string | null;
  sync: SyncState;
  /** Přečte zdravotní data do kroniky. S `askAccess` se uživatele zeptá na oprávnění (jen na jeho výzvu). */
  syncNow: (askAccess: boolean) => Promise<void>;
}
