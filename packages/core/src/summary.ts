import type { ExpeditionState } from "./engine";

export interface ChangeSummary {
  /** Kolik metrů přibylo od posledního otevření. */
  deltaM: number;
  /** Názvy zastávek odemčených od posledně, v pořadí po trase. */
  stops: string[];
  /** Počet nově odemčených malých objevů. */
  discoveries: number;
  /** Čísla (od 1) etap dokončených od posledně. */
  stagesCompleted: number[];
}

/** „Co se změnilo od minule“ (spec 10). `previousWalkedM` je to, co uživatel viděl naposledy. */
export function summarizeChange(
  state: ExpeditionState,
  previousWalkedM: number,
  nameOf: (placeId: string) => string,
): ChangeSummary {
  return {
    deltaM: Math.max(0, state.walkedM - previousWalkedM),
    stops: state.newlyReached.filter((p) => p.kind === "stop").map((p) => nameOf(p.id)),
    discoveries: state.newlyReached.filter((p) => p.kind === "discovery").length,
    stagesCompleted: state.newlyCompletedStages.map((s) => s.index + 1),
  };
}

function km(m: number): string {
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Česká věta pro kartu „Od posledně“; bez změny řekne, že se nic nestalo. */
export function changeSentence(c: ChangeSummary): string {
  if (c.deltaM < 100 && c.stops.length === 0 && c.discoveries === 0) return "Od posledně se nic nezměnilo.";
  const parts = [`Od posledně jste ušli ${km(c.deltaM)}.`];
  if (c.stagesCompleted.length === 1) parts.push(`Dokončili jste ${c.stagesCompleted[0]}. etapu.`);
  else if (c.stagesCompleted.length > 1) parts.push(`Dokončili jste etapy ${c.stagesCompleted.join(" a ")}.`);
  if (c.stops.length > 0) {
    const shown = c.stops.slice(-3);
    const more = c.stops.length - shown.length;
    parts.push(`Minuli jste: ${shown.join(", ")}${more > 0 ? ` a ${more} dalších` : ""}.`);
  }
  if (c.discoveries > 0) parts.push(c.discoveries === 1 ? "Přibyl 1 malý objev." : `Přibylo ${c.discoveries} malých objevů.`);
  return parts.join(" ");
}
