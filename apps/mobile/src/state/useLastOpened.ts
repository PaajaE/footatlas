import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { loadLastOpened, saveLastOpened } from "./storage";

export interface Opening {
  /** Kdy aplikace začala toto otevření (ms). */
  openedAt: number;
  /** Kdy byla otevřená předtím (ms), `null` poprvé. */
  previousMs: number | null;
}

/** Sdílené mezi obrazovkami: jedno otevření aplikace = jeden záznam, i když se obrazovka připojí znovu. */
let current: Opening | null = null;
let loading: Promise<Opening> | null = null;

async function open(now: number): Promise<Opening> {
  const previousMs = await loadLastOpened();
  current = { openedAt: now, previousMs };
  await saveLastOpened(now);
  return current;
}

/**
 * Čas posledního otevření aplikace (rozhodnutí 0034): při spuštění a při každém návratu z pozadí se přečte
 * předchozí hodnota a uloží nová. `undefined`, dokud se nenačte.
 */
export function useLastOpened(): Opening | undefined {
  const [opening, setOpening] = useState<Opening | undefined>(current ?? undefined);
  useEffect(() => {
    let alive = true;
    if (!current) {
      loading ??= open(Date.now());
      void loading.then((o) => alive && setOpening(o));
    }
    let wasActive = AppState.currentState === "active";
    const sub = AppState.addEventListener("change", (next) => {
      const active = next === "active";
      if (active && !wasActive) {
        loading = open(Date.now());
        void loading.then((o) => alive && setOpening(o));
      }
      wasActive = active;
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return opening;
}
