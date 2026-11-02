/**
 * Čistá logika návratu „Inkoust“ (M1): kdy se přehrává, časování letu po trase, rozestupy razítek,
 * nadpis a úsek „A → B“. Bez Reactu a MapLibre, aby šla testovat (rozhodnutí 0022).
 */
import { positionAt, type RoutePoint } from "@footatlas/core";
import { MIN_STAMP_GAP_MS } from "./seal";

/** Od kolika metrů nového postupu se nabízí návrat (nebo dřív, když přibylo místo či etapa). */
export const RETURN_MIN_M = 300;
/** Let kamery trvá 4 až 9 s podle délky úseku (prototyp, docs/design-prototyp.md §2). */
export const FLIGHT_MIN_MS = 4000;
export const FLIGHT_MAX_MS = 9000;
/** Úsek, od kterého je let nejdelší. Kratší úseky letí kratší dobu, ale nikdy pod FLIGHT_MIN_MS. */
const FLIGHT_FULL_AT_M = 15_000;
const FLIGHT_SHORT_UNTIL_M = 1000;
/** Razítko dopadne chvíli po průletu kamery („za letem“). */
export const STAMP_LAG_MS = 300;

export interface ReturnSummary {
  deltaM: number;
  newPlaceCount: number;
  newStageCount: number;
}

/** Návrat se nabídne, když přibylo ≥ 300 m, nové místo nebo dokončená etapa. */
export function shouldShowReturn(s: ReturnSummary): boolean {
  return s.deltaM >= RETURN_MIN_M || s.newPlaceCount > 0 || s.newStageCount > 0;
}

/** Doba letu v ms, 4000 až 9000, lineárně podle délky úseku mezi 1 a 15 km. */
export function flightDurationMs(deltaM: number): number {
  const d = Number.isFinite(deltaM) ? Math.max(0, deltaM) : 0;
  const f = Math.min(1, Math.max(0, (d - FLIGHT_SHORT_UNTIL_M) / (FLIGHT_FULL_AT_M - FLIGHT_SHORT_UNTIL_M)));
  return Math.round(FLIGHT_MIN_MS + f * (FLIGHT_MAX_MS - FLIGHT_MIN_MS));
}

/** Zrychlení a zpomalení (ease-in-out, kvadraticky). */
export function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

/** Inverze `easeInOut`: kdy (0 až 1) kamera dorazí na zlomek `f` úseku. */
export function easeInOutInverse(f: number): number {
  const y = Math.min(1, Math.max(0, f));
  return y < 0.5 ? Math.sqrt(y / 2) : 1 - Math.sqrt((1 - y) / 2);
}

export interface Keyframe {
  /** Čas od začátku letu v ms. */
  atMs: number;
  /** Poloha na trase v metrech od startu. */
  m: number;
  lon: number;
  lat: number;
}

/**
 * Body, kudy kamera letí: stejně rozestoupené v čase, poloha na trase podle `easeInOut`,
 * takže se kamera rozjíždí a zpomaluje. První je `fromM`, poslední `toM`.
 */
export function flightKeyframes(
  route: readonly RoutePoint[],
  cumulative: readonly number[],
  fromM: number,
  toM: number,
  durationMs: number,
  count = 12,
): Keyframe[] {
  const n = Math.max(2, Math.floor(count));
  const out: Keyframe[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const m = fromM + easeInOut(t) * (toM - fromM);
    const p = positionAt(route, cumulative, m);
    out.push({ atMs: Math.round(t * durationMs), m, lon: p.lon, lat: p.lat });
  }
  return out;
}

export interface StampEvent {
  id: string;
  /** Kdy razítko dopadne (ms od začátku letu). */
  atMs: number;
}

/**
 * Kdy dopadne které razítko: krátce po tom, co kamera místo mine, ale nikdy blíž než `MIN_STAMP_GAP_MS`
 * k předchozímu. Místa dostávají pořadí podle polohy na trase. Když se kvůli rozestupům razítka posunou za
 * konec letu, přehrávání trvá o to déle (`flightEndMs`).
 */
