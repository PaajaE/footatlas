/**
 * Čistá logika „Před vámi“ (docs/navrh-v2.md § 4.1): pás trasy asi 8 km před chodcem, odhad podle vlastního tempa,
 * pojmenovaná odměna a text při táhnutí po pásu. Nahrazuje „Kam dnes dojdu“. Nikde slovo „dnes“.
 */
import { formatKm, pluralPlaces } from "./format";
import { formatMinutes, WALK_SPEED_KMH, type DailyDistance } from "./home";
import { toRoman } from "./seal";

/** Jak daleko před chodcem pás sahá. */
export const PREDVAMI_WINDOW_M = 8000;
/** Kolik posledních dní s pohybem tvoří tempo. */
export const PACE_DAYS = 14;
/** Den s méně než 200 m se za den s pohybem nepočítá (telefon v kapse doma). */
export const PACE_MIN_DAY_M = 200;
/** Pohlednice etapy se jmenuje jako odměna, když je do konce etapy nejvýš tolik. */
export const REWARD_REACH_M = 15_000;

/**
 * Obvyklá denní vzdálenost: průměr posledních `PACE_DAYS` dní s pohybem před dneškem (rozepsaný den by tempo
 * podhodnotil). `null`, když žádný takový den není.
 */
export function typicalDailyM(days: readonly DailyDistance[], todayKey: string, count = PACE_DAYS): number | null {
  const moving = days
    .filter((d) => d.day < todayKey && d.distanceM >= PACE_MIN_DAY_M)
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .slice(0, count);
  if (moving.length === 0) return null;
  return moving.reduce((s, d) => s + d.distanceM, 0) / moving.length;
}

/** Spojí denní součty z kroniky a z výpravy; pro stejný den platí větší hodnota. */
export function mergeDaily(...sources: ReadonlyArray<readonly DailyDistance[]>): DailyDistance[] {
  const byDay = new Map<string, number>();
  for (const src of sources) for (const d of src) byDay.set(d.day, Math.max(byDay.get(d.day) ?? 0, d.distanceM));
  return [...byDay].map(([day, distanceM]) => ({ day, distanceM })).sort((a, b) => (a.day < b.day ? -1 : 1));
}

/** Místa na pásu: za ušlou vzdáleností, nejvýš `windowM` před chodcem. */
export function placesAhead<P extends { atM: number }>(places: readonly P[], walkedM: number, windowM = PREDVAMI_WINDOW_M): P[] {
  return places.filter((p) => p.atM > walkedM && p.atM <= walkedM + windowM).sort((a, b) => a.atM - b.atM);
}

/** Délka pásu: okno, nebo méně, když trasa končí dřív. */
export function stripLengthM(walkedM: number, totalM: number, windowM = PREDVAMI_WINDOW_M): number {
  return Math.max(0, Math.min(windowM, totalM - walkedM));
}

function daysWord(n: number): string {
  if (n === 1) return "den";
  if (n >= 2 && n <= 4) return "dny";
  return "dní";
}

/** „Za den“, „Za 2 dny“, „Za 5 dní“. */
export function inDays(n: number): string {
  return n === 1 ? "Za den" : `Za ${n} ${daysWord(n)}`;
}

/**
 * „vás čeká Zámek Veltrusy“, „vás čekají Zámek Veltrusy a Červený mlýn“. Názvy míst v obsahu nemají 2. pád,
 * proto věta stojí na 1. pádu (ne „jste u Zámku Veltrusy“).
 */
