/**
 * Čistá logika přehrání cesty: kdy se přehrává, plán nového letu (rozhodnutí 0033: úvodní záběr, ponoření, kreslení
 * se spojitou rychlostí, místa za letu, zastavení, závěrečný záběr), rozestupy razítek, nadpis a úsek „A → B“.
 * Bez Reactu a MapLibre, aby šla testovat (rozhodnutí 0022).
 */
import { positionAt, type RoutePoint } from "@footatlas/core";
import { formatDayLong } from "./format";
import { MIN_STAMP_GAP_MS } from "./seal";

/** Od kolika metrů nového postupu se nabízí návrat (nebo dřív, když přibylo místo či etapa). */
export const RETURN_MIN_M = 300;

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

// ---------------------------------------------------------------------------------------------------------------
// Nový let (rozhodnutí 0033, docs/navrh-v2.md § 8). Přehrání má pět fází na jedněch hodinách:
//   úvodní záběr 2 s → ponoření 1 s → kreslení (podle délky úseku) → závěrečný záběr 1,5 s → souhrn.
// Za kreslení je poloha hrotu pera dána rychlostí, která je SPOJITOU funkcí času: rozjezdy a dojezdy jsou kosinové
// rampy (rychlost i zrychlení navazují), u zastávek a konců etap rychlost klesne plynule na nulu a po stání stejně
// plynule naroste, u míst za letu klesne jen na čtvrtinu a let nezastaví. Kamera dostává pokyny po úsecích (0028)
// z `flightCamera`; plynulý pohyb mezi nimi počítá MapLibre.

/** Úvodní záběr (celý úsek a místo na obzoru), ponoření na start a závěrečný záběr. */
export const INTRO_MS = 2000;
export const DIVE_MS = 1000;
export const OUTRO_MS = 1500;
/**
 * Pohyb pera (kreslení bez stání) trvá 8 až 20 s podle délky úseku. Stání zastávek a konců etap se k tomu PŘIČÍTÁ
 * (balík O): dřív se vešlo do stejného rozpočtu a pohyb mezi nimi se zkracoval do sprintu.
 */
export const DRAW_MIN_MS = 8000;
export const DRAW_MAX_MS = 20_000;
const DRAW_SHORT_UNTIL_M = 1000;
const DRAW_FULL_AT_M = 15_000;
/**
 * Strop cestovní rychlosti v šířkách záběru za sekundu. Záběr je jen 2–3 km široký; při 0,8 šířky za sekundu
 * projede krajina obrazovkou zhruba za 1,25 s, což oko ještě čte (3,2 km/s z měření byla víc než celá obrazovka
 * za sekundu a mapa se slila). Ustoupí jen stropu 40 s, a to až když nepomůže změnit zastávky na místa za letu.
 */
export const MAX_SCREENS_PER_S = 0.8;
/**
 * Nejkratší přechod mezi dvěma kotvami (start, místo za letu, cíl). Kratší přechod se nezrychlí na špičku,
 * ale protáhne se na tuto dobu se sníženou špičkou (jeden plynulý „hrb“), viz `transition`.
 */
export const TRANSITION_MIN_MS = 1500;
/** Nejkratší přechod, který začíná nebo končí zastavením (zastávka, konec etapy). */
export const TRANSITION_HALT_MIN_MS = 2500;
/** Zastávka a konec etapy: plné zastavení, dojezd i rozjezd 0,8 s. */
export const HOLD_STOP_MS = 3500;
export const HOLD_STAGE_MS = 5000;
export const HALT_RAMP_MS = 800;
/** Místo za letu: zpomalení na čtvrtinu, rozjezd i dojezd 0,6 s, pomalý průlet aspoň 1,2 s, štítek 2,5 s. */
export const FLYBY_SLOW = 0.25;
export const FLYBY_RAMP_MS = 600;
export const FLYBY_SLOW_MS = 1200;
export const LABEL_MS = 2500;
/** Od kolika míst v úseku dostanou objevy jen rychlé razítko (bez zpomalení a štítku). */
export const QUICK_FROM_PLACES = 6;
/** Cíl celého přehrání 20–25 s pro běžný denní úsek bez zastavení (stání se přičte), nikdy přes 40 s. */
export const RETURN_TARGET_MIN_MS = 20_000;
export const RETURN_TARGET_MAX_MS = 25_000;
export const RETURN_MAX_MS = 40_000;
/** Předstih kamery: střed je o tuto část šířky obrazovky před hrotem (při plné rychlosti; při stání 0). */
export const CAMERA_LEAD = 0.2;
/** Dvě místa blíž než tolik metrů od sebe (konec etapy u zastávky) jsou jedno zastavení. */
const SAME_POINT_M = 1;
/** Rovník v metrech (Web Mercator) a velikost dlaždice MapLibre v bodech. */
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const TILE_DP = 512;
/** Šířka obrazovky v bodech, když ji ještě neznáme. */
export const SCREEN_DP = 411;

