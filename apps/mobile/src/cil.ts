/**
 * „Další cíl“ v panelu Výpravy (docs/navrh-v2.md § 4): jedna karta, nejlákavější z kandidátů v pořadí
 * 1. dokončení etapy do 3 km, 2. uzavření kapitoly do 3 km, 3. další zastávka. Čistá funkce bez Reactu.
 */
import { formatDistance } from "./format";
import { chapterStatus, isReached, missingSentence, type KChapter, type KPlace } from "./kapitoly";
import { toRoman } from "./seal";

/** Do jaké vzdálenosti vyhrává konec etapy nebo uzavření kapitoly nad další zastávkou. */
export const GOAL_NEAR_M = 3000;

export type NextGoal =
  | { kind: "stage"; stageIndex: number; remainingM: number; placeId?: string }
  | { kind: "chapter"; chapterId: string; remainingM: number; missing: number }
  | { kind: "stop"; placeId: string; remainingM: number };

export interface GoalInput<C extends KChapter> {
  walkedM: number;
  completed: boolean;
  stage: { index: number; endM: number };
  /** Zastávka, kterou etapa končí (otevře se klepnutím na kartu etapy). */
  stageEndPlaceId?: string;
  chapters: readonly C[];
  placesById: ReadonlyMap<string, KPlace>;
  nextStop: { id: string; atM: number } | null;
}

/** Kolik metrů zbývá do uzavření kapitoly (k poslednímu chybějícímu místu); `undefined` u uzavřené nebo prázdné. */
export function chapterCloseM(chapter: KChapter, placesById: ReadonlyMap<string, KPlace>, walkedM: number): number | undefined {
  const atMs = chapter.placeIds
    .map((id) => placesById.get(id))
    .filter((p): p is KPlace => p !== undefined && !isReached(p.atM, walkedM, true))
    .map((p) => p.atM);
  if (atMs.length === 0) return undefined;
  return Math.max(...atMs) - walkedM;
}

export function nextGoal<C extends KChapter>(g: GoalInput<C>): NextGoal | undefined {
  if (g.completed) return undefined;
  const toStageEnd = g.stage.endM - g.walkedM;
  if (toStageEnd > 0 && toStageEnd <= GOAL_NEAR_M) {
    return { kind: "stage", stageIndex: g.stage.index, remainingM: toStageEnd, placeId: g.stageEndPlaceId };
  }
  let best: { chapterId: string; remainingM: number; missing: number } | undefined;
  for (const c of g.chapters) {
    const left = chapterCloseM(c, g.placesById, g.walkedM);
    if (left === undefined || left > GOAL_NEAR_M) continue;
    const { missing } = chapterStatus(c, g.placesById, g.walkedM, true);
    if (!best || left < best.remainingM) best = { chapterId: c.id, remainingM: left, missing };
  }
  if (best) return { kind: "chapter", ...best };
  if (g.nextStop) return { kind: "stop", placeId: g.nextStop.id, remainingM: Math.max(0, g.nextStop.atM - g.walkedM) };
  return undefined;
}

/** Nadpis karty etapy: „1,2 km do pohlednice etapy III“. */
export function stageGoalTitle(stageIndex: number, remainingM: number): string {
  return `${formatDistance(remainingM)} do pohlednice etapy ${toRoman(stageIndex + 1)}`;
}

/** Nadpis karty kapitoly: „Ještě 1 místo do uzavření Mostů a lávek“. */
export function chapterGoalTitle(chapter: KChapter, missing: number): string {
  return missingSentence(chapter, missing);
}
