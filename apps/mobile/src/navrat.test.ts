import { describe, expect, it } from "vitest";
import { cumulativeM } from "@footatlas/core";
import {
  activeFlyby,
  activeHalt,
  dayHeading,
  dayReplayParams,
  DIVE_MS,
  drawDurationMs,
  firstSentence,
  flightCamera,
  flightWidthM,
  FLYBY_SLOW,
  HOLD_STAGE_MS,
  HOLD_STOP_MS,
  INTRO_MS,
  LABEL_MS,
  OUTRO_MS,
  phaseAt,
  planStampsLanded,
  RETURN_MAX_MS,
  RETURN_TARGET_MAX_MS,
  RETURN_TARGET_MIN_MS,
  returnHeading,
  returnPlan,
  returnRouteLabel,
  returnSource,
  returnTotalMs,
  screenOffsetDp,
  sectionBounds,
  seenAfter,
  shortSentence,
  shouldShowReturn,
  sinceDay,
  speedAt,
  stampsLanded,
  tipAt,
  zoomForWidth,
  type ReturnPlan,
} from "./navrat";
import { vltavska } from "./data/vltavska";
import { MIN_STAMP_GAP_MS } from "./seal";

describe("kdy se přehrává návrat", () => {
  it("od 300 m, nového místa nebo etapy", () => {
    expect(shouldShowReturn({ deltaM: 299, newPlaceCount: 0, newStageCount: 0 })).toBe(false);
    expect(shouldShowReturn({ deltaM: 300, newPlaceCount: 0, newStageCount: 0 })).toBe(true);
    expect(shouldShowReturn({ deltaM: 40, newPlaceCount: 1, newStageCount: 0 })).toBe(true);
    expect(shouldShowReturn({ deltaM: 0, newPlaceCount: 0, newStageCount: 1 })).toBe(true);
  });
});


const route = [
  { lat: 50, lon: 14 },
  { lat: 50.1, lon: 14 },
  { lat: 50.2, lon: 14.1 },
];
const cum = cumulativeM(route);


describe("nadpis a úsek", () => {
  it("od dne", () => {
    const today = "2026-11-02"; // pondělí
    expect(returnHeading(undefined, today)).toBe("Od posledně přibylo");
    expect(returnHeading("2026-11-02", today)).toBe("Od posledně přibylo");
    expect(returnHeading("2026-11-01", today)).toBe("Od včerejška přibylo");
    expect(returnHeading("2026-10-30", today)).toBe("Od pátku přibylo");
    expect(returnHeading("2026-10-28", today)).toBe("Od středy přibylo");
    expect(returnHeading("2026-10-24", today)).toBe("Od 24. 10. přibylo");
  });
  it("jeden den z Kroniky", () => {
    const today = "2026-11-02"; // pondělí
    expect(dayHeading(undefined, today)).toBe("Ten den jste ušli");
    expect(dayHeading("2026-11-02", today)).toBe("Dnes jste ušli");
    expect(dayHeading("2026-11-01", today)).toBe("Včera jste ušli");
    expect(dayHeading("2026-10-30", today)).toBe("V pátek jste ušli");
    expect(dayHeading("2026-10-28", today)).toBe("Ve středu jste ušli");
    expect(dayHeading("2026-10-24", today)).toBe("24. 10. jste ušli");
  });
  it("den, kdy začal sbíraný úsek", () => {
    const slices = [
      { day: "2026-10-20", distanceM: 4000 },
      { day: "2026-10-21", distanceM: 5000 },
    ];
    expect(sinceDay(slices, 0)).toBe("2026-10-20");
    expect(sinceDay(slices, 3999)).toBe("2026-10-20");
    expect(sinceDay(slices, 4000)).toBe("2026-10-21");
    expect(sinceDay(slices, 9000)).toBeUndefined();
    expect(sinceDay([], 0)).toBeUndefined();
  });
  it("A → B", () => {
    const ps = [
      { name: "Karlův most", atM: 2576 },
      { name: "Štvanice", atM: 4936 },
      { name: "Troja", atM: 10477 },
      { name: "Sedlec", atM: 12364 },
    ];
    expect(returnRouteLabel(ps, 3000, 11_000)).toBe("Karlův most → Troja");
    expect(returnRouteLabel(ps, 3000, 4000)).toBe("Karlův most → Štvanice");
    expect(returnRouteLabel(ps, 100, 200)).toBeUndefined();
  });
  it("hranice úseku", () => {
    const total = cum.at(-1)!;
    const b = sectionBounds(route, cum, 0, total);
    expect(b).toEqual([14, 50, 14.1, 50.2]);
  });
});

