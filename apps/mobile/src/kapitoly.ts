/**
 * Kapitoly výpravy: stav (kolik míst, uzavřená), nejbližší kapitola v panelu Výpravy, seznam míst kapitoly
 * a krátké texty. Čisté funkce bez Reactu. Kapitoly zatím patří jen k aktuální výpravě (rozhodnutí 0026).
 */
import { pluralPlaces } from "./format";

/** Věta pod nadpisem kapitol v panelu Výpravy a v Atlasu. */
export const CHAPTERS_EXPLAINER = "Kapitoly spojují místa jedním příběhem. Posbírejte všechna a kapitola se uzavře pečetí.";

export interface KChapter {
  id: string;
  title: string;
  titleGenitive?: string;
  /** Téma atlasu (rozhodnutí 0031). */
  themeId?: string;
  /** Id míst v pořadí trasy. */
  placeIds: readonly string[];
}

export interface KPlace {
  id: string;
  name: string;
  atM: number;
}

export interface KEvent {
  kind: string;
  ref: string;
  reachedDay: string;
}

export interface ChapterStatus {
  done: number;
  total: number;
  /** Kolik míst ještě chybí do uzavření. */
  missing: number;
  /** Všechna místa jsou objevená (kapitola bez míst se neuzavře nikdy). */
  closed: boolean;
}

/** Místo je objevené, když výprava běží a ušlo se aspoň k němu. */
export function isReached(atM: number, walkedM: number, active: boolean): boolean {
  return active && atM <= walkedM;
}

function members(chapter: KChapter, placesById: ReadonlyMap<string, KPlace>): KPlace[] {
  return chapter.placeIds
    .map((id) => placesById.get(id))
    .filter((p): p is KPlace => p !== undefined)
    .sort((a, b) => a.atM - b.atM);
}

/** Stav kapitoly: kolik míst je objevených a zda je uzavřená. */
export function chapterStatus(
  chapter: KChapter,
  placesById: ReadonlyMap<string, KPlace>,
  walkedM: number,
  active: boolean,
): ChapterStatus {
  const list = members(chapter, placesById);
  const done = list.filter((p) => isReached(p.atM, walkedM, active)).length;
  return { done, total: list.length, missing: list.length - done, closed: list.length > 0 && done === list.length };
}

/**
 * Nejbližší kapitola: z neuzavřených ta, které chybí nejméně míst. Při shodě ta, jejíž další místo je
 * na trase nejblíž. Vrací `undefined`, když jsou všechny uzavřené nebo prázdné.
 */
export function nearestChapter<C extends KChapter>(
  chapters: readonly C[],
  placesById: ReadonlyMap<string, KPlace>,
  walkedM: number,
  active: boolean,
): { chapter: C; status: ChapterStatus } | undefined {
  let best: { chapter: C; status: ChapterStatus; nextAtM: number } | undefined;
  for (const chapter of chapters) {
    const status = chapterStatus(chapter, placesById, walkedM, active);
    if (status.closed || status.total === 0) continue;
    const nextAtM = members(chapter, placesById).find((p) => !isReached(p.atM, walkedM, active))?.atM ?? Infinity;
    if (!best || status.missing < best.status.missing || (status.missing === best.status.missing && nextAtM < best.nextAtM)) {
      best = { chapter, status, nextAtM };
    }
  }
  return best && { chapter: best.chapter, status: best.status };
}

export type ChapterPlaceEntry<P extends KPlace> =
  | { place: P; reached: true; reachedDay?: string }
  | { place: P; reached: false; remainingM: number };

/** Místa kapitoly v pořadí trasy: objevená s dnem objevu, zamčená se vzdáleností od ušlého místa. */
export function chapterPlaces<P extends KPlace>(
  chapter: KChapter,
  placesById: ReadonlyMap<string, P>,
  events: readonly KEvent[],
  walkedM: number,
  active: boolean,
): Array<ChapterPlaceEntry<P>> {
  const days = new Map(events.filter((e) => e.kind === "place").map((e) => [e.ref, e.reachedDay]));
  return (members(chapter, placesById) as P[]).map((place) =>
    isReached(place.atM, walkedM, active)
      ? { place, reached: true as const, reachedDay: days.get(place.id) }
      : { place, reached: false as const, remainingM: Math.max(0, place.atM - (active ? walkedM : 0)) },
  );
}

/** „Ještě 1 místo do uzavření Mostů a lávek“. */
export function missingSentence(chapter: KChapter, missing: number): string {
  return `Ještě ${pluralPlaces(missing)} do uzavření ${chapter.titleGenitive ?? chapter.title}`;
}

/** Štítek v detailu místa: „Kapitola Voraři · 5/7“. */
export function chapterTagLabel(chapter: KChapter, status: ChapterStatus): string {
  return `Kapitola ${chapter.title} · ${status.done}/${status.total}`;
}

/** Monogram pečeti: počáteční písmena slov názvu bez spojek („Mosty a lávky“ → „ML“), nejvýš dvě. */
export function chapterMonogram(title: string): string {
  return title
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("cs"))
    .join("");
}
