/**
 * Čistá logika návratu „Inkoust“ (M1): kdy se přehrává, časování letu po trase, rozestupy razítek,
 * nadpis a úsek „A → B“. Bez Reactu a MapLibre, aby šla testovat (rozhodnutí 0022).
 */
import { positionAt, type RoutePoint } from "@footatlas/core";
import { MIN_STAMP_GAP_MS } from "./seal";

/** Od kolika metrů nového postupu se nabízí návrat (nebo dřív, když přibylo místo či etapa). */
export const RETURN_MIN_M = 300;
/** Let kamery trvá 4 až 9 s podle délky úseku (prototyp, docs/design-prototyp.md §2). */
export const FLIGHT_MIN_MS = 4000;
export const FLIGHT_MAX_MS = 9000;
/** Úsek, od kterého je let nejdelší. Kratší úseky letí kratší dobu, ale nikdy pod FLIGHT_MIN_MS. */
const FLIGHT_FULL_AT_M = 15_000;
const FLIGHT_SHORT_UNTIL_M = 1000;
/** Razítko dopadne chvíli po průletu kamery („za letem“). */
export const STAMP_LAG_MS = 300;

export interface ReturnSummary {
  deltaM: number;
  newPlaceCount: number;
  newStageCount: number;
}

/** Návrat se nabídne, když přibylo ≥ 300 m, nové místo nebo dokončená etapa. */
export function shouldShowReturn(s: ReturnSummary): boolean {
  return s.deltaM >= RETURN_MIN_M || s.newPlaceCount > 0 || s.newStageCount > 0;
}

/**
 * Odkud se návrat přehrává: z karty „Od posledně“ na Domů, nebo jako přehrání dne z Kroniky.
 * Jen přehrání z Domů (a „Zavřít“ na kartě) návrat spotřebuje (rozhodnutí 0024).
 */
export type ReturnSource = "domu" | "kronika";

/** Parametr `zdroj` z adresy `/navrat`; cokoli jiného než „kronika“ je návrat z Domů. */
export function returnSource(param: string | string[] | undefined): ReturnSource {
  return param === "kronika" ? "kronika" : "domu";
}

/** Co se s kartou „Od posledně“ stalo. Odchod z Domů (jiná záložka, otevřená zastávka) návrat nespotřebuje. */
export type ReturnAction =
  | { kind: "leave" }
  | { kind: "dismiss" }
  | { kind: "finish"; source: ReturnSource; toM: number };

/**
 * Do kolika metrů je postup „viděný“ po akci. Přehrání z Domů do konce zapamatuje konec přehraného úseku
 * (co přibylo mezitím, zůstane na příště), „Zavřít“ celý dosavadní postup. Hodnota nikdy neklesá.
 */
export function seenAfter(seenM: number, walkedM: number, action: ReturnAction): number {
  if (action.kind === "leave") return seenM;
  if (action.kind === "finish" && action.source !== "domu") return seenM;
  const upTo = action.kind === "finish" ? Math.min(action.toM, walkedM) : walkedM;
  return Math.max(seenM, upTo);
}

/** Úsek pro přehrání dne z Kroniky; den bez úseku se nepřehrává. */
export function dayReplayParams(d: { fromM: number; toM: number }): { from: string; to: string; zdroj: "kronika" } | undefined {
  if (!(d.toM - d.fromM > 0)) return undefined;
  return { from: String(Math.round(d.fromM)), to: String(Math.round(d.toM)), zdroj: "kronika" };
}

/** Doba letu v ms, 4000 až 9000, lineárně podle délky úseku mezi 1 a 15 km. */
export function flightDurationMs(deltaM: number): number {
  const d = Number.isFinite(deltaM) ? Math.max(0, deltaM) : 0;
  const f = Math.min(1, Math.max(0, (d - FLIGHT_SHORT_UNTIL_M) / (FLIGHT_FULL_AT_M - FLIGHT_SHORT_UNTIL_M)));
  return Math.round(FLIGHT_MIN_MS + f * (FLIGHT_MAX_MS - FLIGHT_MIN_MS));
}

/** Nejvyšší rychlost letu v šířkách obrazovky za sekundu (špička ease-in-out je 2× průměr); víc už je rozmazané a dlaždice mapy nestačí. */
const FLIGHT_PEAK_SCREENS_PER_S = 0.6;
/** Šířka obrazovky v bodech a metrů na bod při přiblížení 0 (512px dlaždice, šířka 50° s. š.). */
const SCREEN_DP = 411;
const M_PER_DP_Z0 = 50_300;