describe("kdy se návrat spotřebuje (rozhodnutí 0024)", () => {
  /** Karta „Od posledně“ podle stejné podmínky jako na Domů (bez nových míst a etap). */
  const cardShown = (seenM: number, walkedM: number) => shouldShowReturn({ deltaM: walkedM - seenM, newPlaceCount: 0, newStageCount: 0 });

  it("odchod z Domů (jiná záložka, zastávka) kartu nespotřebuje", () => {
    expect(seenAfter(1000, 4000, { kind: "leave" })).toBe(1000);
    expect(cardShown(seenAfter(1000, 4000, { kind: "leave" }), 4000)).toBe(true);
  });

  it("přehrání z Domů do konce zapamatuje konec přehraného úseku", () => {
    expect(seenAfter(1000, 4000, { kind: "finish", source: "domu", toM: 4000 })).toBe(4000);
    expect(cardShown(4000, 4000)).toBe(false);
    // Co přibylo během přehrávání, zůstane na příště.
    expect(seenAfter(1000, 4500, { kind: "finish", source: "domu", toM: 4000 })).toBe(4000);
  });

  it("přehrání dne z Kroniky návrat nespotřebuje", () => {
    expect(seenAfter(1000, 4000, { kind: "finish", source: "kronika", toM: 4000 })).toBe(1000);
  });

  it("„Zavřít“ na kartě zapamatuje celý postup", () => {
    expect(seenAfter(1000, 4000, { kind: "dismiss" })).toBe(4000);
  });

  it("viděná hodnota nikdy neklesá a nepřeskočí ušlou", () => {
    expect(seenAfter(5000, 4000, { kind: "dismiss" })).toBe(5000);
    expect(seenAfter(1000, 4000, { kind: "finish", source: "domu", toM: 9000 })).toBe(4000);
  });

  it("zdroj z adresy: jen „kronika“ je přehrání z Kroniky", () => {
    expect(returnSource("kronika")).toBe("kronika");
    expect(returnSource(undefined)).toBe("domu");
    expect(returnSource("cokoli")).toBe("domu");
    expect(returnSource(["kronika"])).toBe("domu");
  });

  it("neviděné dny se sčítají a karta ukazuje „Od 24. 10. jste ušli“", () => {
    const slices = [
      { day: "2026-10-20", distanceM: 3000 },
      { day: "2026-10-24", distanceM: 2000 },
      { day: "2026-10-27", distanceM: 4000 },
      { day: "2026-11-02", distanceM: 1500 },
    ];
    // Naposledy viděno uprostřed 24. 10.; mezitím se Domů několikrát opustilo bez přehrání.
    let seen = 4000;
    for (let i = 0; i < 3; i++) seen = seenAfter(seen, 10_500, { kind: "leave" });
    expect(seen).toBe(4000);
    expect(cardShown(seen, 10_500)).toBe(true);
    expect(returnHeading(sinceDay(slices, seen), "2026-11-09")).toBe("Od 24. 10. přibylo");
    expect(returnRouteLabel([{ name: "A", atM: 2000 }, { name: "B", atM: 9000 }], seen, 10_500)).toBe("A → B");
    // Po přehrání zmizí.
    seen = seenAfter(seen, 10_500, { kind: "finish", source: "domu", toM: 10_500 });
    expect(cardShown(seen, 10_500)).toBe(false);
  });
});

