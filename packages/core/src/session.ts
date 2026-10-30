import { distanceInPeriodsM, type ActivePeriod } from "./engine";
import type { DailyRecord } from "./motion";

/**
 * Stav rozjeté výpravy uložený na zařízení. Jen to, co nelze dopočítat z kroniky:
 * kdy výprava běžela a kam až se uživatel naposledy podíval (pro „od posledně“).
 */
export interface ExpeditionSession {
  expeditionId: string;
  /** Období, kdy výprava běžela; poslední může být otevřené (bez `until`). */
  periods: ActivePeriod[];
  /** Vzdálenost, kterou uživatel viděl při posledním otevření, v metrech. */
  lastSeenWalkedM: number;
}

export function startSession(expeditionId: string, today: string): ExpeditionSession {
  return { expeditionId, periods: [{ from: today }], lastSeenWalkedM: 0 };
}

export function isPaused(s: ExpeditionSession): boolean {
  const last = s.periods.at(-1);
  return !last || last.until !== undefined;
}

/** Pozastaví výpravu; den pozastavení se už nepočítá (viz `distanceInPeriodsM`). Postup se neztrácí. */
export function pauseSession(s: ExpeditionSession, today: string): ExpeditionSession {
  if (isPaused(s)) return s;
  const periods = s.periods.map((p, i) => (i === s.periods.length - 1 ? { ...p, until: today } : p));
  return { ...s, periods };
}

/**
 * Obnoví výpravu. Pokud byla pozastavena týž den, období se jen znovu otevře
 * (záznamy jsou po dnech, takže by jinak vznikla mezera dlouhá jeden den).
 */
export function resumeSession(s: ExpeditionSession, today: string): ExpeditionSession {
  if (!isPaused(s)) return s;
  const last = s.periods.at(-1);
  if (last && last.until === today) {
    const { until: _until, ...open } = last;
    return { ...s, periods: [...s.periods.slice(0, -1), open] };
  }
  return { ...s, periods: [...s.periods, { from: today }] };
}

/** Zapamatuje si, kam až uživatel viděl postup. Vzdálenost nikdy neklesá. */
export function markSeen(s: ExpeditionSession, walkedM: number): ExpeditionSession {
  return walkedM > s.lastSeenWalkedM ? { ...s, lastSeenWalkedM: walkedM } : s;
}

/** Vzdálenost započítaná do výpravy z denních záznamů kroniky. */
export function sessionWalkedM(records: readonly DailyRecord[], s: ExpeditionSession): number {
  return distanceInPeriodsM(records, s.periods);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Načte uložený stav; cokoli neplatného vrátí jako `null`, aby poškozená data aplikaci nerozbila. */
export function parseSession(raw: unknown): ExpeditionSession | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.expeditionId !== "string" || !o.expeditionId) return null;
  if (typeof o.lastSeenWalkedM !== "number" || !Number.isFinite(o.lastSeenWalkedM) || o.lastSeenWalkedM < 0) return null;
  if (!Array.isArray(o.periods) || o.periods.length === 0) return null;
  const periods: ActivePeriod[] = [];
  for (const p of o.periods) {
    if (typeof p !== "object" || p === null) return null;
    const { from, until } = p as Record<string, unknown>;
    if (typeof from !== "string" || !DATE.test(from)) return null;
    if (until !== undefined && (typeof until !== "string" || !DATE.test(until) || until < from)) return null;
    periods.push(until === undefined ? { from } : { from, until });
  }
  return { expeditionId: o.expeditionId, periods, lastSeenWalkedM: o.lastSeenWalkedM };
}
