import type { Stage } from "@footatlas/core";
import type { AppPlace } from "../data/vltavska";

const ROMAN: Array<[number, string]> = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];

/** Římská číslice pro „List I“, „List II“ …; pro 1 až 39. */
export function roman(n: number): string {
  let out = "";
  let rest = Math.max(0, Math.floor(n));
  for (const [v, s] of ROMAN) while (rest >= v) {
    out += s;
    rest -= v;
  }
  return out;
}

/** Místa etapy: od začátku (první etapa i s místem v nule) po konec včetně. */
export function placesOfStage(places: readonly AppPlace[], stage: Pick<Stage, "index" | "startM" | "endM">): AppPlace[] {
  return places.filter((p) => (p.atM > stage.startM || (stage.index === 0 && p.atM >= 0)) && p.atM <= stage.endM);
}

/** „10 razítek z 14“: kolik míst etapy je dosaženo a kolik jich v ní je. */
export function stageStamps(places: readonly AppPlace[], stage: Pick<Stage, "index" | "startM" | "endM">, walkedM: number): { reached: number; total: number } {
  const inStage = placesOfStage(places, stage);
  return { reached: inStage.filter((p) => p.atM <= walkedM).length, total: inStage.length };
}

export function stampsWord(n: number): string {
  if (n === 1) return "razítko";
  if (n >= 2 && n <= 4) return "razítka";
  return "razítek";
}

export function placesWord(n: number): string {
  if (n === 1) return "místo";
  if (n >= 2 && n <= 4) return "místa";
  return "míst";
}

/** Další přívoz před námi (podle názvu místa „Přívoz …“), nebo null. Přívozy jsou v datech jako malé objevy. */
export function nextFerry(places: readonly AppPlace[], walkedM: number): AppPlace | null {
  return places.find((p) => p.atM > walkedM && /^přívoz\b/i.test(p.name)) ?? null;
}
