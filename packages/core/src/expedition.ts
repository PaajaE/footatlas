import type { DailyRecord } from "./motion";

/**
 * Vzdálenost započítaná do výpravy: jen pohyb po okamžiku zahájení (spec 6.3).
 * Záznamy jsou po dnech, proto se počítá od data zahájení včetně.
 * Pozastavení se v tomto prvním návrhu neřeší.
 */
export function expeditionDistanceM(records: readonly DailyRecord[], startedOn: string): number {
  return records.filter((r) => r.date >= startedOn).reduce((s, r) => s + r.distanceM, 0);
}

export interface Waypoint {
  id: string;
  /** Vzdálenost od startu v metrech. */
  atM: number;
}

export interface Progress {
  reached: Waypoint[];
  next: Waypoint | null;
  /** Zbývá do další zastávky, v metrech; null po dokončení. */
  toNextM: number | null;
}

export function progress(waypoints: readonly Waypoint[], walkedM: number): Progress {
  const sorted = [...waypoints].sort((a, b) => a.atM - b.atM);
  const reached = sorted.filter((w) => w.atM <= walkedM);
  const next = sorted.find((w) => w.atM > walkedM) ?? null;
  return { reached, next, toNextM: next ? next.atM - walkedM : null };
}
