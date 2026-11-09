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
const line = (c: Array<[number, number]>) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: c } });
/** Vybarvení (maska) se přepočítává po dílech úseku; polygonová unie je drahá, plynulý růst by telefon zdržoval. */
const MASK_STEPS = 6;
/** Přiblížení kamery za letu (zhruba čtvrť; prototyp letí na ~1,9× měřítko listu). */
const FLIGHT_ZOOM_DEFAULT = 14;
/** Dojezd kamery na další polohu, když není plán (`cameraAt`); o málo delší než krok hodin (50 ms). */
const FOLLOW_MS = 70;
/**
 * Délka jednoho pohybu kamery při letu podle plánu. Kamera dostane pokyn jen jednou za úsek a plynulost (60 snímků
 * za sekundu) si spočítá MapLibre sám; pokyn každých 50 ms se na telefonu nestíhal a mapa se sekala.
 */
const SEG_MS = 700;
/** Hotová část úseku se překresluje po 1/300 (jen geometrie úseku, ne celé trasy). */
const DONE_STEPS = 300;
/** Místo na obzoru se do závěrečného záběru přidá, jen když je blíž než tohle za koncem úseku. */
const HORIZON_MAX_M = 3_000;

/**
 * Mapa návratu: stejný atlasový styl jako Výprava. Kamera letí po úseku v pohybech po `SEG_MS` podle plánu
 * (`cameraAt`: ease-in-out, u míst stojí podle `returnPlan`), značka „vy“ je za letu pevně uprostřed mapy (kamera je
 * vždy na ní) a po skončení (nebo přeskočení) se ukáže celý úsek i s místem na obzoru. Místa se odemykají podle
 * polohy letu. Data zdrojů se posílají do mapy, jen když se opravdu změní.
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

function Live({
  route,
  cumulative,
  places,
  fromM,
  toM,
  walkedM,
  durationMs,
  runKey,
  finished,
  holdZoom = 0,
  elapsedMs,
  cameraAt,
  horizonM,
  reduceMotion,
  height,
  frame,
  assets,
}: FlightMapProps & { assets: MapAssets }) {
  const { name, colors } = useTheme();
  const mapTheme = themes[name === "dark" ? "parchment-night" : "parchment-day"];
  const mode = mapTheme.mode;
  const style = useMemo(() => buildAtlasStyle({ theme: mapTheme, tilesUrl: assets.tilesUrl, glyphs: assets.glyphs }), [mapTheme, assets]);
  const camera = useRef<CameraRef>(null);
  const flightZ = useMemo(() => flightZoom(toM - fromM, durationMs), [fromM, toM, durationMs]);
  const coords = useMemo(() => route.map((p) => [p.lon, p.lat] as [number, number]), [route]);
  const start = useMemo(() => positionAt(route, cumulative, fromM), [route, cumulative, fromM]);
  const bounds = useMemo(() => sectionBounds(route, cumulative, fromM, toM), [route, cumulative, fromM, toM]);
  // Závěrečný záběr: úsek a k němu místo na obzoru, aby bylo vidět „jsem tady, tamhle je cíl“.
  const endBounds = useMemo(() => {
    const reach = horizonM !== undefined && horizonM > toM && horizonM - toM <= HORIZON_MAX_M ? horizonM : toM;
    return sectionBounds(route, cumulative, fromM, reach);
  }, [route, cumulative, fromM, toM, horizonM]);
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
  // Ušlá trasa: část před úsekem se nemění; za letu se posílá jen geometrie úseku.
  const doneM = fromM + (Math.round(frac * DONE_STEPS) / DONE_STEPS) * span;
  const beforeData = useMemo(() => {
    if (fromM <= 0) return EMPTY;
    const a = positionAt(route, cumulative, fromM);
    return line([...coords.slice(0, Math.max(1, a.segment + 1)), [a.lon, a.lat]]);
  }, [route, cumulative, coords, fromM]);
  const sectionData = useMemo(() => {
    if (doneM <= fromM) return EMPTY;
    const a = positionAt(route, cumulative, fromM);
    const b = positionAt(route, cumulative, doneM);
    return line([[a.lon, a.lat], ...coords.slice(a.segment + 1, b.segment + 1), [b.lon, b.lat]]);
  }, [route, cumulative, coords, fromM, doneM]);
  const restData = useMemo(() => line(coords), [coords]);
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

  // Let podle plánu: jeden pokyn kameře na úsek SEG_MS, cílem je poloha na konci úseku. Při zastavení se poloha
  // nemění a kamera jen mírně přiblíží. Skok („Dál“) nebo pauza se projeví nejpozději v dalším úseku.
  const planned = cameraAt !== undefined && elapsedMs !== undefined;
  const seg = planned ? Math.floor(elapsedMs / SEG_MS) : -1;
  useEffect(() => {
    if (!planned || finished || reduceMotion) return;
    const endMs = (seg + 1) * SEG_MS;
    const target = cameraAt(endMs);
    const p = positionAt(route, cumulative, target.m);
    camera.current?.easeTo({
      center: [p.lon, p.lat],
      zoom: flightZoom(toM - fromM, durationMs, target.holdZoom),
      duration: Math.max(16, endMs - elapsedMs),
      easing: "linear",
    });
  }, [seg, runKey, finished, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bez plánu (starší volání): kamera dojíždí za značkou v každém kroku hodin.
  useEffect(() => {
    if (planned || finished || reduceMotion) return;
    const zoom = flightZoom(toM - fromM, durationMs, holdZoom);
    camera.current?.easeTo({ center: [you.lon, you.lat], zoom, duration: FOLLOW_MS, easing: "linear" });
  }, [planned, you, finished, reduceMotion, holdZoom, fromM, toM, durationMs]);

  // Konec letu (doběhl, nebo se přeskočil): ukázat celý úsek a místo na obzoru.
  useEffect(() => {
    if (!finished || reduceMotion) return;
    camera.current?.fitBounds(endBounds, { padding: { top: 70, right: 36, bottom: 40, left: 36 }, duration: 900 });
  }, [finished, endBounds, reduceMotion]);

  // Za letu je značka pevně uprostřed obrazovky (kamera je na ní); v mapě se kreslí až po skončení.
  const pinned = planned && !finished && !reduceMotion;
  const pointData = useMemo(
    () => (pinned ? EMPTY : { type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [you.lon, you.lat] } }),
    [pinned, you],
  );
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
        <GeoJSONSource id="route-rest" data={restData}>
          {toLayers(routeLayers(mapTheme), "route-rest")}
        </GeoJSONSource>
        <GeoJSONSource id="route-before" data={beforeData}>
          {toLayers(
            routeLayers(mapTheme).map((l) => ({ ...l, id: `${l.id}-before` })),
            "route-done",
          )}
        </GeoJSONSource>
        <GeoJSONSource id="route-done" data={sectionData}>
          {toLayers(routeLayers(mapTheme), "route-done")}
        </GeoJSONSource>
        <GeoJSONSource id="places" data={placesData}>
          {toLayers(placeLayers(mapTheme), PLACES_SOURCE)}
        </GeoJSONSource>
        <GeoJSONSource id={YOU_SOURCE} data={pointData}>
          {toLayers(youLayers(mapTheme), YOU_SOURCE)}
        </GeoJSONSource>
      </Map>
      {pinned && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: height / 2 - 15, alignItems: "center" }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: mapTheme.route.done + "33", alignItems: "center", justifyContent: "center" }}>
            <View
              style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: mapTheme.route.done, borderWidth: 3, borderColor: mapTheme.atlas.paper }}
            />
          </View>
        </View>
      )}
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
