/** Kilometry s desetinnou čárkou, např. 35,6 km. Bez Intl, aby to fungovalo stejně na Hermesu i na webu. */
export function formatKm(meters: number, digits = 1): string {
  return `${(meters / 1000).toFixed(digits).replace(".", ",")} km`;
}

const MONTHS = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];
const DAYS = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

/** „Čtvrtek 30. října“ */
export function formatDayLong(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

export function pluralPlaces(n: number): string {
  if (n === 1) return "1 místo";
  if (n >= 2 && n <= 4) return `${n} místa`;
  return `${n} míst`;
}

/** Den YYYY-MM-DD jako „30. října 2026“. */
export function formatDay(day: string): string {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7)) - 1;
  const d = Number(day.slice(8, 10));
  return `${d}. ${MONTHS[m]} ${y}`;
}
