import { splitStages } from "./route";
import type { DailyRecord } from "./motion";

export type PlaceKind = "stop" | "discovery" | "milestone";

export interface PlanPlace {
  id: string;
  kind: PlaceKind;
  /** Odemkne se po ušlých metrech od startu. */
  atM: number;
}

export interface Stage {
  /** Od nuly. */
  index: number;
  startM: number;
  endM: number;
}

export interface ExpeditionPlan {
  totalM: number;
  stages: Stage[];
  /** Seřazeno podle `atM`. */
  places: PlanPlace[];
}

export interface PlanInput {
  totalM: number;
  places: readonly PlanPlace[];
  /** Konce etap; když chybí, rozdělí se rovnoměrně po `stageTargetM`. */
  stageEndsM?: readonly number[];
  stageTargetM?: number;
}

/** Sestaví plán výpravy: seřadí místa, ořízne na délku trasy, připraví etapy. */
export function buildPlan(input: PlanInput): ExpeditionPlan {
  const { totalM } = input;
  if (!(totalM > 0)) throw new Error("Trasa musí mít kladnou délku");
  const ends = input.stageEndsM
    ? input.stageEndsM.filter((e) => e > 0 && e <= totalM).sort((a, b) => a - b)
    : splitStages(totalM, input.stageTargetM);
  if (ends.at(-1) !== totalM) ends.push(totalM);
  const stages: Stage[] = ends.map((endM, index) => ({ index, startM: index === 0 ? 0 : ends[index - 1]!, endM }));
  const places = input.places
    .filter((p) => p.atM >= 0 && p.atM <= totalM)
    .sort((a, b) => a.atM - b.atM || a.id.localeCompare(b.id));
  return { totalM, stages, places };
}

export interface ExpeditionState {
  /** Započítaná vzdálenost, oříznutá na délku trasy. */
  walkedM: number;
  completed: boolean;
  /** Aktuální etapa; po dokončení poslední. */
  stage: Stage;
  /** Kolik metrů z aktuální etapy je za námi. */
  stageWalkedM: number;
  /** Počet dokončených etap. */
  stagesCompleted: number;
  reached: PlanPlace[];
  /** Další místo jakéhokoli druhu, `null` po dokončení. */
  next: PlanPlace | null;
  /** Další zastávka (kind "stop") nebo cíl, pokud žádná nezbývá. */
  nextStop: PlanPlace | null;
  toNextM: number | null;
  toNextStopM: number | null;
  /** Místa v následujících `lookaheadM` metrech (výchozí 5 km), spec 7.2. */
  upcoming: PlanPlace[];
  /** Místa odemčená od `previousWalkedM`, pro zprávu „mezitím jste došli k…“. */
  newlyReached: PlanPlace[];
  /** Etapy dokončené od `previousWalkedM`. */
  newlyCompletedStages: Stage[];
}

export interface StateOptions {
  previousWalkedM?: number;
  lookaheadM?: number;
}

export function computeState(plan: ExpeditionPlan, rawWalkedM: number, options: StateOptions = {}): ExpeditionState {
  const walkedM = Math.max(0, Math.min(rawWalkedM, plan.totalM));
  const prev = Math.max(0, Math.min(options.previousWalkedM ?? walkedM, walkedM));
  const lookahead = options.lookaheadM ?? 5_000;

  const completed = walkedM >= plan.totalM;
  const stagesCompleted = plan.stages.filter((s) => s.endM <= walkedM).length;
  const stage = plan.stages[Math.min(stagesCompleted, plan.stages.length - 1)]!;

  const reached = plan.places.filter((p) => p.atM <= walkedM);
  const ahead = plan.places.filter((p) => p.atM > walkedM);
  const next = ahead[0] ?? null;
  const nextStop = ahead.find((p) => p.kind === "stop") ?? null;

  return {
    walkedM,
    completed,
    stage,
    stageWalkedM: walkedM - stage.startM,
    stagesCompleted,
    reached,
    next,
    nextStop,
    toNextM: next ? next.atM - walkedM : null,
    toNextStopM: nextStop ? nextStop.atM - walkedM : null,
    upcoming: ahead.filter((p) => p.atM <= walkedM + lookahead),
    newlyReached: plan.places.filter((p) => p.atM > prev && p.atM <= walkedM),
    newlyCompletedStages: plan.stages.filter((s) => s.endM > prev && s.endM <= walkedM),
  };
}

