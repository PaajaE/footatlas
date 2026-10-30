/** Úroveň důvěry záznamu (spec 6.2). */
export type Confidence = "verified" | "estimated" | "manual";

/** Denní záznam pohybu v kronice. Vzdálenost v metrech. */
export interface DailyRecord {
  /** Lokální datum YYYY-MM-DD. */
  date: string;
  distanceM: number;
  confidence: Confidence;
}

export interface Totals {
  totalM: number;
  byConfidence: Record<Confidence, number>;
}

export function totals(records: readonly DailyRecord[]): Totals {
  const byConfidence: Record<Confidence, number> = { verified: 0, estimated: 0, manual: 0 };
  for (const r of records) byConfidence[r.confidence] += r.distanceM;
  return {
    totalM: byConfidence.verified + byConfidence.estimated + byConfidence.manual,
    byConfidence,
  };
}

/** Odhad vzdálenosti z kroků; vždy jde o úroveň "estimated" (spec 6.1). */
export function stepsToDistanceM(steps: number, stepLengthM = 0.75): number {
  return steps * stepLengthM;
}
