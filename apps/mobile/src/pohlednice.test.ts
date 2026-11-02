import { describe, expect, it } from "vitest";
import {
  backText,
  formatDayRange,
  nextStageCard,
  pickPhotoKey,
  pluralDays,
  pluralDiscoveries,
  pluralStops,
  postcardTitle,
  stageEndpoints,
  stageSummary,
  type PcPlace,
} from "./pohlednice";

const stage0 = { index: 0, startM: 0, endM: 1000 };
const stage1 = { index: 1, startM: 1000, endM: 2000 };
const places: PcPlace[] = [
  { id: "s", kind: "stop", name: "Start", atM: 0, photo: "s" },
  { id: "d1", kind: "discovery", name: "Objev 1", atM: 300 },
  { id: "d2", kind: "discovery", name: "Objev 2", atM: 600, hook: "Háček 2." },
  { id: "t", kind: "stop", name: "Zámek", atM: 1000, photo: "z", hook: "Háček zámku." },
  { id: "u", kind: "stop", name: "Údolí", atM: 1500, riddle: { question: "Kde?" } },
  { id: "v", kind: "discovery", name: "Přívoz", atM: 1800 },
  { id: "w", kind: "stop", name: "Cíl", atM: 2000 },
];
const slices = [
  { day: "2026-10-24", distanceM: 600 },
  { day: "2026-10-26", distanceM: 700 },
  { day: "2026-10-27", distanceM: 300 },
];

describe("souhrn etapy", () => {
  it("dokončená etapa: km, dny, počty míst", () => {
    const s = stageSummary(stage0, places, slices, 1300);
    expect(s).toMatchObject({ walkedM: 1000, completed: true, firstDay: "2026-10-24", lastDay: "2026-10-26", days: 3, stops: 1, discoveries: 2 });
    expect(s.places.map((p) => p.id)).toEqual(["d1", "d2", "t"]);
  });
  it("rozpracovaná etapa se nepočítá jako dokončená", () => {
    const s = stageSummary(stage1, places, slices, 1600);
    expect(s).toMatchObject({ walkedM: 600, completed: false, firstDay: "2026-10-26", lastDay: "2026-10-27", days: 2, stops: 1, discoveries: 0 });
  });
  it("bez dat o dnech zůstanou dny prázdné; nezačatá etapa nemá dny", () => {
    expect(stageSummary(stage0, places, [], 1000).days).toBeUndefined();
    expect(stageSummary(stage1, places, slices, 500).firstDay).toBeUndefined();
  });
  it("ukázkový postup (vše dnes) je jeden den", () => {
    const s = stageSummary(stage0, places, [{ day: "2026-11-02", distanceM: 2500 }], 2500);
    expect(s.days).toBe(1);
  });
});

describe("texty", () => {
  it("množná čísla", () => {
    expect([pluralDays(1), pluralDays(3), pluralDays(13)]).toEqual(["1 den", "3 dny", "13 dní"]);
    expect([pluralStops(1), pluralStops(3), pluralStops(5)]).toEqual(["1 zastávka", "3 zastávky", "5 zastávek"]);
    expect([pluralDiscoveries(1), pluralDiscoveries(2), pluralDiscoveries(11)]).toEqual(["1 objev", "2 objevy", "11 objevů"]);
  });
  it("rozsah dnů", () => {
    expect(formatDayRange("2026-10-24", "2026-11-05")).toBe("24. 10.–5. 11.");
    expect(formatDayRange("2026-10-24", "2026-10-24")).toBe("24. 10.");
  });
  it("nadpis líce", () => {
    expect(postcardTitle(0)).toBe("Pozdrav z Prahy");
    expect(postcardTitle(1)).toBe("Pozdrav z etapy II");
  });
  it("text rubu jen z reálných míst", () => {
    const s = stageSummary(stage0, places, slices, 1300);
    expect(backText(s.places)).toEqual(["Cestou jste minuli: Zámek.", "Přibylo 2 malých objevů.", "„Háček zámku.“"]);
    expect(backText([])).toEqual([]);
  });
  it("fotka líce a konce etapy", () => {
    expect(pickPhotoKey(places.filter((p) => p.atM > 0 && p.atM <= 1000))).toBe("z");
    expect(pickPhotoKey(places)).toBe("s");
    expect(pickPhotoKey([{ id: "a", kind: "discovery", name: "A", atM: 1 }])).toBeUndefined();
    expect(stageEndpoints(stage0, places)).toMatchObject({ start: { id: "s" }, end: { id: "t" } });
  });
});

describe("karta další etapy", () => {
  const fmt = { km: (m: number) => `${m / 1000} km`, places: (n: number) => `${n} míst` };
  it("jen z dat etapy", () => {
    expect(nextStageCard(stage1, places, fmt)).toEqual({
      heading: "Etapa II · Cíl",
      meta: "1 km · 3 míst",
      teaser: "Údolí a Cíl.",
      firstRiddle: "Kde?",
    });
  });
  it("bez hádanky ji nevymýšlí", () => {
    expect(nextStageCard(stage0, places, fmt).firstRiddle).toBeUndefined();
  });
});
