/**
 * Vizuální téma. Obrazovky berou barvy a písma jen odtud (rozhodnutí 0002: později druhý styl),
 * takže nesmí předpokládat pergamenovou texturu ani konkrétní písmo.
 *
 * Hodnoty z mockupů (`docs/mockupy`). Jediná odchylka: světlá `ochre` je tmavší (#7F5718 místo #8E6320),
 * protože původní hodnota měla na pergamenu kontrast 4,2 : 1 a malé kapitálky vyžadují 4,5 : 1.
 */
export interface ThemeColors {
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
  accentFg: string;
  ochre: string;
  /** Tok řeky a nedošlý úsek trasy v náhledu. */
  water: string;
  routeRemaining: string;
}

export interface ThemeFonts {
  display: string;
  displayItalic: string;
  displaySC: string;
  body: string;
  bodyMedium: string;
  bodySemi: string;
}

export interface Theme {
  name: "light" | "dark";
  colors: ThemeColors;
  fonts: ThemeFonts;
  radius: { card: number; pill: number; button: number };
}

const fonts: ThemeFonts = {
  display: "IMFellEnglish_400Regular",
  displayItalic: "IMFellEnglish_400Regular_Italic",
  displaySC: "IMFellEnglishSC_400Regular",
  body: "WorkSans_400Regular",
  bodyMedium: "WorkSans_500Medium",
  bodySemi: "WorkSans_600SemiBold",
};

const radius = { card: 18, pill: 999, button: 14 };

export const lightTheme: Theme = {
  name: "light",
  colors: {
    bg: "#EFE4CB",
    surface: "#F8F1E1",
    fg: "#2B2118",
    muted: "#75644E",
    line: "#D8C9A9",
    accent: "#9B2C22",
    accentFg: "#FBF5E8",
    ochre: "#7F5718",
    water: "#B8CFCB",
    routeRemaining: "#3A2A1C",
  },
  fonts,
  radius,
};

export const darkTheme: Theme = {
  name: "dark",
  colors: {
    bg: "#2B241C",
    surface: "#372E24",
    fg: "#F1E6D2",
    muted: "#B5A68D",
    line: "#4A3E31",
    accent: "#E0704A",
    accentFg: "#2B241C",
    ochre: "#D9B068",
    water: "#3E5552",
    routeRemaining: "#E2D3B4",
  },
  fonts,
  radius,
};