/**
 * Přiblížení mapy za letu: pro krátký úsek blízko (14), pro dlouhý dál, aby kamera neletěla rychleji než
 * `FLIGHT_PEAK_SCREENS_PER_S` šířek obrazovky za sekundu. Rozsah 11,5 až 14,5. U zastavení se přidá
 * `holdZoom` × `HOLD_ZOOM_IN` (0 až +0,5), viz `holdZoomAt`.
 */
export function flightZoom(deltaM: number, durationMs: number, holdZoom = 0): number {
  return baseFlightZoom(deltaM, durationMs) + HOLD_ZOOM_IN * Math.min(1, Math.max(0, holdZoom));
}

function baseFlightZoom(deltaM: number, durationMs: number): number {
  const d = Number.isFinite(deltaM) ? Math.max(0, deltaM) : 0;
  const avgMps = durationMs > 0 ? d / (durationMs / 1000) : 0;
  const widthM = (2 * avgMps) / FLIGHT_PEAK_SCREENS_PER_S;
  if (widthM <= 0) return 14.5;
  const z = Math.log2((SCREEN_DP * M_PER_DP_Z0) / widthM);
  return Math.round(Math.min(14.5, Math.max(11.5, z)) * 10) / 10;
}

/** Zrychlení a zpomalení (ease-in-out, kvadraticky). */
export function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

/** Inverze `easeInOut`: kdy (0 až 1) kamera dorazí na zlomek `f` úseku. */
export function easeInOutInverse(f: number): number {
  const y = Math.min(1, Math.max(0, f));
  return y < 0.5 ? Math.sqrt(y / 2) : 1 - Math.sqrt((1 - y) / 2);
}

export interface Keyframe {
  /** Čas od začátku letu v ms. */
  atMs: number;
  /** Poloha na trase v metrech od startu. */
  m: number;
  lon: number;
  lat: number;
}

/**
 * Body, kudy kamera letí: stejně rozestoupené v čase, poloha na trase podle `easeInOut`,
 * takže se kamera rozjíždí a zpomaluje. První je `fromM`, poslední `toM`.
 */
export function flightKeyframes(
  route: readonly RoutePoint[],
  cumulative: readonly number[],
  fromM: number,
  toM: number,
  durationMs: number,
  count = 12,
): Keyframe[] {
  const n = Math.max(2, Math.floor(count));
  const out: Keyframe[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const m = fromM + easeInOut(t) * (toM - fromM);
    const p = positionAt(route, cumulative, m);
    out.push({ atMs: Math.round(t * durationMs), m, lon: p.lon, lat: p.lat });
  }
  return out;
}

export interface StampEvent {
  id: string;
  /** Kdy razítko dopadne (ms od začátku letu). */
  atMs: number;
}

/**
 * Kdy dopadne které razítko: krátce po tom, co kamera místo mine, ale nikdy blíž než `MIN_STAMP_GAP_MS`
 * k předchozímu. Místa dostávají pořadí podle polohy na trase. Když se kvůli rozestupům razítka posunou za
 * konec letu, přehrávání trvá o to déle (`flightEndMs`).
 */
export function stampSchedule(
  places: ReadonlyArray<{ id: string; atM: number }>,
  fromM: number,
  toM: number,
  durationMs: number,
  gapMs = MIN_STAMP_GAP_MS,
): StampEvent[] {
  const span = Math.max(1, toM - fromM);
  const sorted = [...places].filter((p) => p.atM > fromM && p.atM <= toM).sort((a, b) => a.atM - b.atM);
  const out: StampEvent[] = [];
  let last = -Infinity;
  for (const p of sorted) {
    const reachedAt = easeInOutInverse((p.atM - fromM) / span) * durationMs + STAMP_LAG_MS;
    const at = Math.round(Math.max(reachedAt, last + gapMs));
    out.push({ id: p.id, atMs: at });
    last = at;
  }
  return out;
}

/** Konec celého přehrávání: let, nebo poslední razítko, co přijde později (plus dopad 600 ms). */
export function playbackEndMs(durationMs: number, stamps: readonly StampEvent[], dropMs = 600): number {
  const lastStamp = stamps.reduce((m, s) => Math.max(m, s.atMs + dropMs), 0);
  return Math.max(durationMs, lastStamp);
}

