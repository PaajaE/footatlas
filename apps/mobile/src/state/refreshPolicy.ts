/** Jak často se čtou zdravotní data, dokud je aplikace otevřená a výprava běží. */
export const FOREGROUND_INTERVAL_MS = 60_000;
/** Nejkratší odstup dvou automatických čtení (návrat do popředí apod.). */
export const MIN_GAP_MS = 15_000;

export interface RefreshInput {
  now: number;
  lastReadAt: number | null;
  inFlight: boolean;
  minGapMs?: number;
}

/** Má se teď automaticky načíst nový stav? Čtení nikdy neběží paralelně. */
export function shouldRefresh({ now, lastReadAt, inFlight, minGapMs = MIN_GAP_MS }: RefreshInput): boolean {
  if (inFlight) return false;
  if (lastReadAt === null) return true;
  return now - lastReadAt >= minGapMs;
}
