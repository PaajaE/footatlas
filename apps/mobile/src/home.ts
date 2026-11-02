/** Čistá logika Domů: čísla do dlaždic, odhad chůze, popisky dnů. Bez Reactu, aby šla testovat. */

export interface DailyDistance {
  /** Den YYYY-MM-DD (místní čas). */
  day: string;
  distanceM: number;
}

/** Rychlost chůze pro odhad času; 5 km/h odpovídá hodnotám v prototypu (2 km = 24 minut). */
export const WALK_SPEED_KMH = 5;

/** Název etapy v řádku „Etapa 1 ze 4 · Praha“. Prototyp zná jen první etapu; ostatní se jmenují podle místa, kde končí. */
const KNOWN_STAGE_NAMES: Record<number, string> = { 0: "Praha" };

export function stageLabel(index: number, total: number, endPlaceName: string | undefined): string {
  const name = KNOWN_STAGE_NAMES[index] ?? endPlaceName;
  return name ? `Etapa ${index + 1} ze ${total} · ${name}` : `Etapa ${index + 1} ze ${total}`;
}

/** Velké číslo dlaždice: „0,3 km“ jako ve vzoru, ale pod kilometr v metrech; nikdy „0,0 km“. */
export function tileDistance(meters: number): { value: string; unit: string } {
  const m = Number.isFinite(meters) ? Math.max(0, meters) : 0;
  if (m < 1000) return { value: String(Math.round(m / 10) * 10), unit: "m" };
  const tenths = Math.round(m / 100);
  if (tenths >= 1000) return { value: String(Math.round(m / 1000)), unit: "km" };
  return { value: `${Math.floor(tenths / 10)},${tenths % 10}`, unit: "km" };
}

/** „1 nové místo“, „2 nová místa“, „7 nových míst“. */
export function pluralNewPlaces(n: number): string {
  if (n === 1) return "1 nové místo";
  if (n >= 2 && n <= 4) return `${n} nová místa`;
  return `${n} nových míst`;
}

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} minut`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

/** „asi 2 670 kroků · 24 minut“ pro danou vzdálenost. Kroky se zaokrouhlí na desítky. */
export function walkEstimate(distanceM: number, stepLengthM: number): string {
  const d = Math.max(0, distanceM);
  const steps = Math.round(d / stepLengthM / 10) * 10;
  const minutes = (d / 1000 / WALK_SPEED_KMH) * 60;
  return `asi ${groupThousands(steps)} kroků · ${formatMinutes(minutes)}`;
}

/** Součet vzdálenosti za posledních `days` dnů včetně dneška. */
export function sumLastDays(daily: readonly DailyDistance[], todayKey: string, days: number): number {
  const first = shiftDay(todayKey, -(days - 1));
  return daily.filter((d) => d.day >= first && d.day <= todayKey).reduce((sum, d) => sum + d.distanceM, 0);
}

/** Je `day` v posledních `days` dnech včetně dneška? */
export function isWithinLastDays(day: string, todayKey: string, days: number): boolean {
  return day >= shiftDay(todayKey, -(days - 1)) && day <= todayKey;
}

function parseDay(day: string): Date {
  return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Posun dne o `delta` dnů (YYYY-MM-DD, místní čas). */
export function shiftDay(day: string, delta: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEKDAYS = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];

/** „dnes“, „včera“, název dne (do týdne), jinak „24. 10. 2026“. */
export function formatWhen(day: string, todayKey: string): string {
  if (day === todayKey) return "dnes";
  if (day === shiftDay(todayKey, -1)) return "včera";
  for (let back = 2; back <= 6; back++) {
    if (day === shiftDay(todayKey, -back)) return WEEKDAYS[parseDay(day).getDay()]!;
  }
  return formatDayNumeric(day);
}

/** „2026-10-24“ → „24. 10. 2026“. */
export function formatDayNumeric(day: string): string {
  return `${Number(day.slice(8, 10))}. ${Number(day.slice(5, 7))}. ${day.slice(0, 4)}`;
}

export type ReachChoice = number | "stage";

/** Kurzívní hláška pod výpisem „Kam dnes dojdu?“. Texty z prototypu; bez shody žádná hláška. */
export function reachQuip(choice: ReachChoice, placeNames: readonly string[]): string | undefined {
  if (choice === "stage") return "Na konci etapy na vás čeká pohlednice.";
  if (choice === 1000) return "Krátká procházka, dlouhá historie.";
  if (choice === 2000) return "Akorát na odpoledne s výhledem.";
  if (choice === 4000 && placeNames.some((n) => n.toLowerCase().startsWith("přívoz"))) return "Drobné na převozníka mít nemusíte.";
  return undefined;
}

/** „4 z 5“, „3 ze 6“: předložka „ze“ před číslovkami, které začínají souhláskovou skupinou (dvou, tří, čtyř, šesti, sedmi …). */
export function zOf(done: number, total: number): string {
  const ze = [2, 3, 4, 6, 7, 12, 13, 14, 16, 17].includes(total);
  return `${done} ${ze ? "ze" : "z"} ${total}`;
}
