/**
 * Pohled „Rok“ v Kronice: mřížka den po dni, nejsilnější měsíc, dny v týdnu a rekordy. Čisté funkce nad denními záznamy.
 */
import type { DailyRecord } from "@footatlas/core";
import { formatDay } from "../format";

export interface YearCell {
  /** YYYY-MM-DD, nebo `null` mimo rok. */
  day: string | null;
  distanceM: number;
  /** 0 = bez záznamu, 1 až 4 podle vzdálenosti. */
  level: 0 | 1 | 2 | 3 | 4;
}

/** Úroveň barvy podle vzdálenosti dne: hranice 2; 4,5; 7 a 10 km (jako v prototypu). */
export function dayLevel(distanceM: number): 0 | 1 | 2 | 3 | 4 {
  if (!(distanceM > 0)) return 0;
  const km = distanceM / 1000;
  return km < 2 ? 1 : km < 4.5 ? 2 : km < 7 ? 3 : 4;
}

const pad = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Den v týdnu s pondělím jako 0. */
const mondayFirst = (d: Date) => (d.getDay() + 6) % 7;

/** Roky, ve kterých je aspoň jeden záznam, vzestupně. */
export function yearsWithRecords(days: readonly DailyRecord[]): number[] {
  return [...new Set(days.filter((d) => d.distanceM > 0).map((d) => Number(d.date.slice(0, 4))))].sort((a, b) => a - b);
}

/** Mřížka roku po týdnech (sloupce) a dnech (řádky, pondělí nahoře). Dny mimo rok mají `day: null`. */
export function yearGrid(days: readonly DailyRecord[], year: number): YearCell[][] {
  const byDay = new Map<string, number>();
  for (const d of days) if (d.date.startsWith(`${year}-`)) byDay.set(d.date, (byDay.get(d.date) ?? 0) + d.distanceM);
  const first = new Date(year, 0, 1);
  const offset = mondayFirst(first);
  const weeks: YearCell[][] = [];
  const total = Math.ceil((offset + daysInYear(year)) / 7);
  for (let w = 0; w < total; w++) {
    const col: YearCell[] = [];
    for (let r = 0; r < 7; r++) {
      const date = new Date(year, 0, 1 + w * 7 + r - offset);
      if (date.getFullYear() !== year) col.push({ day: null, distanceM: 0, level: 0 });
      else {
        const m = byDay.get(key(date)) ?? 0;
        col.push({ day: key(date), distanceM: m, level: dayLevel(m) });
      }
    }
    weeks.push(col);
  }
  return weeks;
}

function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

const MONTH_NOM = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];

/** Součty po měsících roku (12 hodnot v metrech). */
export function monthTotals(days: readonly DailyRecord[], year: number): number[] {
  const out = new Array<number>(12).fill(0);
  for (const d of days) if (d.date.startsWith(`${year}-`) && d.distanceM > 0) out[Number(d.date.slice(5, 7)) - 1]! += d.distanceM;
  return out;
}

/** Věta o nejsilnějším měsíci; `null`, když rok nemá žádný záznam. */
export function bestMonthSentence(days: readonly DailyRecord[], year: number): string | null {
  const totals = monthTotals(days, year);
  const max = Math.max(...totals);
  if (!(max > 0)) return null;
  const i = totals.indexOf(max);
  return `Nejsilnější měsíc roku ${year} je ${MONTH_NOM[i]}: ${(max / 1000).toFixed(0)} km.`;
}

/** Součet roku v metrech. */
export function yearTotalM(days: readonly DailyRecord[], year: number): number {
  return days.filter((d) => d.date.startsWith(`${year}-`) && d.distanceM > 0).reduce((s, d) => s + d.distanceM, 0);
}

const WEEKDAY_SHORT = ["po", "út", "st", "čt", "pá", "so", "ne"];
const WEEKDAY_IN = ["v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu", "v neděli"];

export interface WeekdayStat {
  label: string;
  /** Průměr v metrech za jeden takový den (dny bez záznamu se počítají jako nula). */
  avgM: number;
}

/** Nejméně tolik dnů se záznamem musí rok mít, aby se ukázal graf dnů v týdnu. */
export const MIN_DAYS_FOR_WEEKDAYS = 14;

/**
 * Průměrná vzdálenost podle dne v týdnu v rámci roku: od prvního dne se záznamem do posledního
 * (do `until`, nejpozději do konce roku). `null`, když je záznamů málo.
 */