/** Doba kreslení (ms) bez míst: 8 s do 1 km, 20 s od 15 km, mezi tím lineárně. */
export function drawDurationMs(deltaM: number): number {
  const d = Number.isFinite(deltaM) ? Math.max(0, deltaM) : 0;
  const f = Math.min(1, Math.max(0, (d - DRAW_SHORT_UNTIL_M) / (DRAW_FULL_AT_M - DRAW_SHORT_UNTIL_M)));
  return Math.round(DRAW_MIN_MS + f * (DRAW_MAX_MS - DRAW_MIN_MS));
}

/** Kolik metrů je za letu vidět na šířku obrazovky: 2 km u krátkých úseků, 3 km od 20 km (lineárně). */
export function flightWidthM(deltaM: number): number {
  const d = Number.isFinite(deltaM) ? Math.max(0, deltaM) : 0;
  return Math.round(2000 + 1000 * Math.min(1, Math.max(0, (d - 2000) / 18_000)));
}

/** Přiblížení MapLibre (dlaždice 512), při kterém je na `screenDp` bodů šířky vidět `widthM` metrů na šířce `lat`. */
export function zoomForWidth(widthM: number, screenDp = SCREEN_DP, lat = 50): number {
  const mPerDpZ0 = (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / TILE_DP;
  return Math.log2((Math.max(1, screenDp) * mPerDpZ0) / Math.max(1, widthM));
}

/**
 * O kolik bodů je `point` na obrazovce od středu mapy `center` při přiblížení `zoom` (Web Mercator, mapa bez náklonu
 * a otočení). Podle toho se kreslí hrot pera, když je kamera o předstih před ním.
 */
export function screenOffsetDp(
  center: { lon: number; lat: number },
  point: { lon: number; lat: number },
  zoom: number,
): { x: number; y: number } {
  const world = TILE_DP * 2 ** zoom;
  const mx = (lon: number) => ((lon + 180) / 360) * world;
  const my = (lat: number) => {
    const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
    return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world;
  };
  return { x: mx(point.lon) - mx(center.lon), y: my(point.lat) - my(center.lat) };
}

export interface PlanPlace {
  id: string;
  kind: "stop" | "discovery";
  atM: number;
}

/** Plné zastavení: zastávka a/nebo konec etapy. */
export interface Halt {
  /** Místo, u kterého se stojí; chybí, když etapa končí mimo místo. */
  placeId?: string;
  /** Index etapy, která tu končí (stání 5 s, pečeť etapy). */
  stageIndex?: number;
  atM: number;
  /** Kdy hrot zastaví (a dopadne razítko). */
  arriveMs: number;
  holdMs: number;
}

/** Místo za letu: let nezastaví, nahoře vyjede štítek. */
export interface Flyby {
  placeId: string;
  atM: number;
  /** Kdy hrot místo mine (dopad razítka a začátek štítku). */
  passMs: number;
  /** Zda let u místa zpomalil (u zastavení nebo na začátku a konci úseku na to není místo). */
  slowed: boolean;
}

export interface StampEvent {
  id: string;
  /** Kdy razítko dopadne (ms od začátku přehrání). */
  atMs: number;
}

/** Úsek kreslení: rychlost se mění z `v0` na `v1` po kosinu (u stálé rychlosti a stání je `v0 = v1`). */
interface Segment {
  t0: number;
  t1: number;
  m0: number;
  /** Rychlost v m/s. */
  v0: number;
  v1: number;
}

export type FlightPhase = "intro" | "dive" | "draw" | "outro" | "done";

export interface ReturnPlan {
  fromM: number;
  toM: number;
  /** Cestovní rychlost kreslení (m/s); rychlost míst za letu je její čtvrtina. */
  cruiseMps: number;
  /** Kolik metrů je za letu vidět na šířku obrazovky (2–3 km). */
  widthM: number;
  drawStartMs: number;
  drawEndMs: number;
  /** Konec závěrečného záběru = konec přehrání (pak souhrn). */
  totalMs: number;
  halts: Halt[];
  flybys: Flyby[];
  /** Rychlá razítka (bez zpomalení a štítku), rozestup ≥ 250 ms od ostatních razítek. */
  stamps: StampEvent[];
  segments: Segment[];
}

type Treat = "halt" | "flyby" | "quick";
interface Item {
  placeId?: string;
  stageIndex?: number;
  kind?: PlanPlace["kind"];
  atM: number;
  treat: Treat;
}

/** Ujetá vzdálenost a rychlost v úseku po `x` sekundách od jeho začátku. */
function segAt(s: Segment, x: number): { m: number; v: number } {
  const T = (s.t1 - s.t0) / 1000;
  if (T <= 0) return { m: s.m0, v: s.v1 };
  const k = Math.min(T, Math.max(0, x));
  const dv = s.v1 - s.v0;
  return {
    m: s.m0 + s.v0 * k + (dv / 2) * (k - (T / Math.PI) * Math.sin((Math.PI * k) / T)),
    v: s.v0 + (dv * (1 - Math.cos((Math.PI * k) / T))) / 2,
  };
}

/**
 * Přechod mezi dvěma kotvami: ujet `G` metrů z rychlosti `va` do `vb` (kosinové rampy, rychlost i zrychlení navazují)
 * se špičkou nejvýš `V`. Vrací posloupnost ramp a rovinek jako [doba s, v0, v1].
 *
 * Pravidlo proti sprintu (balík O): přechod nikdy netrvá kratší dobu než `minS`. Když by běžný tvar (rampy
 * `Ta` a `Tb`, mezi nimi cestovní rychlost) byl kratší, NEzvyšuje se špička, ale protáhnou se rampy:
 *  - je-li cesta delší, než stihne jeden hrb se špičkou `V` za `minS`, rampy se protáhnou a rovinka zkrátí tak,
 *    aby přechod trval přesně `minS` (špička zůstane `V`);
 *  - jinak je přechod jeden hrb délky `minS` se špičkou nižší než `V` (čím kratší cesta, tím nižší);
 *  - když by i ta špička klesla pod rychlost kotvy (velmi krátká mezera), jede se rychlostí pomalejší kotvy
 *    a přechod je kratší (rychlost se tu ale nezvedá nad rychlost kotev).
 * Doba přechodu tak s rostoucí `V` nikdy neroste (půlení intervalu v `solveCruise` zůstane správné) a všechny tři
 * tvary na sebe navazují bez skoku.
 */
function transition(G: number, va: number, vb: number, V: number, Ta: number, Tb: number, minS: number): Array<[number, number, number]> {
  const Rb = Ta + Tb;
  const fa = Ta / Rb;
  const fb = Tb / Rb;
  const w = fa * va + fb * vb;
  const Tmin = Math.max(minS, Rb);
  const full = (Rb * (w + V)) / 2;
  if (G >= full && Rb + (G - full) / V >= Tmin) {
    return [
      [Ta, va, V],
      [(G - full) / V, V, V],
      [Tb, V, vb],
    ];
  }
  if (G >= (Tmin * (w + V)) / 2) {
    const R = (2 * (V * Tmin - G)) / (V - w);
    return [
      [fa * R, va, V],
      [Tmin - R, V, V],
      [fb * R, V, vb],
    ];
  }
  const u = (2 * G) / Tmin - w;
  if (u >= Math.max(va, vb) * (1 - 1e-9)) {
    return [
      [fa * Tmin, va, u],
      [fb * Tmin, u, vb],
    ];
  }
  const top = Math.max(va, vb);
  const T = w + top > 0 ? (2 * G) / (w + top) : 0;
  return [
    [fa * T, va, top],
    [fb * T, top, vb],
  ];
}

/** Sestaví úseky kreslení pro cestovní rychlost `V` (m/s). Vrací i zastavení a místa za letu (časy od 0). */
function buildDraw(items: readonly Item[], fromM: number, toM: number, V: number) {
  if (!(toM > fromM) || !(V > 0)) return { segments: [] as Segment[], halts: [] as Halt[], flybys: [] as Flyby[], drawMs: 0 };
  const slow = FLYBY_SLOW * V;
  const halfSlowM = (slow * FLYBY_SLOW_MS) / 2000;
  const holdOf = (i: Item) => (i.stageIndex !== undefined ? HOLD_STAGE_MS : HOLD_STOP_MS);
  type Anchor = { m0: number; m1: number; v: number; rampS: number; holdMs: number; halt?: Item; flybys: Item[] };
  const zeros: Anchor[] = [{ m0: fromM, m1: fromM, v: 0, rampS: HALT_RAMP_MS / 1000, holdMs: 0, flybys: [] }];
  for (const h of items.filter((i) => i.treat === "halt")) {
    zeros.push({ m0: h.atM, m1: h.atM, v: 0, rampS: HALT_RAMP_MS / 1000, holdMs: holdOf(h), halt: h, flybys: [] });
  }
  const last = zeros[zeros.length - 1]!;
  if (!(last.halt && toM - last.m0 < SAME_POINT_M)) zeros.push({ m0: toM, m1: toM, v: 0, rampS: HALT_RAMP_MS / 1000, holdMs: 0, flybys: [] });
  const minS = (a: Anchor, b: Anchor) => (a.holdMs > 0 || b.holdMs > 0 ? TRANSITION_HALT_MIN_MS : TRANSITION_MIN_MS) / 1000;

  // Místa za letu: zpomalit jen tam, kde se mezi zastavením (startem, cílem) a pomalým průletem vejde celý
  // přechod, který z nuly vystoupá aspoň na pomalou rychlost (jinak by se jen plazil).
  const flyRampS = FLYBY_RAMP_MS / 1000;
  const zeroClearM = (z: Anchor) => {
    const T = Math.max(minS(z, z), z.rampS + flyRampS);
    const w = (flyRampS / (z.rampS + flyRampS)) * slow;
    return halfSlowM + (T * (w + slow)) / 2;
  };
  // Dvě pomalé zóny se oddělí, jen když se mezi ně vejde přechod se špičkou aspoň dvojnásobku pomalé rychlosti.
  const zoneGapM = (TRANSITION_MIN_MS / 1000) * 1.5 * slow;
  // Sloučená zóna trvá nejvýš 2 × FLYBY_SLOW_MS; další místo se už nezpomaluje (štítek a razítko dostane).
  const maxZoneM = (2 * slow * FLYBY_SLOW_MS) / 1000;
  const zones: Anchor[] = [];
  const unslowed = new Set<string>();
  for (const f of items.filter((i) => i.treat === "flyby")) {
    const free = zeros.every((z) => Math.abs(f.atM - z.m0) >= zeroClearM(z));
    const prev = zones[zones.length - 1];
    if (!free) {
      unslowed.add(f.placeId!);
    } else if (prev && f.atM - halfSlowM - prev.m1 < zoneGapM) {
      const m1 = Math.max(prev.m1, f.atM + halfSlowM);
      if (m1 - prev.m0 <= maxZoneM * (1 + 1e-9)) {
        prev.m1 = m1;
        prev.flybys.push(f);
      } else {
        unslowed.add(f.placeId!);
      }
    } else {
      zones.push({ m0: f.atM - halfSlowM, m1: f.atM + halfSlowM, v: slow, rampS: flyRampS, holdMs: 0, flybys: [f] });
    }
  }
  const anchors = [...zeros, ...zones].sort((a, b) => a.m0 - b.m0 || a.v - b.v);

  const segments: Segment[] = [];
  const halts: Halt[] = [];
  let t = 0;
  let m = fromM;
  const push = (dtS: number, v0: number, v1: number) => {
    if (!(dtS > 0)) return;
    const s: Segment = { t0: t, t1: t + dtS * 1000, m0: m, v0, v1 };
    segments.push(s);
    t = s.t1;
    m = segAt(s, dtS).m;
  };
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i]!;
    // Tělo kotvy: stání, nebo pomalý průlet.
    if (a.halt) {
      m = a.m0;
      halts.push({ placeId: a.halt.placeId, stageIndex: a.halt.stageIndex, atM: a.m0, arriveMs: t, holdMs: a.holdMs });
    }
    if (a.holdMs > 0) push(a.holdMs / 1000, 0, 0);
    if (a.v > 0 && a.m1 > a.m0) push((a.m1 - a.m0) / a.v, a.v, a.v);
    if (a.v === 0) m = a.m1;
    const b = anchors[i + 1];
    if (!b) break;
    // Přechod: rozjezd z rychlosti kotvy, jízda, dojezd na rychlost další kotvy.
    const G = Math.max(0, b.m0 - m);
    for (const [dt, v0, v1] of transition(G, a.v, b.v, V, a.rampS, b.rampS, minS(a, b))) push(dt, v0, v1);
    m = b.m0;
  }
  const flybyOut = items
    .filter((i) => i.treat === "flyby")
    .map((f) => ({ placeId: f.placeId!, atM: f.atM, passMs: 0, slowed: !unslowed.has(f.placeId!) }));
  return { segments, halts, flybys: flybyOut, drawMs: t };
}

