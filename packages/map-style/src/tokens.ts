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

/**
 * Barvy ilustrovaného atlasu (`buildAtlasStyle`): tužková skica všude a kolorovaná vrstva kolem ušlé trasy.
 * Vzory výplní (čtverečky, stromy, vinice) jsou hotové obrázky, jejich barvy jsou v `tools/maps/make-patterns.py`
 * a shodují se s těmito tokeny.
 */
export interface AtlasPalette {
  /** Papír pod skicou a krycí vrstva mimo ušlý úsek. */
  paper: string;
  /** Kolorovaná zem v masce kolem ušlé trasy. */
  wash: string;
  /** Tužka: linky skici (silnice, obrysy bloků a lesů). */
  pencil: string;
  /** Tužka, slabší (vedlejší cesty, okraje ploch). */
  pencilSoft: string;
  /** Okraje kolorované zástavby a lesů. */
  blockLine: string;
  forestLine: string;
  /** Akvarelová řeka a její okraj. */
  river: string;
  riverEdge: string;
  /** Zeleň (louky, parky) a vinice v kolorované vrstvě. */
  green: string;
  vineLine: string;
  /** Okrové budovy v kolorované vrstvě (detail). */
  building: string;
  /** Popisky čtvrtí a míst, název řeky. */
  label: string;
  labelWater: string;
  labelHalo: string;
}

export interface MapTheme {
  id: string;
  mode: "day" | "night";
  palette: MapPalette;
  route: RoutePalette;
  atlas: AtlasPalette;
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
  atlas: {
    paper: "#EFE4CB",
    wash: "#F4E6C6",
    pencil: "#9A8C74",
    pencilSoft: "#B8AA90",
    blockLine: "#8C5E3A",
    forestLine: "#3F5E32",
    river: "#8FB7B4",
    riverEdge: "#4E7F80",
    green: "#C9D3A0",
    vineLine: "#6E7A34",
    building: "#D6A877",
    label: "#2B2118",
    labelWater: "#4E7F80",
    labelHalo: "#F4E6C6",
  },
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
  atlas: {
    paper: "#2B241C",
    wash: "#332B21",
    pencil: "#7D6F5A",
    pencilSoft: "#5E5343",
    blockLine: "#8A6A48",
    forestLine: "#7E9A62",
    river: "#3E5552",
    riverEdge: "#6E9A98",
    green: "#2F3124",
    vineLine: "#8C9A4A",
    building: "#5A4430",
    label: "#F1E6D2",
    labelWater: "#8FAAA6",
    labelHalo: "#2B241C",
  },
};

export const themes = { "parchment-day": parchmentDay, "parchment-night": parchmentNight } as const;
