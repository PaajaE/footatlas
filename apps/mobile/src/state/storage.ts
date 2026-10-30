import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseSession, type ExpeditionSession } from "@footatlas/core";

const SESSION_KEY = "footatlas.session.v1";
const DEMO_KEY = "footatlas.demo.v1";

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
