import { describe, expect, it } from "vitest";
import { place } from "./index.js";

const stop = {
  kind: "stop",
  id: "s1",
  name: "Vyšehrad",
  lat: 50.064,
  lon: 14.419,
  unlockAtM: 0,
  text: "Pevnost nad Vltavou.",
  surprisingFact: "Příklad faktu.",
  image: { url: "https://commons.wikimedia.org/x.jpg", author: "A", license: "CC BY-SA 4.0" },
  sources: [
    { title: "Zdroj 1", url: "https://example.org/1" },
    { title: "Zdroj 2", url: "https://example.org/2" },
  ],
  factCheckedOn: "2026-10-30",
};

describe("místo", () => {
  it("přijme platnou zastávku", () => {
    expect(place.safeParse(stop).success).toBe(true);
  });
  it("odmítne zastávku s jedním zdrojem", () => {
    expect(place.safeParse({ ...stop, sources: [stop.sources[0]] }).success).toBe(false);
  });
});
