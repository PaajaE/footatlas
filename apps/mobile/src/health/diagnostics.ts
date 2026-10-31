import {
  aggregateGroupByPeriod,
  aggregateRecord,
  ExerciseType,
  getGrantedPermissions,
  initialize,
  readRecords,
  requestPermission,
} from "react-native-health-connect";
import { periodStartDayKey } from "@footatlas/core";

/**
 * Vývojářská diagnostika (jen Android): srovnání agregované vzdálenosti, kroků a vzdálenosti
 * uvnitř relací `ExerciseSession` podle typu cvičení. Podklad pro rozhodnutí z docs/technologie.md
 * (Známá omezení): jak moc Health Connect `Distance` zahrnuje i jízdu na kole.
 * Nic neukládá, výstup jde do logu (štítek FA_DIAG) a do vráceného textu.
 */

const FOOT_TYPES = new Set<number>([ExerciseType.WALKING, ExerciseType.RUNNING, ExerciseType.RUNNING_TREADMILL, ExerciseType.HIKING]);

const TYPE_NAMES = new Map<number, string>(Object.entries(ExerciseType).map(([k, v]) => [v as number, k]));

interface Session {
  type: number;
  start: number;
  end: number;
  origin: string;
}

interface DistRec {
  start: number;
  end: number;
  m: number;
  origin: string;
}

async function pageAll<T>(read: (pageToken?: string) => Promise<{ records: T[]; pageToken?: string }>): Promise<T[]> {
  const all: T[] = [];
  let token: string | undefined;
  do {
    const res = await read(token);
    all.push(...res.records);
    token = res.pageToken || undefined;
  } while (token);
  return all;
}

async function dailyAggregate(kind: "Distance" | "Steps", from: Date, to: Date): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const rows = (await aggregateGroupByPeriod({
    recordType: kind,
    timeRangeFilter: { operator: "between", startTime: from.toISOString(), endTime: to.toISOString() },
    timeRangeSlicer: { period: "DAYS", length: 1 },
  } as never)) as unknown as Array<{ startTime: string; result: Record<string, any> }>;
  for (const r of rows) {
    const v = kind === "Distance" ? r.result.DISTANCE?.inMeters : r.result.COUNT_TOTAL;
    if (typeof v === "number") out.set(periodStartDayKey(r.startTime), v);
  }
  return out;
}

/**
 * Pokus s přesahem záznamu přes hranici intervalu (rozhodnutí 0004, NEOVĚŘENO): vezme skutečné
 * záznamy kroků a agreguje jen jejich první třetinu a první polovinu. Poměrné započítání
 * dá ≈ 33 % a 50 % počtu, celý záznam 100 %. Zapisuje nic, jen čte.
 */
async function probeOverlap(recs: any[]): Promise<string[]> {
  const out: string[] = [];
  const candidates = recs
    .map((r) => ({ r, ms: Date.parse(r.endTime) - Date.parse(r.startTime) }))
    .filter((x) => x.ms >= 10 * 60_000 && (x.r.count ?? 0) >= 200)
    .sort((a, b) => b.r.count - a.r.count)
    .slice(0, 4);
  if (candidates.length === 0) return ["Přesah: žádný záznam kroků delší než 10 min s ≥ 200 kroky."];
  for (const { r, ms } of candidates) {
    const start = Date.parse(r.startTime);
    const row: string[] = [];
    for (const frac of [1 / 3, 1 / 2]) {
      const res = (await aggregateRecord({
        recordType: "Steps",
        timeRangeFilter: { operator: "between", startTime: new Date(start).toISOString(), endTime: new Date(start + ms * frac).toISOString() },
      } as never)) as Record<string, any>;
      const got = res.COUNT_TOTAL ?? 0;
      row.push(`${Math.round(frac * 100)} % času → ${got} (${Math.round((got / r.count) * 100)} % záznamu)`);
    }
    out.push(`Přesah: záznam ${r.startTime.slice(0, 16)} ${Math.round(ms / 60000)} min, ${r.count} kroků, ${r.metadata?.dataOrigin ?? "?"}: ${row.join("; ")}`);
  }
  return out;
}

