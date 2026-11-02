import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { loadThemeChoice, saveThemeChoice } from "../state/storage";
import { darkTheme, lightTheme, type Theme } from "./tokens";

export type SchemeChoice = "auto" | "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  choice: SchemeChoice;
  /** Uložená volba už je načtená, takže první vykreslení nebliká špatným tématem. */
  ready: boolean;
  setChoice: (c: SchemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  choice: "light",
  ready: true,
  setChoice: () => undefined,
});

/** Výchozí je světlé téma; volba (světlé, tmavé, podle systému) se pamatuje v telefonu. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<SchemeChoice>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadThemeChoice().then((c) => {
      if (cancelled) return;
      setChoiceState(c);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setChoice = useCallback((c: SchemeChoice) => {
    setChoiceState(c);
    void saveThemeChoice(c);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const dark = choice === "auto" ? system === "dark" : choice === "dark";
    return { theme: dark ? darkTheme : lightTheme, choice, ready, setChoice };
  }, [system, choice, ready, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useSchemeChoice(): Pick<ThemeContextValue, "choice" | "setChoice"> {
  const { choice, setChoice } = useContext(ThemeContext);
  return { choice, setChoice };
}

/** Je načtená uložená volba vzhledu? Splash screen se do té doby neskrývá. */
export function useThemeReady(): boolean {
  return useContext(ThemeContext).ready;
}
