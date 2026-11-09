/** Čistá logika pohlednice z etapy: souhrn etapy z dat výpravy, texty a karta další etapy. Bez Reactu. */
import { sinceDay } from "./navrat";
import { toRoman } from "./seal";

export interface PcStage {
  index: number;
  startM: number;
  endM: number;
}

export interface PcPlace {
  id: string;
  kind: "stop" | "discovery";
  name: string;
  atM: number;
  hook?: string;
  photo?: string;
  riddle?: { question: string };
}

export interface StageSummary {
  /** Kolik metrů etapy je ušlých (u dokončené celá délka). */
  walkedM: number;
  completed: boolean;
  /** První a poslední den chůze v etapě; `undefined`, když o dnech nejsou data. */
  firstDay?: string;
  lastDay?: string;
  /** Počet dnů od prvního do posledního včetně. */
  days?: number;
  stops: number;
  discoveries: number;
  places: PcPlace[];
}

export function pluralDays(n: number): string {
  if (n === 1) return "1 den";
  if (n >= 2 && n <= 4) return `${n} dny`;
  return `${n} dní`;
}

export function pluralStops(n: number): string {
  if (n === 1) return "1 zastávka";
  if (n >= 2 && n <= 4) return `${n} zastávky`;
  return `${n} zastávek`;
}

export function pluralDiscoveries(n: number): string {
  if (n === 1) return "1 objev";
  if (n >= 2 && n <= 4) return `${n} objevy`;
  return `${n} objevů`;
}

function diffDays(a: string, b: string): number {
  const t = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((t(b) - t(a)) / 86_400_000);
}

/** „24. 10.–5. 11.“, u jednoho dne „24. 10.“. */
export function formatDayRange(first: string, last: string): string {
  const f = (d: string) => `${Number(d.slice(8, 10))}. ${Number(d.slice(5, 7))}.`;
  return first === last ? f(first) : `${f(first)}–${f(last)}`;
}

/** Souhrn etapy: kilometry, dny (z denních úseků výpravy), počty míst. Dny jen podle kumulace úseků od startu výpravy. */
export function stageSummary(
  stage: PcStage,
  places: readonly PcPlace[],
  slices: ReadonlyArray<{ day: string; distanceM: number }>,
  walkedM: number,
): StageSummary {
  const inStage = places.filter((p) => p.atM > stage.startM && p.atM <= stage.endM).sort((a, b) => a.atM - b.atM);
  const reached = inStage.filter((p) => p.atM <= walkedM);
  const completed = walkedM >= stage.endM;
  const firstDay = walkedM > stage.startM ? sinceDay(slices, stage.startM) : undefined;
  let lastDay: string | undefined;
  if (firstDay) {
    let sum = 0;
    const limit = Math.min(walkedM, stage.endM);
    for (const s of slices) {
      sum += s.distanceM;
      lastDay = s.day;
      if (sum >= limit) break;
    }
  }
  return {
    walkedM: Math.max(0, Math.min(walkedM, stage.endM) - stage.startM),
    completed,
    firstDay,
    lastDay,
    days: firstDay && lastDay ? Math.max(1, diffDays(firstDay, lastDay) + 1) : undefined,
    stops: reached.filter((p) => p.kind === "stop").length,
    discoveries: reached.filter((p) => p.kind === "discovery").length,
    places: reached,
  };
}

/** Začátek a konec etapy podle zastávek: poslední zastávka v nebo před začátkem a poslední v etapě. */
export function stageEndpoints(stage: PcStage, places: readonly PcPlace[]): { start?: PcPlace; end?: PcPlace } {
  const stops = places.filter((p) => p.kind === "stop").sort((a, b) => a.atM - b.atM);
  return {
    start: [...stops].reverse().find((p) => p.atM <= stage.startM) ?? stops[0],
    end: [...stops].reverse().find((p) => p.atM <= stage.endM),
  };
}

/** Rukopisný nadpis líce. U první etapy „Pozdrav z Prahy“ (název z prototypu), jinak „Pozdrav z etapy II“. */
export function postcardTitle(stageIndex: number): string {
  return stageIndex === 0 ? "Pozdrav z Prahy" : `Pozdrav z etapy ${toRoman(stageIndex + 1)}`;
}

/** Fotka líce: foto prvního místa etapy, které ho má (u první etapy Karlův most, ladí s nadpisem „Pozdrav z Prahy“). */
export function pickPhotoKey(places: readonly PcPlace[]): string | undefined {
  return places.find((p) => p.photo)?.photo;
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} a ${names[names.length - 1]}`;
}

/** Krátký text rubu složený z reálných objevů etapy: výčet zastávek a háček posledního místa, které ho má. */
export function backText(places: readonly PcPlace[]): string[] {
  const out: string[] = [];
  const stops = places.filter((p) => p.kind === "stop").map((p) => p.name);
  if (stops.length > 0) out.push(`Cestou jste odemkli: ${joinNames(stops)}.`);
  const discoveries = places.filter((p) => p.kind === "discovery").length;
  if (discoveries > 0) out.push(discoveries === 1 ? "Přibyl 1 objev." : discoveries <= 4 ? `Přibyly ${discoveries} objevy.` : `Přibylo ${discoveries} objevů.`);
  const hooked = places.filter((p) => p.hook).at(-1);
  if (hooked) out.push(`„${hooked.hook}“`);
  return out;
}

export interface NextStageCard {
  heading: string;
  meta: string;
  teaser: string | undefined;
  firstRiddle: string | undefined;
}

/** Karta další etapy jen z dat: zastávky etapy (nejvýš tři), délka, počet míst a první hádanka, když ji místo má. */
export function nextStageCard(
  next: PcStage,
  places: readonly PcPlace[],
  fmt: { km: (m: number) => string; places: (n: number) => string },
): NextStageCard {
  const inStage = places.filter((p) => p.atM > next.startM && p.atM <= next.endM).sort((a, b) => a.atM - b.atM);
  const end = [...inStage].reverse().find((p) => p.kind === "stop");
  const names = inStage.filter((p) => p.kind === "stop").slice(0, 3).map((p) => p.name);
  return {
    heading: `Etapa ${toRoman(next.index + 1)}${end ? ` · ${end.name}` : ""}`,
    meta: `${fmt.km(next.endM - next.startM)} · ${fmt.places(inStage.length)}`,
    teaser: names.length > 0 ? `${joinNames(names)}.` : undefined,
    firstRiddle: inStage.find((p) => p.riddle)?.riddle?.question,
  };
}

/**
 * Text, který se pošle tlačítkem „Poslat“ (obrázek zatím poslat nejde, rozhodnutí 0022): nadpis pohlednice,
 * etapa nebo kapitola, věty z rubu a podpis výpravy. Prázdné části se vynechají.
 */
export function postcardShareText(p: { title: string; subtitle?: string; lines: readonly string[]; expedition: string }): string {
  const head = p.subtitle && p.subtitle !== p.title ? `${p.title} (${p.subtitle})` : p.title;
  return [`Pohlednice: ${head}`, ...p.lines, `${p.expedition} · FootAtlas`].filter((s) => s.trim().length > 0).join("\n");
}
