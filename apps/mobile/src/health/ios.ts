import {
  isHealthDataAvailable,
  queryStatisticsCollectionForQuantity,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import { localDateKey, toDailyRecord, type AccessResult, type Availability, type DailyRecord, type HealthSource } from "@footatlas/core";

const DISTANCE = "HKQuantityTypeIdentifierDistanceWalkingRunning" as const;
const STEPS = "HKQuantityTypeIdentifierStepCount" as const;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Denní součty po lokálních dnech; HealthKit si duplicity (telefon + hodinky) řeší sám. */
async function dailySums(id: typeof DISTANCE | typeof STEPS, unit: "m" | "count", from: Date, to: Date) {
  const anchor = startOfDay(from);
  const rows = await queryStatisticsCollectionForQuantity(
    id,
    ["cumulativeSum"],
    anchor,
    { day: 1 },
    { unit, filter: { date: { startDate: anchor, endDate: to } } },
  );
  const byDay = new Map<string, number>();
  for (const r of rows) {
    if (!r.startDate || !r.sumQuantity) continue;
    byDay.set(localDateKey(r.startDate), r.sumQuantity.quantity);
  }
  return byDay;
}

export const iosHealthSource: HealthSource = {
  platform: "ios",

  async availability(): Promise<Availability> {
    return (await isHealthDataAvailable()) ? "available" : "unsupported";
  },

  async requestAccess(): Promise<AccessResult> {
    // iOS neprozradí, zda uživatel čtení povolil; prázdná data pak znamenají "nepovoleno nebo bez dat".
    await requestAuthorization({ toRead: [DISTANCE, STEPS] });
    return { read: true, history: true };
  },

  async readDaily(from: Date, to: Date): Promise<DailyRecord[]> {
    const [dist, steps] = await Promise.all([
      dailySums(DISTANCE, "m", from, to),
      dailySums(STEPS, "count", from, to),
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
