import { describe, expect, it } from "vitest";
import {
  cumulativeM,
  haversineM,
  positionAt,
  projectOnto,
  routeLengthM,
  simplify,
  simplifyToLimit,
  splitStages,
  type RoutePoint,
} from "./index";

// Úsek podél poledníku: 1 stupeň šířky je ~111,195 km.
const meridian = (n: number, stepDeg = 0.01): RoutePoint[] =>
  Array.from({ length: n }, (_, i) => ({ lat: 50 + i * stepDeg, lon: 14 }));

describe("vzdálenost", () => {
  it("stupeň šířky je asi 111,2 km", () => {
    expect(haversineM({ lat: 50, lon: 14 }, { lat: 51, lon: 14 })).toBeCloseTo(111_195, -2);
  });
  it("Praha - Řím vychází kolem 920 km", () => {
    const d = haversineM({ lat: 50.0755, lon: 14.4378 }, { lat: 41.9028, lon: 12.4964 });
    expect(d / 1000).toBeGreaterThan(900);
    expect(d / 1000).toBeLessThan(940);
  });
  it("kumulativní vzdálenost začíná nulou a roste", () => {
    const c = cumulativeM(meridian(4));
    expect(c[0]).toBe(0);
    expect(c[3]).toBeCloseTo(3 * 1111.95, 0);
    expect(routeLengthM(meridian(4))).toBeCloseTo(c[3]!, 6);
  });
});

describe("positionAt", () => {
  const pts = meridian(3, 0.1);
  const cum = cumulativeM(pts);
  it("na začátku a na konci", () => {
    expect(positionAt(pts, cum, 0).lat).toBe(50);
    expect(positionAt(pts, cum, 99_999_999).lat).toBeCloseTo(50.2, 9);
  });
  it("uprostřed prvního úseku", () => {
    const p = positionAt(pts, cum, cum[1]! / 2);
    expect(p.lat).toBeCloseTo(50.05, 6);
    expect(p.segment).toBe(0);
  });
  it("v bodě zlomu je v dalším úseku", () => {
    expect(positionAt(pts, cum, cum[1]!).segment).toBe(1);
  });
  it("interpoluje výšku", () => {
    const p = positionAt([{ lat: 50, lon: 14, ele: 100 }, { lat: 50.1, lon: 14, ele: 200 }], [0, 11_119.5], 5_559.75);
    expect(p.ele).toBeCloseTo(150, 3);
  });
});

describe("zjednodušení", () => {
  it("odstraní body na přímce a zachová délku", () => {
    const pts = meridian(101);
    const s = simplify(pts, 5);
    expect(s).toHaveLength(2);
    expect(routeLengthM(s)).toBeCloseTo(routeLengthM(pts), 3);
  });
  it("zachová roh", () => {
    const pts: RoutePoint[] = [
      { lat: 50, lon: 14 },
      { lat: 50.05, lon: 14 },
      { lat: 50.05, lon: 14.1 },
    ];
    expect(simplify(pts, 5)).toHaveLength(3);
  });
  it("šum menší než tolerance zmizí a délka se změní o méně než 1 %", () => {
    const pts: RoutePoint[] = Array.from({ length: 400 }, (_, i) => ({
      lat: 50 + i * 0.0005,
      lon: 14 + (i % 2 === 0 ? 0.00001 : -0.00001),
    }));
    const s = simplify(pts, 5);
    expect(s.length).toBeLessThan(10);
    expect(Math.abs(routeLengthM(s) - routeLengthM(pts)) / routeLengthM(pts)).toBeLessThan(0.01);
  });
  it("simplifyToLimit zvětší toleranci, aby se vešel do limitu", () => {
    const wiggly: RoutePoint[] = Array.from({ length: 2000 }, (_, i) => ({
      lat: 50 + i * 0.001,
      lon: 14 + Math.sin(i / 7) * 0.002,
    }));
    const s = simplifyToLimit(wiggly, 100);
    expect(s.length).toBeLessThanOrEqual(100);
    expect(s[0]).toBe(wiggly[0]);
    expect(s.at(-1)).toBe(wiggly.at(-1));
  });
});

describe("projectOnto", () => {
  const pts = meridian(11, 0.01); // ~11,1 km
  const cum = cumulativeM(pts);
  it("bod těsně vedle trasy", () => {
    const r = projectOnto(pts, cum, 50.05, 14.001)!;
    expect(r.atM).toBeCloseTo(cum[5]!, -1);
    expect(r.offsetM).toBeCloseTo(71.5, 0);
  });
  it("před začátkem se ořízne na start", () => {
    expect(projectOnto(pts, cum, 49.9, 14)!.atM).toBe(0);
  });
  it("příliš krátká trasa nelze promítat", () => {
    expect(projectOnto([pts[0]!], [0], 50, 14)).toBeNull();
  });
  it("trasa tam a zpět: bez okna vyhraje dřívější průchod, s oknem ten pozdější", () => {
    const out = meridian(11, 0.01);
    const back = [...out, ...out.slice(0, -1).reverse()];
    const c = cumulativeM(back);
    const total = c.at(-1)!;
    const first = projectOnto(back, c, 50.05, 14)!;
    const second = projectOnto(back, c, 50.05, 14, { fromM: total * 0.6 })!;
    expect(first.atM).toBeCloseTo(c[5]!, 0);
    expect(second.atM).toBeCloseTo(total - c[5]!, 0);
    expect(second.atM).toBeGreaterThan(first.atM);
  });
});

describe("etapy", () => {
  it("rozdělí rovnoměrně", () => {
    expect(splitStages(62_000, 20_000)).toEqual([62_000 / 3, (2 * 62_000) / 3, 62_000]);
  });
  it("krátká trasa má jednu etapu", () => {
    expect(splitStages(8_000)).toEqual([8_000]);
  });
  it("nulová trasa nemá etapy", () => {
    expect(splitStages(0)).toEqual([]);
  });
});