/** Čas (od začátku kreslení), kdy hrot dorazí na `m`. U zastavení je to příjezd. */
function timeAtM(segments: readonly Segment[], m: number): number {
  for (const s of segments) {
    const end = segAt(s, (s.t1 - s.t0) / 1000).m;
    if (m > end + 1e-9) continue;
    if (m <= s.m0) return s.t0;
    let lo = 0;
    let hi = (s.t1 - s.t0) / 1000;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (segAt(s, mid).m < m) lo = mid;
      else hi = mid;
    }
    return s.t0 + hi * 1000;
  }
  return segments.length ? segments[segments.length - 1]!.t1 : 0;
}

/** Nejdelší kreslení, aby se celé přehrání vešlo do 40 s. */
const DRAW_CAP_MS = RETURN_MAX_MS - INTRO_MS - DIVE_MS - OUTRO_MS;

/**
 * Cestovní rychlost, při které `cost(V)` (doba s rychlostí neroste) klesne na `targetMs` (půlení intervalu).
 * Doba není všude spojitá (podle rychlosti se mění, která místa za letu se stihnou zpomalit), proto `atLeast`
 * vybere stranu skoku: `true` pomalejší (doba ≥ cíl), `false` rychlejší (doba ≤ cíl, pro strop 40 s).
 */