/** Kolik razítek už dopadlo v čase `elapsedMs`. */
export function stampsLanded(stamps: readonly StampEvent[], elapsedMs: number): string[] {
  return stamps.filter((s) => s.atMs <= elapsedMs).map((s) => s.id);
}

/** Vzdálenost, kterou počítadlo ukazuje v čase `elapsedMs` (roste stejně jako kamera, ne rychleji). */
export function counterM(deltaM: number, durationMs: number, elapsedMs: number): number {
  if (durationMs <= 0) return deltaM;
  return deltaM * easeInOut(elapsedMs / durationMs);
}

// ---------------------------------------------------------------------------------------------------------------
// Zastavení u míst (rozhodnutí 0025). Let (`durationMs`, ease-in-out po úseku) zůstává stejný; „čas letu“ se ale
// u vybraných míst zastaví. Hodiny přehrávání (skutečný čas) běží dál a plán říká, jak se na čas letu převádějí:
// pohyb → ~1 s brzdění → zastavení (karta místa) → ~1 s rozjezd → pohyb. Kamera tak dál jezdí `easeTo` ze stejných
// hodin, jen poloha v čase letu stojí.

/** Jak dlouho se stojí u zastávky, malého objevu a na konci dokončené etapy (ms). */
export const HOLD_STOP_MS = 5000;
export const HOLD_DISCOVERY_MS = 3000;
export const HOLD_STAGE_MS = 6000;
/** Od kolika míst v úseku se staví jen u zastávek a konců etap; ostatní dostanou rychlé razítko. */
export const QUICK_FROM_PLACES = 6;
/** Brzdění před místem a rozjezd po něm (skutečný čas). Za tu dobu urazí kamera půl tolika času letu. */
export const BRAKE_MS = 1000;
/** O kolik se kamera u místa přiblíží. */
export const HOLD_ZOOM_IN = 0.5;
/** Cílová délka celého návratu: zhruba 15 až 40 s. Nad horní mez se méně důležitá zastavení změní na rychlá razítka. */
export const RETURN_TARGET_MIN_MS = 15_000;
export const RETURN_MAX_MS = 40_000;
/** Dvě místa blíž než tolik metrů od sebe (konec etapy u zastávky) jsou jedno zastavení. */
const SAME_POINT_M = 1;

export interface PlanPlace {
  id: string;
  kind: "stop" | "discovery";
  atM: number;
}

/** Jedno zastavení: místo (a/nebo dokončená etapa), kdy kamera dorazí a jak dlouho stojí. */
export interface Halt {
  /** Místo, u kterého se stojí; chybí, když etapa končí mimo místo. */
  placeId?: string;
  /** Index etapy, která tu končí (zastavení 6 s s pečetí etapy). */
  stageIndex?: number;
  atM: number;
  /** Čas letu (0 až `durationMs`), kdy kamera místo míjí. */
  flightMs: number;
  /** Skutečný čas přehrávání, kdy kamera zastaví (a dopadne razítko). */
  arriveMs: number;
  holdMs: number;
}

type SegmentKind = "move" | "brake" | "accel" | "hold";
interface Segment {
  kind: SegmentKind;
  /** Skutečný čas přehrávání. */
  t0: number;
  t1: number;
  /** Čas letu. */
  f0: number;
  f1: number;
}

export interface ReturnPlan {
  /** Doba samotného letu (čas letu), stejná jako dřív: `flightDurationMs`. */
  durationMs: number;
  halts: Halt[];
  /** Rychlá razítka míst bez zastavení (skutečný čas, rozestup ≥ 250 ms). */
  stamps: StampEvent[];
  segments: Segment[];
  /** Kdy kamera doletí na konec úseku včetně posledního zastavení. */
  motionEndMs: number;
  /** Celá délka přehrávání (i s dopadem posledního razítka). */
  totalMs: number;
}

function holdFor(kind: PlanPlace["kind"], stage: boolean, quick: boolean): number {
  if (stage) return HOLD_STAGE_MS;
  if (kind === "stop") return HOLD_STOP_MS;
  return quick ? 0 : HOLD_DISCOVERY_MS;
}

