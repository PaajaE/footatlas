import { describe, expect, it } from "vitest";
import { themes, themesById } from "./data/temata";
import { vltavska } from "./data/vltavska";
import {
  chaptersOf,
  countInTheme,
  expeditionThemeContribution,
  milestoneSentence,
  pluralCs,
  reachedPlaceIdsOf,
  themeProgress,
  type TExpedition,
  type TTheme,
} from "./temata";

const mosty: TTheme = {
  id: "mosty",
  title: "Mosty",
  titleGenitive: "Mostů",
  symbol: "most",
  intro: "…",
  milestones: [3, 10, 25],
  unit: { one: "most", few: "mosty", many: "mostů" },
};
const pocatky: TTheme = { id: "pocatky", title: "Počátky Čech", titleGenitive: "Počátků Čech", symbol: "hradiste", intro: "…", milestones: [3, 10] };

const vltava: TExpedition = {
  id: "vltava",
  name: "Vltavská stezka",
  chapters: [
    { id: "mosty", title: "Mosty a lávky", themeId: "mosty", placeIds: ["karluv", "libensky", "trojska", "bukol"] },
    { id: "pocatky", title: "Počátky Čech", themeId: "pocatky", placeIds: ["vysehrad", "levy-hradec"] },
  ],
};
const labe: TExpedition = {
  id: "labe",
  name: "Labská stezka",
  chapters: [{ id: "mosty-labe", title: "Mosty na Labi", themeId: "mosty", placeIds: ["l1", "l2", "l3"] }],
};
const atlas = [...chaptersOf(vltava), ...chaptersOf(labe)];

describe("pluralCs", () => {
  it("skloňuje podle počtu", () => {
    const u = mosty.unit!;
    expect([0, 1, 2, 4, 5, 10, 21, 22].map((n) => pluralCs(n, u))).toEqual([
      "0 mostů", "1 most", "2 mosty", "4 mosty", "5 mostů", "10 mostů", "21 mostů", "22 mostů",
    ]);
  });
  it("téma bez slova počítá místa", () => {
    expect(countInTheme(pocatky, 1)).toBe("1 místo");
    expect(countInTheme(pocatky, 3)).toBe("3 místa");
    expect(countInTheme(pocatky, 7)).toBe("7 míst");
  });
});

describe("themeProgress", () => {
  it("sčítá kapitoly různých výprav se stejným tématem", () => {
    const p = themeProgress(mosty, atlas, new Set(["karluv", "libensky", "trojska", "bukol", "l1", "vysehrad"]));
    expect(p.unlocked).toBe(5);
    expect(p.total).toBe(7);
    expect(p.chapters.map((c) => [c.chapter.id, c.done, c.total, c.closed])).toEqual([
      ["mosty", 4, 4, true],
      ["mosty-labe", 1, 3, false],
    ]);
    expect(p.closedByExpedition).toEqual([
      { expeditionId: "vltava", expeditionName: "Vltavská stezka", chapters: [atlas[0]] },
    ]);
    expect(p.reachedMilestones).toEqual([3]);
    expect(p.nextMilestone).toBe(10);
    expect(p.toNextMilestone).toBe(5);
    expect(p.nextMilestoneReachable).toBe(false);
  });

  it("uzavřené kapitoly seskupí po výpravách", () => {
    const p = themeProgress(mosty, atlas, new Set(["karluv", "libensky", "trojska", "bukol", "l1", "l2", "l3"]));
    expect(p.closedByExpedition.map((g) => [g.expeditionId, g.chapters.map((c) => c.id)])).toEqual([
      ["vltava", ["mosty"]],
      ["labe", ["mosty-labe"]],
    ]);
  });

  it("bez odemčených míst je nejbližší první milník", () => {
    const p = themeProgress(mosty, atlas, new Set());
    expect(p.unlocked).toBe(0);
    expect(p.closedByExpedition).toEqual([]);
    expect(p.nextMilestone).toBe(3);
    expect(p.toNextMilestone).toBe(3);
    expect(p.nextMilestoneReachable).toBe(true);
  });

  it("po posledním milníku už další není", () => {
    const many = Array.from({ length: 30 }, (_, i) => `m${i}`);
    const p = themeProgress(mosty, [{ ...atlas[0]!, placeIds: many }], new Set(many));
    expect(p.reachedMilestones).toEqual([3, 10, 25]);
    expect(p.nextMilestone).toBeUndefined();
    expect(p.toNextMilestone).toBeUndefined();
    expect(p.nextMilestoneReachable).toBe(false);
  });

  it("místo ve dvou kapitolách tématu počítá jednou a ignoruje jiná témata", () => {
    const dup = [...atlas, { ...atlas[0]!, id: "jina", placeIds: ["karluv"] }];
    const p = themeProgress(mosty, dup, new Set(["karluv", "vysehrad"]));
    expect(p.unlocked).toBe(1);
    expect(p.total).toBe(7);
  });

  it("kapitola bez míst se neuzavře", () => {
    const p = themeProgress(mosty, [{ ...atlas[0]!, placeIds: [] }], new Set());
    expect(p.chapters[0]!.closed).toBe(false);
  });
});

