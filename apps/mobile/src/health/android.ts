import {
  aggregateGroupByPeriod,
  getSdkStatus,
  initialize,
  requestPermission,
  SdkAvailabilityStatus,
} from "react-native-health-connect";
import { localDateKey, toDailyRecord, type AccessResult, type Availability, type DailyRecord, type HealthSource } from "@footatlas/core";

const READ_STEPS = { accessType: "read", recordType: "Steps" } as const;
const READ_DISTANCE = { accessType: "read", recordType: "Distance" } as const;
const READ_HISTORY = { accessType: "read", recordType: "ReadHealthDataHistory" } as const;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Rozdělí rozsah po rocích, aby jedna agregace nebyla příliš velká. */
function yearChunks(from: Date, to: Date): Array<[Date, Date]> {
  const chunks: Array<[Date, Date]> = [];
  let start = startOfDay(from);
  while (start < to) {
    const next = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
    chunks.push([start, next < to ? next : to]);
    start = next;
  }
  return chunks;
}

type Kind = "Distance" | "Steps";

async function dailySums(kind: Kind, from: Date, to: Date): Promise<Map<string, number>> {
  const byDay = new Map<string, number>();
  for (const [a, b] of yearChunks(from, to)) {
    const rows = await aggregateGroupByPeriod({
      recordType: kind,
      timeRangeFilter: { operator: "between", startTime: a.toISOString(), endTime: b.toISOString() },
      timeRangeSlicer: { period: "DAYS", length: 1 },
    } as never);
    for (const r of rows as Array<{ startTime: string; result: Record<string, any> }>) {
      const value = kind === "Distance" ? r.result.DISTANCE?.inMeters : r.result.COUNT_TOTAL;
      // Klíč dne z lokálního času začátku intervalu (řetězec může mít UTC nebo offset).
      if (typeof value === "number") byDay.set(localDateKey(new Date(r.startTime)), value);
    }
  }
  return byDay;
}

export const androidHealthSource: HealthSource = {
  platform: "android",

  async availability(): Promise<Availability> {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return "available";
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return "needs-install";
    return "unsupported";
  },

  async requestAccess(): Promise<AccessResult> {
    await initialize();
    const granted = await requestPermission([READ_STEPS, READ_DISTANCE, READ_HISTORY]);
    const has = (t: string) => granted.some((p: any) => p.recordType === t);
    return { read: has("Steps") || has("Distance"), history: has("ReadHealthDataHistory") };
  },

  async readDaily(from: Date, to: Date): Promise<DailyRecord[]> {
    await initialize();
    // Bez oprávnění k historii Health Connect vrací jen okno ~30 dní před prvním udělením.
    const [dist, steps] = await Promise.all([
      dailySums("Distance", from, to),
      dailySums("Steps", from, to),
    ]);
    const days = new Set([...dist.keys(), ...steps.keys()]);
    const out: DailyRecord[] = [];
    for (const day of [...days].sort()) {
      const rec = toDailyRecord(day, dist.get(day) ?? 0, steps.get(day) ?? 0);
      if (rec) out.push(rec);
    }
    return out;
  },
};
