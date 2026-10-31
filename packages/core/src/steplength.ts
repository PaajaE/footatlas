/**
 * Osobní délka kroku (rozhodnutí 0006). Vzdálenost z kroků je jen tak přesná jako délka kroku,
 * proto se určuje ve třech úrovních: kalibrace nebo ruční hodnota, odhad z výšky, obecný průměr.
 */

export type Sex = "male" | "female" | "other";

/** Odkud se aktuální délka kroku vzala; určuje, jak moc se jí dá věřit. */
export type StepLengthSource = "calibrated" | "manual" | "height" | "default";

export interface StepProfile {
  heightCm?: number;
  sex?: Sex;
  /** Hodnota, kterou uživatel zadal nebo naměřil; má přednost před odhadem z výšky. */
  override?: { meters: number; source: "calibrated" | "manual"; at: string };
}

export interface StepLength {
  meters: number;
  source: StepLengthSource;
}

/** Obecný průměr, když o uživateli nic nevíme. */
export const DEFAULT_STEP_LENGTH_M = 0.75;
/** Meze věrohodné délky kroku při chůzi a běhu; mimo ně se vstup odmítne. */
export const STEP_LENGTH_RANGE_M = { min: 0.3, max: 1.5 } as const;
export const HEIGHT_RANGE_CM = { min: 100, max: 230 } as const;
/** Nejméně kroků, aby kalibrace dávala smysl (méně je citlivé na zaokrouhlení záznamů). */
export const MIN_CALIBRATION_STEPS = 300;

/** Poměr délky kroku k výšce při chůzi; běžný vzorec výrobců krokoměrů (muži 0,415, ženy 0,413). */
const HEIGHT_RATIO = { male: 0.415, female: 0.413, other: 0.414 } as const;

export function isValidStepLength(m: unknown): m is number {
  return typeof m === "number" && Number.isFinite(m) && m >= STEP_LENGTH_RANGE_M.min && m <= STEP_LENGTH_RANGE_M.max;
}

export function isValidHeight(cm: unknown): cm is number {
  return typeof cm === "number" && Number.isFinite(cm) && cm >= HEIGHT_RANGE_CM.min && cm <= HEIGHT_RANGE_CM.max;
}

/** Odhad délky kroku z výšky v centimetrech; `null` při neplatné výšce. */
export function stepLengthFromHeight(heightCm: number, sex: Sex = "other"): number | null {
  if (!isValidHeight(heightCm)) return null;
  return Math.round(heightCm * HEIGHT_RATIO[sex]) / 100;
}

/** Délka kroku, kterou se přepočítají kroky na vzdálenost. */
export function resolveStepLength(profile: StepProfile | null | undefined): StepLength {
  const o = profile?.override;
  if (o && isValidStepLength(o.meters)) return { meters: o.meters, source: o.source };
  if (profile?.heightCm !== undefined) {
    const m = stepLengthFromHeight(profile.heightCm, profile.sex);
    if (m !== null) return { meters: m, source: "height" };
  }
  return { meters: DEFAULT_STEP_LENGTH_M, source: "default" };
}

/**
 * Kalibrace: délka kroku ze známé vzdálenosti a počtu kroků na ní.
 * `null`, když je kroků málo nebo vyjde nevěrohodná hodnota (například špatně zadaná vzdálenost).
 */
export function calibrateStepLength(distanceM: number, steps: number): number | null {
  if (!(distanceM > 0) || !(steps >= MIN_CALIBRATION_STEPS)) return null;
  const m = Math.round((distanceM / steps) * 1000) / 1000;
  return isValidStepLength(m) ? m : null;
}

/** Načtení uloženého profilu; neplatné části se zahodí, nikdy nevyhazuje chybu. */
export function parseStepProfile(raw: unknown): StepProfile {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: StepProfile = {};
  if (isValidHeight(o.heightCm)) out.heightCm = o.heightCm;
  if (o.sex === "male" || o.sex === "female" || o.sex === "other") out.sex = o.sex;
  const ov = o.override as Record<string, unknown> | undefined;
  if (
    ov &&
    typeof ov === "object" &&
    isValidStepLength(ov.meters) &&
    (ov.source === "calibrated" || ov.source === "manual") &&
    typeof ov.at === "string"
  ) {
    out.override = { meters: ov.meters, source: ov.source, at: ov.at };
  }
  return out;
}
