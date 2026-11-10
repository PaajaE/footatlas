/**
 * Čistá logika chvíle „Mezitím“ (docs/navrh-v2.md § 5, rozhodnutí 0034): nadpis podle doby, věta pruhu na Výpravě
 * a kdy se přehrání pustí samo přes celou obrazovku. Kdy se Mezitím vůbec ukáže a jak se spotřebuje, zůstává
 * podle rozhodnutí 0022 a 0024 (`shouldShowReturn`, `seenAfter` v `navrat.ts`). Nikdy „Dnes“.
 */
import { pluralNewPlaces, tileDistance } from "./home";

/** Po kolika dnech od posledního otevření se přehrání pustí samo. */
export const AUTO_OPEN_AFTER_MS = 3 * 86_400_000;

function utcDay(day: string): number {
  return Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

/** Kolik celých dní uběhlo od `since` do `today` (YYYY-MM-DD); bez `since` 0. */
export function daysSince(since: string | undefined, today: string): number {
  if (!since) return 0;
  return Math.max(0, Math.round((utcDay(today) - utcDay(since)) / 86_400_000));
}

function daysWord(n: number): string {
  return n >= 2 && n <= 4 ? "dny" : "dní";
}

/**
 * Nadpis podle doby od dne, kdy začal nepřehraný postup: „Mezitím přibylo“ (méně než den),
 * „Od včerejška přibylo“, „Za 5 dní přibylo“ (do týdne), jinak „Od 24. 10. přibylo“.
 */
export function mezitimHeading(since: string | undefined, today: string): string {
  const back = daysSince(since, today);
  if (back <= 0 || !since) return "Mezitím přibylo";
  if (back === 1) return "Od včerejška přibylo";
  if (back <= 6) return `Za ${back} ${daysWord(back)} přibylo`;
  return `Od ${Number(since.slice(8, 10))}. ${Number(since.slice(5, 7))}. přibylo`;
}

/** Věta pruhu: „Mezitím · 23,4 km za 5 dní · 3 nová místa“. */
export function mezitimStrip(deltaM: number, since: string | undefined, today: string, newPlaces: number): string {
  const d = tileDistance(deltaM);
  const back = daysSince(since, today);
  const when = back >= 2 ? ` za ${back} ${daysWord(back)}` : back === 1 ? " od včerejška" : "";
  const parts = ["Mezitím", `${d.value} ${d.unit}${when}`];
  if (newPlaces > 0) parts.push(pluralNewPlaces(newPlaces));
  return parts.join(" · ");
}

export interface AutoOpenInput {
  /** Je co přehrát (`shouldShowReturn`). */
  show: boolean;
  /** Kolik etap se mezitím dokončilo. */
  newStageCount: number;
  /** Kdy byla aplikace naposledy otevřená před tímto otevřením (ms), `null` poprvé. */
  previousOpenMs: number | null;
  nowMs: number;
}

/** Přehrání se pustí samo přes celou obrazovku, když se mezitím dokončila etapa nebo od otevření uběhly ≥ 3 dny. */
export function shouldAutoOpen(a: AutoOpenInput): boolean {
  if (!a.show) return false;
  if (a.newStageCount > 0) return true;
  return a.previousOpenMs !== null && a.nowMs - a.previousOpenMs >= AUTO_OPEN_AFTER_MS;
}
