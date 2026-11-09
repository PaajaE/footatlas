/**
 * Deník výpravy po dnech: seskupení úseků a událostí, minimapa úseku a postřehy podle jednoduchých pravidel.
 * Postřehy vznikají jen ze skutečných dat dne (vzdálenost, odemčená místa), nic se nedomýšlí.
 */
import type { JourneyEvent, SliceDistance } from "@footatlas/core";
import { formatDayLong, formatDistance, pluralPlaces } from "../format";
import { joinNames } from "../riddle";
import { estimateSteps } from "./earth";

export interface DiaryDay {
  /** Lokální den YYYY-MM-DD. */
  day: string;
  distanceM: number;
  /** Kilometr výpravy na začátku a na konci dne (v metrech). */
  fromM: number;
  toM: number;
  /** Odhad kroků z délky kroku; `null`, když délka kroku není známa. */
  steps: number | null;
  /** Místa odemčená v ten den v pořadí po trase. */
  places: Array<{ id: string; name: string; atM: number }>;
  /** Etapy dokončené v ten den (od 1). */
  stagesDone: number[];
  finished: boolean;
}

/**
 * Z úseků výpravy a událostí sestaví dny, nejnovější první. Dny bez vzdálenosti se vynechají.
 * Úseky stejného dne (pauza a obnovení) se sečtou.
 */
export function buildDiary(
  slices: readonly SliceDistance[],
  events: readonly JourneyEvent[],
  nameOf: (placeId: string) => string,
  stepLengthM: number,
): DiaryDay[] {
  const perDay = new Map<string, number>();
  for (const s of slices) if (s.distanceM > 0) perDay.set(s.day, (perDay.get(s.day) ?? 0) + s.distanceM);
  const out: DiaryDay[] = [];
  let cum = 0;
  for (const day of [...perDay.keys()].sort()) {
    const distanceM = perDay.get(day)!;
    const ofDay = events.filter((e) => e.reachedDay === day);
    out.push({
      day,
      distanceM,
      fromM: cum,
      toM: cum + distanceM,
      steps: estimateSteps(distanceM, stepLengthM),
      places: ofDay
        .filter((e) => e.kind === "place")
        .sort((a, b) => a.atM - b.atM)
        .map((e) => ({ id: e.ref, name: nameOf(e.ref), atM: e.atM })),
      stagesDone: ofDay.filter((e) => e.kind === "stage").map((e) => Number(e.ref) + 1),
      finished: ofDay.some((e) => e.kind === "finish"),
    });
    cum += distanceM;
  }
  return out.reverse();
}

/** Minimapa úseku: poloha dne a kolíčků na pruhu 0 až `scaleM`, v podílech 0 až 1. */
export function miniMap(d: Pick<DiaryDay, "fromM" | "toM" | "places">, scaleM: number): { from: number; len: number; marks: number[] } {
  const scale = scaleM > 0 ? scaleM : Math.max(d.toM, 1);
  const clamp = (v: number) => Math.max(0, Math.min(1, v / scale));
  const from = clamp(d.fromM);
  return { from, len: Math.max(0.012, clamp(d.toM) - from), marks: d.places.map((p) => clamp(p.atM)) };
}

/** „km 9,1 → 12,2“ */
export function rangeLabel(d: Pick<DiaryDay, "fromM" | "toM">): string {
  const k = (m: number) => (m / 1000).toFixed(1).replace(".", ",");
  return `km ${k(d.fromM)} → ${k(d.toM)}`;
}

/** Název dne karty: „Dnes“, jinak „Neděle 1. listopadu“ (s rokem, když není letošní). */
export function dayTitle(day: string, today: string): string {
  if (day === today) return "Dnes";
  const date = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
  const base = formatDayLong(date);
  return day.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${day.slice(0, 4)}`;
}

/** Délka pro větu: „300 m“, „3,1 km“. */
function lengthText(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

export interface InsightContext {
  isToday: boolean;
  /** Je to nejdelší den výpravy a dnů je aspoň 3? */
  isLongest: boolean;
  /** Další místo (jen u dnešní karty) pro větu o tom, co čeká. */
  nextStop?: { name: string; remainingM: number } | null;
}

/**
 * Kurzívní postřeh ke dni. Pravidla podle priority, šablony česky; vždy jen ze skutečných dat dne.
 */
export function diaryInsight(d: DiaryDay, ctx: InsightContext): string {
  if (d.finished) return "Cíl výpravy je za vámi. Tohle se hned tak nezapomíná.";
  if (d.stagesDone.length > 0) {
    const n = d.stagesDone[d.stagesDone.length - 1]!;
    return `Konec ${n}. etapy. Tuhle zastávku si pamatují i nohy.`;
  }
  const names = d.places.map((p) => p.name);
  if (names.length >= 3) return `${pluralPlaces(names.length)} za jediný den. Deník se plní.`;
  if (names.length === 2) return `Dvě místa za jeden den: ${joinNames(names)}.`;
  if (names.length === 1) return ctx.isToday ? `Dnes jste odemkli: ${names[0]}.` : `Místo dne: ${names[0]}.`;
  if (ctx.isToday && ctx.nextStop && ctx.nextStop.remainingM >= 15) {
    return `Zatím bez nového místa. ${ctx.nextStop.name} čeká ${formatDistance(ctx.nextStop.remainingM)} od vás.`;
  }
  if (ctx.isLongest) return "Nejdelší den výpravy zatím. Nohy to zaznamenaly.";
  if (d.distanceM >= 10_000) return "Pořádný den. Deset kilometrů a víc.";
  return d.distanceM < 500
    ? `Krátká procházka bez nového místa. I tak se cesta prodloužila o ${lengthText(d.distanceM)}.`
    : `Den bez nového místa, ale cesta se prodloužila o ${lengthText(d.distanceM)}.`;
}

/** Karty deníku s postřehem; příznak nejdelšího dne se dopočítá zde. */
export function diaryCards(
  days: readonly DiaryDay[],
  today: string,
  nextStop: { name: string; remainingM: number } | null,
): Array<DiaryDay & { title: string; insight: string }> {
  const longest = days.reduce((m, d) => Math.max(m, d.distanceM), 0);
  return days.map((d) => ({
    ...d,
    title: dayTitle(d.day, today),
    insight: diaryInsight(d, {
      isToday: d.day === today,
      isLongest: days.length >= 3 && d.distanceM === longest,
      nextStop: d.day === today ? nextStop : null,
    }),
  }));
}
