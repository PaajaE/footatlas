import type { DailyRecord } from "./motion";

export type Availability = "available" | "needs-install" | "unsupported";

export interface AccessResult {
  /** Povoleno čtení kroků a vzdálenosti. */
  read: boolean;
  /** Povoleno čtení historie starší než výchozí okno platformy (Android: 30 dní). */
  history: boolean;
}

/**
 * Jediný zdroj pohybových dat (spec 6.1). Implementace volají HealthKit
 * a Health Connect; zbytek aplikace zná jen toto rozhraní.
 */
export interface HealthSource {
  readonly platform: "ios" | "android";
  availability(): Promise<Availability>;
  requestAccess(): Promise<AccessResult>;
  /**
   * Denní součty od `from` do `to` (včetně), po lokálních dnech, bez duplicit
   * mezi zdroji (řeší platforma agregací). Dny bez pohybu se nevracejí.
   */
  readDaily(from: Date, to: Date): Promise<DailyRecord[]>;
  /**
   * Vzdálenost v metrech za interval [from, to) mimo hranice dnů (např. od okamžiku
   * zahájení výpravy), podle stejného pravidla jako `readDaily`. Volitelné: zdroj bez něj
   * započítá části dne celým dnem (viz `walkedInSlicesM`).
   */
  readInterval?(from: Date, to: Date): Promise<number>;
}

/**
 * Ze dne s naměřenou vzdáleností i kroky vybere nejlepší údaj:
 * vzdálenost je "verified", kroky přepočtené délkou kroku jsou "estimated".
 */
export function toDailyRecord(
  date: string,
  distanceM: number,
  steps: number,
  stepLengthM = 0.75,
): DailyRecord | null {
  if (distanceM > 0) return { date, distanceM, confidence: "verified" };
  if (steps > 0) return { date, distanceM: steps * stepLengthM, confidence: "estimated" };
  return null;
}

/** Lokální datum jako YYYY-MM-DD. */
export function localDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