describe("přehrát den z Kroniky", () => {
  it("úsek dne jako parametry a zdroj Kronika", () => {
    expect(dayReplayParams({ fromM: 9100.4, toM: 12_200.6 })).toEqual({ from: "9100", to: "12201", zdroj: "kronika" });
  });
  it("den bez úseku se nepřehrává", () => {
    expect(dayReplayParams({ fromM: 5000, toM: 5000 })).toBeUndefined();
  });
});

describe("první věta háčku", () => {
  it("vezme první větu, datum s tečkou ji neutne", () => {
    expect(firstSentence("Pět set let se mu říkalo prostě Kamenný most.")).toBe("Pět set let se mu říkalo prostě Kamenný most.");
    expect(firstSentence("V roce 1869 tu stálo 27 domů. Dnes jich je 765.")).toBe("V roce 1869 tu stálo 27 domů.");
    expect(firstSentence("Tady byl 19. února 982 zvolen biskup. Další věta.")).toBe("Tady byl 19. února 982 zvolen biskup.");
    expect(firstSentence(undefined)).toBeUndefined();
    expect(firstSentence("  ")).toBeUndefined();
  });
});

describe("krátká věta na štítek", () => {
  it("krátkou první větu nechá celou, dlouhou zkrátí na část věty nebo slovo", () => {
    expect(shortSentence("Krátká věta. Druhá.")).toBe("Krátká věta.");
    const long = `${"slovo ".repeat(15)}a pak, ${"další ".repeat(20)}konec.`;
    const s = shortSentence(long, 140)!;
    expect(s.length).toBeLessThanOrEqual(141);
    expect(s.endsWith("…")).toBe(true);
    expect(shortSentence(undefined)).toBeUndefined();
  });
});

describe("kamera a obrazovka", () => {
  it("doba kreslení 8–20 s a šířka záběru 2–3 km podle délky úseku", () => {
    expect(drawDurationMs(0)).toBe(8000);
    expect(drawDurationMs(15_000)).toBe(20_000);
    expect(drawDurationMs(80_000)).toBe(20_000);
    expect(drawDurationMs(Number.NaN)).toBe(8000);
    expect(flightWidthM(500)).toBe(2000);
    expect(flightWidthM(23_400)).toBe(3000);
    expect(flightWidthM(11_000)).toBeGreaterThan(2000);
    expect(flightWidthM(11_000)).toBeLessThan(3000);
  });
  it("přiblížení pro 2–3 km na šířku telefonu je kolem 13, ne 15 (500 m)", () => {
    const z = zoomForWidth(2500, 411, 50.2);
    expect(z).toBeGreaterThan(12.5);
    expect(z).toBeLessThan(13.5);
    expect(zoomForWidth(500, 411, 50.2) - z).toBeCloseTo(Math.log2(5), 6);
  });
  it("posun bodu na obrazovce odpovídá šířce záběru", () => {
    const z = zoomForWidth(2000, 400, 50);
    // 1000 m na východ je čtvrt šířky obrazovky (100 bodů) na stejné šířce.
    const dLon = 1000 / (111_320 * Math.cos((50 * Math.PI) / 180));
    const o = screenOffsetDp({ lon: 14, lat: 50 }, { lon: 14 + dLon, lat: 50 }, z);
    expect(o.x).toBeCloseTo(200, 0);
    expect(Math.abs(o.y)).toBeLessThan(1e-6);
    // Na sever je y záporné (nahoru).
    expect(screenOffsetDp({ lon: 14, lat: 50 }, { lon: 14, lat: 50.01 }, z).y).toBeLessThan(0);
  });
});

/** Rychlost vzorkovaná po 16 ms (jeden snímek) přes celé přehrání, vztažená k cestovní rychlosti. */
function speedSamples(plan: ReturnPlan): number[] {
  const out: number[] = [];
  for (let t = 0; t <= plan.totalMs + 32; t += 16) out.push(speedAt(plan, t) / plan.cruiseMps);
  return out;
}
/** Největší skok rychlosti mezi dvěma snímky (jako část cestovní rychlosti). */
function maxJump(plan: ReturnPlan): number {
  const v = speedSamples(plan);
  let max = 0;
  for (let i = 1; i < v.length; i++) max = Math.max(max, Math.abs(v[i]! - v[i - 1]!));
  return max;
}
/** Rychlost se mezi snímky smí změnit nejvýš o 5 % cestovní (kosinová rampa 0,6 s dělá nejvýš ~3,1 %). */
const MAX_JUMP = 0.05;

