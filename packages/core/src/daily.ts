import { localDateKey, toDailyRecord } from "./health";
import type { DailyRecord } from "./motion";

/** Začátek lokálního dne. */
export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Rozdělí rozsah na úseky po lokálních letech, aby jedna agregace nebyla příliš velká.
 * Hranice jsou lokální půlnoci, takže denní plátky platformy nepřecházejí přes hranici úseku.
 */
export function yearChunks(from: Date, to: Date): Array<[Date, Date]> {
  const chunks: Array<[Date, Date]> = [];
  let start = startOfLocalDay(from);
  while (start < to) {
    const next = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
    chunks.push([start, next < to ? next : to]);
    start = next;
  }
  return chunks;
}

const HAS_ZONE = /(Z|[+-]\d{2}(:?\d{2})?)$/;

/**
 * Lokální den z `startTime` plátku agregace. Health Connect vrací začátek plátku
 * jako lokální čas bez zóny (např. "2026-10-26T00:00:00"), a to je už hledaný den,
 * takže se čte přímo z řetězce, bez převodu přes Date (ten by u času v přechodu
 * letního času mohl den posunout). Řetězec se zónou (Z nebo offset) je instant a
 * převádí se do lokálního dne zařízení.
 */
export function periodStartDayKey(startTime: string): string {
  if (!HAS_ZONE.test(startTime) && /^\d{4}-\d{2}-\d{2}/.test(startTime)) return startTime.slice(0, 10);
  return localDateKey(new Date(startTime));
}

/** Sečte hodnoty se stejným dnem (např. při překrývajících se plátcích). */
export function addToDay(byDay: Map<string, number>, day: string, value: number): void {
  byDay.set(day, (byDay.get(day) ?? 0) + value);
}

/** Spojí denní součty vzdálenosti (m) a kroků do záznamů kroniky, seřazené podle dne. */
export function mergeDaily(
  distanceM: ReadonlyMap<string, number>,
  steps: ReadonlyMap<string, number>,
): DailyRecord[] {
  const days = new Set([...distanceM.keys(), ...steps.keys()]);
  const out: DailyRecord[] = [];
  for (const day of [...days].sort()) {
    const rec = toDailyRecord(day, distanceM.get(day) ?? 0, steps.get(day) ?? 0);
    if (rec) out.push(rec);
  }
  return out;
}
