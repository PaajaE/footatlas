import { describe, expect, it } from "vitest";
import { parseWishes, pluralTrips, UPCOMING, wishCountLabel } from "./upcoming";

describe("připravované výpravy", () => {
  it("jsou jen koncept a mají jedinečná id", () => {
    expect(UPCOMING.every((u) => u.verified === false)).toBe(true);
    expect(new Set(UPCOMING.map((u) => u.id)).size).toBe(UPCOMING.length);
  });
  it("přání: jen známá id s hodnotou true", () => {
    expect(parseWishes({ labe: true, mesic: false, nic: true, krkonose: "ano" })).toEqual({ labe: true });
    expect(parseWishes(null)).toEqual({});
    expect(parseWishes([true])).toEqual({});
    expect(parseWishes(true)).toEqual({});
  });
  it("počet: skloňování a seznam přání", () => {
    expect([1, 2, 4, 5].map(pluralTrips)).toEqual(["1 výprava", "2 výpravy", "4 výpravy", "5 výprav"]);
    expect(wishCountLabel(3, 0)).toBe("3 výpravy");
    expect(wishCountLabel(3, 2)).toBe("2 na seznamu přání");
  });
});