describe("nový let: střih a spojitá rychlost (rozhodnutí 0033)", () => {
  const stop = (id: string, atM: number) => ({ id, kind: "stop" as const, atM });
  const disc = (id: string, atM: number) => ({ id, kind: "discovery" as const, atM });

  it("úvodní záběr 2 s, ponoření 1 s, kreslení, závěrečný záběr 1,5 s", () => {
    const plan = returnPlan([], [], 0, 10_000);
    expect(phaseAt(plan, 0)).toBe("intro");
    expect(phaseAt(plan, INTRO_MS - 1)).toBe("intro");
    expect(phaseAt(plan, INTRO_MS)).toBe("dive");
    expect(plan.drawStartMs).toBe(INTRO_MS + DIVE_MS);
    expect(phaseAt(plan, plan.drawStartMs)).toBe("draw");
    expect(plan.drawEndMs - plan.drawStartMs).toBeCloseTo(drawDurationMs(10_000), -1);
    expect(phaseAt(plan, plan.drawEndMs)).toBe("outro");
    expect(plan.totalMs - plan.drawEndMs).toBeCloseTo(OUTRO_MS, -1);
    expect(phaseAt(plan, plan.totalMs)).toBe("done");
    // Před kreslením je hrot na startu, po něm v cíli; rychlost mimo kreslení je 0.
    expect(tipAt(plan, INTRO_MS + 500)).toBe(0);
    expect(tipAt(plan, plan.drawEndMs + 1)).toBe(10_000);
    expect(speedAt(plan, 100)).toBe(0);
    expect(speedAt(plan, plan.totalMs - 10)).toBe(0);
  });

  it("rychlost je spojitá: žádný skok po zastavení ani u místa za letu", () => {
    const plan = returnPlan(
      [disc("a", 3000), stop("b", 8000), disc("c", 12_000), disc("d", 12_400), stop("e", 18_000)],
      [{ index: 2, endM: 18_000 }],
      0,
      23_400,
    );
    expect(plan.halts.map((h) => h.placeId)).toEqual(["b", "e"]);
    expect(maxJump(plan)).toBeLessThan(MAX_JUMP);
    // Poloha nikdy necouvá a končí přesně v cíli.
    let prev = 0;
    for (let t = 0; t <= plan.totalMs; t += 16) {
      const m = tipAt(plan, t);
      expect(m).toBeGreaterThanOrEqual(prev - 1e-6);
      prev = m;
    }
    expect(tipAt(plan, plan.drawEndMs - 1)).toBeCloseTo(23_400, 0);
  });

  it("zastávka 3,5 s a konec etapy 5 s: plné zastavení přesně u místa, dojezd i rozjezd ~0,8 s", () => {
    const plan = returnPlan([stop("a", 5000), stop("b", 9000)], [{ index: 0, endM: 9000 }], 0, 15_000);
    expect(plan.halts.map((h) => [h.placeId, h.holdMs, h.stageIndex])).toEqual([
      ["a", HOLD_STOP_MS, undefined],
      ["b", HOLD_STAGE_MS, 0],
    ]);
    const h = plan.halts[0]!;
    expect(tipAt(plan, h.arriveMs + 10)).toBeCloseTo(5000, 3);
    expect(tipAt(plan, h.arriveMs + h.holdMs - 10)).toBeCloseTo(5000, 3);
    expect(speedAt(plan, h.arriveMs + 100)).toBe(0);
    // 0,8 s před zastavením se jede plnou rychlostí, za 0,4 s je to polovina, pak nula.
    expect(speedAt(plan, h.arriveMs - 810) / plan.cruiseMps).toBeCloseTo(1, 2);
    expect(speedAt(plan, h.arriveMs - 400) / plan.cruiseMps).toBeCloseTo(0.5, 2);
    expect(speedAt(plan, h.arriveMs - 1)).toBeLessThan(0.01 * plan.cruiseMps);
    // Rozjezd: hned po stání pomalu, po 0,8 s plnou rychlostí.
    const go = h.arriveMs + h.holdMs;
    expect(speedAt(plan, go + 16) / plan.cruiseMps).toBeLessThan(0.01);
    expect(speedAt(plan, go + 810) / plan.cruiseMps).toBeCloseTo(1, 2);
    expect(activeHalt(plan, h.arriveMs + h.holdMs / 2)?.remaining).toBeCloseTo(0.5, 9);
    expect(activeHalt(plan, go)).toBeUndefined();
  });

  it("konec etapy mimo místo je samostatné zastavení s pečetí", () => {
    const plan = returnPlan([], [{ index: 1, endM: 3000 }], 0, 6000);
    expect(plan.halts).toHaveLength(1);
    expect(plan.halts[0]).toMatchObject({ stageIndex: 1, holdMs: HOLD_STAGE_MS });
    expect(plan.halts[0]!.placeId).toBeUndefined();
  });

  it("místo za letu: zpomalí na čtvrtinu, nezastaví, štítek 2,5 s", () => {
    const plan = returnPlan([disc("a", 10_000)], [], 0, 20_000);
    expect(plan.halts).toEqual([]);
    const f = plan.flybys[0]!;
    expect(f).toMatchObject({ placeId: "a", slowed: true });
    expect(tipAt(plan, f.passMs)).toBeCloseTo(10_000, 0);
    expect(speedAt(plan, f.passMs) / plan.cruiseMps).toBeCloseTo(FLYBY_SLOW, 3);
    let min = Infinity;
    for (let t = f.passMs - 2000; t < f.passMs + 2000; t += 16) min = Math.min(min, speedAt(plan, t));
    expect(min / plan.cruiseMps).toBeCloseTo(FLYBY_SLOW, 3);
    expect(activeFlyby(plan, f.passMs - 1)).toBeUndefined();
    expect(activeFlyby(plan, f.passMs)?.flyby.placeId).toBe("a");
    expect(activeFlyby(plan, f.passMs + LABEL_MS - 1)).toBeDefined();
    expect(activeFlyby(plan, f.passMs + LABEL_MS)).toBeUndefined();
    expect(planStampsLanded(plan, f.passMs)).toEqual(["a"]);
    expect(maxJump(plan)).toBeLessThan(MAX_JUMP);
  });

  it("místa za letu těsně za sebou zpomalí jednou, místo těsně u zastávky nezpomaluje", () => {
    const plan = returnPlan([disc("a", 9000), disc("b", 9100), disc("c", 14_950), stop("d", 15_000)], [], 0, 20_000);
    expect(plan.flybys.map((f) => [f.placeId, f.slowed])).toEqual([
      ["a", true],
      ["b", true],
      ["c", false],
    ]);
    expect(maxJump(plan)).toBeLessThan(MAX_JUMP);
  });

  it("kamera má předstih ~20 % šířky před hrotem při plné rychlosti, při stání je na hrotu", () => {
    const plan = returnPlan([stop("a", 10_000)], [], 0, 20_000);
    const cruiseT = plan.drawStartMs + 2000;
    const c = flightCamera(plan, cruiseT);
    expect(c.centerM - c.tipM).toBeCloseTo(0.2 * plan.widthM, 0);
    const h = plan.halts[0]!;
    const atHalt = flightCamera(plan, h.arriveMs + 500);
    expect(atHalt.centerM).toBeCloseTo(atHalt.tipM, 6);
    // Předstih se mění plynule (spojitě s rychlostí), nikdy za cíl.
    let prev = flightCamera(plan, plan.drawStartMs).centerM;
    for (let t = plan.drawStartMs; t <= plan.drawEndMs; t += 16) {
      const now = flightCamera(plan, t).centerM;
      expect(Math.abs(now - prev)).toBeLessThan(0.05 * plan.widthM);
      expect(now).toBeLessThanOrEqual(20_000);
      prev = now;
    }
  });

  it("od 6 míst dostanou objevy jen rychlé razítko, rozestup ≥ 250 ms", () => {
    const places = [disc("a", 1000), disc("b", 2000), stop("c", 3000), disc("d", 4000), disc("e", 5000), disc("f", 6000)];
    const plan = returnPlan(places, [], 0, 7000);
    expect(plan.halts.map((h) => h.placeId)).toEqual(["c"]);
    expect(plan.flybys).toEqual([]);
    expect(plan.stamps.map((s) => s.id)).toEqual(["a", "b", "d", "e", "f"]);
    const all = [...plan.stamps.map((s) => s.atMs), plan.halts[0]!.arriveMs].sort((x, y) => x - y);
    for (let i = 1; i < all.length; i++) expect(all[i]! - all[i - 1]!).toBeGreaterThanOrEqual(250);
    // Při 5 místech jsou objevy místa za letu se štítkem.
    expect(returnPlan(places.slice(0, 5), [], 0, 7000).flybys).toHaveLength(4);
    expect(stampsLanded(plan.stamps, 0)).toEqual([]);
  });

  it("běžný denní úsek (10–25 km, pár míst) trvá 20–25 s", () => {
    const cases = [
      returnPlan([], [], 0, 23_400),
      returnPlan([disc("a", 4000), stop("b", 11_000)], [], 0, 15_000),
      returnPlan([stop("a", 6000)], [], 0, 10_000),
      returnPlan([disc("a", 3000), disc("b", 9000)], [{ index: 0, endM: 18_000 }], 0, 18_000),
    ];
    for (const plan of cases) {
      expect(returnTotalMs(plan)).toBeGreaterThanOrEqual(RETURN_TARGET_MIN_MS);
      expect(returnTotalMs(plan)).toBeLessThanOrEqual(RETURN_TARGET_MAX_MS);
      expect(maxJump(plan)).toBeLessThan(MAX_JUMP);
    }
  });

  it("mnoho míst a etap: nejvýš 40 s, konce etap zůstanou, každé místo má razítko", () => {
    const places = Array.from({ length: 10 }, (_, i) => stop(`s${i}`, (i + 1) * 6000));
    const stages = [{ index: 0, endM: 18_000 }, { index: 1, endM: 42_000 }];
    const plan = returnPlan(places, stages, 0, 62_000);
    expect(returnTotalMs(plan)).toBeLessThanOrEqual(RETURN_MAX_MS);
    expect(plan.halts.filter((h) => h.stageIndex !== undefined).map((h) => h.placeId)).toEqual(["s2", "s6"]);
    expect(plan.halts.length + plan.flybys.length + plan.stamps.length).toBe(10);
    expect(maxJump(plan)).toBeLessThan(MAX_JUMP);
  });

  it("pilot: celá výprava i denní úseky Vltavské stezky", () => {
    const places = vltavska.places.map((p) => ({ id: p.id, kind: p.kind, atM: p.atM }));
    const whole = returnPlan(places, vltavska.plan.stages, 0, vltavska.totalM);
    expect(returnTotalMs(whole)).toBeLessThanOrEqual(RETURN_MAX_MS);
    expect(whole.halts.filter((h) => h.stageIndex !== undefined)).toHaveLength(vltavska.plan.stages.length);
    expect(maxJump(whole)).toBeLessThan(MAX_JUMP);
    for (let from = 0; from + 5000 <= vltavska.totalM; from += 3700) {
      for (const len of [3000, 9000, 16_000]) {
        const to = Math.min(vltavska.totalM, from + len);
        const plan = returnPlan(places, vltavska.plan.stages, from, to);
        expect(returnTotalMs(plan)).toBeLessThanOrEqual(RETURN_MAX_MS);
        expect(maxJump(plan)).toBeLessThan(MAX_JUMP);
        expect(tipAt(plan, plan.drawEndMs)).toBe(to);
      }
    }
  });

  it("bez postupu se nekreslí", () => {
    const plan = returnPlan([], [], 5000, 5000);
    expect(plan.drawEndMs).toBe(plan.drawStartMs);
    expect(plan.cruiseMps).toBe(0);
    expect(speedAt(plan, plan.drawStartMs + 10)).toBe(0);
  });
});
