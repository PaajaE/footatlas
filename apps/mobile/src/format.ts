/** Kilometry s desetinnou čárkou, např. 35,6 km. Bez Intl, aby to fungovalo stejně na Hermesu i na webu. */
export function formatKm(meters: number, digits = 1): string {
  return `${(meters / 1000).toFixed(digits).replace(".", ",")} km`;
}

function pluralSteps(n: number): string {
  if (n === 1) return "1 krok";
  if (n >= 2 && n <= 4) return `${n} kroky`;
  return `${n} kroků`;
}

/**
 * Zbývající vzdálenost k místu pro lidi: „Jste tady“, „40 m · asi 55 kroků“, „3,4 km“, „23 km“.
 * Záporná hodnota se bere jako 0.
 */
export function formatDistance(meters: number, opts?: { stepLengthM?: number }): string {
  const m = Number.isFinite(meters) ? Math.max(0, meters) : 0;
  if (m < 15) return "Jste tady";
  if (m < 1000) {
    const rounded = Math.round(m / 10) * 10;
    if (rounded < 1000) {
      let text = `${rounded} m`;
      const step = opts?.stepLengthM;
      if (step && Number.isFinite(step) && step > 0) {
        let n = Math.round(m / step);
        if (n >= 20) n = Math.round(n / 5) * 5;
        if (n > 0) text += ` · asi ${pluralSteps(n)}`;
      }
      return text;
    }
  }
  const tenths = Math.round(m / 100);
  if (tenths >= 100) return `${Math.round(m / 1000)} km`;
  return `${Math.floor(tenths / 10)},${tenths % 10} km`;
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

const NBSP = " ";

/**
 * Číslo a jednotka nerozdělitelně („4,0 km“ s pevnou mezerou): v úzkém řádku se jednotka nesmí odtrhnout
 * na další řádek ani oříznout (dřív se na kartě zamčeného místa zobrazilo „ještě 4,0“ bez „km“).
 */
export function keepUnit(text: string): string {
  return text.replace(/(\d) (km|m|kroků|kroky|krok)\b/g, `$1${NBSP}$2`).replace(/\b(km) (\d)/g, `$1${NBSP}$2`);
}

/** Zbývající vzdálenost s jednotkou, která se neodtrhne: „4,0 km“, „350 m · asi 480 kroků“. */
export function formatDistanceNoWrap(meters: number, opts?: { stepLengthM?: number }): string {
  return keepUnit(formatDistance(meters, opts));
}

/** Poloha místa na trase: „km 4,0“ (start „km 0,0“), jednotka nerozdělitelně. */
export function formatKmMark(meters: number): string {
  const m = Number.isFinite(meters) ? Math.max(0, meters) : 0;
  return `km${NBSP}${(m / 1000).toFixed(1).replace(".", ",")}`;
}
