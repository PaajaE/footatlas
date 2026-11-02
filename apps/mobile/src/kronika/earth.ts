/**
 * Čistá logika zeměkoule, srovnání a životní cesty (Kronika, Karta života). Bez Reactu, aby šla testovat.
 * Žádné číslo se tu nevymýšlí: vzdálenosti měst se počítají ze souřadnic, podíl cesty kolem Země z obvodu.
 */

/** Obvod Země na rovníku (WGS 84), v km. */
export const EARTH_CIRCUMFERENCE_KM = 40_075.017;
/** Střední poloměr Země, v km (pro vzdušnou čáru). */
const EARTH_RADIUS_KM = 6_371.0088;

const NBSP = " ";

/** Podíl cesty kolem Země (1 = celý obvod); může přesáhnout 1. */
export function earthShare(totalM: number): number {
  return Math.max(0, totalM) / 1000 / EARTH_CIRCUMFERENCE_KM;
}

/** „35 % cesty kolem Země“, pod 1 % „méně než 1 % cesty kolem Země“, od 100 % „2,3× kolem Země“. */
export function earthShareLabel(totalM: number, short = false): string {
  const f = earthShare(totalM);
  const tail = short ? "kolem Země" : "cesty kolem Země";
  if (f >= 1) return `${(Math.floor(f * 10) / 10).toFixed(1).replace(".", ",")}×${NBSP}kolem${NBSP}Země`;
  const pct = Math.round(f * 100);
  if (pct < 1) return `méně než 1${NBSP}%${NBSP}${tail}`;
  return `${pct}${NBSP}%${NBSP}${tail}`;
}

