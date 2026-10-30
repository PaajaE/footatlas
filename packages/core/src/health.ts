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

/**
 * Meze, ve kterých se na Androidu věří agregované vzdálenosti, jako podíl odhadu z kroků.
 * Pod `min` zapsal vzdálenost jen některý zdroj nebo jen část dne (na telefonu z ověření
 * 72 m proti 860 m z kroků). Nad `max` jde nejspíš o jízdu na kole nebo jiný pohyb,
 * který Health Connect `Distance` započítává také. 2× odpovídá délce kroku 1,5 m, tedy
 * i rychlému běhu. Zdůvodnění v docs/technologie.md (Známá omezení).
 */
export const ANDROID_DISTANCE_TRUST = { min: 0.5, max: 2 } as const;

/**
 * Pravidlo pro Android: hlavním zdrojem jsou kroky, protože Health Connect `Distance`
 * bývá neúplná a zahrnuje i jiné aktivity než chůzi a běh (spec 6.3).
 * Vzdálenost se použije ("verified") jen, když leží v mezích `ANDROID_DISTANCE_TRUST`
 * vůči odhadu z kroků; jinak se vrátí odhad z kroků ("estimated").
 * Den bez kroků se nepočítá, ani když má vzdálenost: bez kroků nejde o chůzi ani běh.
 */
export function toDailyRecordStepsFirst(
  date: string,
  distanceM: number,
  steps: number,
  stepLengthM = 0.75,
  trust: { min: number; max: number } = ANDROID_DISTANCE_TRUST,
): DailyRecord | null {
  if (!(steps > 0)) return null;
  const estimateM = steps * stepLengthM;
  if (distanceM >= estimateM * trust.min && distanceM <= estimateM * trust.max) {
    return { date, distanceM, confidence: "verified" };
  }
  return { date, distanceM: estimateM, confidence: "estimated" };
}

/** Lokální datum jako YYYY-MM-DD. */
export function localDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
