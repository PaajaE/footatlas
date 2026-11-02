import { describe, expect, it } from "vitest";
import { progressArcs, ringPath, sealKm, stageOrdinal, toRoman, waxRingText } from "./seal";

describe("seal", () => {
  it("římské číslice", () => {
    expect(toRoman(1)).toBe("I");
    expect(toRoman(4)).toBe("IV");
    expect(toRoman(9)).toBe("IX");
    expect(toRoman(14)).toBe("XIV");
    expect(toRoman(0)).toBe("0");
  });
  it("pořadí etapy slovy", () => {
    expect(stageOrdinal(1)).toBe("první");
    expect(stageOrdinal(12)).toBe("12");
  });
  it("oblouky postupu: počet, splněné, první začíná nahoře", () => {
    const arcs = progressArcs(2, 5, 66, 66, 56);
    expect(arcs).toHaveLength(5);
    expect(arcs.map((a) => a.done)).toEqual([true, true, false, false, false]);
    expect(arcs[0]!.path.startsWith("M")).toBe(true);
    // Začátek prvního oblouku je těsně napravo od vrcholu (66, 10).
    const [x, y] = arcs[0]!.path.slice(1).split(" A")[0]!.split(" ").map(Number);
    expect(y).toBeCloseTo(10.2, 0);
    expect(x).toBeGreaterThan(66);
    expect(progressArcs(0, 0, 0, 0, 1)).toEqual([]);
  });
  it("jeden segment je skoro celý kruh s příznakem velkého oblouku", () => {
    const [a] = progressArcs(1, 1, 66, 66, 56);
    expect(a!.path).toContain(" 0 1 1 ");
  });
  it("texty", () => {
    expect(sealKm(200)).toBe("km 0,2");
    expect(sealKm(0)).toBe("start");
    expect(waxRingText("Vyšehrad", "km 0,2", "24. 10. 2026")).toBe("Vyšehrad · km 0,2 · 24. 10. 2026 ·");
    expect(ringPath(66, 66, 49)).toBe("M66 66 m-49 0 a49 49 0 1 1 98 0 a49 49 0 1 1 -98 0");
  });
});

import { grungeDash, wobblyCircle } from "./seal";

describe("okraje pečetí", () => {
  it("wobblyCircle je deterministický a uzavřený", () => {
    const a = wobblyCircle(66, 66, 58, 3, 11);
    expect(a).toBe(wobblyCircle(66, 66, 58, 3, 11));
    expect(a).not.toBe(wobblyCircle(66, 66, 58, 3, 12));
    expect(a.startsWith("M")).toBe(true);
    expect(a.endsWith("Z")).toBe(true);
    expect(a.match(/Q/g)).toHaveLength(28);
  });
  it("grungeDash dává sudý počet kladných čísel", () => {
    const parts = grungeDash(340, 4).split(" ").map(Number);
    expect(parts.length % 2).toBe(0);
    expect(parts.every((n) => n > 0)).toBe(true);
  });
});
