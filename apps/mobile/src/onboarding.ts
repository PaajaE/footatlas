/**
 * Čistá logika úvodu (rozhodnutí 0035): kdy se ukáže, jak dopadne načtení historie a geometrie úvodní kresby.
 * Bez Reactu, aby šla testovat.
 */
import type { SyncState } from "./db/types";

/** Co o spuštění aplikace víme. Úvod vidí jen ten, kdo ho ještě neviděl a nemá žádnou stopu po používání. */
export interface GateInput {
  /** Uložený příznak „úvod proběhl“ je načtený. */
  flagLoaded: boolean;
  done: boolean;
  expeditionReady: boolean;
  /** Rozjetá nebo dřív rozjetá výprava (uložená relace). */
  hasSession: boolean;
  chronicleReady: boolean;
  /** Kronika už obsahuje načtenou historii. */
  hasHistory: boolean;
  /** Kronika se načítá podezřele dlouho; nečeká se na ni (splash se nesmí zaseknout). */
  chronicleTimedOut: boolean;
}

/** `wait` = ještě nevíme, `show` = ukázat úvod, `skip` = nezobrazovat (a poznačit jako hotový, pokud nebyl). */
export type GateDecision = "wait" | "show" | "skip";

export function onboardingGate(i: GateInput): GateDecision {
  if (!i.flagLoaded) return "wait";
  if (i.done) return "skip";
  if (!i.expeditionReady) return "wait";
  if (i.hasSession) return "skip";
  if (!i.chronicleReady && !i.chronicleTimedOut) return "wait";
  return i.chronicleReady && i.hasHistory ? "skip" : "show";
}

/** Jak skončilo „Načíst historii“ (ze stavu kroniky po čtení). */
export type ImportOutcome =
  | { kind: "ok"; totalM: number }
  /** Čtení proběhlo, ale zdravotní data žádné kroky neobsahují. */
  | { kind: "empty" }
  | { kind: "denied" }
  | { kind: "unavailable"; reason: string }
  | { kind: "error"; message: string };

export function importOutcome(sync: SyncState, totalM: number): ImportOutcome {
  if (sync.kind === "unavailable") return sync.reason === "denied" ? { kind: "denied" } : { kind: "unavailable", reason: sync.reason };
  if (sync.kind === "error") return { kind: "error", message: sync.message };
  return totalM > 0 ? { kind: "ok", totalM } : { kind: "empty" };
}

export type Pt = readonly [number, number];

/** Délka lomené čáry. */
export function polylineLength(pts: readonly Pt[]): number {
  let sum = 0;
  for (let i = 1; i < pts.length; i++) sum += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  return sum;
}

/** Bod na lomené čáře v podílu `t` (0 až 1) její délky. */
export function pointAt(pts: readonly Pt[], t: number): Pt {
  const total = polylineLength(pts);
  let left = Math.min(1, Math.max(0, t)) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left <= seg || i === pts.length - 1) {
      const k = seg === 0 ? 0 : Math.min(1, left / seg);
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
    left -= seg;
  }
  return pts[0] ?? [0, 0];
}

/** SVG cesta `M x y L x y …` z lomené čáry. */
export function polylinePath(pts: readonly Pt[]): string {
  return pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
}

/** Ušlý (inkoustový) úsek úvodní kresby a pokračování před vámi; souřadnice ve čtverci 390 × 330. */
export const INTRO_INK: readonly Pt[] = [
  [40, 262], [62, 257], [72, 238], [98, 230], [112, 205], [146, 191], [182, 187], [206, 168], [238, 162], [250, 132],
];
export const INTRO_AHEAD: readonly Pt[] = [[250, 132], [266, 112], [284, 80], [316, 58], [348, 30], [376, 14]];
/** Osa řeky; trasa vede po břehu a nikdy ji nepřekročí (hlídá test). */
export const INTRO_RIVER_D = "M-20 330C60 300 90 250 150 225S250 215 275 160S330 70 420 30";

/** Body osy řeky pro kontrolu odstupu trasy. */
export function introRiverPoints(): Pt[] {
  const seg = (p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt[] =>
    Array.from({ length: 60 }, (_, k) => {
      const t = k / 59;
      const u = 1 - t;
      return [
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ] as Pt;
    });
  // C60 300 90 250 150 225, pak S250 215 275 160 (první řídicí bod je odraz), pak S330 70 420 30.
  const a = seg([-20, 330], [60, 300], [90, 250], [150, 225]);
  const b = seg([150, 225], [210, 200], [250, 215], [275, 160]);
  const c = seg([275, 160], [300, 105], [330, 70], [420, 30]);
  return [...a, ...b, ...c];
}