function solveCruise(cost: (V: number) => number, targetMs: number, atLeast = false): number {
  let lo = Math.log(0.5);
  let hi = Math.log(1e6);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (cost(Math.exp(mid)) > targetMs) lo = mid;
    else hi = mid;
  }
  return Math.exp(atLeast ? lo : hi);
}

/**
 * Plán nového letu. Zastávky a konce etap stojí (3,5 s / 5 s), objevy se míjejí za letu se štítkem; od 6 míst v úseku
 * dostanou objevy jen rychlé razítko. Pohyb pera trvá `drawDurationMs` (8–20 s) a stání se k němu přičte; cestovní
 * rychlost nepřekročí `MAX_SCREENS_PER_S` šířek záběru za sekundu (pak pohyb trvá déle). Kdyby celek přesáhl 40 s,
 * změní se nejdřív zastávky (nejtěsněji u jiného místa) na místa za letu, pak místa za letu na rychlá razítka; konce
 * etap zůstanou vždy. Teprve když ani to nestačí, smí cestovní rychlost strop překročit.
 */
export function returnPlan(
  places: readonly PlanPlace[],
  stages: ReadonlyArray<{ index: number; endM: number }>,
  fromM: number,
  toM: number,
  gapMs = MIN_STAMP_GAP_MS,
): ReturnPlan {
  const deltaM = Math.max(0, toM - fromM);
  const inside = [...places].filter((p) => p.atM > fromM && p.atM <= toM).sort((a, b) => a.atM - b.atM);
  const stagesIn = stages.filter((s) => s.endM > fromM && s.endM <= toM);
  const many = inside.length >= QUICK_FROM_PLACES;

  const usedStages = new Set<number>();
  let items: Item[] = [];
  for (const p of inside) {
    const stage = stagesIn.find((s) => !usedStages.has(s.index) && Math.abs(s.endM - p.atM) < SAME_POINT_M);
    if (stage) usedStages.add(stage.index);
    const treat: Treat = stage || p.kind === "stop" ? "halt" : many ? "quick" : "flyby";
    items.push({ placeId: p.id, stageIndex: stage?.index, kind: p.kind, atM: p.atM, treat });
  }
  for (const s of stagesIn) if (!usedStages.has(s.index)) items.push({ stageIndex: s.index, atM: s.endM, treat: "halt" });
  items.sort((a, b) => a.atM - b.atM);

  const holds = (list: readonly Item[]) =>
    list.reduce((sum, i) => sum + (i.treat !== "halt" ? 0 : i.stageIndex !== undefined ? HOLD_STAGE_MS : HOLD_STOP_MS), 0);
  const widthM = flightWidthM(deltaM);
  const maxV = MAX_SCREENS_PER_S * widthM;
  const moveTarget = drawDurationMs(deltaM);
  const solve = (list: readonly Item[], allowFast = false) => {
    if (!(deltaM > 0)) return { V: 0, draw: buildDraw(list, fromM, toM, 0) };
    const held = holds(list);
    // Pohyb má vlastní rozpočet; stání se přičte.
    let V = Math.min(maxV, solveCruise((v) => buildDraw(list, fromM, toM, v).drawMs - held, moveTarget, true));
    if (allowFast && buildDraw(list, fromM, toM, V).drawMs > DRAW_CAP_MS) {
      V = Math.max(V, solveCruise((v) => buildDraw(list, fromM, toM, v).drawMs, DRAW_CAP_MS));
    }
    return { V, draw: buildDraw(list, fromM, toM, V) };
  };
  const fixedMs = INTRO_MS + DIVE_MS + OUTRO_MS;
  let built = solve(items);
  // Rozpočet 40 s: zastávky → místa za letu → rychlá razítka; vždy to, které je nejtěsněji u jiného místa.
  for (const [from, to] of [["halt", "flyby"], ["flyby", "quick"]] as const) {
    while (fixedMs + built.draw.drawMs > RETURN_MAX_MS) {
      let pick = -1;
      let closest = Infinity;
      items.forEach((c, i) => {
        if (c.treat !== from || c.stageIndex !== undefined) return;
        const near = Math.min(c.atM - (items[i - 1]?.atM ?? fromM), (items[i + 1]?.atM ?? toM) - c.atM);
        if (near < closest) {
          closest = near;
          pick = i;
        }
      });
      if (pick < 0) break;
      items = items.map((c, i) => (i === pick ? { ...c, treat: to } : c));
      built = solve(items);
    }
  }
  // Až když nepomohlo nic jiného, má strop 40 s přednost před stropem rychlosti.
  if (fixedMs + built.draw.drawMs > RETURN_MAX_MS) built = solve(items, true);

  const { V, draw } = built;
  const drawStartMs = deltaM > 0 ? INTRO_MS + DIVE_MS : INTRO_MS;
  const shift = (s: Segment): Segment => ({ ...s, t0: s.t0 + drawStartMs, t1: s.t1 + drawStartMs });
  const segments = draw.segments.map(shift);
  const halts = draw.halts.map((h) => ({ ...h, arriveMs: h.arriveMs + drawStartMs }));
  const flybys = draw.flybys.map((f) => ({ ...f, passMs: Math.round(timeAtM(segments, f.atM)) }));
  const drawEndMs = drawStartMs + draw.drawMs;
  const plan: ReturnPlan = {
    fromM,
    toM,
    cruiseMps: V,
    widthM,
    drawStartMs,
    drawEndMs,
    totalMs: Math.round(drawEndMs + OUTRO_MS),
    halts,
    flybys,
    stamps: [],
    segments,
  };

  // Rychlá razítka: když je hrot mine, rozestup ≥ 250 ms od předchozího i od razítek zastavení a míst za letu.
  const fixed = [...halts.map((h) => h.arriveMs), ...flybys.map((f) => f.passMs)];
  let lastAt = -Infinity;
  for (const it of items) {
    if (it.treat !== "quick" || !it.placeId) continue;
    let at = Math.max(timeAtM(segments, it.atM), lastAt + gapMs);
    for (const h of fixed) if (Math.abs(at - h) < gapMs) at = h + gapMs;
    at = Math.round(at);
    plan.stamps.push({ id: it.placeId, atMs: at });
    lastAt = at;
  }
  return plan;
}

