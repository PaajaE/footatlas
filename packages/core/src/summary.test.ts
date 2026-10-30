import { describe, expect, it } from "vitest";
import { buildPlan, changeSentence, computeState, summarizeChange, type PlanPlace } from "./index";

const p = (id: string, kind: PlanPlace["kind"], atM: number): PlanPlace => ({ id, kind, atM });
const plan = buildPlan({
  totalM: 20_000,
  stageEndsM: [8_000, 20_000],
  places: [p("o1", "discovery", 600), p("s1", "stop", 3_000), p("o2", "discovery", 5_500), p("s2", "stop", 8_000), p("s3", "stop", 20_000)],
});
const names: Record<string, string> = { s1: "Troja", s2: "Roztoky", s3: "Mělník" };
const nameOf = (id: string) => names[id] ?? id;

describe("co se změnilo od posledně", () => {
  it("nic se nestalo", () => {
    const s = computeState(plan, 4_000, { previousWalkedM: 4_000 });
    expect(changeSentence(summarizeChange(s, 4_000, nameOf))).toBe("Od posledně se nic nezměnilo.");
  });

  it("jen kilometry a objev", () => {
    const s = computeState(plan, 6_000, { previousWalkedM: 5_000 });
    expect(changeSentence(summarizeChange(s, 5_000, nameOf))).toBe("Od posledně jste ušli 1,0 km. Přibyl 1 malý objev.");
  });

  it("zastávka a dokončená etapa", () => {
    const s = computeState(plan, 8_200, { previousWalkedM: 2_000 });
    const c = summarizeChange(s, 2_000, nameOf);
    expect(c.stagesCompleted).toEqual([1]);
    expect(c.stops).toEqual(["Troja", "Roztoky"]);
    expect(changeSentence(c)).toBe("Od posledně jste ušli 6,2 km. Dokončili jste 1. etapu. Minuli jste: Troja, Roztoky. Přibyl 1 malý objev.");
  });

  it("vzdálenost nikdy nevychází záporná", () => {
    const s = computeState(plan, 1_000, { previousWalkedM: 1_000 });
    expect(summarizeChange(s, 5_000, nameOf).deltaM).toBe(0);
  });

  it("dlouhý seznam zastávek se zkrátí", () => {
    const many = { deltaM: 50_000, stops: ["A", "B", "C", "D", "E"], discoveries: 0, stagesCompleted: [1, 2] };
    expect(changeSentence(many)).toBe("Od posledně jste ušli 50,0 km. Dokončili jste etapy 1 a 2. Minuli jste: C, D, E a 2 dalších.");
  });
});
