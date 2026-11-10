import { describe, expect, it } from "vitest";
import { chapterCloseM, chapterGoalTitle, nextGoal, stageGoalTitle } from "./cil";

const places = [
  { id: "a", name: "A", atM: 1000 },
  { id: "b", name: "B", atM: 4000 },
  { id: "c", name: "C", atM: 6000 },
  { id: "d", name: "D", atM: 12_000 },
];
const placesById = new Map(places.map((p) => [p.id, p]));
const mosty = { id: "mosty", title: "Mosty a lávky", titleGenitive: "Mostů a lávek", placeIds: ["a", "c"] };
const daleko = { id: "daleko", title: "Daleko", placeIds: ["b", "d"] };
const base = {
  completed: false,
  stage: { index: 2, endM: 20_000 },
  stageEndPlaceId: "d",
  chapters: [daleko, mosty],
  placesById,
  nextStop: { id: "b", atM: 4000 },
};

describe("nextGoal", () => {
  it("1. konec etapy do 3 km má přednost", () => {
    expect(nextGoal({ ...base, walkedM: 3500, stage: { index: 2, endM: 4700 } })).toEqual({
      kind: "stage",
      stageIndex: 2,
      remainingM: 1200,
      placeId: "d",
    });
  });
  it("2. uzavření kapitoly do 3 km (k poslednímu chybějícímu místu)", () => {
    expect(nextGoal({ ...base, walkedM: 3500 })).toEqual({ kind: "chapter", chapterId: "mosty", remainingM: 2500, missing: 1 });
  });
  it("3. jinak další zastávka", () => {
    expect(nextGoal({ ...base, walkedM: 500 })).toEqual({ kind: "stop", placeId: "b", remainingM: 3500 });
  });
  it("hranice 3 km platí včetně", () => {
    expect(nextGoal({ ...base, walkedM: 3000 })?.kind).toBe("chapter");
    expect(nextGoal({ ...base, walkedM: 2999 })?.kind).toBe("stop");
  });
  it("hotová výprava nic, bez zastávky nic", () => {
    expect(nextGoal({ ...base, walkedM: 3500, completed: true })).toBeUndefined();
    expect(nextGoal({ ...base, walkedM: 13_000, chapters: [], nextStop: null })).toBeUndefined();
  });
  it("uzavřená kapitola se nepočítá", () => {
    expect(chapterCloseM(mosty, placesById, 7000)).toBeUndefined();
    expect(chapterCloseM(daleko, placesById, 7000)).toBe(5000);
  });
});

describe("texty", () => {
  it("etapa a kapitola", () => {
    expect(stageGoalTitle(2, 1200)).toBe("1,2 km do pohlednice etapy III");
    expect(chapterGoalTitle(mosty, 1)).toBe("Ještě 1 místo do uzavření Mostů a lávek");
  });
});
