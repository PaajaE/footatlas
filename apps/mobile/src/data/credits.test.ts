import { describe, expect, it } from "vitest";
import { creditAuthor, creditForPhoto, creditLine, PHOTO_CREDITS } from "./credits";
import expedition from "@footatlas/content/data/vltavska-stezka/expedition.json";

describe("credits", () => {
  it("každá fotka míst z expedition.json má licenci", () => {
    const keys = (expedition as { places: Array<{ photo?: string }> }).places.flatMap((p) => (p.photo ? [p.photo] : []));
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(creditForPhoto(key), key).toBeDefined();
  });
  it("řádek s původem", () => {
    expect(creditLine(creditForPhoto("vysehrad")!)).toBe("Foto: Godot13, CC BY-SA 4.0, Wikimedia Commons.");
  });
  it("neznámý autor se nevypisuje a v UI není poznámka k ověření", () => {
    const troja = creditForPhoto("troja")!;
    expect(creditLine(troja)).toBe("Foto: Free Art License, Wikimedia Commons.");
    expect(creditAuthor(troja)).toBe("");
    expect(PHOTO_CREDITS.map(creditLine).join(" ")).not.toContain("ověřit");
  });
});
