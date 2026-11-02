import polygonClipping, { type MultiPolygon as PcMultiPolygon, type Ring } from "polygon-clipping";

/** Bod [délka, šířka] ve stupních. */
export type LonLat = [number, number];

export interface RevealMask {
  type: "Feature";
  properties: Record<string, never>;
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
}

const M_PER_DEG = 111_320;
const WORLD: Ring = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

/** Douglas–Peucker v metrech. */
function simplify(pts: Array<[number, number]>, tol: number): Array<[number, number]> {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    const [ax, ay] = pts[i]!;
    const [bx, by] = pts[j]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let best = -1;
    let bestD = tol;
    for (let k = i + 1; k < j; k++) {
      const [px, py] = pts[k]!;
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > bestD) {
        bestD = d;
        best = k;
      }
    }
    if (best > 0) {
      keep[best] = 1;
      stack.push([i, best], [best, j]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function hull(points: Array<[number, number]>): Array<[number, number]> {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Array<[number, number]> = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Array<[number, number]> = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * Maska „vybarveno jen kolem ušlé trasy“: papír (obdélník přes celý svět) s dírou tvaru okolí trasy do
 * `radiusM` metrů. Díra je sjednocení „kapslí“ kolem úseků zjednodušené trasy. Ostrovy uvnitř okolí, které
 * trasa neobklopuje, zůstanou kryté. Výsledek je GeoJSON `MultiPolygon` pro zdroj krycí vrstvy.
 * Bez trasy vrací papír bez díry (všechno je skica).
 */
export function revealMask(coords: readonly LonLat[], radiusM: number): RevealMask {
  const feature = (coordinates: number[][][][]): RevealMask => ({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates } });
  if (coords.length === 0 || radiusM <= 0) return feature([[WORLD]]);

  const lat0 = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const kx = M_PER_DEG * Math.cos((lat0 * Math.PI) / 180);
  const ky = M_PER_DEG;
  const lon0 = coords[0]![0];
  const metric = simplify(
    coords.map((c): [number, number] => [(c[0] - lon0) * kx, (c[1] - lat0) * ky]),
    radiusM * 0.12,
  );

  const STEPS = 20;
  const circle = (c: [number, number]): Array<[number, number]> =>
    Array.from({ length: STEPS }, (_, i) => {
      const t = (i / STEPS) * 2 * Math.PI;
      return [c[0] + radiusM * Math.cos(t), c[1] + radiusM * Math.sin(t)];
    });
  const capsules: Ring[] = [];
  const closed = (pts: Array<[number, number]>): Ring => [...pts, pts[0]!];
  if (metric.length === 1) capsules.push(closed(circle(metric[0]!)));
  for (let i = 0; i + 1 < metric.length; i++) capsules.push(closed(hull([...circle(metric[i]!), ...circle(metric[i + 1]!)])));

  const toLonLat = (r: Ring): Ring => r.map(([x, y]) => [lon0 + x / kx, lat0 + y / ky] as [number, number]);
  const [first, ...rest]: PcMultiPolygon = polygonClipping.union(capsules.map((r) => [r]) as never) as PcMultiPolygon;
  if (!first) return feature([[WORLD]]);
  const union: PcMultiPolygon = [first, ...rest];
  const holes = union.map((poly) => toLonLat(poly[0]!));
  const islands = union.flatMap((poly) => poly.slice(1).map((ring) => [toLonLat(ring)]));
  return feature([[WORLD, ...holes], ...islands]);
}
