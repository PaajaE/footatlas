import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseSession, parseStepProfile, type ExpeditionSession, type StepProfile } from "@footatlas/core";
import { parseWishes } from "../kronika/upcoming";
import { parseTips, type Tip } from "../riddle";

const SESSION_KEY = "footatlas.session.v1";
const DEMO_KEY = "footatlas.demo.v1";
const STEP_PROFILE_KEY = "footatlas.stepprofile.v1";
const CALIBRATION_KEY = "footatlas.calibration.v1";

/** Vývojářský „ukázkový postup“, aby šly obrazovky vyzkoušet bez zdravotních dat. */
export interface DemoState {
  enabled: boolean;
  /** Ušlá vzdálenost výpravy, v metrech. */
  walkedM: number;
  /** Co uživatel viděl při posledním otevření, v metrech. */
  seenM: number;
}

export const DEFAULT_DEMO: DemoState = { enabled: false, walkedM: 36_000, seenM: 24_600 };

async function readJson(key: string): Promise<unknown> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function loadSession(): Promise<ExpeditionSession | null> {
  return parseSession(await readJson(SESSION_KEY));
}

export async function dropLegacySession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function saveSession(s: ExpeditionSession | null): Promise<void> {
  if (s === null) await AsyncStorage.removeItem(SESSION_KEY);
  else await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export async function loadDemo(): Promise<DemoState> {
  const o = (await readJson(DEMO_KEY)) as Partial<DemoState> | null;
  if (!o || typeof o !== "object") return DEFAULT_DEMO;
  return {
    enabled: o.enabled === true,
    walkedM: typeof o.walkedM === "number" && o.walkedM >= 0 ? o.walkedM : DEFAULT_DEMO.walkedM,
    seenM: typeof o.seenM === "number" && o.seenM >= 0 ? o.seenM : DEFAULT_DEMO.seenM,
  };
}

export async function saveDemo(d: DemoState): Promise<void> {
  await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(d));
}

/** Výška, pohlaví a délka kroku zůstávají jen v telefonu (osobní údaje, spec 11). */
export async function loadStepProfile(): Promise<StepProfile> {
  return parseStepProfile(await readJson(STEP_PROFILE_KEY));
}

export async function saveStepProfile(p: StepProfile): Promise<void> {
  await AsyncStorage.setItem(STEP_PROFILE_KEY, JSON.stringify(p));
}

/** Okamžik začátku rozpracovaného měření kroku (ISO), aby přežilo zavření aplikace. */
export async function loadCalibrationStart(): Promise<string | null> {
  const v = await readJson(CALIBRATION_KEY);
  return typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null;
}

const THEME_KEY = "footatlas.theme.v1";

export type StoredSchemeChoice = "light" | "dark" | "auto";

/** Zvolený vzhled; výchozí je světlý. */
export async function loadThemeChoice(): Promise<StoredSchemeChoice> {
  const v = await readJson(THEME_KEY);
  return v === "dark" || v === "auto" || v === "light" ? v : "light";
}

export async function saveThemeChoice(c: StoredSchemeChoice): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, JSON.stringify(c));
  } catch {
    // vzhled se nepodařilo uložit, platí jen do zavření aplikace
  }
}

export async function saveCalibrationStart(iso: string | null): Promise<void> {
  if (iso === null) await AsyncStorage.removeItem(CALIBRATION_KEY);
  else await AsyncStorage.setItem(CALIBRATION_KEY, JSON.stringify(iso));
}

const TIPS_KEY = "footatlas.tips.v1";

/** Tipy k hádankám (id místa → zvolená možnost); zůstávají jen v telefonu. */
export async function loadTips(): Promise<Record<string, Tip>> {
  return parseTips(await readJson(TIPS_KEY));
}

export async function saveTips(t: Record<string, Tip>): Promise<void> {
  try {
    await AsyncStorage.setItem(TIPS_KEY, JSON.stringify(t));
  } catch {
    // tip se nepodařilo uložit, platí jen do zavření aplikace
  }
}

const WISHES_KEY = "footatlas.wishes.v1";

/** „Chci ji“ u připravovaných výprav (id → true); jen poznámka v telefonu, nic se neodesílá. */
export async function loadWishes(): Promise<Record<string, true>> {
  return parseWishes(await readJson(WISHES_KEY));
}

export async function saveWishes(w: Record<string, true>): Promise<void> {
  try {
    await AsyncStorage.setItem(WISHES_KEY, JSON.stringify(w));
  } catch {
    // poznámka se nepodařila uložit, platí jen do zavření aplikace
  }
}

const LIFE_CARD_KEY = "footatlas.lifecard.v1";

/** Karta života se ukáže jednou po prvním načtení historie; tady je poznačeno, že už byla. */
export async function loadLifeCardSeen(): Promise<boolean> {
  return (await readJson(LIFE_CARD_KEY)) === true;
}

export async function saveLifeCardSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(LIFE_CARD_KEY, JSON.stringify(true));
  } catch {
    // příště se karta může ukázat znovu
  }
}

const POSTCARDS_KEY = "footatlas.postcards.v1";

/** Pohlednice uložené do Kroniky: pole indexů etap (od 0). Jen v telefonu. */
export async function loadPostcards(): Promise<number[]> {
  const v = await readJson(POSTCARDS_KEY);
  return Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n) && n >= 0) : [];
}

export async function savePostcards(stages: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(POSTCARDS_KEY, JSON.stringify(stages));
  } catch {
    // uložení se nepovedlo, platí jen do zavření aplikace
  }
}

const CHAPTER_OPENED_KEY = "footatlas.chapteropened.v1";

/**
 * Otevřel už chodec nějakou kapitolu? Do té doby se pod nadpisem kapitol (panel Výpravy, Atlas) ukazuje
 * vysvětlující věta; potom už ne (rozhodnutí 0029).
 */
export async function loadChapterOpened(): Promise<boolean> {
  return (await readJson(CHAPTER_OPENED_KEY)) === true;
}

export async function saveChapterOpened(): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAPTER_OPENED_KEY, JSON.stringify(true));
  } catch {
    // věta se příště může ukázat znovu
  }
}

const LAST_OPENED_KEY = "footatlas.lastopened.v1";

/**
 * Kdy byla aplikace naposledy otevřená (ms od epochy). Podle toho se Mezitím po ≥ 3 dnech pustí samo přes celou
 * obrazovku (rozhodnutí 0034). `null`, dokud se nic neuložilo.
 */
export async function loadLastOpened(): Promise<number | null> {
  const v = await readJson(LAST_OPENED_KEY);
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

export async function saveLastOpened(ms: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_OPENED_KEY, JSON.stringify(ms));
  } catch {
    // příště se počítá od dřívějšího otevření
  }
}

const ONBOARDING_KEY = "footatlas.onboarding.v1";

/** Úvod (rozhodnutí 0035) už proběhl nebo ho uživatel přeskočil. */
export async function loadOnboardingDone(): Promise<boolean> {
  return (await readJson(ONBOARDING_KEY)) === true;
}

export async function saveOnboardingDone(done: boolean): Promise<void> {
  try {
    if (done) await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(true));
    else await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // příště se úvod může ukázat znovu
  }
}