/** Součty podle zdroje a dne proti agregaci: ukáže, kolik duplicit agregace odstranila. */
function originReport(stepRecs: any[], aggSteps: Map<string, number>, dayOf: (ms: number) => string): string[] {
  const perOrigin = new Map<string, number>();
  const perDay = new Map<string, Map<string, number>>();
  for (const r of stepRecs) {
    const o = r.metadata?.dataOrigin ?? "?";
    const n = r.count ?? 0;
    perOrigin.set(o, (perOrigin.get(o) ?? 0) + n);
    const day = dayOf(Date.parse(r.startTime));
    const m = perDay.get(day) ?? new Map<string, number>();
    m.set(o, (m.get(o) ?? 0) + n);
    perDay.set(day, m);
  }
  const out = [`Zdroje kroků (surově): ${[...perOrigin].map(([k, v]) => `${k} ${v}`).join(", ") || "žádné"}`];
  let multi = 0;
  let rawTotal = 0;
  let aggTotal = 0;
  for (const [day, m] of perDay) {
    const raw = [...m.values()].reduce((a, b) => a + b, 0);
    const agg = aggSteps.get(day) ?? 0;
    rawTotal += raw;
    aggTotal += agg;
    if (m.size > 1) {
      multi++;
      if (multi <= 8) out.push(`Více zdrojů ${day}: ${[...m].map(([k, v]) => `${k} ${v}`).join(", ")}; součet ${raw}, agregace ${agg}`);
    }
  }
  out.push(`Dní s více zdroji kroků: ${multi}; surový součet ${rawTotal}, agregace ${aggTotal}`);
  return out;
}

const log = (s: string) => console.log(`FA_DIAG ${s}`);

