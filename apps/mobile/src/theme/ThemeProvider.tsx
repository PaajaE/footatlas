import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { loadThemeChoice, saveThemeChoice } from "../state/storage";
import { darkTheme, lightTheme, type Theme } from "./tokens";

export type SchemeChoice = "auto" | "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  choice: SchemeChoice;
  setChoice: (c: SchemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  choice: "light",
  setChoice: () => undefined,
});

/** Výchozí je světlé téma; volba (světlé, tmavé, podle systému) se pamatuje v telefonu. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<SchemeChoice>("light");

  useEffect(() => {
    let cancelled = false;
    loadThemeChoice().then((c) => {
      if (!cancelled) setChoiceState(c);
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
    return { theme: dark ? darkTheme : lightTheme, choice, setChoice };
  }, [system, choice, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useSchemeChoice(): Pick<ThemeContextValue, "choice" | "setChoice"> {
  const { choice, setChoice } = useContext(ThemeContext);
  return { choice, setChoice };
}
