import { describe, expect, it } from "vitest";
import { chapterMonogram, chapterPlaces, chapterStatus, chapterTagLabel, missingSentence, nearestChapter } from "./kapitoly";

const places = [
  { id: "a", name: "A", atM: 1000 },
  { id: "b", name: "B", atM: 2000 },
  { id: "c", name: "C", atM: 3000 },
  { id: "d", name: "D", atM: 4000 },
  { id: "e", name: "E", atM: 5000 },
];
const byId = new Map(places.map((p) => [p.id, p]));
const mosty = { id: "mosty", title: "Mosty a lávky", titleGenitive: "Mostů a lávek", placeIds: ["a", "c"] };
const vorari = { id: "vorari", title: "Voraři", titleGenitive: "Vorařů", placeIds: ["e", "b", "d"] };
const prazdna = { id: "nic", title: "Nic", placeIds: [] };

describe("chapterStatus", () => {
  it("počítá objevená místa a uzavření", () => {
    expect(chapterStatus(mosty, byId, 1500, true)).toEqual({ done: 1, total: 2, missing: 1, closed: false });
    expect(chapterStatus(mosty, byId, 3000, true).closed).toBe(true);
  });
  it("bez rozjeté výpravy není nic objevené", () => {
    expect(chapterStatus(mosty, byId, 9000, false)).toMatchObject({ done: 0, closed: false });
  });
  it("prázdná kapitola se neuzavře", () => {
    expect(chapterStatus(prazdna, byId, 9000, true).closed).toBe(false);
  });
});

describe("nearestChapter", () => {
  it("vybere neuzavřenou s nejmenším počtem chybějících míst", () => {
    // mosty: chybí c (1), vorari: chybí d, e (2)
    expect(nearestChapter([vorari, mosty], byId, 2500, true)?.chapter.id).toBe("mosty");
  });
  it("přeskočí uzavřené a prázdné", () => {
    expect(nearestChapter([mosty, vorari, prazdna], byId, 3500, true)?.chapter.id).toBe("vorari");
    expect(nearestChapter([mosty, vorari], byId, 9000, true)).toBeUndefined();
  });
  it("při shodě vyhraje kapitola s bližším dalším místem", () => {
    const x = { id: "x", title: "X", placeIds: ["e"] };
    const y = { id: "y", title: "Y", placeIds: ["d"] };
    expect(nearestChapter([x, y], byId, 0, true)?.chapter.id).toBe("y");
  });
});

describe("chapterPlaces", () => {
  it("řadí podle trasy, objeveným dá den, zamčeným vzdálenost", () => {
    const events = [
      { kind: "place", ref: "b", reachedDay: "2026-11-01" },
      { kind: "stage", ref: "0", reachedDay: "2026-11-01" },
    ];
    const list = chapterPlaces(vorari, byId, events, 2500, true);
    expect(list.map((e) => e.place.id)).toEqual(["b", "d", "e"]);
    expect(list[0]).toEqual({ place: places[1], reached: true, reachedDay: "2026-11-01" });
    expect(list[1]).toEqual({ place: places[3], reached: false, remainingM: 1500 });
  });
  it("bez výpravy počítá vzdálenost od startu", () => {
    expect(chapterPlaces(mosty, byId, [], 5000, false)[0]).toEqual({ place: places[0], reached: false, remainingM: 1000 });
  });
});

describe("texty", () => {
  it("věta o chybějících místech skloňuje", () => {
    expect(missingSentence(mosty, 1)).toBe("Ještě 1 místo do uzavření Mostů a lávek");
    expect(missingSentence(vorari, 3)).toBe("Ještě 3 místa do uzavření Vorařů");
    expect(missingSentence({ id: "n", title: "Nic", placeIds: [] }, 5)).toBe("Ještě 5 míst do uzavření Nic");
  });
  it("štítek a monogram", () => {
    expect(chapterTagLabel(vorari, { done: 5, total: 7, missing: 2, closed: false })).toBe("Kapitola Voraři · 5/7");
    expect(chapterMonogram("Mosty a lávky")).toBe("ML");
    expect(chapterMonogram("Šlechtická sídla")).toBe("ŠS");
    expect(chapterMonogram("Voraři")).toBe("V");
  });
});