export function awaits(names: readonly string[]): string {
  if (names.length <= 1) return `vás čeká ${names[0] ?? ""}`;
  return `vás čekají ${names.slice(0, -1).join(", ")} a ${names.at(-1)}`;
}

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Minuty chůze pro vzdálenost, zaokrouhlené na pět (aspoň 5). */
export function walkMinutes(distanceM: number): number {
  const minutes = (Math.max(0, distanceM) / 1000 / WALK_SPEED_KMH) * 60;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

/** Kroky pro vzdálenost, zaokrouhlené na stovky. */
export function walkSteps(distanceM: number, stepLengthM: number): number {
  return Math.round(Math.max(0, distanceM) / stepLengthM / 100) * 100;
}

export interface PaceInput {
  walkedM: number;
  /** Místa před chodcem v pořadí trasy (aspoň první z nich se pojmenuje). */
  ahead: ReadonlyArray<{ name: string; atM: number }>;
  /** Obvyklá denní vzdálenost, nebo `null` bez historie. */
  dailyM: number | null;
  stepLengthM: number;
}

/**
 * Věta nad pásem. S tempem: „Obvykle ujdete 6,2 km denně. Za 2 dny vás čekají Zámek Veltrusy a Červený mlýn.“
 * (místa, která přibudou v tom dni, nejvýš dvě). Bez historie: „Za 30 minut chůze (asi 2 700 kroků) vás čeká Zámek Veltrusy.“
 * Bez míst před chodcem `undefined`.
 */
export function paceSentence(p: PaceInput): string | undefined {
  const first = p.ahead[0];
  if (!first) return undefined;
  const toFirst = first.atM - p.walkedM;
  if (p.dailyM === null || p.dailyM <= 0) {
    return `Za ${formatMinutes(walkMinutes(toFirst))} chůze (asi ${groupThousands(walkSteps(toFirst, p.stepLengthM))} kroků) ${awaits([first.name])}.`;
  }
  const day = Math.max(1, Math.ceil(toFirst / p.dailyM));
  const from = p.walkedM + (day - 1) * p.dailyM;
  const to = p.walkedM + day * p.dailyM;
  const names = p.ahead.filter((x) => x.atM > from && x.atM <= to).slice(0, 2).map((x) => x.name);
  return `Obvykle ujdete ${formatKm(p.dailyM)} denně. ${inDays(day)} ${awaits(names.length > 0 ? names : [first.name])}.`;
}

/** „Do pohlednice etapy III: 12,1 km.“, je-li konec etapy v dosahu; jinak `undefined`. */
export function rewardSentence(stage: { index: number; endM: number }, walkedM: number, completed: boolean): string | undefined {
  if (completed) return undefined;
  const left = stage.endM - walkedM;
  if (left <= 0 || left > REWARD_REACH_M) return undefined;
  return `Do pohlednice etapy ${toRoman(stage.index + 1)}: ${formatKm(left)}.`;
}

/** Text při táhnutí po pásu: „Do sem: 4,0 km, asi 50 minut, 3 místa“. */
export function scrubSentence(distanceM: number, placeCount: number): string {
  const d = Math.max(0, distanceM);
  const parts = [`Do sem: ${formatKm(d)}`, `asi ${formatMinutes(walkMinutes(d))}`];
  if (placeCount > 0) parts.push(pluralPlaces(placeCount));
  return parts.join(", ");
}

/** Vzdálenost od chodce pro bod na pásu (`x` od 0 do `width` bodů), zaokrouhlená na 100 m. */
export function scrubDistance(x: number, width: number, lengthM: number): number {
  if (width <= 0 || lengthM <= 0) return 0;
  const f = Math.max(0, Math.min(1, x / width));
  return Math.round((f * lengthM) / 100) * 100;
}

/**
 * Řádek razítka na pásu: místa blíž než `minGapPx` k předchozímu ve stejném řádku jdou do druhého řádku,
 * aby se nepřekrývala. Vrací 0 nebo 1 pro každé místo.
 */
export function stripRows(xs: readonly number[], minGapPx: number): Array<0 | 1> {
  const last: [number, number] = [-Infinity, -Infinity];
  return xs.map((x) => {
    const row: 0 | 1 = x - last[0] >= minGapPx ? 0 : x - last[1] >= minGapPx ? 1 : x - last[0] >= x - last[1] ? 0 : 1;
    last[row] = x;
    return row;
  });
}
