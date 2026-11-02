import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { storyFile } from "./index";

const load = (name: string) =>
  JSON.parse(readFileSync(new URL(`../data/vltavska-stezka/${name}`, import.meta.url), "utf8"));

const STAGE_1 = [
  "vysehrad", "vyton", "naplavka", "karluv-most", "stvanice", "holesovice", "libensky-most",
  "komora-troja", "cisarsky-ostrov", "trojska-lavka", "troja", "sedlec", "podmorani", "roztoky",
];

describe("obsah.json", () => {
  const parsed = storyFile.safeParse(load("obsah.json"));
  const file = parsed.success ? parsed.data : undefined;

  it("projde schématem", () => {
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true);
  });

  it("každý příběh patří existujícímu místu", () => {
    const ids = new Set((load("expedition.json").places as { id: string }[]).map((p) => p.id));
    for (const s of file!.stories) expect(ids.has(s.id), s.id).toBe(true);
  });

  it("má háček a hádanku pro všech 14 míst první etapy", () => {
    for (const id of STAGE_1) {
      const s = file!.stories.find((x) => x.id === id);
      expect(s, id).toBeDefined();
      expect(s!.hook.length, id).toBeGreaterThan(0);
      expect(s!.riddle, id).toBeDefined();
    }
  });

  it("správná odpověď hádanky je platný index", () => {
    for (const s of file!.stories) {
      if (!s.riddle) continue;
      expect(s.riddle.answer).toBeGreaterThanOrEqual(0);
      expect(s.riddle.answer).toBeLessThan(s.riddle.options.length);
    }
  });

  it("uživatelské texty neobsahují poznámky o ověřování", () => {
    for (const s of file!.stories) {
      const texts = [s.hook, s.teaser, s.context, s.visitTip, s.riddle?.question, ...(s.riddle?.options ?? [])];
      for (const t of texts) expect(t ?? "", s.id).not.toMatch(/ověř|koncept/i);
    }
    for (const c of file!.chapters) expect(`${c.title} ${c.blurb}`).not.toMatch(/ověř|koncept/i);
  });

  it("odmítne neznámou kapitolu a duplicitní id", () => {
    const base = load("obsah.json");
    const bad = { ...base, stories: [{ ...base.stories[0], chapterId: "nic" }] };
    expect(storyFile.safeParse(bad).success).toBe(false);
    const dup = { ...base, stories: [base.stories[0], base.stories[0]] };
    expect(storyFile.safeParse(dup).success).toBe(false);
  });
});