/** Stavba časové osy pro daná zastavení (už seřazená podle polohy). */
function buildTimeline(
  halts: ReadonlyArray<Omit<Halt, "flightMs" | "arriveMs">>,
  fromM: number,
  toM: number,
  durationMs: number,
): { halts: Halt[]; segments: Segment[]; motionEndMs: number } {
  const span = Math.max(1, toM - fromM);
  const half = BRAKE_MS / 2;
  const segments: Segment[] = [];
  const out: Halt[] = [];
  let t = 0;
  let f = 0;
  const push = (kind: SegmentKind, dt: number, df: number) => {
    if (dt <= 0) return;
    segments.push({ kind, t0: t, t1: t + dt, f0: f, f1: f + df });
    t += dt;
    f += df;
  };
  let prevF: number | undefined;
  for (const h of halts) {
    const flightMs = easeInOutInverse((h.atM - fromM) / span) * durationMs;
    const gap = Math.max(0, flightMs - f);
    // Rozjezd po předchozím zastavení a brzdění před tímto si dělí mezeru napůl; každý trvá nejvýš BRAKE_MS.
    const brake = Math.min(half, prevF === undefined ? gap : (flightMs - prevF) / 2, gap);
    push("move", gap - brake, gap - brake);
    push("brake", 2 * brake, brake);
    f = flightMs;
    out.push({ ...h, flightMs, arriveMs: t });
    segments.push({ kind: "hold", t0: t, t1: t + h.holdMs, f0: f, f1: f });
    t += h.holdMs;
    const next = halts[out.length];
    const nextF = next ? easeInOutInverse((next.atM - fromM) / span) * durationMs : durationMs;
    const accel = Math.min(half, next ? (nextF - flightMs) / 2 : nextF - flightMs);
    push("accel", 2 * accel, accel);
    prevF = flightMs;
  }
  push("move", durationMs - f, durationMs - f);
  return { halts: out, segments, motionEndMs: t };
}

/**
 * Plán zastavení návratu: u kterých míst se stojí a jak dlouho (zastávka 5 s, malý objev 3 s, konec etapy 6 s),
 * kdy kamera dorazí, a rychlá razítka ostatních. Při 6 a více místech v úseku se stojí jen u zastávek a konců etap.
 * Když by celek přesáhl `RETURN_MAX_MS`, změní se nejdřív objevy a pak zastávky, které leží nejtěsněji u jiného
 * zastavení, na rychlá razítka; konce etap zůstanou vždy.
 */
export function returnPlan(
  places: readonly PlanPlace[],
  stages: ReadonlyArray<{ index: number; endM: number }>,
  fromM: number,
  toM: number,
  durationMs = flightDurationMs(toM - fromM),
  gapMs = MIN_STAMP_GAP_MS,
): ReturnPlan {
  const inside = [...places].filter((p) => p.atM > fromM && p.atM <= toM).sort((a, b) => a.atM - b.atM);
  const stagesIn = stages.filter((s) => s.endM > fromM && s.endM <= toM);
  const quick = inside.length >= QUICK_FROM_PLACES;

  type Candidate = Omit<Halt, "flightMs" | "arriveMs"> & { kind?: PlanPlace["kind"] };
  const usedStages = new Set<number>();
  let candidates: Candidate[] = [];
  const quickIds: string[] = [];
  for (const p of inside) {
    const stage = stagesIn.find((s) => !usedStages.has(s.index) && Math.abs(s.endM - p.atM) < SAME_POINT_M);
    if (stage) usedStages.add(stage.index);
    const holdMs = holdFor(p.kind, stage !== undefined, quick);
    if (holdMs > 0) candidates.push({ placeId: p.id, stageIndex: stage?.index, atM: p.atM, holdMs, kind: p.kind });
    else quickIds.push(p.id);
  }
  for (const s of stagesIn) {
    if (!usedStages.has(s.index)) candidates.push({ stageIndex: s.index, atM: s.endM, holdMs: HOLD_STAGE_MS });
  }
  candidates.sort((a, b) => a.atM - b.atM);

  // Rozpočet: nad 40 s ubírat zastavení (objevy, pak zastávky; vždy to, které je nejblíž jinému).
  const length = (list: Candidate[]) => buildTimeline(list, fromM, toM, durationMs).motionEndMs;
  while (length(candidates) > RETURN_MAX_MS) {
    const rank = (c: Candidate) => (c.stageIndex !== undefined ? 2 : c.kind === "stop" ? 1 : 0);
    const level = Math.min(...candidates.map(rank));
    if (level >= 2) break;
    let pick = -1;
    let closest = Infinity;
    candidates.forEach((c, i) => {
      if (rank(c) !== level) return;
      const prev = candidates[i - 1]?.atM ?? fromM;
      const next = candidates[i + 1]?.atM ?? toM;
      const near = Math.min(c.atM - prev, next - c.atM);
      if (near < closest) {
        closest = near;
        pick = i;
      }
    });
    quickIds.push(candidates[pick]!.placeId!);
    candidates = candidates.filter((_, i) => i !== pick);
  }

  const { halts, segments, motionEndMs } = buildTimeline(
    candidates.map(({ kind: _k, ...c }) => c),
    fromM,
    toM,
    durationMs,
  );
  const plan: ReturnPlan = { durationMs, halts, stamps: [], segments, motionEndMs, totalMs: motionEndMs };

  // Rychlá razítka: za průletem (v přepočtu na skutečný čas), rozestup ≥ 250 ms od předchozího razítka i zastavení.
  const span = Math.max(1, toM - fromM);
  const quickSet = new Set(quickIds);
  const fixed = halts.map((h) => h.arriveMs);
  let last = -Infinity;
  for (const p of inside) {
    if (!quickSet.has(p.id)) continue;
    const reached = realAtFlight(plan, easeInOutInverse((p.atM - fromM) / span) * durationMs) + STAMP_LAG_MS;
    let at = Math.max(reached, last + gapMs);
    // Neuhodit ve stejnou chvíli jako razítko zastavení.
    for (const h of fixed) if (Math.abs(at - h) < gapMs) at = h + gapMs;
    at = Math.round(at);
    plan.stamps.push({ id: p.id, atMs: at });
    last = at;
  }
  plan.totalMs = playbackEndMs(motionEndMs, plan.stamps);
  return plan;
}

