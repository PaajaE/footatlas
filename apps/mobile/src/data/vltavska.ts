import {
  buildPlan,
  cumulativeM,
  type ExpeditionPlan,
  type PlaceKind,
  type RoutePoint,
} from "@footatlas/core";
import expeditionJson from "@footatlas/content/data/vltavska-stezka/expedition.json";
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
}

export interface LoadedExpedition {
  id: string;
  name: string;
  summary: string;
  routeTypeLabel: string;
  totalM: number;
  plan: ExpeditionPlan;
  places: AppPlace[];
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
    placesById: new Map(places.map((p) => [p.id, p])),
    route,
    cumulative: cumulativeM(route),
    draft: raw.status === "draft",
  };
}

/** Pilotní výprava je zatím jediná a je zabalená v aplikaci. */
export const vltavska: LoadedExpedition = load();
