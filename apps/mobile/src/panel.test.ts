import { describe, expect, it } from "vitest";
import { panelHeights, snapAfterDrag, snapAfterTap } from "./panel";

describe("panel", () => {
  const h = panelHeights(800, 120, 100);
  it("výšky poloh", () => {
    expect(h).toEqual({ collapsed: 120, half: 400, full: 700 });
  });
  it("na malé obrazovce se polohy nepřekříží", () => {
    const s = panelHeights(200, 120, 100);
    expect(s.collapsed).toBeLessThanOrEqual(s.half);
    expect(s.half).toBeLessThanOrEqual(s.full);
  });
  it("po tahu k nejbližší poloze", () => {
    expect(snapAfterDrag(h, "half", 650, 0)).toBe("full");
    expect(snapAfterDrag(h, "half", 200, 0)).toBe("collapsed");
    expect(snapAfterDrag(h, "half", 420, 0)).toBe("half");
  });
  it("rychlý tah skočí o polohu ve směru tahu", () => {
    expect(snapAfterDrag(h, "half", 410, -1)).toBe("full");
    expect(snapAfterDrag(h, "half", 390, 1)).toBe("collapsed");
    expect(snapAfterDrag(h, "full", 690, -1)).toBe("full");
  });
  it("klepnutí na úchyt", () => {
    expect(snapAfterTap("collapsed")).toBe("half");
    expect(snapAfterTap("half")).toBe("full");
    expect(snapAfterTap("full")).toBe("half");
  });
});
