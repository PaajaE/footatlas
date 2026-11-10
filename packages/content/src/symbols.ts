/**
 * Kreslené symboly na razítkách míst podle typu místa (docs/navrh-v2.md § 6.1, rozhodnutí 0032).
 * Pořadí odpovídá tabulce v návrhu. Bez zodu, aby šel soubor importovat i v aplikaci.
 */
export const PLACE_SYMBOLS = [
  "hradiste",
  "zamek",
  "most",
  "lavka",
  "ostrov",
  "zdymadlo",
  "pristav",
  "privoz",
  "vor",
  "skala",
  "obec",
  "nota",
  "mlyn",
  "vyhled",
  "rakos",
  "soutok",
] as const;
export type PlaceSymbol = (typeof PLACE_SYMBOLS)[number];

/** Je hodnota povolený symbol razítka? */
export function isPlaceSymbol(value: unknown): value is PlaceSymbol {
  return typeof value === "string" && (PLACE_SYMBOLS as readonly string[]).includes(value);
}