export async function diagnoseHealth(days = 60): Promise<string> {
  await initialize();
  // READ_EXERCISE je jen pro tuto diagnostiku (relace cvičení), ne pro produkční čtení.
  await requestPermission([{ accessType: "read", recordType: "ExerciseSession" }]);
  const granted = (await getGrantedPermissions()).map((p: any) => `${p.accessType}:${p.recordType}`);
  log(`granted ${granted.join(",")}`);

  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - days);
  const range = { operator: "between", startTime: from.toISOString(), endTime: to.toISOString() } as const;

  const [aggDist, aggSteps] = await Promise.all([dailyAggregate("Distance", from, to), dailyAggregate("Steps", from, to)]);

  const sessions: Session[] = (
    await pageAll((pageToken) => readRecords("ExerciseSession", { timeRangeFilter: range, pageSize: 500, pageToken }))
  ).map((r: any) => ({
    type: r.exerciseType,
    start: Date.parse(r.startTime),
    end: Date.parse(r.endTime),
    origin: r.metadata?.dataOrigin ?? "?",
  }));

  const dists: DistRec[] = (
    await pageAll((pageToken) => readRecords("Distance", { timeRangeFilter: range, pageSize: 1000, pageToken }))
  ).map((r: any) => ({
    start: Date.parse(r.startTime),
    end: Date.parse(r.endTime),
    m: r.distance?.inMeters ?? 0,
    origin: r.metadata?.dataOrigin ?? "?",
  }));

  const stepRecs = await pageAll((pageToken) => readRecords("Steps", { timeRangeFilter: range, pageSize: 1000, pageToken }));
  const stepsByOrigin = new Map<string, number>();
  for (const r of stepRecs as any[]) {
    const o = r.metadata?.dataOrigin ?? "?";
    stepsByOrigin.set(o, (stepsByOrigin.get(o) ?? 0) + (r.count ?? 0));
  }
  log(`stepRecords ${stepRecs.length} byOrigin ${JSON.stringify([...stepsByOrigin])}`);
  for (const d of dists.slice(0, 10)) log(`distRec ${new Date(d.start).toISOString()}..${new Date(d.end).toISOString()} ${d.m}m ${d.origin}`);

  const typeCount = new Map<string, number>();
  for (const s of sessions) {
    const n = TYPE_NAMES.get(s.type) ?? `type${s.type}`;
    typeCount.set(n, (typeCount.get(n) ?? 0) + 1);
  }
  const originDist = new Map<string, number>();
  for (const d of dists) originDist.set(d.origin, (originDist.get(d.origin) ?? 0) + d.m);

  log(`sessions ${sessions.length} byType ${JSON.stringify([...typeCount])}`);
  log(`distanceRecords ${dists.length} byOriginM ${JSON.stringify([...originDist].map(([k, v]) => [k, Math.round(v)]))}`);
  const sessOrigins = new Map<string, number>();
  for (const s of sessions) sessOrigins.set(s.origin, (sessOrigins.get(s.origin) ?? 0) + 1);
  log(`sessionOrigins ${JSON.stringify([...sessOrigins])}`);

  // Záznam vzdálenosti se přiřadí relaci, pokud se jeho střed času nachází uvnitř ní.
  const perDay = new Map<string, { foot: number; other: number; none: number; otherTypes: Set<string> }>();
  const dayOf = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  for (const d of dists) {
    const mid = (d.start + d.end) / 2;
    const s = sessions.find((x) => mid >= x.start && mid <= x.end);
    const day = dayOf(d.start);
    const e = perDay.get(day) ?? { foot: 0, other: 0, none: 0, otherTypes: new Set<string>() };
    if (!s) e.none += d.m;
    else if (FOOT_TYPES.has(s.type)) e.foot += d.m;
    else {
      e.other += d.m;
      e.otherTypes.add(TYPE_NAMES.get(s.type) ?? `type${s.type}`);
    }
    perDay.set(day, e);
  }

  const dayKeys = [...new Set([...aggDist.keys(), ...aggSteps.keys(), ...perDay.keys()])].sort();
  let totAgg = 0;
  let totSteps = 0;
  let totOther = 0;
  let totFoot = 0;
  let totNone = 0;
  for (const k of dayKeys) {
    const a = aggDist.get(k) ?? 0;
    const st = aggSteps.get(k) ?? 0;
    const p = perDay.get(k);
    totAgg += a;
    totSteps += st;
    totOther += p?.other ?? 0;
    totFoot += p?.foot ?? 0;
    totNone += p?.none ?? 0;
    log(
      `day ${k} agg=${Math.round(a)} steps=${st} step075=${Math.round(st * 0.75)} rawFoot=${Math.round(p?.foot ?? 0)} rawOther=${Math.round(p?.other ?? 0)} rawNoSession=${Math.round(p?.none ?? 0)} ${p ? [...p.otherTypes].join("+") : ""}`,
    );
  }
  const summary =
    `Dní ${dayKeys.length}, relací ${sessions.length}, záznamů vzdálenosti ${dists.length}. ` +
    `Agregace Distance ${(totAgg / 1000).toFixed(1)} km, kroky ${totSteps} (≈${((totSteps * 0.75) / 1000).toFixed(1)} km při 0,75 m), ` +
    `v relacích chůze/běh/turistika ${(totFoot / 1000).toFixed(1)} km, v jiných relacích ${(totOther / 1000).toFixed(1)} km, ` +
    `mimo relace ${(totNone / 1000).toFixed(1)} km (surové záznamy, mohou obsahovat duplicity mezi zdroji).`;
  const extra = [...originReport(stepRecs as any[], aggSteps, dayOf), ...(await probeOverlap(stepRecs as any[]))];
  for (const line of extra) log(line);
  log(`summary ${summary}`);
  return [summary, ...extra].join("\n");
}
