/** Čistá logika hádanek u míst a dosahu „Kam dnes dojdu?“; bez Reactu, aby šla testovat. */

export type Tip = 0 | 1 | 2;
export type TipOutcome = "none" | "correct" | "wrong";

/** Vyhodnocení tipu po odemčení: bez tipu nic, jinak shoda se správnou odpovědí. */
export function tipOutcome(answer: number, tip: number | undefined): TipOutcome {
  if (tip === undefined) return "none";
  return tip === answer ? "correct" : "wrong";
}

/** Uložené tipy z úložiště: jen platné dvojice id míst a možnosti 0 až 2, ostatní se zahodí. */
export function parseTips(value: unknown): Record<string, Tip> {
  const out: Record<string, Tip> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [id, tip] of Object.entries(value)) {
    if (tip === 0 || tip === 1 || tip === 2) out[id] = tip;
  }
  return out;
}

/** Místa, která se odemknou, když z `fromM` dojdete do `toM` (včetně hranice `toM`), v pořadí po trase. */
export function placesWithin<P extends { atM: number }>(places: readonly P[], fromM: number, toM: number): P[] {
  return places.filter((p) => p.atM > fromM && p.atM <= toM).sort((a, b) => a.atM - b.atM);
}

/** Výčet po česku: „A“, „A a B“, „A, B a C“. */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} a ${names[names.length - 1]}`;
}
