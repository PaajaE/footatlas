/**
 * Který symbol patří na razítko nebo pečeť (navrh-v2 § 6, rozhodnutí 0032). Čistá logika bez Reactu.
 * Kresby symbolů jsou v `components/stamps/`.
 */
import { isPlaceSymbol, type PlaceSymbol } from "@footatlas/content/src/symbols";

export type { PlaceSymbol };

export interface SymbolPlace {
  id: string;
  name: string;
  atM: number;
  kind?: string;
  symbol?: PlaceSymbol;
}

export interface SymbolLookup {
  places: readonly SymbolPlace[];
  /** Konce etap v metrech, seřazené. */
  stageEndsM: readonly number[];
}

/**
 * Symbol místa: výslovný `symbol`, jinak podle `placeId`, jinak podle přesného názvu.
 * `undefined` znamená, že razítko ukáže monogram jako zálohu.
 */
export function resolvePlaceSymbol(
  lookup: SymbolLookup,
  q: { symbol?: string; placeId?: string; name?: string },
): PlaceSymbol | undefined {
  if (q.symbol !== undefined) return isPlaceSymbol(q.symbol) ? q.symbol : undefined;
  const byId = q.placeId ? lookup.places.find((p) => p.id === q.placeId) : undefined;
  if (byId) return byId.symbol;
  if (q.name) return lookup.places.find((p) => p.name === q.name)?.symbol;
  return undefined;
}

/** Římská číslice na číslo („III“ → 3); neplatný zápis dá `undefined`. */
export function fromRoman(roman: string): number | undefined {
  const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const s = roman.trim().toUpperCase();
  if (!/^[IVXLCDM]+$/.test(s)) return undefined;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = v[s[i]!]!;
    const next = v[s[i + 1] ?? ""] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return total > 0 ? total : undefined;
}

/**
 * Symbol cíle etapy (`stageIndex` od nuly): symbol posledního místa, které leží nejpozději na konci etapy.
 * Pečeť etapy ho nese drobně pod římským číslem (§ 6.3).
 */
export function stageSymbol(lookup: SymbolLookup, stageIndex: number): PlaceSymbol | undefined {
  const end = lookup.stageEndsM[stageIndex];
  if (end === undefined) return undefined;
  const start = stageIndex === 0 ? -1 : lookup.stageEndsM[stageIndex - 1]!;
  const inStage = lookup.places.filter((p) => p.atM > start && p.atM <= end).sort((a, b) => a.atM - b.atM);
  return [...inStage].reverse().find((p) => p.symbol)?.symbol;
}

/** Symboly kapitol Vltavské stezky (§ 6.3); klíčem je id i název kapitoly. */
const CHAPTER_SYMBOLS: Record<string, PlaceSymbol> = {
  vorari: "vor",
  "Voraři": "vor",
  mosty: "most",
  "Mosty a lávky": "most",
  ostrovy: "ostrov",
  Ostrovy: "ostrov",
  pocatky: "hradiste",
  "Počátky Čech": "hradiste",
  sidla: "zamek",
  "Šlechtická sídla": "zamek",
};

/** Symbol kapitoly podle id nebo názvu; neznámá kapitola dá `undefined` (pečeť pak ukáže monogram). */
export function chapterSymbol(q: { id?: string; title?: string }): PlaceSymbol | undefined {
  return (q.id ? CHAPTER_SYMBOLS[q.id] : undefined) ?? (q.title ? CHAPTER_SYMBOLS[q.title] : undefined);
}