function segmentAt(plan: ReturnPlan, t: number): Segment | undefined {
  return plan.segments.find((s) => t >= s.t0 && t < s.t1);
}

/** Čas letu (0 až `durationMs`) ve skutečném čase přehrávání `t`. Podle něj se počítá poloha kamery i počítadlo. */
export function flightAt(plan: ReturnPlan, t: number): number {
  if (t <= 0) return 0;
  const s = segmentAt(plan, t);
  if (!s) return plan.durationMs;
  const L = s.t1 - s.t0;
  const x = (t - s.t0) / L;
  switch (s.kind) {
    case "move":
      return s.f0 + (t - s.t0);
    case "hold":
      return s.f0;
    case "brake":
      // Rychlost klesá z 1 na 0: plynule navazuje na pohyb a zastaví přesně u místa.
      return s.f0 + L * (x - (x * x) / 2);
    case "accel":
      return s.f0 + (L * x * x) / 2;
  }
}

/** Inverze `flightAt` mimo zastavení: kdy (skutečný čas) kamera dorazí do času letu `f`. */
export function realAtFlight(plan: ReturnPlan, f: number): number {
  if (f <= 0) return 0;
  for (const s of plan.segments) {
    if (s.kind === "hold" || f > s.f1) continue;
    const L = s.t1 - s.t0;
    const d = f - s.f0;
    if (s.kind === "move") return s.t0 + d;
    if (s.kind === "brake") return s.t0 + L * (1 - Math.sqrt(Math.max(0, 1 - (2 * d) / L)));
    return s.t0 + L * Math.sqrt(Math.max(0, (2 * d) / L));
  }
  return plan.motionEndMs;
}

/** O kolik (0 až 1 z `HOLD_ZOOM_IN`) je kamera přiblížená: při brzdění roste, při zastavení drží, při rozjezdu klesá. */
export function holdZoomAt(plan: ReturnPlan, t: number): number {
  const s = segmentAt(plan, t);
  if (!s) return 0;
  const x = (t - s.t0) / (s.t1 - s.t0);
  if (s.kind === "brake") return easeInOut(x);
  if (s.kind === "hold") return 1;
  if (s.kind === "accel") return 1 - easeInOut(x);
  return 0;
}

/** Zastavení, které právě probíhá v čase `t`, a kolik z něj zbývá (1 → 0). */
export function activeHalt(plan: ReturnPlan, t: number): { index: number; halt: Halt; remaining: number } | undefined {
  const index = plan.halts.findIndex((h) => t >= h.arriveMs && t < h.arriveMs + h.holdMs);
  if (index < 0) return undefined;
  const halt = plan.halts[index]!;
  return { index, halt, remaining: 1 - (t - halt.arriveMs) / halt.holdMs };
}

/** Celková délka návratu v ms (cíl zhruba 15 až 40 s; krátký úsek bez míst může trvat jen let). */
export function returnTotalMs(plan: ReturnPlan): number {
  return plan.totalMs;
}

