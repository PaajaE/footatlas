/**
 * Barvy mapy na jednom místě. Styl (style.ts) se skládá jen z těchto tokenů, žádná barva
 * se v něm nepíše natvrdo. Druhý vizuální styl (rozhodnutí 0002) = další objekt `MapTheme`.
 */
export interface MapPalette {
  bg: string;
  land: string;
  wood: string;
  park: string;
  water: string;
  waterLine: string;
  urban: string;
  bld: string;
  bldLine: string;
  road: string;
  roadMinor: string;
  path: string;
  rail: string;
  text: string;
  textWater: string;
  halo: string;
}

/** Barvy trasy výpravy nad mapou: ušlý úsek, zbývající úsek a podkladové obrysy. */
export interface RoutePalette {
  done: string;
  plan: string;
  halo: string;
  width: number;
}

export interface MapTheme {
  id: string;
  mode: "day" | "night";
  palette: MapPalette;
  route: RoutePalette;
}

/** Pergamen, světlý režim. Hodnoty převzaté z mockupů (docs/mockupy/nastroje/mapa.html). */
export const parchmentDay: MapTheme = {
  id: "parchment-day",
  mode: "day",
  palette: {
    bg: "#EFE4CB",
    land: "#EBDFC3",
    wood: "#DCD5AE",
    park: "#E4DCB9",
    water: "#B7CBC5",
    waterLine: "#A7BEB7",
    urban: "#E0CCA3",
    bld: "#E1CFAA",
    bldLine: "#BDA77F",
    road: "#8A6B45",
    roadMinor: "#AB9473",
    path: "#7A5A36",
    rail: "#5E4630",
    text: "#3A2A1C",
    textWater: "#4F6A66",
    halo: "#EFE4CB",
  },
  route: { done: "#9B2C22", plan: "#3A2A1C", halo: "#F3E6C4", width: 3.2 },
};

/** Pergamen, tmavý režim. */
export const parchmentNight: MapTheme = {
  id: "parchment-night",
  mode: "night",
  palette: {
    bg: "#2B241C",
    land: "#2E271F",
    wood: "#2F3124",
    park: "#302D22",
    water: "#2F474E",
    waterLine: "#3F5C64",
    urban: "#3A3126",
    bld: "#43382B",
    bldLine: "#55473A",
    road: "#A68A5E",
    roadMinor: "#7A6649",
    path: "#A68A5E",
    rail: "#8C7656",
    text: "#E2D3B4",
    textWater: "#8FAAA6",
    halo: "#2B241C",
  },
  route: { done: "#E0704A", plan: "#E2D3B4", halo: "#2B241C", width: 3.2 },
};

export const themes = { "parchment-day": parchmentDay, "parchment-night": parchmentNight } as const;
