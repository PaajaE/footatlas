import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkChapterThemes, parseThemes, storyFile, themeFile } from "./index";

const load = (rel: string) => JSON.parse(readFileSync(new URL(`../data/${rel}`, import.meta.url), "utf8"));

describe("temata.json", () => {
  const raw = load("temata.json");
  const parsed = themeFile.safeParse(raw);

  it("projde schématem", () => {
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true);
  });

  it("obsahuje pět témat Vltavské stezky se symboly podle návrhu v2 § 6.3", () => {
    const symbols = Object.fromEntries(parseThemes(raw).map((t) => [t.id, t.symbol]));
    expect(symbols).toEqual({ vorari: "vor", mosty: "most", ostrovy: "ostrov", pocatky: "hradiste", sidla: "zamek" });
  });

  it("úvod má 2–3 věty, je neověřený a neříká nic o ověřování", () => {
    const sentences = (t: string) => t.split(/[.!?](?:\s|$)/).filter((x) => x.trim().length > 0).length;
    for (const t of parseThemes(raw)) {
      expect(sentences(t.intro), t.id).toBeGreaterThanOrEqual(2);
      expect(sentences(t.intro), t.id).toBeLessThanOrEqual(3);
      expect(t.verified, t.id).toBe(false);
      expect(`${t.title} ${t.intro}`, t.id).not.toMatch(/ověř|koncept/i);
    }
  });

  it("odmítne duplicitní téma, neznámý symbol a nevzestupné milníky", () => {
    const [first] = raw.themes;
    expect(themeFile.safeParse({ themes: [first, first] }).success).toBe(false);
    expect(themeFile.safeParse({ themes: [{ ...first, symbol: "drak" }] }).success).toBe(false);
    expect(themeFile.safeParse({ themes: [{ ...first, milestones: [10, 3] }] }).success).toBe(false);
    expect(themeFile.safeParse({ themes: [{ ...first, milestones: [3, 3] }] }).success).toBe(false);
    expect(themeFile.safeParse({ themes: [{ ...first, milestones: [] }] }).success).toBe(false);
    expect(() => parseThemes({ themes: [] })).toThrow();
  });
});

describe("kapitoly a témata", () => {
  const themes = parseThemes(load("temata.json"));
  const obsah = storyFile.parse(load("vltavska-stezka/obsah.json"));

  it("každá kapitola Vltavské stezky má existující themeId", () => {
    expect(checkChapterThemes(obsah.chapters, themes)).toEqual([]);
    for (const c of obsah.chapters) expect(themes.some((t) => t.id === c.themeId), c.id).toBe(true);
  });

  it("kapitoly Vltavské stezky jsou s tématy 1:1", () => {
    expect(obsah.chapters.map((c) => c.themeId).sort()).toEqual(themes.map((t) => t.id).sort());
  });

  it("hlásí kapitolu bez tématu i s neznámým tématem", () => {
    expect(
      checkChapterThemes(
        [
          { id: "a" },
          { id: "b", themeId: "nic" },
          { id: "c", themeId: "mosty" },
        ],
        themes,
      ),
    ).toEqual(["Kapitola a nemá themeId", "Kapitola b odkazuje na neznámé téma nic"]);
  });
});