/** Fáze přehrání v čase `t`. */
export function phaseAt(plan: ReturnPlan, t: number): FlightPhase {
  if (t < INTRO_MS) return "intro";
  if (t < plan.drawStartMs) return "dive";
  if (t < plan.drawEndMs) return "draw";
  if (t < plan.totalMs) return "outro";
  return "done";
}

function segmentAt(plan: ReturnPlan, t: number): Segment | undefined {
  const s = plan.segments;
  let lo = 0;
  let hi = s.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const g = s[mid]!;
    if (t < g.t0) hi = mid - 1;
    else if (t >= g.t1) lo = mid + 1;
    else return g;
  }
  return undefined;
}

/** Poloha hrotu pera (metry trasy) v čase `t`. Před kreslením je na startu, po něm v cíli. */
export function tipAt(plan: ReturnPlan, t: number): number {
  if (t <= plan.drawStartMs) return plan.fromM;
  if (t >= plan.drawEndMs) return plan.toM;
  const s = segmentAt(plan, t);
  if (!s) return plan.toM;
  return Math.min(plan.toM, segAt(s, (t - s.t0) / 1000).m);
}

/** Rychlost hrotu (m/s) v čase `t`: spojitá, mimo kreslení 0. */
export function speedAt(plan: ReturnPlan, t: number): number {
  const s = t >= plan.drawStartMs && t < plan.drawEndMs ? segmentAt(plan, t) : undefined;
  return s ? segAt(s, (t - s.t0) / 1000).v : 0;
}

