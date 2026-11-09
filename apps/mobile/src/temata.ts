/**
 * Témata atlasu (návrh v2 § 7, rozhodnutí 0031): téma prochází všemi výpravami a roste s každou
 * novou. Kapitoly různých výprav se stejným `themeId` se v tématu sčítají. Čisté funkce bez Reactu.
 *
 * Id míst musí být jedinečná v celém atlasu (ne jen ve výpravě), protože `reachedPlaceIds`
 * je jedna sada pro všechny výpravy.
 */
import { isReached } from "./kapitoly";

export interface TUnit {
  one: string;
  few: string;
  many: string;
}

export interface TTheme {
  id: string;
  title: string;
  titleGenitive: string;
  symbol: string;
  intro: string;
  /** Milníky v počtu odemčených míst, vzestupně. */
  milestones: readonly number[];
  /** Jak se místům tématu říká ve větách („most“); chybí-li, „místo“. */
  unit?: TUnit;
}

export interface TChapter {
  id: string;
  title: string;
  titleGenitive?: string;
  themeId?: string;
  placeIds: readonly string[];
}

export interface TExpedition {
  id: string;
  name: string;
  chapters: readonly TChapter[];
}

/** Kapitola s výpravou, ke které patří. */
export interface TExpeditionChapter extends TChapter {
  expeditionId: string;
  expeditionName: string;
}

export interface ThemeChapterStatus {
  chapter: TExpeditionChapter;
  done: number;
  total: number;
  closed: boolean;
}

export interface ThemeExpeditionGroup {
  expeditionId: string;
  expeditionName: string;
  chapters: TExpeditionChapter[];
}

export interface ThemeProgress {
  /** Odemčená místa tématu napříč výpravami. */
  unlocked: number;
  /** Všechna místa tématu ve známých výpravách. */
  total: number;
  /** Stav každé kapitoly tématu v pořadí výprav. */
  chapters: ThemeChapterStatus[];
  /** Uzavřené kapitoly seskupené po výpravách (pečeti na obrazovce tématu). */
  closedByExpedition: ThemeExpeditionGroup[];
  /** Splněné milníky. */
  reachedMilestones: number[];
  /** Nejbližší nesplněný milník; chybí, když jsou splněné všechny. */
  nextMilestone?: number;
  /** Kolik míst do nejbližšího milníku chybí. */
  toNextMilestone?: number;
  /** Lze nejbližší milník splnit v dosud známých výpravách? (Jinak čeká na další výpravu.) */
  nextMilestoneReachable: boolean;
}

const PLACE: TUnit = { one: "místo", few: "místa", many: "míst" };

/** Český plurál: 1 → one, 2–4 → few, jinak many („1 most“, „3 mosty“, „10 mostů“). */
export function pluralCs(n: number, unit: TUnit): string {
  const form = n === 1 ? unit.one : n >= 2 && n <= 4 ? unit.few : unit.many;
  return `${n} ${form}`;
}

/** Počet míst tématu jeho slovem („3 mosty“); téma bez `unit` počítá místa. */
export function countInTheme(theme: TTheme, n: number): string {
  return pluralCs(n, theme.unit ?? PLACE);
}

/** Kapitoly výpravy doplněné o výpravu, aby se daly spojit s kapitolami jiných výprav. */
export function chaptersOf(expedition: TExpedition): TExpeditionChapter[] {
  return expedition.chapters.map((c) => ({ ...c, expeditionId: expedition.id, expeditionName: expedition.name }));
}

/** Id odemčených míst výpravy (stejné pravidlo jako u kapitol: výprava běží a ušlo se k místu). */
export function reachedPlaceIdsOf(
  places: ReadonlyArray<{ id: string; atM: number }>,
  walkedM: number,
  active: boolean,
): Set<string> {
  return new Set(places.filter((p) => isReached(p.atM, walkedM, active)).map((p) => p.id));
}

/**
 * Postup v tématu napříč výpravami: počet odemčených míst, uzavřené kapitoly po výpravách
 * a nejbližší milník. Kapitoly jiných témat se ignorují; místo ve dvou kapitolách se počítá jednou.
 */
export function themeProgress(
  theme: TTheme,
  chaptersAcrossExpeditions: readonly TExpeditionChapter[],
  reachedPlaceIds: ReadonlySet<string>,
): ThemeProgress {
  const chapters = chaptersAcrossExpeditions.filter((c) => c.themeId === theme.id);
  const all = new Set<string>();
  const statuses: ThemeChapterStatus[] = chapters.map((chapter) => {
    const ids = [...new Set(chapter.placeIds)];
    ids.forEach((id) => all.add(id));
    const done = ids.filter((id) => reachedPlaceIds.has(id)).length;
    return { chapter, done, total: ids.length, closed: ids.length > 0 && done === ids.length };
  });
  const unlocked = [...all].filter((id) => reachedPlaceIds.has(id)).length;

  const closedByExpedition: ThemeExpeditionGroup[] = [];
  for (const s of statuses) {
    if (!s.closed) continue;
    let group = closedByExpedition.find((g) => g.expeditionId === s.chapter.expeditionId);
    if (!group) {
      group = { expeditionId: s.chapter.expeditionId, expeditionName: s.chapter.expeditionName, chapters: [] };
      closedByExpedition.push(group);
    }
    group.chapters.push(s.chapter);
  }

  const reachedMilestones = theme.milestones.filter((m) => m <= unlocked);
  const nextMilestone = theme.milestones.find((m) => m > unlocked);
  return {
    unlocked,
    total: all.size,
    chapters: statuses,
    closedByExpedition,
    reachedMilestones,
    nextMilestone,
    toNextMilestone: nextMilestone === undefined ? undefined : nextMilestone - unlocked,
    nextMilestoneReachable: nextMilestone !== undefined && nextMilestone <= all.size,
  };
}

/** „Ještě 2 místa do milníku 10 mostů“; po posledním milníku `undefined`. */
export function milestoneSentence(theme: TTheme, unlocked: number): string | undefined {
  const next = theme.milestones.find((m) => m > unlocked);
  if (next === undefined) return undefined;
  const target = theme.unit ? countInTheme(theme, next) : `${pluralCs(next, PLACE)} ${theme.titleGenitive}`;
  return `Ještě ${pluralCs(next - unlocked, PLACE)} do milníku ${target}`;
}

export interface ThemeContribution {
  theme: TTheme;
  /** Kolik míst výprava tématu přidá. */
  count: number;
  /** „Tato výprava přidá 3 mosty do tématu Mosty“. */
  sentence: string;
}

/**
 * Co výprava přidá do témat atlasu (podklad pro výběr výpravy). V pořadí `themes`,
 * jen témata, kterým výprava přidá aspoň jedno místo.
 */
export function expeditionThemeContribution(expedition: TExpedition, themes: readonly TTheme[]): ThemeContribution[] {
  const out: ThemeContribution[] = [];
  for (const theme of themes) {
    const ids = new Set(expedition.chapters.filter((c) => c.themeId === theme.id).flatMap((c) => c.placeIds));
    if (ids.size === 0) continue;
    out.push({
      theme,
      count: ids.size,
      sentence: `Tato výprava přidá ${countInTheme(theme, ids.size)} do tématu ${theme.title}`,
    });
  }
  return out;
}
