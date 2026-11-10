import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadOnboardingDone, saveOnboardingDone } from "./storage";

interface OnboardingValue {
  /** Uložený příznak je načtený. */
  loaded: boolean;
  done: boolean;
  /** Poznačí úvod jako hotový (dokončený i přeskočený). */
  complete: () => void;
}

const Ctx = createContext<OnboardingValue>({ loaded: true, done: true, complete: () => undefined });

/** Pamatuje si, že úvod proběhl (rozhodnutí 0035). Zůstává jen v telefonu. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadOnboardingDone().then((d) => {
      if (cancelled) return;
      setDone(d);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const complete = useCallback(() => {
    setDone(true);
    void saveOnboardingDone(true);
  }, []);

  const value = useMemo(() => ({ loaded, done, complete }), [loaded, done, complete]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding(): OnboardingValue {
  return useContext(Ctx);
}
