import { describe, expect, it } from "vitest";
import { formatDistance, formatKm } from "./format";

describe("formatDistance", () => {
  it("pod 15 m je „Jste tady“", () => {
    expect(formatDistance(0)).toBe("Jste tady");
    expect(formatDistance(14)).toBe("Jste tady");
    expect(formatDistance(14.9)).toBe("Jste tady");
  });

  it("záporná hodnota se chová jako 0", () => {
    expect(formatDistance(-5)).toBe("Jste tady");
    expect(formatDistance(-5000)).toBe("Jste tady");
    expect(formatDistance(Number.NaN)).toBe("Jste tady");
  });

  it("od 15 m zaokrouhluje na desítky metrů", () => {
    expect(formatDistance(15)).toBe("20 m");
    expect(formatDistance(44)).toBe("40 m");
    expect(formatDistance(45)).toBe("50 m");
    expect(formatDistance(347)).toBe("350 m");
    expect(formatDistance(994)).toBe("990 m");
    expect(formatDistance(999)).toBe("1,0 km");
  });

  it("bez délky kroku se kroky nepíšou", () => {
    expect(formatDistance(40)).toBe("40 m");
  });

  it("kroky: počet a zaokrouhlení", () => {
    expect(formatDistance(40, { stepLengthM: 0.73 })).toBe("40 m · asi 55 kroků");
    expect(formatDistance(350, { stepLengthM: 0.7 })).toBe("350 m · asi 500 kroků");
    // pod 20 kroků bez zaokrouhlení na pětky
    expect(formatDistance(15, { stepLengthM: 1 })).toBe("20 m · asi 15 kroků");
    expect(formatDistance(18, { stepLengthM: 1 })).toBe("20 m · asi 18 kroků");
    // od 20 kroků na nejbližších 5
    expect(formatDistance(22, { stepLengthM: 1 })).toBe("20 m · asi 20 kroků");
    expect(formatDistance(23.4, { stepLengthM: 1 })).toBe("20 m · asi 25 kroků");
  });

  it("kroky: česká množná čísla", () => {
    expect(formatDistance(15, { stepLengthM: 15 })).toBe("20 m · asi 1 krok");
    expect(formatDistance(30, { stepLengthM: 15 })).toBe("30 m · asi 2 kroky");
    expect(formatDistance(60, { stepLengthM: 15 })).toBe("60 m · asi 4 kroky");
    expect(formatDistance(75, { stepLengthM: 15 })).toBe("80 m · asi 5 kroků");
    expect(formatDistance(100, { stepLengthM: 0.75 })).toBe("100 m · asi 135 kroků");
  });

  it("neplatná délka kroku se ignoruje", () => {
    expect(formatDistance(100, { stepLengthM: 0 })).toBe("100 m");
    expect(formatDistance(100, { stepLengthM: -1 })).toBe("100 m");
    expect(formatDistance(100, { stepLengthM: Number.NaN })).toBe("100 m");
  });

  it("u kilometrů se kroky nepíšou", () => {
    expect(formatDistance(1000, { stepLengthM: 0.7 })).toBe("1,0 km");
  });

  it("1 až 10 km s desetinnou čárkou", () => {
    expect(formatDistance(1000)).toBe("1,0 km");
    expect(formatDistance(3400)).toBe("3,4 km");
    expect(formatDistance(3449)).toBe("3,4 km");
    expect(formatDistance(3450)).toBe("3,5 km");
    expect(formatDistance(9949)).toBe("9,9 km");
  });

  it("od 10 km po celých kilometrech", () => {
    expect(formatDistance(9950)).toBe("10 km");
    expect(formatDistance(9999)).toBe("10 km");
    expect(formatDistance(10000)).toBe("10 km");
    expect(formatDistance(23000)).toBe("23 km");
    expect(formatDistance(23500)).toBe("24 km");
  });

  it("nikdy nevrátí „0,0 km“", () => {
    for (const m of [0, 1, 14, 15, 99, 500, 999, 1000, 1049, 5000, 12345]) {
      expect(formatDistance(m)).not.toContain("0,0 km");
    }
  });
});

describe("formatKm", () => {
  it("zachovává dosavadní chování", () => {
    expect(formatKm(12500)).toBe("12,5 km");
    expect(formatKm(62000)).toBe("62,0 km");
    expect(formatKm(35600, 0)).toBe("36 km");
  });
});
