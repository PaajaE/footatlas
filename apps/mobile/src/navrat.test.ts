import { describe, expect, it } from "vitest";
import { cumulativeM } from "@footatlas/core";
import {
  flightZoom,
  FLIGHT_MAX_MS,
  FLIGHT_MIN_MS,
  counterM,
  dayReplayParams,
  returnSource,
  seenAfter,
  easeInOut,
  easeInOutInverse,
  flightDurationMs,
  flightKeyframes,
  playbackEndMs,
  returnHeading,
  returnRouteLabel,
  sectionBounds,
  shouldShowReturn,
  sinceDay,
  stampSchedule,
  stampsLanded,
} from "./navrat";
import { MIN_STAMP_GAP_MS } from "./seal";

describe("kdy se přehrává návrat", () => {
  it("od 300 m, nového místa nebo etapy", () => {
    expect(shouldShowReturn({ deltaM: 299, newPlaceCount: 0, newStageCount: 0 })).toBe(false);
    expect(shouldShowReturn({ deltaM: 300, newPlaceCount: 0, newStageCount: 0 })).toBe(true);
    expect(shouldShowReturn({ deltaM: 40, newPlaceCount: 1, newStageCount: 0 })).toBe(true);
    expect(shouldShowReturn({ deltaM: 0, newPlaceCount: 0, newStageCount: 1 })).toBe(true);
  });
});

describe("doba letu", () => {
  it("drží se mezi 4 a 9 s a roste s úsekem", () => {
    expect(flightDurationMs(0)).toBe(FLIGHT_MIN_MS);
    expect(flightDurationMs(1000)).toBe(FLIGHT_MIN_MS);
    expect(flightDurationMs(9100)).toBeGreaterThan(FLIGHT_MIN_MS);
    expect(flightDurationMs(9100)).toBeLessThan(FLIGHT_MAX_MS);
    expect(flightDurationMs(15_000)).toBe(FLIGHT_MAX_MS);
    expect(flightDurationMs(60_000)).toBe(FLIGHT_MAX_MS);
    expect(flightDurationMs(Number.NaN)).toBe(FLIGHT_MIN_MS);
  });
});

describe("ease-in-out", () => {
  it("začíná v 0, končí v 1, uprostřed je ½ a je monotónní", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    let prev = 0;
    for (let i = 1; i <= 20; i++) {
      const v = easeInOut(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it("inverze vrací původní čas", () => {
    for (const t of [0, 0.1, 0.3, 0.5, 0.8, 1]) expect(easeInOutInverse(easeInOut(t))).toBeCloseTo(t, 6);
  });
});

const route = [
  { lat: 50, lon: 14 },
  { lat: 50.1, lon: 14 },
  { lat: 50.2, lon: 14.1 },
];
const cum = cumulativeM(route);

describe("klíčové body letu", () => {
  it("začínají na startu úseku a končí na jeho konci, čas roste rovnoměrně", () => {
    const total = cum.at(-1)!;
    const k = flightKeyframes(route, cum, 0, total, 6000, 10);
    expect(k).toHaveLength(11);
    expect(k[0]).toMatchObject({ atMs: 0, m: 0, lat: 50, lon: 14 });
    expect(k.at(-1)).toMatchObject({ atMs: 6000 });
    expect(k.at(-1)!.m).toBeCloseTo(total);
    expect(k[5]!.atMs).toBe(3000);
    // kamera se rozjíždí pomalu: první polovina času ujede méně než polovinu trasy
    expect(k[2]!.m).toBeLessThan(total * 0.2);
  });
});

describe("razítka za letem", () => {
  const places = [
    { id: "a", atM: 1000 },
    { id: "b", atM: 1100 },
    { id: "c", atM: 1200 },
    { id: "mimo", atM: 99_999 },
  ];
  it("dopadají za průletem a nikdy blíž než 250 ms", () => {
    const s = stampSchedule(places, 0, 2000, 5000);
    expect(s.map((x) => x.id)).toEqual(["a", "b", "c"]);
    for (let i = 1; i < s.length; i++) expect(s[i]!.atMs - s[i - 1]!.atMs).toBeGreaterThanOrEqual(MIN_STAMP_GAP_MS);
    // „a“ je v polovině úseku, kamera tam je v polovině času (2500 ms) + zpoždění
    expect(s[0]!.atMs).toBeGreaterThanOrEqual(2500);
  });
  it("místa před startem a za cílem úseku se přeskočí; hranice cíle patří úseku", () => {
    const s = stampSchedule([{ id: "před", atM: 0 }, { id: "cíl", atM: 2000 }], 0, 2000, 4000);
    expect(s.map((x) => x.id)).toEqual(["cíl"]);
  });
  it("rozestupy mohou přehrávání prodloužit za let", () => {
    const dense = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, atM: 1990 + i }));
    const s = stampSchedule(dense, 0, 2000, 4000);
    expect(playbackEndMs(4000, s)).toBeGreaterThan(4000 + 600);
    expect(playbackEndMs(4000, [])).toBe(4000);
  });
  it("kolik jich dopadlo v daný čas", () => {
    const s = [{ id: "a", atMs: 1000 }, { id: "b", atMs: 2000 }];
    expect(stampsLanded(s, 999)).toEqual([]);
    expect(stampsLanded(s, 1000)).toEqual(["a"]);
    expect(stampsLanded(s, 5000)).toEqual(["a", "b"]);
  });
});

describe("počítadlo", () => {
  it("roste z 0 na plnou vzdálenost", () => {
    expect(counterM(9100, 7000, 0)).toBe(0);
    expect(counterM(9100, 7000, 7000)).toBe(9100);
    expect(counterM(9100, 7000, 9999)).toBe(9100);
    expect(counterM(9100, 0, 0)).toBe(9100);
  });
});

describe("nadpis a úsek", () => {
  it("od dne", () => {
    const today = "2026-11-02"; // pondělí
    expect(returnHeading(undefined, today)).toBe("Od posledně jste ušli");
    expect(returnHeading("2026-11-02", today)).toBe("Dnes jste ušli");
    expect(returnHeading("2026-11-01", today)).toBe("Od včerejška jste ušli");
    expect(returnHeading("2026-10-30", today)).toBe("Od pátku jste ušli");
    expect(returnHeading("2026-10-28", today)).toBe("Od středy jste ušli");
    expect(returnHeading("2026-10-24", today)).toBe("Od 24. 10. jste ušli");
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

describe("flightZoom", () => {
  it("krátký úsek letí blízko", () => {
    expect(flightZoom(1400, 4000)).toBeGreaterThanOrEqual(13.5);
  });
  it("dlouhý úsek letí dál, aby kamera nebyla příliš rychlá", () => {
    const z = flightZoom(12_000, 7_900);
    expect(z).toBeLessThanOrEqual(12.5);
    expect(z).toBeGreaterThanOrEqual(11.5);
  });
  it("je vždy v rozsahu 11,5 až 14,5", () => {
    expect(flightZoom(0, 4000)).toBe(14.5);
    expect(flightZoom(500_000, 9000)).toBe(11.5);
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
    expect(returnHeading(sinceDay(slices, seen), "2026-11-09")).toBe("Od 24. 10. jste ušli");
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
