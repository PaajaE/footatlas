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
