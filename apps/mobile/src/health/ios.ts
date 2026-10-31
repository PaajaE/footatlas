import {
  isHealthDataAvailable,
  queryStatisticsCollectionForQuantity,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import { localDateKey, toDailyRecord, type AccessResult, type Availability, type DailyRecord, type HealthSource, type RawDay } from "@footatlas/core";

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

/**
 * Součet za libovolný interval [from, to). HealthKit sám dělí vzorky na hranicích kbelíků kolekce,
 * proto se používá kolekce s jediným kbelíkem, který končí přesně v `to` a začíná o méně než minutu
 * před `from` (interval je jen v celých minutách); filtr omezí vzorky na ty od `from`. Chyba je tedy
 * nejvýš minuta pohybu na straně `from`. NEOVĚŘENO na iPhonu (rozhodnutí 0008).
 */
async function intervalSum(id: typeof DISTANCE | typeof STEPS, unit: "m" | "count", from: Date, to: Date): Promise<number> {
  const ms = to.getTime() - from.getTime();
  if (!(ms > 0)) return 0;
  const minutes = Math.ceil(ms / 60_000);
  const anchor = new Date(to.getTime() - minutes * 60_000);
  const rows = await queryStatisticsCollectionForQuantity(id, ["cumulativeSum"], anchor, { minute: minutes }, {
    unit,
    filter: { date: { startDate: from, endDate: to } },
  });
  let sum = 0;
  for (const r of rows) sum += r.sumQuantity?.quantity ?? 0;
  return sum;
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

  async readRawDaily(from: Date, to: Date): Promise<RawDay[]> {
    const [dist, steps] = await Promise.all([dailySums(DISTANCE, "m", from, to), dailySums(STEPS, "count", from, to)]);
    return [...new Set([...dist.keys(), ...steps.keys()])]
      .sort()
      .map((day) => ({ day, steps: steps.get(day) ?? 0, distanceM: dist.get(day) ?? 0 }));
  },

  async readDaily(from: Date, to: Date, stepLengthM?: number): Promise<DailyRecord[]> {
    const [dist, steps] = await Promise.all([
      dailySums(DISTANCE, "m", from, to),
      dailySums(STEPS, "count", from, to),
    ]);
    const days = new Set([...dist.keys(), ...steps.keys()]);
    const out: DailyRecord[] = [];
    for (const day of [...days].sort()) {
      const rec = toDailyRecord(day, dist.get(day) ?? 0, steps.get(day) ?? 0, stepLengthM);
      if (rec) out.push(rec);
    }
    return out;
  },

  async readInterval(from: Date, to: Date, stepLengthM?: number): Promise<number> {
    const [dist, steps] = await Promise.all([intervalSum(DISTANCE, "m", from, to), intervalSum(STEPS, "count", from, to)]);
    return toDailyRecord("", dist, steps, stepLengthM)?.distanceM ?? 0;
  },

  async readSteps(from: Date, to: Date): Promise<number> {
    return intervalSum(STEPS, "count", from, to);
  },
};
