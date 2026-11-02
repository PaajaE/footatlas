/** Čistá geometrie a texty pečetí; bez Reactu, aby šla testovat. */

export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return String(n);
  const table: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let rest = n;
  let out = "";
  for (const [value, sym] of table) {
    while (rest >= value) {
      out += sym;
      rest -= value;
    }
  }
  return out;
}

/** Římská číslice slovy v textu po obvodu: „první“ až „desátá“ jen pro etapy; jinak číslo. */
const ORDINALS = ["", "první", "druhá", "třetí", "čtvrtá", "pátá", "šestá", "sedmá", "osmá", "devátá", "desátá"];
export function stageOrdinal(n: number): string {
  return ORDINALS[n] || String(n);
}

export interface ArcSegment {
  path: string;
  done: boolean;
}

function point(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

const f = (n: number) => n.toFixed(1);

/**
 * Oblouky postupu kolem pečeti kapitoly: `total` segmentů od vrcholu po směru hodin, prvních `done` je splněných.
 * Mezi segmenty je mezera `gapDeg` (u jednoho segmentu žádná).
 */
export function progressArcs(done: number, total: number, cx: number, cy: number, r: number, gapDeg = 6): ArcSegment[] {
  if (total <= 0) return [];
  const span = 360 / total;
  const gap = total === 1 ? 0 : gapDeg;
  const out: ArcSegment[] = [];
  for (let i = 0; i < total; i++) {
    const a0 = -90 + i * span + gap / 2;
    const a1 = -90 + (i + 1) * span - gap / 2 - (total === 1 ? 0.01 : 0);
    const [x0, y0] = point(cx, cy, r, a0);
    const [x1, y1] = point(cx, cy, r, a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    out.push({ path: `M${f(x0)} ${f(y0)} A${r} ${r} 0 ${large} 1 ${f(x1)} ${f(y1)}`, done: i < done });
  }
  return out;
}

/** Text po obvodu zastávky: „Vyšehrad · km 0,2 · 24. 10. 2026 ·“. */
export function waxRingText(name: string, kmLabel: string, dateLabel: string): string {
  return `${name} · ${kmLabel} · ${dateLabel} ·`;
}

/** Kilometr na pečeti: „km 0,2“; start výpravy se nepíše jako „km 0,0“. */
export function sealKm(meters: number): string {
  if (meters < 50) return "start";
  return `km ${(meters / 1000).toFixed(1).replace(".", ",")}`;
}

/** Kruhová dráha textu: začíná vlevo a běží po směru hodin kolem středu. */
export function ringPath(cx: number, cy: number, r: number): string {
  return `M${cx} ${cy} m${-r} 0 a${r} ${r} 0 1 1 ${2 * r} 0 a${r} ${r} 0 1 1 ${-2 * r} 0`;
}

/** Časování dopadu razítka podle `Pecete.dc.html`. */
export const DROP_MS = 600;
export const RING_MS = 700;
export const MIN_STAMP_GAP_MS = 250;
export const REDUCED_FADE_MS = 400;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Nepravidelný okraj vosku (nahrazuje filtr `waxEdge`, který react-native-svg na telefonu nezná):
 * kružnice s poloměrem rozkolísaným deterministickým šumem, vyhlazená křivkami. Stejné `seed` dá stejný tvar.
 */
export function wobblyCircle(cx: number, cy: number, r: number, amplitude: number, seed: number, points = 28): string {
  const rnd = mulberry32(seed);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rr = r + (rnd() * 2 - 1) * amplitude;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  // Uzavřená křivka přes středy hran (kvadratické Bézierovy křivky s vrcholy jako řídicími body).
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const first = mid(pts[points - 1]!, pts[0]!);
  let d = `M${f(first[0])} ${f(first[1])}`;
  for (let i = 0; i < points; i++) {
    const c = pts[i]!;
    const m = mid(c, pts[(i + 1) % points]!);
    d += ` Q${f(c[0])} ${f(c[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return `${d} Z`;
}

/** Přerušovaný tah „otřepaného“ inkoustového kruhu: deterministická nepravidelná čárkování. */
export function grungeDash(circumference: number, seed: number): string {
  const rnd = mulberry32(seed);
  const parts: number[] = [];
  let used = 0;
  while (used < circumference - 4) {
    const on = 6 + rnd() * 26;
    const off = 0.6 + rnd() * 1.6;
    parts.push(Number(on.toFixed(1)), Number(off.toFixed(1)));
    used += on + off;
  }
  return parts.join(" ");
}
