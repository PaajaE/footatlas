import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, type Theme } from "./tokens";

export type SchemeChoice = "auto" | "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  choice: SchemeChoice;
  setChoice: (c: SchemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  choice: "auto",
  setChoice: () => undefined,
});

/** Téma podle nastavení telefonu; vývojářský panel ho umí přepsat. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoice] = useState<SchemeChoice>("auto");
  const value = useMemo<ThemeContextValue>(() => {
    const dark = choice === "auto" ? system === "dark" : choice === "dark";
    return { theme: dark ? darkTheme : lightTheme, choice, setChoice };
  }, [system, choice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useSchemeChoice(): Pick<ThemeContextValue, "choice" | "setChoice"> {
  const { choice, setChoice } = useContext(ThemeContext);
  return { choice, setChoice };
}
