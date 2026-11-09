import { Camera, GeoJSONSource, Images, Layer, Map, type CameraRef } from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import {
  ATLAS_PATTERNS,
  ATLAS_SKETCH_START,
  PLACES_SOURCE,
  REVEAL_INNER,
  REVEAL_OUTER,
  YOU_SOURCE,
  type StyleLayer,
  buildAtlasStyle,
  patternName,
  placeLayers,
  revealLayers,
  revealMask,
  routeLayers,
  themes,
  youLayers,
} from "@footatlas/map-style";
import { positionAt } from "@footatlas/core";
import { flightZoom, sectionBounds } from "../navrat";
import { placeProps } from "../map/atlasPlaces";
import { MEDALLIONS } from "../map/medallionFiles";
import { PATTERNS } from "../map/patternFiles";
import { prepareMapAssets, type MapAssets } from "../map/mapAssets";
import { useTheme } from "../theme/ThemeProvider";
import { AtlasFrame } from "./AtlasFrame";
import type { FlightMapProps } from "./flightMapProps";
import { RouteSketch } from "./RouteSketch";
import { T } from "./ui";

export type { FlightMapProps };

type Assets = { kind: "loading" } | { kind: "ready"; assets: MapAssets } | { kind: "failed" };

const REVEAL_INNER_M = 380;
const REVEAL_OUTER_M = 650;
const EMPTY = { type: "FeatureCollection" as const, features: [] };
/** Vybarvení (maska) se přepočítává po dílech úseku; polygonová unie je drahá, plynulý růst by telefon zdržoval. */
const MASK_STEPS = 6;
/** Přiblížení kamery za letu (zhruba čtvrť; prototyp letí na ~1,9× měřítko listu). */
const FLIGHT_ZOOM_DEFAULT = 14;
/** Dojezd kamery na další polohu; o málo delší než krok hodin (50 ms), aby se pohyb nezastavoval mezi kroky. */
const FOLLOW_MS = 70;

/**
 * Mapa návratu: stejný atlasový styl jako Výprava, ale kamera MapLibre plynule sleduje polohu letu (`walkedM`,
 * ease-in-out, u míst zastavuje podle plánu `returnPlan`) a po skončení (nebo přeskočení) ukáže celý úsek.
 * Místa se odemykají podle polohy letu.
 */
export function FlightMap(props: FlightMapProps) {
  const [state, setState] = useState<Assets>({ kind: "loading" });
  useEffect(() => {
    let live = true;
    prepareMapAssets().then(
      (assets) => live && setState({ kind: "ready", assets }),
      () => live && setState({ kind: "failed" }),
    );
    return () => {
      live = false;
    };
  }, []);
  if (state.kind !== "ready") {
    return (
      <View>
        <RouteSketch route={props.route} cumulative={props.cumulative} places={props.places} walkedM={props.walkedM} height={props.height} />
        {state.kind === "loading" && <T variant="small" style={{ paddingHorizontal: 20 }}>Připravuji mapu…</T>}
      </View>
    );
  }
  return <Live {...props} assets={state.assets} />;
}