/** Kam se dívá kamera za kreslení: střed je před hrotem o předstih úměrný rychlosti (při stání přesně na hrotu). */
export function flightCamera(plan: ReturnPlan, t: number): { tipM: number; centerM: number } {
  const tipM = tipAt(plan, t);
  const share = plan.cruiseMps > 0 ? Math.min(1, speedAt(plan, t) / plan.cruiseMps) : 0;
  return { tipM, centerM: Math.min(plan.toM, tipM + CAMERA_LEAD * plan.widthM * share) };
}

/** Zastavení, které právě probíhá v čase `t`, a kolik z něj zbývá (1 → 0). */
export function activeHalt(plan: ReturnPlan, t: number): { index: number; halt: Halt; remaining: number } | undefined {
  const index = plan.halts.findIndex((h) => t >= h.arriveMs && t < h.arriveMs + h.holdMs);
  if (index < 0) return undefined;
  const halt = plan.halts[index]!;
  return { index, halt, remaining: 1 - (t - halt.arriveMs) / halt.holdMs };
}

/** Štítek místa za letu, který je v čase `t` vidět (2,5 s od průletu; další místo štítek vystřídá). */
export function activeFlyby(plan: ReturnPlan, t: number): { index: number; flyby: Flyby } | undefined {
  for (let i = plan.flybys.length - 1; i >= 0; i--) {
    const f = plan.flybys[i]!;
    if (t >= f.passMs && t < f.passMs + LABEL_MS) return { index: i, flyby: f };
  }
  return undefined;
}

