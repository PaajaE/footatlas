/** Čistá logika příchodu naživo (M4): co se odemklo mezi dvěma načteními postupu. Bez Reactu. */

export interface ArrivalPlace {
  id: string;
  name: string;
  atM: number;
}

export interface ArrivalStage {
  index: number;
  endM: number;
}

export interface Arrival {
  /** Nově odemčená místa v pořadí po trase. */
  placeIds: string[];
  /** Index etap, které se právě dokončily. */
  stageIndexes: number[];
  /** Místo, o kterém hláška mluví (poslední odemčené). */
  focusId: string | undefined;
}

/**
 * Příchod mezi `prevM` a `nowM`: místa a etapy, které se přes hranici dostaly (včetně `nowM`).
 * Bez nového místa a bez dokončené etapy (nebo při couvnutí) vrací `null`.
 */
export function detectArrival(
  prevM: number,
  nowM: number,
  places: readonly ArrivalPlace[],
  stages: readonly ArrivalStage[],
): Arrival | null {
  if (!(nowM > prevM)) return null;
  const hit = places.filter((p) => p.atM > prevM && p.atM <= nowM).sort((a, b) => a.atM - b.atM);
  const done = stages.filter((s) => s.endM > prevM && s.endM <= nowM).map((s) => s.index);
  if (hit.length === 0 && done.length === 0) return null;
  return { placeIds: hit.map((p) => p.id), stageIndexes: done, focusId: hit.at(-1)?.id };
}

/**
 * Stav hlídače příchodu. `baseline` je vzdálenost, ke které se porovnává; po návratu z pozadí se čeká na první
 * nové čtení a to se jen přijme (vyřeší to Návrat, ne příchod).
 */
export interface WatchState {
  baseline: number | null;
  /** Po návratu z pozadí: `lastReadAt` v okamžiku návratu; čtení s jiným časem se přijme potichu. */
  rebaseFrom: number | null | undefined;
}

export interface WatchInput {
  walkedM: number;
  lastReadAt: number | null;
}

/** Jeden krok hlídače: vrátí nový stav a vzdálenosti, mezi kterými se má hledat příchod (nebo `null`). */
export function watchStep(state: WatchState, input: WatchInput): { next: WatchState; between: [number, number] | null } {
  if (state.rebaseFrom !== undefined) {
    if (input.lastReadAt === state.rebaseFrom) return { next: state, between: null };
    return { next: { baseline: input.walkedM, rebaseFrom: undefined }, between: null };
  }
  if (state.baseline === null) return { next: { baseline: input.walkedM, rebaseFrom: undefined }, between: null };
  if (input.walkedM === state.baseline) return { next: state, between: null };
  const between: [number, number] | null = input.walkedM > state.baseline ? [state.baseline, input.walkedM] : null;
  return { next: { baseline: input.walkedM, rebaseFrom: undefined }, between };
}
