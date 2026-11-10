import { describe, expect, it } from "vitest";
import { PLACE_SYMBOLS } from "@footatlas/content/src/symbols";
import { GLYPHS, GLYPH_STROKE } from "./glyphs";

describe("kresby symbolů", () => {
  it("každý ze 16 symbolů má kresbu", () => {
    expect(Object.keys(GLYPHS).sort()).toEqual([...PLACE_SYMBOLS].sort());
    for (const k of PLACE_SYMBOLS) expect(GLYPHS[k].length).toBeGreaterThan(0);
  });
  it("kresby jsou platné cesty uvnitř viewBoxu 24 s okrajem pro linku", () => {
    for (const k of PLACE_SYMBOLS) {
      for (const g of GLYPHS[k]) {
        expect(g.d).toMatch(/^M[\d.-]/);
        expect(g.d).not.toMatch(/NaN|undefined/);
        // Absolutní souřadnice (M, L, H, V, Q, C, A cíl) musí ležet v 0..24.
        for (const m of g.d.matchAll(/([MLQC])\s*([-\d.]+)\s+([-\d.]+)/g)) {
          const x = Number(m[2]);
          const y = Number(m[3]);
          expect(x, `${k}: ${g.d}`).toBeGreaterThanOrEqual(GLYPH_STROKE / 2);
          expect(x, `${k}: ${g.d}`).toBeLessThanOrEqual(24 - GLYPH_STROKE / 2);
          expect(y, `${k}: ${g.d}`).toBeGreaterThanOrEqual(GLYPH_STROKE / 2);
          expect(y, `${k}: ${g.d}`).toBeLessThanOrEqual(24 - GLYPH_STROKE / 2);
        }
      }
    }
  });
});