export function stampSchedule(
  places: ReadonlyArray<{ id: string; atM: number }>,
  fromM: number,
  toM: number,
  durationMs: number,
  gapMs = MIN_STAMP_GAP_MS,
): StampEvent[] {
  const span = Math.max(1, toM - fromM);
  const sorted = [...places].filter((p) => p.atM > fromM && p.atM <= toM).sort((a, b) => a.atM - b.atM);
  const out: StampEvent[] = [];
  let last = -Infinity;
  for (const p of sorted) {
    const reachedAt = easeInOutInverse((p.atM - fromM) / span) * durationMs + STAMP_LAG_MS;
    const at = Math.round(Math.max(reachedAt, last + gapMs));
    out.push({ id: p.id, atMs: at });
    last = at;
  }
  return out;
}

/** Konec celého přehrávání: let, nebo poslední razítko, co přijde později (plus dopad 600 ms). */
export function playbackEndMs(durationMs: number, stamps: readonly StampEvent[], dropMs = 600): number {
  const lastStamp = stamps.reduce((m, s) => Math.max(m, s.atMs + dropMs), 0);
  return Math.max(durationMs, lastStamp);
}

/** Kolik razítek už dopadlo v čase `elapsedMs`. */
export function stampsLanded(stamps: readonly StampEvent[], elapsedMs: number): string[] {
  return stamps.filter((s) => s.atMs <= elapsedMs).map((s) => s.id);
}

/** Vzdálenost, kterou počítadlo ukazuje v čase `elapsedMs` (roste stejně jako kamera, ne rychleji). */
export function counterM(deltaM: number, durationMs: number, elapsedMs: number): number {
  if (durationMs <= 0) return deltaM;
  return deltaM * easeInOut(elapsedMs / durationMs);
}

const WEEKDAYS_FROM = ["neděle", "pondělí", "úterý", "středy", "čtvrtka", "pátku", "soboty"];

function parseDay(day: string): Date {
  return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

/** Rozdíl dnů `a - b` (YYYY-MM-DD) po celých dnech. */
function dayDiff(a: string, b: string): number {
  const ms = Date.UTC(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10))) -
    Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  return Math.round(ms / 86_400_000);
}

/** Den, kdy se začal sbírat postup po `fromM` (první úsek, který kumulativně přesáhl `fromM`). `undefined` bez dat. */
export function sinceDay(slices: ReadonlyArray<{ day: string; distanceM: number }>, fromM: number): string | undefined {
  let sum = 0;
  for (const s of slices) {
    sum += s.distanceM;
    if (sum > fromM) return s.day;
  }
  return undefined;
}

/**
 * Horní řádek návratu: „Dnes jste ušli“, „Od včerejška jste ušli“, „Od pátku jste ušli“ (do týdne),
 * jinak „Od 24. 10. jste ušli“; bez známého dne „Od posledně jste ušli“.
 */
export function returnHeading(since: string | undefined, today: string): string {
  if (!since) return "Od posledně jste ušli";
  const back = dayDiff(today, since);
  if (back <= 0) return "Dnes jste ušli";
  if (back === 1) return "Od včerejška jste ušli";
  if (back <= 6) return `Od ${WEEKDAYS_FROM[parseDay(since).getDay()]} jste ušli`;
  return `Od ${Number(since.slice(8, 10))}. ${Number(since.slice(5, 7))}. jste ušli`;
}

/**
 * Úsek „A → B“: A je poslední místo, které jste měli před úsekem, B poslední nově odemčené;
 * bez nového místa B je to nejbližší další místo (směr, kterým jdete).
 */
export function returnRouteLabel(
  places: ReadonlyArray<{ name: string; atM: number }>,
  fromM: number,
  toM: number,
): string | undefined {
  const sorted = [...places].sort((a, b) => a.atM - b.atM);
  const start = [...sorted].reverse().find((p) => p.atM <= fromM);
  const reached = [...sorted].reverse().find((p) => p.atM > fromM && p.atM <= toM);
  const end = reached ?? sorted.find((p) => p.atM > toM);
  if (!start || !end) return undefined;
  return `${start.name} → ${end.name}`;
}

/** Souřadnice a zoom pro závěrečný pohled na celý úsek (bounding box s malou rezervou). */
export function sectionBounds(
  route: readonly RoutePoint[],
  cumulative: readonly number[],
  fromM: number,
  toM: number,
): [number, number, number, number] {
  const pts: RoutePoint[] = [positionAt(route, cumulative, fromM)];
  for (let i = 0; i < route.length; i++) {
    const c = cumulative[i]!;
    if (c > fromM && c < toM) pts.push(route[i]!);
  }
  pts.push(positionAt(route, cumulative, toM));
  const lons = pts.map((p) => p.lon);
  const lats = pts.map((p) => p.lat);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}
