import {
  aggregateGroupByPeriod,
  aggregateRecord,
  getSdkStatus,
  initialize,
  requestPermission,
  SdkAvailabilityStatus,
} from "react-native-health-connect";
import { addToDay, mergeDaily, periodStartDayKey, toDailyRecord, yearChunks, type AccessResult, type Availability, type DailyRecord, type HealthSource } from "@footatlas/core";

const READ_STEPS = { accessType: "read", recordType: "Steps" } as const;
const READ_DISTANCE = { accessType: "read", recordType: "Distance" } as const;
const READ_HISTORY = { accessType: "read", recordType: "ReadHealthDataHistory" } as const;

type Kind = "Distance" | "Steps";

/**
 * Denní součty z agregace Health Connectu (deduplikace telefon + hodinky řeší platforma).
 * Dny platforma dělí podle zónového offsetu záznamu, ne podle aktuální zóny zařízení;
 * to je správně (den, který uživatel prožil), a ověřeno na reálných datech.
 */
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
      if (typeof value === "number") addToDay(byDay, periodStartDayKey(r.startTime), value);
    }
  }
  return byDay;
}

/**
 * Součet za libovolný interval. Předpoklad (NEOVĚŘENO na telefonu): Health Connect záznam
 * přesahující hranici intervalu započítá poměrnou částí, ne celý.
 */
async function intervalSum(kind: Kind, from: Date, to: Date): Promise<number> {
  const r = (await aggregateRecord({
    recordType: kind,
    timeRangeFilter: { operator: "between", startTime: from.toISOString(), endTime: to.toISOString() },
  } as never)) as Record<string, any>;
  const value = kind === "Distance" ? r.DISTANCE?.inMeters : r.COUNT_TOTAL;
  return typeof value === "number" ? value : 0;
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
    // Bez oprávnění k historii Health Connect bez chyby tiše ořízne data na ~30 dní před prvním udělením.
    const [dist, steps] = await Promise.all([
      dailySums("Distance", from, to),
      dailySums("Steps", from, to),
    ]);
    return mergeDaily(dist, steps);
  },

  async readInterval(from: Date, to: Date): Promise<number> {
    await initialize();
    const [dist, steps] = await Promise.all([intervalSum("Distance", from, to), intervalSum("Steps", from, to)]);
    return toDailyRecord("", dist, steps)?.distanceM ?? 0;
  },
};
