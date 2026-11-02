import { describe, expect, it } from "vitest";
import { MIN_GAP_MS, shouldRefresh } from "./refreshPolicy";

describe("shouldRefresh", () => {
  const now = 1_000_000;
  it("bez předchozího čtení načte", () => {
    expect(shouldRefresh({ now, lastReadAt: null, inFlight: false })).toBe(true);
  });
  it("za běhu čtení nenačítá", () => {
    expect(shouldRefresh({ now, lastReadAt: null, inFlight: true })).toBe(false);
    expect(shouldRefresh({ now, lastReadAt: now - 10 * MIN_GAP_MS, inFlight: true })).toBe(false);
  });
  it("v rámci odstupu nenačítá", () => {
    expect(shouldRefresh({ now, lastReadAt: now - (MIN_GAP_MS - 1), inFlight: false })).toBe(false);
  });
  it("po uplynutí odstupu načte", () => {
    expect(shouldRefresh({ now, lastReadAt: now - MIN_GAP_MS, inFlight: false })).toBe(true);
    expect(shouldRefresh({ now, lastReadAt: now - 5_000, inFlight: false, minGapMs: 1_000 })).toBe(true);
  });
});
