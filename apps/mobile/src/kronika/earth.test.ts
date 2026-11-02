import { describe, expect, it } from "vitest";
import {
  CITY_STOPS,
  confidenceShares,
  dayReaching,
  distanceSentence,
  earthShare,
  earthShareLabel,
  estimateSteps,
  EARTH_CIRCUMFERENCE_KM,
  formatKmBig,
  formatStepCount,
  groupThousands,
  haversineKm,
  lifeRoute,
  longestDaySentence,
  nextLifeStop,
  orbitArc,
  PRAGUE,
} from "./earth";

const nb = (s: string | null) => s?.replace(/ /g, " ");

describe("obvod Země", () => {
  it("14 200 km je 35 % obvodu", () => {
    expect(earthShare(14_200_000)).toBeCloseTo(14_200 / EARTH_CIRCUMFERENCE_KM, 6);
    expect(nb(earthShareLabel(14_200_000))).toBe("35 % cesty kolem Země");
  });
  it("pod 1 % se nepíše 0 %", () => {
    expect(nb(earthShareLabel(60_000))).toBe("méně než 1 % cesty kolem Země");
  });
  it("přes celý obvod se píše násobek", () => {
    expect(nb(earthShareLabel(100_000_000))).toBe("2,4× kolem Země");
    expect(earthShare(-5)).toBe(0);
  });
});

describe("formátování", () => {
  it("tisíce a kilometry", () => {
    expect(nb(groupThousands(14_200))).toBe("14 200");
    expect(nb(formatKmBig(14_200_000))).toBe("14 200 km");
    expect(nb(formatKmBig(35_600))).toBe("35,6 km");
    expect(nb(formatKmBig(420))).toBe("420 m");
  });
  it("kroky", () => {
    expect(nb(formatStepCount(18_900_000))).toBe("18,9 mil.");
    expect(nb(formatStepCount(123_456))).toBe("123 000");
    expect(nb(formatStepCount(4_133))).toBe("4 130");
    expect(formatStepCount(42)).toBe("42");
  });
  it("odhad kroků jen z platných vstupů", () => {
    expect(estimateSteps(750, 0.75)).toBe(1000);
    expect(estimateSteps(0, 0.75)).toBeNull();
    expect(estimateSteps(750, 0)).toBeNull();
  });
});

describe("oblouk kolem zeměkoule", () => {
  it("nulový podíl je jen bod, polovina končí v pravém bodě", () => {
    const half = orbitArc(0.5, 120, 105, 104, 30);
    expect(half.end.x).toBeCloseTo(224, 1);
    expect(half.end.y).toBeCloseTo(105, 1);
    expect(half.path).toContain("0 0 0");
  });
  it("přes půlku obvodu je příznak velkého oblouku a konec nad středem", () => {
    const a = orbitArc(0.75, 120, 105, 104, 30);
    expect(a.path).toContain("A104 30 0 1 0");
    expect(a.end.y).toBeLessThan(105);
  });
  it("celý obvod vrací uzavřenou elipsu", () => {
    expect(orbitArc(1, 0, 0, 10, 5).path.match(/A/g)).toHaveLength(2);
    expect(orbitArc(2, 0, 0, 10, 5).path.match(/A/g)).toHaveLength(2);
  });
});

describe("podíly podle důvěry", () => {
  it("dává součet 1", () => {
    const s = confidenceShares({ verified: 82, estimated: 15, manual: 3 });
    expect(s.verified + s.estimated + s.manual).toBeCloseTo(1, 9);
    expect(s.verified).toBeCloseTo(0.82, 9);
  });
  it("prázdná data nedělí nulou", () => {
    expect(confidenceShares({ verified: 0, estimated: 0, manual: 0 })).toEqual({ verified: 0, estimated: 0, manual: 0 });
  });
});

