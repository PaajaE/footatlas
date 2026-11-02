import {
  buildPlan,
  cumulativeM,
  type ExpeditionPlan,
  type PlaceKind,
  type RoutePoint,
} from "@footatlas/core";
import expeditionJson from "@footatlas/content/data/vltavska-stezka/expedition.json";
import obsahJson from "@footatlas/content/data/vltavska-stezka/obsah.json";
import routeJson from "@footatlas/content/data/vltavska-stezka/route.json";

/** Místo tak, jak ho potřebují obrazovky (draft i vydané). */
export interface AppPlace {
  id: string;
  kind: Exclude<PlaceKind, "milestone">;
  name: string;
  text: string;
  lat: number;
  lon: number;
  atM: number;
  draft: boolean;
  photo?: string;
  /** Obsah z obsah.json (chybí u míst bez příběhu). */
  hook?: string;
  teaser?: string;
  riddle?: AppRiddle;
  context?: string;
  visitTip?: string;
  chapterId?: string;
}

export interface AppRiddle {
  question: string;
  options: [string, string, string];
  answer: 0 | 1 | 2;
}

export interface AppChapter {
  id: string;
  title: string;
  blurb: string;
  /** Id míst kapitoly v pořadí trasy. */
  placeIds: string[];
}

export interface LoadedExpedition {
  id: string;
  name: string;
  summary: string;
  routeTypeLabel: string;
  totalM: number;
  plan: ExpeditionPlan;
  places: AppPlace[];
  chapters: AppChapter[];
  placesById: Map<string, AppPlace>;
  route: RoutePoint[];
  cumulative: number[];
  draft: boolean;
}

interface RawPlace {
  id: string;
  kind: "stop" | "discovery";
  name: string;
  text: string;
  lat: number;
  lon: number;
  unlockAtM: number;
  draft?: boolean;
  photo?: string;
}

/** Štítky typů trasy (spec 5.4); shodují se s `routeTypeLabel` v balíčku content. */
const ROUTE_LABELS: Record<string, string> = {
  real: "Skutečná trasa",
  simplified: "Zjednodušená trasa",
  virtual: "Vlastní virtuální trasa",
  symbolic: "Symbolická cesta",
  imported: "Skutečná trasa · vlastní import",
};

function load(): LoadedExpedition {
  const raw = expeditionJson as unknown as {
    id: string;
    name: string;
    summary: string;
    status: string;
    routeType: string;
    totalM: number;
    stageEndsM?: number[];
    places: RawPlace[];
  };
  const places: AppPlace[] = raw.places
    .map((p) => ({
      id: p.id,
      kind: p.kind,
      name: p.name,
      text: p.text,
      lat: p.lat,
      lon: p.lon,
      atM: p.unlockAtM,
      draft: p.draft === true,
      photo: p.photo,
    }))
    .sort((a, b) => a.atM - b.atM);
  const obsah = obsahJson as unknown as {
    chapters: Array<{ id: string; title: string; blurb: string }>;
    stories: Array<{
      id: string;
      hook: string;
      teaser?: string;
      riddle?: AppRiddle;
      context?: string;
      visitTip?: string;
      chapterId?: string;
    }>;
  };
  const stories = new Map(obsah.stories.map((st) => [st.id, st]));
  for (const p of places) {
    const st = stories.get(p.id);
    if (!st) continue;
    p.hook = st.hook;
    p.teaser = st.teaser;
    p.riddle = st.riddle;
    p.context = st.context;
    p.visitTip = st.visitTip;
    p.chapterId = st.chapterId;
  }
  const chapters: AppChapter[] = obsah.chapters.map((c) => ({
    ...c,
    placeIds: places.filter((p) => p.chapterId === c.id).map((p) => p.id),
  }));
  const route: RoutePoint[] = (routeJson as unknown as { coordinates: [number, number][] }).coordinates.map(([lon, lat]) => ({
    lat,
    lon,
  }));
  return {
    id: raw.id,
    name: raw.name,
    summary: raw.summary,
    routeTypeLabel: ROUTE_LABELS[raw.routeType] ?? raw.routeType,
    totalM: raw.totalM,
    plan: buildPlan({
      totalM: raw.totalM,
      stageEndsM: raw.stageEndsM,
      places: places.map((p) => ({ id: p.id, kind: p.kind, atM: p.atM })),
    }),
    places,
    chapters,
    placesById: new Map(places.map((p) => [p.id, p])),
    route,
    cumulative: cumulativeM(route),
    draft: raw.status === "draft",
  };
}

/** Pilotní výprava je zatím jediná a je zabalená v aplikaci. */
export const vltavska: LoadedExpedition = load();
