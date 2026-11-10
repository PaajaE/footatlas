import { describe, expect, it } from "vitest";
import { AUTO_OPEN_AFTER_MS, daysSince, mezitimHeading, mezitimStrip, shouldAutoOpen } from "./mezitim";

describe("mezitimHeading", () => {
  it("podle doby, nikdy Dnes", () => {
    expect(mezitimHeading(undefined, "2026-11-09")).toBe("Mezitím přibylo");
    expect(mezitimHeading("2026-11-09", "2026-11-09")).toBe("Mezitím přibylo");
    expect(mezitimHeading("2026-11-08", "2026-11-09")).toBe("Od včerejška přibylo");
    expect(mezitimHeading("2026-11-07", "2026-11-09")).toBe("Za 2 dny přibylo");
    expect(mezitimHeading("2026-11-04", "2026-11-09")).toBe("Za 5 dní přibylo");
    expect(mezitimHeading("2026-11-03", "2026-11-09")).toBe("Za 6 dní přibylo");
    expect(mezitimHeading("2026-10-24", "2026-11-09")).toBe("Od 24. 10. přibylo");
  });
  it("přes změnu času a konec měsíce", () => {
    expect(daysSince("2026-10-24", "2026-10-26")).toBe(2);
    expect(daysSince("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("mezitimStrip", () => {
  it("vzdálenost, doba a nová místa", () => {
    expect(mezitimStrip(23_400, "2026-11-04", "2026-11-09", 3)).toBe("Mezitím · 23,4 km za 5 dní · 3 nová místa");
    expect(mezitimStrip(450, "2026-11-09", "2026-11-09", 0)).toBe("Mezitím · 450 m");
    expect(mezitimStrip(2000, "2026-11-08", "2026-11-09", 1)).toBe("Mezitím · 2,0 km od včerejška · 1 nové místo");
  });
});

describe("shouldAutoOpen", () => {
  const now = Date.UTC(2026, 10, 9, 12);
  it("dokončená etapa pustí přehrání hned", () => {
    expect(shouldAutoOpen({ show: true, newStageCount: 1, previousOpenMs: now - 1000, nowMs: now })).toBe(true);
  });
  it("po 3 dnech od posledního otevření", () => {
    expect(shouldAutoOpen({ show: true, newStageCount: 0, previousOpenMs: now - AUTO_OPEN_AFTER_MS, nowMs: now })).toBe(true);
    expect(shouldAutoOpen({ show: true, newStageCount: 0, previousOpenMs: now - AUTO_OPEN_AFTER_MS + 1, nowMs: now })).toBe(false);
  });
  it("poprvé (bez záznamu) jen pruh; bez postupu nic", () => {
    expect(shouldAutoOpen({ show: true, newStageCount: 0, previousOpenMs: null, nowMs: now })).toBe(false);
    expect(shouldAutoOpen({ show: false, newStageCount: 2, previousOpenMs: 0, nowMs: now })).toBe(false);
  });
});