describe("vzdálenosti měst", () => {
  it("vzdušná čára z Prahy odpovídá známým hodnotám", () => {
    const d = (name: string) => CITY_STOPS.find((c) => c.name === name)!.km;
    expect(d("Brno")).toBeGreaterThan(180);
    expect(d("Brno")).toBeLessThan(190);
    expect(d("Řím")).toBeGreaterThan(900);
    expect(d("Řím")).toBeLessThan(940);
    expect(d("Tokio")).toBeGreaterThan(9_000);
    expect(d("Tokio")).toBeLessThan(9_300);
    expect(d("New York")).toBeGreaterThan(6_500);
    expect(d("New York")).toBeLessThan(6_700);
  });
  it("seřazeno vzestupně a nic není za polovinou obvodu Země", () => {
    for (let i = 1; i < CITY_STOPS.length; i++) expect(CITY_STOPS[i]!.km).toBeGreaterThanOrEqual(CITY_STOPS[i - 1]!.km);
    expect(CITY_STOPS[CITY_STOPS.length - 1]!.km).toBeLessThan(EARTH_CIRCUMFERENCE_KM / 2);
  });
  it("haversine: nulová a čtvrtina obvodu", () => {
    expect(haversineKm(PRAGUE, PRAGUE)).toBe(0);
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 90 })).toBeCloseTo((Math.PI / 2) * 6371.0088, 3);
  });
});

describe("věty srovnání", () => {
  it("14 200 km: až do Tokia a ještě pár tisíc km navíc", () => {
    const s = nb(distanceSentence(14_200_000))!;
    expect(s).toMatch(/^To je vzdušnou čarou z Prahy až do (Tokia|Sydney|Buenos Aires) a ještě/);
  });
  it("přesně u města se píše bez „navíc“", () => {
    const rome = CITY_STOPS.find((c) => c.name === "Řím")!;
    expect(distanceSentence(rome.km * 1000 + 10_000)).toBe("To je vzdušnou čarou z Prahy až do Říma.");
  });
  it("menší vzdálenost než první město a nulová data", () => {
    expect(nb(distanceSentence(50_000))).toMatch(/^Z Prahy do Brna je to vzdušnou čarou asi 18\d km/);
    expect(distanceSentence(0)).toBeNull();
  });
  it("nad obvodem Země", () => {
    expect(distanceSentence(45_000_000)).toContain("celá cesta kolem Země");
  });
  it("nejdelší den ve vztahu k trase", () => {
    expect(nb(longestDaySentence(14_200, { name: "Vltavská stezka", totalM: 62_254 }))).toBe(
      "Váš nejdelší den, 14,2 km, je 23 % trasy Vltavská stezka.".replace("14,2 km", "14,2 km"),
    );
    expect(longestDaySentence(70_000, { name: "X", totalM: 62_254 })).toContain("celou trasu X");
    expect(longestDaySentence(0)).toBeNull();
    expect(nb(longestDaySentence(8_000))).toBe("Váš nejdelší den měřil 8,0 km.");
  });
});

describe("životní cesta", () => {
  const days = [
    { date: "2019-03-02", distanceM: 100_000 },
    { date: "2019-03-01", distanceM: 100_000 },
    { date: "2019-03-03", distanceM: 0 },
    { date: "2019-03-04", distanceM: 800_000 },
  ];
  it("den dosažení z kumulativního součtu bez ohledu na pořadí vstupu", () => {
    expect(dayReaching(days, 150)).toBe("2019-03-02");
    expect(dayReaching(days, 190)).toBe("2019-03-02");
    expect(dayReaching(days, 900)).toBe("2019-03-04");
    expect(dayReaching(days, 1_001)).toBeNull();
  });
  it("hotová města s dnem, dvě nejbližší před vámi", () => {
    const r = lifeRoute(days)!;
    const done = r.stations.filter((s) => s.state === "done");
    expect(done.map((s) => s.name)).toEqual(["Brno", "Vídeň", "Řím"]);
    expect(done[0]!.reachedDay).toBe("2019-03-02");
    expect(done[2]!.reachedDay).toBe("2019-03-04");
    const next = r.stations.filter((s) => s.state === "next");
    expect(next).toHaveLength(2);
    expect(next[0]!.remainingKm).toBeGreaterThan(0);
  });
  it("bez záznamů cesta není", () => {
    expect(lifeRoute([])).toBeNull();
    expect(lifeRoute([{ date: "2019-01-01", distanceM: 0 }])).toBeNull();
    expect(nextLifeStop(0)).toBeNull();
  });
  it("další město pro banner", () => {
    const n = nextLifeStop(1_000_000)!;
    expect(n.name).toBe("Reykjavík".length ? n.name : "");
    expect(n.remainingKm).toBeGreaterThan(0);
  });
});