export interface DensityReport {
  count: number;
  stops: number;
  discoveries: number;
  /** Průměrná mezera mezi místy včetně startu a cíle, v metrech. */
  avgGapM: number;
  maxGapM: number;
  /** Vzdálenost prvního místa od startu; `null` bez míst. */
  firstPlaceM: number | null;
  /** Průměrná mezera mezi zastávkami (kind "stop"), `null` při méně než dvou. */
  avgStopGapM: number | null;
  /** Porušení pravidel hustoty ze spec 7.2, česky. */
  issues: string[];
}

/** Zkontroluje obsah výpravy proti cílům hustoty ze spec 7.2. */
export function densityReport(plan: ExpeditionPlan): DensityReport {
  const marks = [0, ...plan.places.filter((p) => p.kind !== "milestone").map((p) => p.atM), plan.totalM];
  const gaps = marks.slice(1).map((m, i) => m - marks[i]!);
  const content = plan.places.filter((p) => p.kind !== "milestone");
  const stopsAt = content.filter((p) => p.kind === "stop").map((p) => p.atM);
  const stopGaps = stopsAt.slice(1).map((m, i) => m - stopsAt[i]!);
  const maxGapM = Math.max(...gaps);
  const avgGapM = plan.totalM / Math.max(1, content.length + 1);
  const firstPlaceM = content[0]?.atM ?? null;

  const issues: string[] = [];
  if (firstPlaceM === null || firstPlaceM > 1_000) issues.push("První místo je dál než 1 km od startu.");
  if (maxGapM > 4_000) issues.push(`Největší mezera mezi místy je ${(maxGapM / 1000).toFixed(1)} km, limit je 4 km.`);
  if (avgGapM > 2_000) issues.push(`Průměrná mezera ${(avgGapM / 1000).toFixed(1)} km překračuje cíl 2 km.`);
  for (const s of plan.stages) {
    if (!plan.places.some((p) => p.kind === "stop" && p.atM > s.startM && p.atM <= s.endM)) {
      issues.push(`Etapa ${s.index + 1} nemá žádnou zastávku.`);
    }
  }
  return {
    count: content.length,
    stops: stopsAt.length,
    discoveries: content.length - stopsAt.length,
    avgGapM,
    maxGapM,
    firstPlaceM,
    avgStopGapM: stopGaps.length ? stopGaps.reduce((a, b) => a + b, 0) / stopGaps.length : null,
    issues,
  };
}

export interface ActivePeriod {
  /** Lokální datum YYYY-MM-DD, kdy se začalo počítat. */
  from: string;
  /** Datum pozastavení nebo opuštění; bez něj období trvá. Den pozastavení se už nepočítá. */
  until?: string;
}

/**
 * Vzdálenost započítaná do výpravy podle období, kdy běžela (spec 5.3: pozastavení bez ztráty postupu,
 * po pozastavení se pohyb nepočítá). Záznamy jsou po dnech, takže den zahájení se započítá celý
 * a den pozastavení vůbec ne; je to záměrné zjednodušení.
 */
export function distanceInPeriodsM(records: readonly DailyRecord[], periods: readonly ActivePeriod[]): number {
  return records
    .filter((r) => periods.some((p) => r.date >= p.from && (p.until === undefined || r.date < p.until)))
    .reduce((sum, r) => sum + r.distanceM, 0);
}
