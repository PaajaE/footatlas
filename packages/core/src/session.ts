import { periodSlices, type ActivePeriod, type DaySlice } from "./periods";

/**
 * Stav rozjeté výpravy uložený na zařízení. Jen to, co nelze dopočítat ze zdravotních dat:
 * kdy přesně výprava běžela a kam až se uživatel naposledy podíval (pro „od posledně“).
 */
export interface ExpeditionSession {
  expeditionId: string;
  /** Období, kdy výprava běžela, seřazená a nepřekrývající se; jen poslední může být otevřené. */
  periods: ActivePeriod[];
  /** Vzdálenost, kterou uživatel viděl při posledním otevření, v metrech. */
  lastSeenWalkedM: number;
}

export function startSession(expeditionId: string, now: Date): ExpeditionSession {
  return { expeditionId, periods: [{ start: now.toISOString() }], lastSeenWalkedM: 0 };
}

export function isPaused(s: ExpeditionSession): boolean {
  const last = s.periods.at(-1);
  return !last || last.end !== undefined;
}

/**
 * Pozastaví výpravu v okamžiku `now`. Pohyb do tohoto okamžiku zůstává započítaný (i ten
 * z dne pozastavení), další se nepočítá. Postup se neztrácí, protože se z období vždy
 * znovu dopočítá ze zdravotních dat.
 */
export function pauseSession(s: ExpeditionSession, now: Date): ExpeditionSession {
  const last = s.periods.at(-1);
  if (!last || last.end !== undefined) return s;
  const end = Math.max(now.getTime(), Date.parse(last.start));
  const periods = [...s.periods.slice(0, -1), { start: last.start, end: new Date(end).toISOString() }];
  return { ...s, periods };
}

/** Obnoví výpravu od okamžiku `now`; mezera mezi pozastavením a obnovením se nepočítá. */
export function resumeSession(s: ExpeditionSession, now: Date): ExpeditionSession {
  const last = s.periods.at(-1);
  if (!last || last.end === undefined) return s;
  const start = Math.max(now.getTime(), Date.parse(last.end));
  return { ...s, periods: [...s.periods, { start: new Date(start).toISOString() }] };
}

/** Zapamatuje si, kam až uživatel viděl postup. Vzdálenost nikdy neklesá. */
export function markSeen(s: ExpeditionSession, walkedM: number): ExpeditionSession {
  return walkedM > s.lastSeenWalkedM ? { ...s, lastSeenWalkedM: walkedM } : s;
}

/** Úseky výpravy po lokálních dnech, které je potřeba ze zdravotních dat přečíst. */
export function sessionSlices(s: ExpeditionSession, now: Date): DaySlice[] {
  return periodSlices(s.periods, now);
}

/** Začátek výpravy, od něj se čtou denní záznamy. */
export function sessionStart(s: ExpeditionSession): Date {
  return new Date(s.periods[0]!.start);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isInstant(v: unknown): v is string {
  return typeof v === "string" && !DATE.test(v) && Number.isFinite(Date.parse(v));
}

/** Lokální půlnoc dne YYYY-MM-DD jako okamžik ISO. */
function legacyDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toISOString();
}

/**
 * Starý formát (období po dnech `{ from, until }`) se převede na okamžiky lokálních půlnocí.
 * Výsledek počítá stejně jako dřív: den zahájení celý, den pozastavení ne. Nic se tím neztratí
 * ani nepřidá; přesné časy platí pro nová zahájení a pozastavení.
 */
function parsePeriod(p: unknown): ActivePeriod | null {
  if (typeof p !== "object" || p === null) return null;
  const o = p as Record<string, unknown>;
  if ("from" in o) {
    if (typeof o.from !== "string" || !DATE.test(o.from)) return null;
    if (o.until === undefined) return { start: legacyDay(o.from) };
    if (typeof o.until !== "string" || !DATE.test(o.until) || o.until < o.from) return null;
    return { start: legacyDay(o.from), end: legacyDay(o.until) };
  }
  if (!isInstant(o.start)) return null;
  if (o.end === undefined) return { start: o.start };
  if (!isInstant(o.end)) return null;
  return { start: o.start, end: o.end };
}

/** Načte uložený stav; cokoli neplatného vrátí jako `null`, aby poškozená data aplikaci nerozbila. */
export function parseSession(raw: unknown): ExpeditionSession | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.expeditionId !== "string" || !o.expeditionId) return null;
  if (typeof o.lastSeenWalkedM !== "number" || !Number.isFinite(o.lastSeenWalkedM) || o.lastSeenWalkedM < 0) return null;
  if (!Array.isArray(o.periods) || o.periods.length === 0) return null;
  const periods: ActivePeriod[] = [];
  let prevEnd = -Infinity;
  for (const [i, raw] of o.periods.entries()) {
    const p = parsePeriod(raw);
    if (!p) return null;
    const start = Date.parse(p.start);
    const end = p.end === undefined ? undefined : Date.parse(p.end);
    if (start < prevEnd) return null;
    if (end === undefined && i !== o.periods.length - 1) return null;
    if (end !== undefined && end < start) return null;
    prevEnd = end ?? Infinity;
    periods.push(p);
  }
  return { expeditionId: o.expeditionId, periods, lastSeenWalkedM: o.lastSeenWalkedM };
}