describe("milestoneSentence", () => {
  it("„Ještě 2 místa do milníku 10 mostů“", () => {
    expect(milestoneSentence(mosty, 8)).toBe("Ještě 2 místa do milníku 10 mostů");
    expect(milestoneSentence(mosty, 2)).toBe("Ještě 1 místo do milníku 3 mosty");
    expect(milestoneSentence(mosty, 3)).toBe("Ještě 7 míst do milníku 10 mostů");
    expect(milestoneSentence(mosty, 25)).toBeUndefined();
  });
  it("téma bez slova použije 2. pád názvu", () => {
    expect(milestoneSentence(pocatky, 0)).toBe("Ještě 3 místa do milníku 3 místa Počátků Čech");
    expect(milestoneSentence(pocatky, 5)).toBe("Ještě 5 míst do milníku 10 míst Počátků Čech");
  });
});

describe("expeditionThemeContribution", () => {
  it("„Tato výprava přidá 3 mosty do tématu Mosty“", () => {
    expect(expeditionThemeContribution(labe, [mosty, pocatky]).map((c) => c.sentence)).toEqual([
      "Tato výprava přidá 3 mosty do tématu Mosty",
    ]);
  });
  it("v pořadí témat, s počtem a bez témat, kam nic nepřidá", () => {
    const c = expeditionThemeContribution(vltava, [pocatky, mosty]);
    expect(c.map((x) => [x.theme.id, x.count, x.sentence])).toEqual([
      ["pocatky", 2, "Tato výprava přidá 2 místa do tématu Počátky Čech"],
      ["mosty", 4, "Tato výprava přidá 4 mosty do tématu Mosty"],
    ]);
  });
});

describe("témata Vltavské stezky", () => {
  it("každá kapitola má existující téma a témata jsou 1:1 s kapitolami", () => {
    for (const c of vltavska.chapters) expect(themesById.has(c.themeId ?? ""), c.id).toBe(true);
    expect(vltavska.chapters.map((c) => c.themeId).sort()).toEqual(themes.map((t) => t.id).sort());
  });

  it("výprava přidá do témat právě místa svých kapitol", () => {
    const c = expeditionThemeContribution(vltavska, themes);
    expect(c.map((x) => x.sentence)).toEqual([
      "Tato výprava přidá 7 vorařských míst do tématu Voraři",
      "Tato výprava přidá 4 mosty do tématu Mosty",
      "Tato výprava přidá 3 ostrovy do tématu Ostrovy",
      "Tato výprava přidá 5 míst do tématu Počátky Čech",
      "Tato výprava přidá 7 sídel do tématu Šlechtická sídla",
    ]);
  });

  it("po celé výpravě jsou uzavřené všechny kapitoly a odemčená všechna místa témat", () => {
    const reached = reachedPlaceIdsOf(vltavska.places, vltavska.totalM, true);
    const chapters = chaptersOf(vltavska);
    for (const t of themes) {
      const p = themeProgress(t, chapters, reached);
      expect(p.unlocked, t.id).toBe(p.total);
      expect(p.closedByExpedition.map((g) => g.expeditionId), t.id).toEqual([vltavska.id]);
    }
    const m = themeProgress(themesById.get("mosty")!, chapters, reached);
    expect(milestoneSentence(themesById.get("mosty")!, m.unlocked)).toBe("Ještě 6 míst do milníku 10 mostů");
    expect(m.nextMilestoneReachable).toBe(false);
  });

  it("neběžící výprava nemá odemčená místa", () => {
    expect(reachedPlaceIdsOf(vltavska.places, vltavska.totalM, false).size).toBe(0);
  });
});