function Live({ route, cumulative, places, fromM, toM, walkedM, durationMs, runKey, finished, holdZoom = 0, reduceMotion, height, frame, assets }: FlightMapProps & { assets: MapAssets }) {
  const { name, colors } = useTheme();
  const mapTheme = themes[name === "dark" ? "parchment-night" : "parchment-day"];
  const mode = mapTheme.mode;
  const style = useMemo(() => buildAtlasStyle({ theme: mapTheme, tilesUrl: assets.tilesUrl, glyphs: assets.glyphs }), [mapTheme, assets]);
  const camera = useRef<CameraRef>(null);
  const flightZ = useMemo(() => flightZoom(toM - fromM, durationMs), [fromM, toM, durationMs]);
  const coords = useMemo(() => route.map((p) => [p.lon, p.lat] as [number, number]), [route]);
  const start = useMemo(() => positionAt(route, cumulative, fromM), [route, cumulative, fromM]);
  const bounds = useMemo(() => sectionBounds(route, cumulative, fromM, toM), [route, cumulative, fromM, toM]);
  const [view, setView] = useState<{ zoom: number; lat: number }>({ zoom: FLIGHT_ZOOM_DEFAULT, lat: start.lat });

  // Poloha značky a kamery: jemný krok (1/600 úseku), aby se plynule hýbaly se stejnými hodinami (krok ≈ 50 ms).
  // Místa a maska se přepočítávají zřídka (drahé): místa po 1/40 úseku, maska po šestinách.
  const span = Math.max(1, toM - fromM);
  const frac = Math.min(1, Math.max(0, (walkedM - fromM) / span));
  const qFine = Math.round(frac * 600) / 600;
  const q = Math.round(frac * 40) / 40;
  const here = fromM + q * span;
  const youM = fromM + qFine * span;
  const you = useMemo(() => positionAt(route, cumulative, youM), [route, cumulative, youM]);
  const done = useMemo(() => [...coords.slice(0, Math.max(1, you.segment + 1)), [you.lon, you.lat] as [number, number]], [coords, you]);
  const maskStep = Math.round(q * MASK_STEPS);
  const maskDone = useMemo(() => {
    const m = fromM + (maskStep / MASK_STEPS) * span;
    const p = positionAt(route, cumulative, m);
    return [...coords.slice(0, Math.max(1, p.segment + 1)), [p.lon, p.lat] as [number, number]];
  }, [coords, route, cumulative, fromM, span, maskStep]);
  const masks = useMemo(
    () => ({ outer: revealMask(maskDone, REVEAL_OUTER_M), inner: revealMask(maskDone, REVEAL_INNER_M) }),
    [maskDone],
  );

  const nextStopId = useMemo(() => places.find((p) => p.kind === "stop" && p.atM > here)?.id, [places, here]);
  const placesData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: places.map((p) => ({
        type: "Feature" as const,
        id: p.id,
        properties: placeProps(p, here, nextStopId) as unknown as Record<string, string | number | boolean>,
        geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
      })),
    }),
    [places, here, nextStopId],
  );

  const images = useMemo(() => {
    const out: Record<string, number> = {};
    const take = (key: string) => {
      const m = MEDALLIONS[`${mode}-${key}`];
      if (m !== undefined) out[key] = m;
    };
    for (const p of places) {
      if (p.kind !== "stop") continue;
      take(`reached-${p.id}`);
      take(`next-${p.id}`);
    }
    for (const k of ["locked", "stamp-reached", "stamp-locked", "pill", "drawing-boat", "drawing-castle", "drawing-bridge"]) take(k);
    for (const pattern of ATLAS_PATTERNS) {
      const key = patternName(mapTheme, pattern);
      const m = PATTERNS[key];
      if (m !== undefined) out[key] = m;
    }
    return out;
  }, [places, mode, mapTheme]);

  // Let: kamera skočí na začátek úseku a pak v každém kroku hodin plynule dojede (lineárně) na polohu značky.
  useEffect(() => {
    const cam = camera.current;
    if (!cam) return;
    if (reduceMotion) {
      cam.fitBounds(bounds, { padding: { top: 40, right: 28, bottom: 40, left: 28 }, duration: 0 });
      return;
    }
    cam.jumpTo({ center: [start.lon, start.lat], zoom: flightZ });
  }, [runKey, start, bounds, reduceMotion, flightZ]);

  useEffect(() => {
    if (finished || reduceMotion) return;
    // U zastavení kamera zpomalí (to dělá čas letu z plánu) a mírně se přiblíží; obojí ze stejných hodin.
    const zoom = flightZoom(toM - fromM, durationMs, holdZoom);
    camera.current?.easeTo({ center: [you.lon, you.lat], zoom, duration: FOLLOW_MS, easing: "linear" });
  }, [you, finished, reduceMotion, holdZoom, fromM, toM, durationMs]);

  // Konec letu (doběhl, nebo se přeskočil): ukázat celý úsek.
  useEffect(() => {
    if (!finished || reduceMotion) return;
    camera.current?.fitBounds(bounds, { padding: { top: 40, right: 28, bottom: 40, left: 28 }, duration: 900 });
  }, [finished, bounds, reduceMotion]);

  const line = (c: Array<[number, number]>) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: c } });
  const point = { type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [you.lon, you.lat] } };
  const toLayers = (list: StyleLayer[], source: string, extra: Record<string, unknown> = {}) =>
    list
      .filter((l) => l.source === source)
      .map(({ source: _s, ...l }) => {
        const props = { ...l, ...extra } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        return <Layer key={l.id} {...props} />;
      });

  return (
    <View style={{ height, backgroundColor: colors.bg }} accessibilityLabel="Mapa ušlého úseku">
      <Map
        style={{ flex: 1 }}
        mapStyle={style as never}
        compass={false}
        logo={false}
        touchRotate={false}
        touchPitch={false}
        touchZoom={false}
        dragPan={false}
        doubleTapZoom={false}
        tintColor={mapTheme.palette.road}
        onRegionDidChange={(e) => setView({ zoom: e.nativeEvent.zoom, lat: e.nativeEvent.center[1]! })}
      >
        <Images images={images} />
        <Camera ref={camera} initialViewState={{ center: [start.lon, start.lat], zoom: flightZ }} />
        <GeoJSONSource id={REVEAL_INNER} data={masks.inner}>
          {toLayers(revealLayers(mapTheme), REVEAL_INNER, { beforeId: ATLAS_SKETCH_START })}
        </GeoJSONSource>
        <GeoJSONSource id={REVEAL_OUTER} data={masks.outer}>
          {toLayers(revealLayers(mapTheme), REVEAL_OUTER, { beforeId: ATLAS_SKETCH_START })}
        </GeoJSONSource>
        <GeoJSONSource id="route-rest" data={line(coords)}>
          {toLayers(routeLayers(mapTheme), "route-rest")}
        </GeoJSONSource>
        <GeoJSONSource id="route-done" data={here > 0 ? line(done) : EMPTY}>
          {toLayers(routeLayers(mapTheme), "route-done")}
        </GeoJSONSource>
        <GeoJSONSource id="places" data={placesData}>
          {toLayers(placeLayers(mapTheme), PLACES_SOURCE)}
        </GeoJSONSource>
        <GeoJSONSource id={YOU_SOURCE} data={point}>
          {toLayers(youLayers(mapTheme), YOU_SOURCE)}
        </GeoJSONSource>
      </Map>
      <AtlasFrame title={frame} zoom={view.zoom} lat={view.lat} />
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 12, bottom: 12, backgroundColor: colors.surface, opacity: 0.85, paddingHorizontal: 5, borderRadius: 4 }}
      >
        <T variant="small" style={{ fontSize: 10 }}>
          © přispěvatelé OpenStreetMap
        </T>
      </View>
    </View>
  );
}