export function weekdayAverages(days: readonly DailyRecord[], year: number, until: Date): { stats: WeekdayStat[]; sentence: string } | null {
  const inYear = days.filter((d) => d.date.startsWith(`${year}-`) && d.distanceM > 0);
  if (inYear.length < MIN_DAYS_FOR_WEEKDAYS) return null;
  const byDay = new Map<string, number>();
  for (const d of inYear) byDay.set(d.date, (byDay.get(d.date) ?? 0) + d.distanceM);
  const firstDay = [...byDay.keys()].sort()[0]!;
  const start = new Date(Number(firstDay.slice(0, 4)), Number(firstDay.slice(5, 7)) - 1, Number(firstDay.slice(8, 10)));
  const endOfYear = new Date(year, 11, 31);
  const end = until < endOfYear ? new Date(until.getFullYear(), until.getMonth(), until.getDate()) : endOfYear;
  const sum = new Array<number>(7).fill(0);
  const count = new Array<number>(7).fill(0);
  for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const w = mondayFirst(d);
    count[w]!++;
    sum[w]! += byDay.get(key(d)) ?? 0;
  }
  const stats = WEEKDAY_SHORT.map((label, i) => ({ label, avgM: count[i]! > 0 ? sum[i]! / count[i]! : 0 }));
  const max = Math.max(...stats.map((s) => s.avgM));
  const best = stats.findIndex((s) => s.avgM === max);
  return { stats, sentence: `Nejvíc chodíte ${WEEKDAY_IN[best]}.` };
}

export interface RecordItem {
  label: string;
  value: string;
  note: string;
}

const km1 = (m: number) => `${(m / 1000).toFixed(1).replace(".", ",")} km`;

/** Pondělí týdne, ve kterém den leží. */
function weekStart(day: string): Date {
  const d = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayFirst(d));
}

/**
 * Rekordy z celé kroniky: nejdelší den, nejlepší týden (pondělí až neděle), průměr na den se záznamem
 * a nejdelší pauza (dny bez záznamu mezi dvěma dny se záznamem; od 2 dnů).
 */
export function records(days: readonly DailyRecord[], stepLengthM?: number): RecordItem[] {
  const rec = days.filter((d) => d.distanceM > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (rec.length === 0) return [];
  const out: RecordItem[] = [];
  const longest = rec.reduce((m, d) => (d.distanceM > m.distanceM ? d : m));
  out.push({ label: "Nejdelší den", value: km1(longest.distanceM), note: formatDay(longest.date) });

  const weeks = new Map<string, number>();
  for (const d of rec) {
    const k = key(weekStart(d.date));
    weeks.set(k, (weeks.get(k) ?? 0) + d.distanceM);
  }
  const [bestWeek, bestWeekM] = [...weeks.entries()].reduce((m, e) => (e[1] > m[1] ? e : m));
  out.push({ label: "Nejlepší týden", value: km1(bestWeekM), note: `týden od ${formatDay(bestWeek)}` });

  const total = rec.reduce((s, d) => s + d.distanceM, 0);
  const avg = total / rec.length;
  out.push({
    label: "Průměr na den",
    value: km1(avg),
    note: stepLengthM && stepLengthM > 0 ? `asi ${Math.round(avg / stepLengthM / 100) * 100} kroků` : "ve dnech se záznamem",
  });

  let gap = 0;
  let gapFrom = "";
  let gapTo = "";
  for (let i = 1; i < rec.length; i++) {
    const a = new Date(Number(rec[i - 1]!.date.slice(0, 4)), Number(rec[i - 1]!.date.slice(5, 7)) - 1, Number(rec[i - 1]!.date.slice(8, 10)));
    const b = new Date(Number(rec[i]!.date.slice(0, 4)), Number(rec[i]!.date.slice(5, 7)) - 1, Number(rec[i]!.date.slice(8, 10)));
    const between = Math.round((b.getTime() - a.getTime()) / 86_400_000) - 1;
    if (between > gap) {
      gap = between;
      gapFrom = key(new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1));
      gapTo = key(new Date(b.getFullYear(), b.getMonth(), b.getDate() - 1));
    }
  }
  if (gap >= 2) out.push({ label: "Nejdelší pauza", value: `${gap} dní`, note: `${formatDay(gapFrom)} až ${formatDay(gapTo)}` });
  return out;
}