/**
 * Etapa v rámečku mapy za letu: ta, ve které je hrot pera. Konec etapy patří ještě jí, dokud u něj pero stojí
 * (pečeť dopadá); po rozjezdu se rámeček přepne na další etapu. Za koncem výpravy zůstane poslední etapa.
 */
export function flightStageIndex(plan: ReturnPlan, stages: ReadonlyArray<{ index: number; endM: number }>, t: number): number {
  if (!stages.length) return 0;
  const tip = tipAt(plan, t);
  const sealing = (s: { index: number }) =>
    plan.halts.some((h) => h.stageIndex === s.index && t < h.arriveMs + h.holdMs);
  const current = stages.find((s) => tip < s.endM || (tip - s.endM < SAME_POINT_M && sealing(s)));
  return (current ?? stages[stages.length - 1]!).index;
}

/**
 * Horní řádek záhlaví přehrání: dnešní datum jen u návratu z Domů. Přehrání dne z Kroniky ho nemá, protože den
 * už říká nadpis pod ním („2. 11. jste ušli“) a dnešní datum by se s ním pletlo.
 */
export function returnDateLine(source: ReturnSource, now: Date): string | undefined {
  return source === "kronika" ? undefined : formatDayLong(now);
}

/** Celková délka přehrání v ms (bez souhrnu). */
export function returnTotalMs(plan: ReturnPlan): number {
  return plan.totalMs;
}

