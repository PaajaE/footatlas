/** Bod trasy. Výška je volitelná a do délky se nezapočítává. */
export interface RoutePoint {
  lat: number;
  lon: number;
  ele?: number;
}

const EARTH_R = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;

/** Vzdálenost po povrchu mezi dvěma body, v metrech (haversine). */
export function haversineM(a: RoutePoint, b: RoutePoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Kumulativní vzdálenost od startu u každého bodu; první je 0. */
export function cumulativeM(points: readonly RoutePoint[]): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) sum += haversineM(points[i - 1]!, points[i]!);
    out.push(sum);
  }
  return out;
}

export function routeLengthM(points: readonly RoutePoint[]): number {
  return cumulativeM(points).at(-1) ?? 0;
}

/** Rovinná aproximace kolem referenční šířky, v metrech. Pro vzdálenosti do desítek km dostatečná. */
function project(p: RoutePoint, lat0: number): [number, number] {
  return [rad(p.lon) * Math.cos(rad(lat0)) * EARTH_R, rad(p.lat) * EARTH_R];
}

/** Vzdálenost bodu od úsečky ab a parametr t (0..1) nejbližšího bodu. */
function nearestOnSegment(p: [number, number], a: [number, number], b: [number, number]): { t: number; d: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return { t, d: Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)) };
}

/** Douglas–Peucker; tolerance v metrech. Zachová první a poslední bod. */
export function simplify<T extends RoutePoint>(points: readonly T[], toleranceM: number): T[] {
  if (points.length <= 2) return [...points];
  const lat0 = points[0]!.lat;
  const xy = points.map((p) => project(p, lat0));
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let worst = -1;
    let worstD = toleranceM;
    for (let i = s + 1; i < e; i++) {
      const { d } = nearestOnSegment(xy[i]!, xy[s]!, xy[e]!);
      if (d > worstD) {
        worstD = d;
        worst = i;
      }
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push([s, worst], [worst, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Zjednoduší trasu tak, aby měla nejvýše `maxPoints` bodů, s nejmenší možnou tolerancí
 * (nejméně `minToleranceM`). U dlouhé trasy se tolerance sama zvětší; pevná tolerance
 * by limit bodů nesplnila.
 */
export function simplifyToLimit<T extends RoutePoint>(
  points: readonly T[],
  maxPoints: number,
  minToleranceM = 5,
): T[] {
  let current = simplify(points, minToleranceM);
  let tol = minToleranceM;
  while (current.length > maxPoints && tol < 100_000) {
    tol *= 1.5;
    current = simplify(points, tol);
  }
  return current;
}

export interface PositionOnRoute extends RoutePoint {
  /** Index úseku (bod i až i+1), na kterém poloha leží. */
  segment: number;
}

/** Interpolovaná poloha na trase po `m` metrech od startu; mimo trasu se ořízne na začátek nebo konec. */
export function positionAt(
  points: readonly RoutePoint[],
  cumulative: readonly number[],
  m: number,
): PositionOnRoute {
  if (points.length === 0) throw new Error("Prázdná trasa");
  if (points.length === 1 || m <= 0) return { ...points[0]!, segment: 0 };
  const total = cumulative.at(-1)!;
  if (m >= total) return { ...points.at(-1)!, segment: points.length - 2 };
  // Binární hledání úseku s cumulative[i] <= m < cumulative[i + 1].
  let lo = 0;
  let hi = cumulative.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid]! <= m) lo = mid;
    else hi = mid;
  }
  const a = points[lo]!;
  const b = points[lo + 1]!;
  const segLen = cumulative[lo + 1]! - cumulative[lo]!;
  const t = segLen === 0 ? 0 : (m - cumulative[lo]!) / segLen;
  const out: PositionOnRoute = { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, segment: lo };
  if (a.ele !== undefined && b.ele !== undefined) out.ele = a.ele + (b.ele - a.ele) * t;
  return out;
}

export interface Projection {
  /** Vzdálenost od startu trasy k nejbližšímu bodu, v metrech. */
  atM: number;
  /** Kolmá odchylka bodu od trasy, v metrech. */
  offsetM: number;
}

export interface ProjectOptions {
  /** Hledat jen na úsecích, které zasahují do [fromM, toM]. U smyček a tras tam a zpět to určuje, kterou z více shod vybrat. */
  fromM?: number;
  toM?: number;
}

/**
 * Promítne bod na trasu. Bez omezení vrací nejbližší místo; při shodě (smyčka, návrat po stejné
 * cestě) vybere dřívější. S `fromM` / `toM` se hledá jen v daném okně, proto si volající může
 * pro `wpt` v pořadí po trase předávat poslední nalezenou vzdálenost.
 */
export function projectOnto(
  points: readonly RoutePoint[],
  cumulative: readonly number[],
  lat: number,
  lon: number,
  options: ProjectOptions = {},
): Projection | null {
  if (points.length < 2) return null;
  const lat0 = points[0]!.lat;
  const p = project({ lat, lon }, lat0);
  const fromM = options.fromM ?? 0;
  const toM = options.toM ?? Infinity;
  let best: Projection | null = null;
  for (let i = 0; i < points.length - 1; i++) {
    if (cumulative[i + 1]! < fromM || cumulative[i]! > toM) continue;
    const { t, d } = nearestOnSegment(p, project(points[i]!, lat0), project(points[i + 1]!, lat0));
    // Rozdíl menší než 0,5 m se bere jako shoda: vyhrává dřívější úsek.
    if (!best || d < best.offsetM - 0.5) {
      best = { atM: cumulative[i]! + t * (cumulative[i + 1]! - cumulative[i]!), offsetM: d };
    }
  }
  return best;
}

/** Rozdělí trasu rovnoměrně na etapy o délce co nejblíž cílové. Vrací konce etap, poslední je `totalM`. */
export function splitStages(totalM: number, targetM = 20_000): number[] {
  if (totalM <= 0) return [];
  const n = Math.max(1, Math.round(totalM / targetM));
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? totalM : ((i + 1) * totalM) / n));
}
