/**
 * Připravované výpravy pro Objevovat a seznam přání. Obsah je koncept (`verified: false`):
 * délky a popisy se před vydáním ověřují, v UI se to nijak neoznačuje.
 */

export type UpcomingType = "real" | "simplified" | "symbolic";

export interface UpcomingExpedition {
  id: string;
  type: UpcomingType;
  name: string;
  blurb: string;
  /** Délka a rozsah tak, jak se zobrazí („asi 100 km · 5 listů“). */
  meta: string;
  /** Čára náhledu trasy ve viewBoxu 96 × 110. */
  sketch: string;
  verified: boolean;
}

/** Věta na kartě připravované výpravy: náhled trasy je jen obecná čára, výprava ještě není hotová. */
export const UPCOMING_NOTE = "Připravujeme. Až bude výprava hotová, objeví se tady.";

export const UPCOMING_TYPE_LABEL: Record<UpcomingType, string> = {
  real: "Skutečná trasa",
  simplified: "Zjednodušená",
  symbolic: "Symbolická",
};

export const UPCOMING: readonly UpcomingExpedition[] = [
  {
    id: "labe",
    type: "real",
    name: "Po Labi do Děčína",
    blurb: "Navazuje na Mělník. Pískovcové skály, Porta Bohemica a řeka, která míří až do moře.",
    meta: "asi 100 km · 5 listů",
    sketch: "M10 100 C30 80 20 60 46 52 S80 30 86 10",
    verified: false,
  },
  {
    id: "krkonose",
    type: "simplified",
    name: "Krkonošská hřebenovka",
    blurb: "Po hřebenech od Harrachova na Sněžku. Vítr zdarma, výhledy taky.",
    meta: "asi 70 km · 4 listy",
    sketch: "M6 80 L24 50 L36 64 L54 30 L66 46 L88 20",
    verified: false,
  },
  {
    id: "mesic",
    type: "symbolic",
    name: "Pěšky na Měsíc",
    blurb: "Pro všechny kroky, co kdy uděláte. Na půli cesty vás čeká malý pozdrav.",
    meta: "384 400 km · bez spěchu",
    sketch: "M10 104 C30 70 50 60 60 40 S80 14 86 10",
    verified: false,
  },
];

/** Uložená přání: jen známá id s hodnotou `true`, ostatní se zahodí. */
export function parseWishes(value: unknown, known: readonly string[] = UPCOMING.map((u) => u.id)): Record<string, true> {
  const out: Record<string, true> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [id, v] of Object.entries(value)) if (v === true && known.includes(id)) out[id] = true;
  return out;
}

export function pluralTrips(n: number): string {
  if (n === 1) return "1 výprava";
  if (n >= 2 && n <= 4) return `${n} výpravy`;
  return `${n} výprav`;
}

/** Štítek počtu vpravo od „Připravujeme“: „3 výpravy“, po přání „1 na seznamu přání“. */
export function wishCountLabel(total: number, wished: number): string {
  return wished === 0 ? pluralTrips(total) : `${wished} na seznamu přání`;
}
