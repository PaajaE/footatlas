import { describe, expect, it } from "vitest";
import { detectArrival, watchStep, type WatchState } from "./prichod";

const places = [
  { id: "a", name: "A", atM: 100 },
  { id: "b", name: "B", atM: 200 },
  { id: "c", name: "C", atM: 300 },
];
const stages = [
  { index: 0, endM: 200 },
  { index: 1, endM: 400 },
];

describe("příchod", () => {
  it("najde místa a etapy dosažené mezi dvěma načteními", () => {
    expect(detectArrival(50, 250, places, stages)).toEqual({ placeIds: ["a", "b"], stageIndexes: [0], focusId: "b" });
  });
  it("hranice: už dosažené se neopakuje, cíl patří úseku", () => {
    expect(detectArrival(100, 200, places, stages)?.placeIds).toEqual(["b"]);
    expect(detectArrival(200, 250, places, stages)).toBeNull();
  });
  it("bez místa i etapy, při couvnutí a beze změny nic", () => {
    expect(detectArrival(0, 50, places, stages)).toBeNull();
    expect(detectArrival(300, 100, places, stages)).toBeNull();
    expect(detectArrival(100, 100, places, stages)).toBeNull();
  });
  it("jen dokončená etapa bez místa", () => {
    expect(detectArrival(380, 410, [], stages)).toEqual({ placeIds: [], stageIndexes: [1], focusId: undefined });
  });
});

describe("hlídač příchodu", () => {
  const fresh: WatchState = { baseline: null, rebaseFrom: undefined };
  it("první hodnotu jen zapamatuje, další změnu ohlásí", () => {
    const a = watchStep(fresh, { walkedM: 100, lastReadAt: 1 });
    expect(a.between).toBeNull();
    const b = watchStep(a.next, { walkedM: 100, lastReadAt: 2 });
    expect(b.between).toBeNull();
    const c = watchStep(b.next, { walkedM: 180, lastReadAt: 3 });
    expect(c.between).toEqual([100, 180]);
    expect(c.next.baseline).toBe(180);
  });
  it("při couvnutí (pauza, reset) jen přenastaví základ", () => {
    const a = watchStep({ baseline: 500, rebaseFrom: undefined }, { walkedM: 0, lastReadAt: 1 });
    expect(a.between).toBeNull();
    expect(a.next.baseline).toBe(0);
  });
  it("po návratu z pozadí počká na nové čtení a to přijme potichu", () => {
    const back: WatchState = { baseline: 100, rebaseFrom: 5 };
    expect(watchStep(back, { walkedM: 100, lastReadAt: 5 }).between).toBeNull();
    const waiting = watchStep(back, { walkedM: 100, lastReadAt: 5 });
    expect(waiting.next.rebaseFrom).toBe(5);
    const read = watchStep(back, { walkedM: 900, lastReadAt: 6 });
    expect(read.between).toBeNull();
    expect(read.next).toEqual({ baseline: 900, rebaseFrom: undefined });
  });
  it("bez předchozího čtení (null) po návratu čeká na první čtení", () => {
    const back: WatchState = { baseline: 0, rebaseFrom: null };
    expect(watchStep(back, { walkedM: 0, lastReadAt: null }).next.rebaseFrom).toBeNull();
    expect(watchStep(back, { walkedM: 50, lastReadAt: 7 }).next.baseline).toBe(50);
  });
});
