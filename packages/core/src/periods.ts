import { localDateKey } from "./health";
import type { DailyRecord } from "./motion";

/**
 * Období, kdy výprava běžela. Časy jsou okamžiky ISO 8601 (např. "2026-10-30T14:05:00.000Z"),
 * takže se počítá od přesného okamžiku zahájení do přesného okamžiku pozastavení (spec 5.3, 6.3).
 */
export interface ActivePeriod {
  start: string;
  /** Okamžik pozastavení nebo opuštění; bez něj období trvá. */
  end?: string;
}

/** Část období uvnitř jednoho lokálního dne. */
export interface DaySlice {
  /** Lokální den YYYY-MM-DD. */
  day: string;
  from: Date;
  to: Date;
  /**
   * Úsek pokrývá celý den, jak ho zná zdravotní aplikace: od půlnoci do půlnoci,
   * nebo dnešek od půlnoci do teď. Pak stačí denní součet; jinak je potřeba čtení intervalu.
   */
  whole: boolean;
}

function nextLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Rozdělí období na úseky po lokálních dnech, otevřené období končí v `now`.
 * Budoucí části (po `now`) se ořežou; prázdná období se vynechají.
 */
export function periodSlices(periods: readonly ActivePeriod[], now: Date): DaySlice[] {
  const out: DaySlice[] = [];
  for (const p of periods) {
    const start = new Date(p.start);
    const endRaw = p.end === undefined ? now : new Date(p.end);
    const end = endRaw < now ? endRaw : now;
    let day = localMidnight(start);
    while (day < end) {
      const next = nextLocalMidnight(day);
      const from = start > day ? start : day;
      const to = end < next ? end : next;
      if (to > from) {
        const whole = from.getTime() === day.getTime() && (to.getTime() === next.getTime() || to.getTime() >= now.getTime());
        out.push({ day: localDateKey(day), from, to, whole });
      }
      day = next;
    }
  }
  return out;
}

/**
 * Vzdálenost výpravy z úseků. Celé dny se berou z denních záznamů kroniky, části dne
 * ze čtení intervalu (`intervalM[i]` patří k `slices[i]`).
 *
 * Když zdroj čtení intervalu nemá (`intervalM[i]` je `null` nebo chybí), započítá se
 * celý den, ale každý den nejvýš jednou. Tím se nikdy nic neztratí, jen se může
 * započítat i pohyb ze stejného dne před zahájením nebo po pozastavení.
 */
export function walkedInSlicesM(
  slices: readonly DaySlice[],
  daily: readonly DailyRecord[],
  intervalM: readonly (number | null | undefined)[] = [],
): number {
  const byDay = new Map<string, number>();
  for (const r of daily) byDay.set(r.date, (byDay.get(r.date) ?? 0) + r.distanceM);
  const countedDays = new Set<string>();
  let sum = 0;
  slices.forEach((s, i) => {
    const part = intervalM[i];
    if (!s.whole && typeof part === "number") {
      sum += Math.max(0, part);
      return;
    }
    if (countedDays.has(s.day)) return;
    countedDays.add(s.day);
    sum += byDay.get(s.day) ?? 0;
  });
  return sum;
}