/** Celé číslo s pevnými mezerami po tisících: 14 200. */
export function groupThousands(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** „14 200 km“ od 100 km, pod 100 km s desetinou („35,6 km“), pod 1 km v metrech („420 m“). */
export function formatKmBig(totalM: number): string {
  const m = Math.max(0, totalM);
  if (m < 1000) return `${Math.round(m / 10) * 10}${NBSP}m`;
  const km = m / 1000;
  if (km < 100) return `${km.toFixed(1).replace(".", ",")}${NBSP}km`;
  return `${groupThousands(km)}${NBSP}km`;
}

/** Velké číslo a jednotka pro kartu zeměkoule: „14 200“ + „km“; pod 100 km s desetinou, pod 1 km v metrech. */
export function bigDistance(totalM: number): { value: string; unit: string } {
  const m = Math.max(0, totalM);
  if (m < 1000) return { value: String(Math.round(m / 10) * 10), unit: "m" };
  const km = m / 1000;
  return { value: km < 100 ? km.toFixed(1).replace(".", ",") : groupThousands(km), unit: "km" };
}

/** Počet kroků pro lidi: „18,9 mil.“, „123 000“, „4 130“. */
export function formatStepCount(steps: number): string {
  const n = Math.max(0, Math.round(steps));
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}${NBSP}mil.`;
  if (n >= 10_000) return groupThousands(Math.round(n / 1000) * 1000);
  if (n >= 100) return groupThousands(Math.round(n / 10) * 10);
  return String(n);
}

/** Kroky odhadnuté z délky kroku; vždy jde o odhad, ne o změřenou hodnotu. */
export function estimateSteps(distanceM: number, stepLengthM: number): number | null {
  if (!(stepLengthM > 0) || !(distanceM > 0)) return null;
  return distanceM / stepLengthM;
}

export interface OrbitArc {
  /** SVG cesta oblouku od levého okraje elipsy po spodní polovině. */
  path: string;
  end: { x: number; y: number };
}

/**
 * Oblouk ušlé části „rovníku“ kolem zeměkoule: elipsa se středem (cx, cy), od levého bodu přes spodní polovinu.
 * `fraction` je podíl obvodu 0 až 1 (úhlově; jde o ilustraci, ne o mapu). Nad 1 se vrátí celá elipsa.
 */
export function orbitArc(fraction: number, cx: number, cy: number, rx: number, ry: number): OrbitArc {
  const f = Math.max(0, Math.min(1, fraction));
  const t = f * Math.PI * 2;
  const pt = (a: number) => ({ x: cx - rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  const start = pt(0);
  if (f >= 0.9999) {
    const far = pt(Math.PI);
    return {
      path: `M${start.x} ${start.y} A${rx} ${ry} 0 0 0 ${far.x} ${far.y} A${rx} ${ry} 0 0 0 ${start.x} ${start.y}`,
      end: start,
    };
  }
  const end = pt(t);
  const large = t > Math.PI ? 1 : 0;
  const r = (v: number) => Math.round(v * 100) / 100;
  return { path: `M${r(start.x)} ${r(start.y)} A${rx} ${ry} 0 ${large} 0 ${r(end.x)} ${r(end.y)}`, end: { x: r(end.x), y: r(end.y) } };
}

/** Rozpad čísla podle důvěry v podíly 0 až 1 (součet 1, nebo samé nuly při prázdných datech). */
export function confidenceShares(by: { verified: number; estimated: number; manual: number }): {
  verified: number;
  estimated: number;
  manual: number;
} {
  const total = by.verified + by.estimated + by.manual;
  if (!(total > 0)) return { verified: 0, estimated: 0, manual: 0 };
  return { verified: by.verified / total, estimated: by.estimated / total, manual: by.manual / total };
}

// ---------- vzdálenosti měst ----------

const toRad = (d: number) => (d * Math.PI) / 180;

/** Vzdálenost po povrchu Země (vzdušnou čarou) v km. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const PRAGUE = { lat: 50.0755, lon: 14.4378 };

/** Města pro srovnání; `to` je tvar po „do“. Souřadnice středů měst, vzdálenosti se počítají. */
const CITIES: ReadonlyArray<{ name: string; to: string; lat: number; lon: number }> = [
  { name: "Brno", to: "do Brna", lat: 49.1951, lon: 16.6068 },
  { name: "Vídeň", to: "do Vídně", lat: 48.2082, lon: 16.3738 },
  { name: "Řím", to: "do Říma", lat: 41.9028, lon: 12.4964 },
  { name: "Reykjavík", to: "do Reykjavíku", lat: 64.1466, lon: -21.9426 },
  { name: "Istanbul", to: "do Istanbulu", lat: 41.0082, lon: 28.9784 },
  { name: "Dubaj", to: "do Dubaje", lat: 25.2048, lon: 55.2708 },
  { name: "Peking", to: "do Pekingu", lat: 39.9042, lon: 116.4074 },
  { name: "New York", to: "do New Yorku", lat: 40.7128, lon: -74.006 },
  { name: "Tokio", to: "do Tokia", lat: 35.6762, lon: 139.6503 },
  { name: "Buenos Aires", to: "do Buenos Aires", lat: -34.6037, lon: -58.3816 },
  { name: "Sydney", to: "do Sydney", lat: -33.8688, lon: 151.2093 },
];

export interface CityStop {
  name: string;
  to: string;
  /** Vzdušnou čarou z Prahy, v km. */
  km: number;
}

/** Města seřazená podle vzdálenosti od Prahy. */
export const CITY_STOPS: readonly CityStop[] = CITIES.map((c) => ({ name: c.name, to: c.to, km: haversineKm(PRAGUE, c) })).sort(
  (a, b) => a.km - b.km,
);

const roundExtra = (km: number) => (km >= 1000 ? Math.round(km / 100) * 100 : Math.round(km / 10) * 10);

/**
 * Věta o celkové vzdálenosti, bez vymýšlení: vzdušná čára z Prahy do nejvzdálenějšího města, kam „dosáhnete“.
 * `null`, když nejsou žádná data.
 */
export function distanceSentence(totalM: number): string | null {
  if (!(totalM > 0)) return null;
  const km = totalM / 1000;
  if (earthShare(totalM) >= 1) return `To je celá cesta kolem Země, ${earthShareLabel(totalM)}.`;
  const reached = [...CITY_STOPS].reverse().find((c) => c.km <= km);
  if (!reached) {
    const first = CITY_STOPS[0]!;
    return `Z Prahy ${first.to} je to vzdušnou čarou asi ${Math.round(first.km)}${NBSP}km. Vaše cesta teprve začíná.`;
  }
  const extra = roundExtra(km - reached.km);
  const base = `To je vzdušnou čarou z Prahy až ${reached.to}`;
  return extra >= 50 ? `${base} a ještě ${groupThousands(extra)}${NBSP}km navíc.` : `${base}.`;
}

/**
 * Věta o nejdelším dni ve srovnání s délkou rozjeté výpravy; `null`, když není co srovnávat.
 */
export function longestDaySentence(longestM: number, route?: { name: string; totalM: number }): string | null {
  if (!(longestM > 0)) return null;
  const day = formatKmBig(longestM);
  if (!route || !(route.totalM > 0)) return `Váš nejdelší den měřil ${day}.`;
  if (longestM >= route.totalM) return `Váš nejdelší den, ${day}, by stačil na celou výpravu ${route.name}.`;
  const pct = Math.round((longestM / route.totalM) * 100);
  if (pct < 1) return `Váš nejdelší den měřil ${day}.`;
  return `Váš nejdelší den, ${day}, je ${pct}${NBSP}% délky výpravy ${route.name}.`;
}

// ---------- životní cesta ----------

export interface LifeStation {
  name: string;
  /** Vzdušnou čarou z Prahy, v km (zaokrouhleno). */
  km: number;
  state: "done" | "next";
  /** Den (YYYY-MM-DD), kdy součet kroniky poprvé dosáhl vzdálenosti; jen u hotových. */
  reachedDay?: string;
  /** Kolik km ještě chybí; jen u nedosažených. */
  remainingKm?: number;
}

export interface LifeRoute {
  stations: LifeStation[];
  totalKm: number;
}

/** Den, kdy kumulativní součet denních záznamů poprvé dosáhl `km`; `null`, když ještě ne. */
export function dayReaching(days: ReadonlyArray<{ date: string; distanceM: number }>, km: number): string | null {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let cum = 0;
  for (const d of sorted) {
    if (!(d.distanceM > 0)) continue;
    cum += d.distanceM;
    if (cum / 1000 >= km) return d.date;
  }
  return null;
}

/**
 * Životní cesta „z Prahy vzdušnou čarou“: dosažená města s dnem dosažení a nejbližší dvě před vámi.
 * Poctivě spočítatelné jen z denních záznamů, takže bez nich `null`.
 */
export function lifeRoute(days: ReadonlyArray<{ date: string; distanceM: number }>, upcoming = 2): LifeRoute | null {
  const totalM = days.reduce((s, d) => s + (d.distanceM > 0 ? d.distanceM : 0), 0);
  if (!(totalM > 0)) return null;
  const totalKm = totalM / 1000;
  const stations: LifeStation[] = [];
  for (const c of CITY_STOPS) {
    if (c.km <= totalKm) {
      stations.push({ name: c.name, km: Math.round(c.km), state: "done", reachedDay: dayReaching(days, c.km) ?? undefined });
    }
  }
  const next = CITY_STOPS.filter((c) => c.km > totalKm).slice(0, upcoming);
  for (const c of next) stations.push({ name: c.name, km: Math.round(c.km), state: "next", remainingKm: Math.ceil(c.km - totalKm) });
  return { stations, totalKm };
}

/** Další město na životní cestě pro banner v Objevovat: „Za 200 km Sapporo.“ */
export function nextLifeStop(totalM: number): { name: string; remainingKm: number } | null {
  if (!(totalM > 0)) return null;
  const km = totalM / 1000;
  const c = CITY_STOPS.find((s) => s.km > km);
  return c ? { name: c.name, remainingKm: Math.ceil(c.km - km) } : null;
}