/** Která místa už mají razítko v čase `t`: rychlá razítka a místa, u kterých kamera zastavila. */
export function planStampsLanded(plan: ReturnPlan, t: number): string[] {
  const halted = plan.halts.filter((h) => h.placeId !== undefined && h.arriveMs <= t).map((h) => h.placeId!);
  return [...halted, ...stampsLanded(plan.stamps, t)];
}

/** První věta háčku pro kartu místa (věta končí tečkou, otazníkem či vykřičníkem a pokračuje velkým písmenem). */
export function firstSentence(text: string | undefined): string | undefined {
  const t = text?.trim();
  if (!t) return undefined;
  const m = /^(.+?[.!?…])\s+(?=[„"A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/u.exec(t);
  return m ? m[1] : t;
}

const WEEKDAYS_FROM = ["neděle", "pondělí", "úterý", "středy", "čtvrtka", "pátku", "soboty"];

function parseDay(day: string): Date {
  return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

/** Rozdíl dnů `a - b` (YYYY-MM-DD) po celých dnech. */
function dayDiff(a: string, b: string): number {
  const ms = Date.UTC(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10))) -
    Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  return Math.round(ms / 86_400_000);
}

/** Den, kdy se začal sbírat postup po `fromM` (první úsek, který kumulativně přesáhl `fromM`). `undefined` bez dat. */
export function sinceDay(slices: ReadonlyArray<{ day: string; distanceM: number }>, fromM: number): string | undefined {
  let sum = 0;
  for (const s of slices) {
    sum += s.distanceM;
    if (sum > fromM) return s.day;
  }
  return undefined;
}

/**
 * Horní řádek návratu: „Dnes jste ušli“, „Od včerejška jste ušli“, „Od pátku jste ušli“ (do týdne),
 * jinak „Od 24. 10. jste ušli“; bez známého dne „Od posledně jste ušli“.
 */
export function returnHeading(since: string | undefined, today: string): string {
  if (!since) return "Od posledně jste ušli";
  const back = dayDiff(today, since);
  if (back <= 0) return "Dnes jste ušli";
  if (back === 1) return "Od včerejška jste ušli";
  if (back <= 6) return `Od ${WEEKDAYS_FROM[parseDay(since).getDay()]} jste ušli`;
  return `Od ${Number(since.slice(8, 10))}. ${Number(since.slice(5, 7))}. jste ušli`;
}

const WEEKDAYS_ON = ["V neděli", "V pondělí", "V úterý", "Ve středu", "Ve čtvrtek", "V pátek", "V sobotu"];

/** Horní řádek přehrání jednoho dne z Kroniky: „Dnes / Včera / V pátek / 24. 10. jste ušli“. */
export function dayHeading(day: string | undefined, today: string): string {
  if (!day) return "Ten den jste ušli";
  const back = dayDiff(today, day);
  if (back <= 0) return "Dnes jste ušli";
  if (back === 1) return "Včera jste ušli";
  if (back <= 6) return `${WEEKDAYS_ON[parseDay(day).getDay()]} jste ušli`;
  return `${Number(day.slice(8, 10))}. ${Number(day.slice(5, 7))}. jste ušli`;
}

/**
 * Úsek „A → B“: A je poslední místo, které jste měli před úsekem, B poslední nově odemčené;
 * bez nového místa B je to nejbližší další místo (směr, kterým jdete).
 */
export function returnRouteLabel(
  places: ReadonlyArray<{ name: string; atM: number }>,
  fromM: number,
  toM: number,
): string | undefined {
  const sorted = [...places].sort((a, b) => a.atM - b.atM);
  const start = [...sorted].reverse().find((p) => p.atM <= fromM);
  const reached = [...sorted].reverse().find((p) => p.atM > fromM && p.atM <= toM);
  const end = reached ?? sorted.find((p) => p.atM > toM);
  if (!start || !end) return undefined;
  return `${start.name} → ${end.name}`;
}

/** Souřadnice a zoom pro závěrečný pohled na celý úsek (bounding box s malou rezervou). */
export function sectionBounds(
  route: readonly RoutePoint[],
  cumulative: readonly number[],
  fromM: number,
  toM: number,
): [number, number, number, number] {
  const pts: RoutePoint[] = [positionAt(route, cumulative, fromM)];
  for (let i = 0; i < route.length; i++) {
    const c = cumulative[i]!;
    if (c > fromM && c < toM) pts.push(route[i]!);
  }
  pts.push(positionAt(route, cumulative, toM));
  const lons = pts.map((p) => p.lon);
  const lats = pts.map((p) => p.lat);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}
