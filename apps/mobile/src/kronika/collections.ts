/** Sbírky v Kronice: postup po listech atlasu (etapách) a kapitolách. Čisté funkce. */

/** Podíl etapy ušlý 0 až 1. */
export function stageProgress(stage: { startM: number; endM: number }, walkedM: number): number {
  const len = stage.endM - stage.startM;
  if (!(len > 0)) return 0;
  return Math.max(0, Math.min(1, (walkedM - stage.startM) / len));
}

export type StageState = "done" | "walking" | "ahead";

/** Popis stavu listu: „Dokončeno“, „Ušlo se 67 %“, „Zatím před vámi“. */
export function stageStateLabel(progress: number): { state: StageState; label: string } {
  if (progress >= 1) return { state: "done", label: "Dokončeno" };
  if (progress <= 0) return { state: "ahead", label: "Zatím před vámi" };
  return { state: "walking", label: `Ušlo se ${Math.max(1, Math.floor(progress * 100))} %` };
}

/** Římská číslice listu (1 až 20). */
export function roman(n: number): string {
  const map: Array<[number, string]> = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  let rest = n;
  for (const [v, s] of map) while (rest >= v) {
    out += s;
    rest -= v;
  }
  return out;
}

/** Kolik míst kapitoly je odemčeno při ušlých `walkedM`. */
export function chapterProgress(placeAtM: readonly number[], walkedM: number): { done: number; total: number; complete: boolean } {
  const done = placeAtM.filter((m) => m <= walkedM).length;
  return { done, total: placeAtM.length, complete: placeAtM.length > 0 && done === placeAtM.length };
}
