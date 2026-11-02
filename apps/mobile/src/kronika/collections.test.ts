import { describe, expect, it } from "vitest";
import { chapterProgress, roman, stageProgress, stageStateLabel } from "./collections";

describe("sbírky", () => {
  it("postup etapy", () => {
    const s = { startM: 1000, endM: 3000 };
    expect(stageProgress(s, 0)).toBe(0);
    expect(stageProgress(s, 2000)).toBe(0.5);
    expect(stageProgress(s, 9999)).toBe(1);
    expect(stageProgress({ startM: 5, endM: 5 }, 9)).toBe(0);
  });
  it("popisy stavu", () => {
    expect(stageStateLabel(1)).toEqual({ state: "done", label: "Dokončeno" });
    expect(stageStateLabel(0)).toEqual({ state: "ahead", label: "Zatím před vámi" });
    expect(stageStateLabel(0.678)).toEqual({ state: "walking", label: "Ušlo se 67 %" });
    expect(stageStateLabel(0.001).label).toBe("Ušlo se 1 %");
  });
  it("římské číslice", () => {
    expect([1, 2, 3, 4, 5, 9, 14].map(roman)).toEqual(["I", "II", "III", "IV", "V", "IX", "XIV"]);
  });
  it("kapitola", () => {
    expect(chapterProgress([100, 200, 300], 250)).toEqual({ done: 2, total: 3, complete: false });
    expect(chapterProgress([100], 100).complete).toBe(true);
    expect(chapterProgress([], 100).complete).toBe(false);
  });
});