/** Kolik razítek už dopadlo v čase `elapsedMs`. */
export function stampsLanded(stamps: readonly StampEvent[], elapsedMs: number): string[] {
  return stamps.filter((s) => s.atMs <= elapsedMs).map((s) => s.id);
}

/** Která místa už mají razítko v čase `t`: zastavení, místa za letu a rychlá razítka. */
export function planStampsLanded(plan: ReturnPlan, t: number): string[] {
  const halted = plan.halts.filter((h) => h.placeId !== undefined && h.arriveMs <= t).map((h) => h.placeId!);
  const passed = plan.flybys.filter((f) => f.passMs <= t).map((f) => f.placeId);
  return [...halted, ...passed, ...stampsLanded(plan.stamps, t)];
}

/** Věta na štítek a kartu: první věta, a když je delší než `max` znaků, zkrátí se na celou část věty nebo slovo. */
export function shortSentence(text: string | undefined, max = 140): string | undefined {
  const s = firstSentence(text);
  if (!s || s.length <= max) return s;
  const head = s.slice(0, max);
  const clause = Math.max(head.lastIndexOf(", "), head.lastIndexOf("; "), head.lastIndexOf(" – "));
  if (clause >= max * 0.5) return `${head.slice(0, clause).trimEnd()}…`;
  const word = head.lastIndexOf(" ");
  return `${head.slice(0, word > 0 ? word : max).trimEnd()}…`;
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
 * Horní řádek návratu: kolik přibylo od posledního přehrání („Od posledně přibylo“, „Od včerejška přibylo“,
 * „Od pátku přibylo“ do týdne, jinak „Od 24. 10. přibylo“). Nikdy „Dnes jste ušli“: číslo není součet za celý den
 * a vedle dlaždice „Dnes“ by si odporovalo (docs/nazvoslovi.md).
 */
export function returnHeading(since: string | undefined, today: string): string {
  if (!since) return "Od posledně přibylo";
  const back = dayDiff(today, since);
  if (back <= 0) return "Od posledně přibylo";
  if (back === 1) return "Od včerejška přibylo";
  if (back <= 6) return `Od ${WEEKDAYS_FROM[parseDay(since).getDay()]} přibylo`;
  return `Od ${Number(since.slice(8, 10))}. ${Number(since.slice(5, 7))}. přibylo`;
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
