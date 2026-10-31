import { toDailyRecord, toDailyRecordStepsFirst } from "./health";
import type { Confidence, DailyRecord } from "./motion";

/** Odkud den pochází. Systémové zdroje mají přednost; Takeout a GPX přijdou s importy. */
export type SourceId = "health_connect" | "healthkit" | "takeout" | "gpx";
const SYSTEM_SOURCES: readonly SourceId[] = ["health_connect", "healthkit"];

/** Verze pravidla, které z kroků a vzdálenosti vybírá denní hodnotu. Zvýšit při každé změně pravidla. */
export const RULE_VERSION = 1;

/** Surové denní hodnoty ze zdroje, ještě bez výběru mezi kroky a vzdáleností. */
export interface RawDay {
  /** Lokální den YYYY-MM-DD. */
  day: string;
  steps: number;
  distanceM: number;
}

/** Řádek `daily_motion`: jeden lokální den z jednoho zdroje. */
export interface StoredDay {
  day: string;
  source: SourceId;
  steps: number | null;
  rawDistanceM: number | null;
  distanceM: number;
  confidence: Extract<Confidence, "verified" | "estimated">;
  ruleVersion: number;
  /** Délka kroku, se kterou se `distanceM` počítala; po její změně se den přepočítá. */
  stepLengthM: number;
  readAt: string;
}

/** Pravidlo výběru: Android kroky jako hlavní zdroj (0005), iOS vzdálenost má přednost. */
export function applyRule(platform: "android" | "ios", raw: RawDay, stepLengthM: number): DailyRecord | null {
  return platform === "android"
    ? toDailyRecordStepsFirst(raw.day, raw.distanceM, raw.steps, stepLengthM)
    : toDailyRecord(raw.day, raw.distanceM, raw.steps, stepLengthM);
}

/** Převede surový den na řádek k uložení; `null`, když v něm žádný pohyb není. */
export function toStoredDay(
  platform: "android" | "ios",
  source: SourceId,
  raw: RawDay,
  stepLengthM: number,
  readAt: string,
): StoredDay | null {
  const rec = applyRule(platform, raw, stepLengthM);
  if (!rec || (rec.confidence !== "verified" && rec.confidence !== "estimated")) return null;
  return {
    day: raw.day,
    source,
    steps: raw.steps,
    rawDistanceM: raw.distanceM,
    distanceM: rec.distanceM,
    confidence: rec.confidence,
    ruleVersion: RULE_VERSION,
    stepLengthM,
    readAt,
  };
}

/** Má se hodnota dne přepočítat ze surových údajů (nové pravidlo nebo jiná délka kroku)? */
export function needsRecompute(row: Pick<StoredDay, "ruleVersion" | "stepLengthM">, stepLengthM: number): boolean {
  return row.ruleVersion !== RULE_VERSION || Math.abs(row.stepLengthM - stepLengthM) > 1e-9;
}

/**
 * Z řádků po zdrojích vybere pro každý den jednu hodnotu. Systémový zdroj má přednost;
 * ostatní zdroje (Takeout) jen pro dny před nejstarším dnem systémového zdroje, aby se pohyb nezdvojil.
 * GPX výpravy nejsou kronika a nezapočítávají se. Výsledek je seřazený podle dne.
 */
export function chronicleDays(rows: readonly StoredDay[]): DailyRecord[] {
  const system = rows.filter((r) => SYSTEM_SOURCES.includes(r.source));
  const oldestSystem = system.reduce<string | null>((min, r) => (min === null || r.day < min ? r.day : min), null);
  const byDay = new Map<string, StoredDay>();
  const rank = (s: SourceId) => SYSTEM_SOURCES.indexOf(s);
  for (const r of system) {
    const cur = byDay.get(r.day);
    if (!cur || rank(r.source) < rank(cur.source)) byDay.set(r.day, r);
  }
  for (const r of rows) {
    if (r.source !== "takeout") continue;
    if (oldestSystem !== null && r.day >= oldestSystem) continue;
    if (!byDay.has(r.day)) byDay.set(r.day, r);
  }
  return [...byDay.values()]
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .map((r) => ({ date: r.day, distanceM: r.distanceM, confidence: r.confidence }));
}

/** Odkud číst příště: poprvé celou historii, potom posledních 7 dní kvůli pozdě synchronizovaným hodinkám. */
export function syncFrom(lastReadAt: string | null, now: Date): Date {
  if (lastReadAt === null) return new Date(2000, 0, 1);
  const last = new Date(lastReadAt);
  const base = Number.isNaN(last.getTime()) || last > now ? now : last;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() - 7);
}

export interface ChronicleStats {
  totalM: number;
  byConfidence: Record<Confidence, number>;
  /** Dny se vzdáleností > 0. */
  daysWithRecord: number;
  firstDay: string | null;
  longestDay: { day: string; distanceM: number } | null;
  byYear: Array<{ year: string; distanceM: number; days: number }>;
}

export function chronicleStats(days: readonly DailyRecord[]): ChronicleStats {
  const byConfidence: Record<Confidence, number> = { verified: 0, estimated: 0, manual: 0 };
  const years = new Map<string, { distanceM: number; days: number }>();
  let longest: { day: string; distanceM: number } | null = null;
  let firstDay: string | null = null;
  let counted = 0;
  for (const d of days) {
    if (!(d.distanceM > 0)) continue;
    counted++;
    byConfidence[d.confidence] += d.distanceM;
    if (firstDay === null || d.date < firstDay) firstDay = d.date;
    if (longest === null || d.distanceM > longest.distanceM) longest = { day: d.date, distanceM: d.distanceM };
    const y = years.get(d.date.slice(0, 4)) ?? { distanceM: 0, days: 0 };
    y.distanceM += d.distanceM;
    y.days++;
    years.set(d.date.slice(0, 4), y);
  }
  return {
    totalM: byConfidence.verified + byConfidence.estimated + byConfidence.manual,
    byConfidence,
    daysWithRecord: counted,
    firstDay,
    longestDay: longest,
    byYear: [...years].sort(([a], [b]) => (a < b ? -1 : 1)).map(([year, v]) => ({ year, ...v })),
  };
}
