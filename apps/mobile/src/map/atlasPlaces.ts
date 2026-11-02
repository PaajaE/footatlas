import type { AppPlace } from "../data/vltavska";

/** Stav místa na mapě (pečeť podle `docs/prototyp-snimky/02-peceti.jpg`). */
export type PlaceState = "reached" | "next" | "locked";
export type DrawingKind = "boat" | "castle" | "bridge";

export interface PlaceFeatureProps {
  id: string;
  name: string;
  stop: boolean;
  state: PlaceState;
  /** Klíč obrázku (pečeť / medailon / razítko / šrafovaný kroužek), viz `tools/maps/make-medallions.py`. */
  image: string;
  /** Štítek s metry u další zastávky, jinak prázdný. */
  label: string;
  /** Klíč kresby u místa, nebo prázdný. */
  drawing: string;
  /** Menší číslo = přednost při rozmísťování: další zastávka, dosažená, zamčená. */
  rank: number;
}

/**
 * Kresba k místu podle jeho názvu (nic se nevymýšlí: loď je u míst „Přívoz …“, zámek u názvů se slovem „zámek“,
 * most u „most“ a „lávka“). Jinak žádná.
 */
export function drawingFor(name: string): DrawingKind | null {
  const n = name.toLocaleLowerCase("cs");
  if (/^přívoz\b/.test(n)) return "boat";
  if (/\bzámek\b/.test(n)) return "castle";
  if (/\bmost\b|\blávka\b/.test(n)) return "bridge";
  return null;
}

export function placeState(place: Pick<AppPlace, "id" | "atM">, walkedM: number, nextStopId: string | undefined): PlaceState {
  if (place.atM <= walkedM) return "reached";
  return place.id === nextStopId ? "next" : "locked";
}

/** Klíč obrázku místa. Zastávky mají vlastní pečeť / medailon (fotka), zamčené a malé objevy sdílené obrázky. */
export function imageKey(place: Pick<AppPlace, "id" | "kind">, state: PlaceState): string {
  if (place.kind === "stop") return state === "locked" ? "locked" : `${state}-${place.id}`;
  return state === "reached" ? "stamp-reached" : "stamp-locked";
}

/** Štítek vzdálenosti pod medailonem další zastávky: „40 m“, „1,2 km“ (bez kroků, ty patří do panelu). */
export function distanceLabel(meters: number): string {
  const m = Math.max(0, meters);
  if (m < 15) return "tady";
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  const tenths = Math.round(m / 100);
  return tenths >= 100 ? `${Math.round(m / 1000)} km` : `${Math.floor(tenths / 10)},${tenths % 10} km`;
}

export function placeProps(place: AppPlace, walkedM: number, nextStopId: string | undefined): PlaceFeatureProps {
  const state = placeState(place, walkedM, nextStopId);
  return {
    id: place.id,
    name: place.name,
    stop: place.kind === "stop",
    state,
    image: imageKey(place, state),
    label: state === "next" ? distanceLabel(place.atM - walkedM) : "",
    drawing: drawingFor(place.name) ?? "",
    rank: state === "next" ? 0 : state === "reached" ? 1 : 2,
  };
}

export interface ScaleBar {
  /** Délka čárky v metrech (kulatá hodnota) a její popisek. */
  meters: number;
  label: string;
  /** Délka čárky v bodech obrazovky. */
  widthPt: number;
}

/**
 * Měřítko pro rámeček mapy: nejdelší kulatá vzdálenost (1, 2, 5 × 10^n), která se vejde do `maxWidthPt`.
 * Metrů na bod obrazovky při zoomu z a šířce lat: 156 543,03 · cos(lat) / 2^z.
 */
export function scaleBar(zoom: number, latDeg: number, maxWidthPt = 96): ScaleBar {
  const mPerPt = (156_543.03 * Math.cos((latDeg * Math.PI) / 180)) / 2 ** zoom / 2; // 512px dlaždice: zoom 0 = 512 px
  const maxM = mPerPt * maxWidthPt;
  const pow = 10 ** Math.floor(Math.log10(maxM));
  const meters = [5, 2, 1].map((f) => f * pow).find((v) => v <= maxM) ?? pow;
  return {
    meters,
    label: meters >= 1000 ? `${meters / 1000} km` : `${meters} m`,
    widthPt: meters / mPerPt,
  };
}
