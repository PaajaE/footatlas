import type { ExpeditionPlan } from "./engine";
import type { SliceDistance } from "./periods";

export type JourneyEventKind = "place" | "stage" | "finish";

/** Co se na výpravě stalo a kdy: dosažené místo, dokončená etapa, cíl. */
export interface JourneyEvent {
  kind: JourneyEventKind;
  /** Id místa, číslo etapy od nuly, u cíle "finish". */
  ref: string;
  /** Kilometr trasy v metrech, který se dosáhl. */
  atM: number;
  /** Lokální den, kdy kumulativní vzdálenost výpravy poprvé dosáhla `atM`. */
  reachedDay: string;
}

const EPS = 1e-6;

/**
 * Z plánu a vzdáleností po úsecích určí, který den se dosáhlo každého místa, konce každé etapy a cíle.
 * Den je den úseku, ve kterém součet poprvé dosáhl hranice, ne den, kdy aplikace změnu zjistila (otevření).
 * Nedosažené věci se nevracejí. Výprava bez pohybu nemá žádné události, ani místo na kilometru 0.
 */
export function journeyEvents(plan: ExpeditionPlan, perSlice: readonly SliceDistance[]): JourneyEvent[] {
  const cumulative: Array<{ day: string; cumM: number }> = [];
  let cum = 0;
  for (const s of perSlice) {
    cum += s.distanceM;
    cumulative.push({ day: s.day, cumM: cum });
  }
  const dayReaching = (atM: number): string | null => {
    for (const c of cumulative) {
      if (c.cumM > 0 && c.cumM + EPS >= atM) return c.day;
    }
    return null;
  };
  const out: JourneyEvent[] = [];
  const add = (kind: JourneyEventKind, ref: string, atM: number) => {
    const reachedDay = dayReaching(atM);
    if (reachedDay !== null) out.push({ kind, ref, atM, reachedDay });
  };
  for (const p of plan.places) if (p.kind !== "milestone") add("place", p.id, p.atM);
  for (const st of plan.stages) add("stage", String(st.index), st.endM);
  add("finish", "finish", plan.totalM);
  return out;
}
