/** Přívozy na trase: čistá logika scény „Přívoz“. Přívoz je místo s názvem „Přívoz …“ (jako u kresby lodi na mapě). */

export interface FerryPlace {
  id: string;
  name: string;
  atM: number;
  text?: string;
  hook?: string;
  context?: string;
}

export function isFerry(p: { name: string }): boolean {
  return /^přívoz\b/i.test(p.name);
}

export interface FerryInfo {
  /** Pořadí tohoto přívozu na trase (od 1) a jejich počet. */
  index: number;
  total: number;
  /** Další přívoz za tímto a vzdálenost k němu v metrech; `null` u posledního. */
  next: { place: FerryPlace; distanceM: number } | null;
}

/** Přívozy na trase v pořadí a údaje pro dlaždice „Přívozy · 1 ze 2“ a „Další přívoz“. `null`, když `id` přívoz není. */
export function ferryInfo<P extends FerryPlace>(places: readonly P[], id: string): FerryInfo | null {
  const ferries = places.filter(isFerry).sort((a, b) => a.atM - b.atM);
  const i = ferries.findIndex((p) => p.id === id);
  if (i < 0) return null;
  const nxt = ferries[i + 1];
  return { index: i + 1, total: ferries.length, next: nxt ? { place: nxt, distanceM: nxt.atM - ferries[i]!.atM } : null };
}

/** Texty scény jen z existujících dat: háček a kontext z příběhu, jinak věta místa z expedition.json. */
export function ferryTexts(p: FerryPlace): { quote: string | undefined; body: string | undefined } {
  if (p.hook) return { quote: p.hook, body: p.context };
  return { quote: undefined, body: p.context ?? p.text };
}
