import { describe, expect, it } from "vitest";
import {
  awaits,
  inDays,
  mergeDaily,
  paceSentence,
  placesAhead,
  rewardSentence,
  scrubDistance,
  scrubSentence,
  stripLengthM,
  stripRows,
  typicalDailyM,
  walkMinutes,
} from "./predvami";

const day = (d: string, km: number) => ({ day: d, distanceM: km * 1000 });

describe("typicalDailyM", () => {
  it("průměr posledních dní s pohybem bez dneška", () => {
    const days = [day("2026-11-01", 4), day("2026-11-02", 0), day("2026-11-03", 8), day("2026-11-09", 20)];
    expect(typicalDailyM(days, "2026-11-09")).toBe(6000);
  });
  it("bere nejvýš 14 posledních dní s pohybem", () => {
    const days = Array.from({ length: 20 }, (_, i) => day(`2026-10-${String(i + 1).padStart(2, "0")}`, i < 6 ? 100 : 5));
    expect(typicalDailyM(days, "2026-11-09")).toBe(5000);
  });
  it("dny pod 200 m se nepočítají, bez historie null", () => {
    expect(typicalDailyM([{ day: "2026-11-01", distanceM: 150 }], "2026-11-09")).toBeNull();
    expect(typicalDailyM([], "2026-11-09")).toBeNull();
  });
});

describe("mergeDaily", () => {
  it("pro stejný den platí větší hodnota", () => {
    expect(mergeDaily([day("2026-11-01", 3)], [day("2026-11-01", 5), day("2026-10-30", 1)])).toEqual([
      day("2026-10-30", 1),
      day("2026-11-01", 5),
    ]);
  });
});

describe("pás", () => {
  const places = [
    { name: "A", atM: 900 },
    { name: "B", atM: 1500 },
    { name: "C", atM: 8900 },
  ];
  it("místa v okně 8 km před chodcem", () => {
    expect(placesAhead(places, 1000).map((p) => p.name)).toEqual(["B", "C"]);
    expect(placesAhead(places, 0).map((p) => p.name)).toEqual(["A", "B"]);
  });
  it("délka pásu se zkrátí u konce trasy", () => {
    expect(stripLengthM(1000, 62_000)).toBe(8000);
    expect(stripLengthM(60_000, 62_000)).toBe(2000);
    expect(stripLengthM(62_000, 62_000)).toBe(0);
  });
  it("táhnutí: bod na pásu na vzdálenost po 100 m", () => {
    expect(scrubDistance(150, 300, 8000)).toBe(4000);
    expect(scrubDistance(-5, 300, 8000)).toBe(0);
    expect(scrubDistance(999, 300, 8000)).toBe(8000);
  });
  it("řádky razítek se střídají, když jsou blízko", () => {
    expect(stripRows([0, 10, 20, 100], 30)).toEqual([0, 1, 0, 0]);
  });
});

describe("věty", () => {
  const ahead = [
    { name: "Zámek Veltrusy", atM: 13_000 },
    { name: "Červený mlýn", atM: 13_400 },
    { name: "Výhled na Říp", atM: 30_000 },
  ];
  it("s tempem: kdy podle obvyklé denní vzdálenosti", () => {
    expect(paceSentence({ walkedM: 2000, ahead, dailyM: 6200, stepLengthM: 0.75 })).toBe(
      "Obvykle ujdete 6,2 km denně. Za 2 dny vás čekají Zámek Veltrusy a Červený mlýn.",
    );
    expect(paceSentence({ walkedM: 12_000, ahead, dailyM: 6200, stepLengthM: 0.75 })).toBe(
      "Obvykle ujdete 6,2 km denně. Za den vás čekají Zámek Veltrusy a Červený mlýn.",
    );
  });
  it("bez historie: minuty a kroky k nejbližšímu místu", () => {
    expect(paceSentence({ walkedM: 10_500, ahead, dailyM: null, stepLengthM: 0.92 })).toBe(
      "Za 30 minut chůze (asi 2 700 kroků) vás čeká Zámek Veltrusy.",
    );
  });
  it("bez míst nic", () => {
    expect(paceSentence({ walkedM: 0, ahead: [], dailyM: 5000, stepLengthM: 0.75 })).toBeUndefined();
  });
  it("nikde slovo dnes", () => {
    for (const dailyM of [null, 500, 6200, 40_000]) {
      expect(paceSentence({ walkedM: 0, ahead, dailyM, stepLengthM: 0.75 })).not.toMatch(/dnes/i);
    }
    expect(scrubSentence(4000, 3)).not.toMatch(/dnes/i);
  });
  it("odměna: pohlednice etapy v dosahu", () => {
    expect(rewardSentence({ index: 2, endM: 51_500 }, 39_400, false)).toBe("Do pohlednice etapy III: 12,1 km.");
    expect(rewardSentence({ index: 2, endM: 60_000 }, 39_400, false)).toBeUndefined();
    expect(rewardSentence({ index: 2, endM: 41_000 }, 39_400, true)).toBeUndefined();
  });
  it("táhnutí: vzdálenost, minuty a místa", () => {
    expect(scrubSentence(4000, 3)).toBe("Do sem: 4,0 km, asi 50 minut, 3 místa");
    expect(scrubSentence(300, 0)).toBe("Do sem: 0,3 km, asi 5 minut");
  });
  it("drobnosti", () => {
    expect(inDays(1)).toBe("Za den");
    expect(inDays(3)).toBe("Za 3 dny");
    expect(inDays(5)).toBe("Za 5 dní");
    expect(awaits(["A", "B", "C"])).toBe("vás čekají A, B a C");
    expect(walkMinutes(2500)).toBe(30);
  });
});
