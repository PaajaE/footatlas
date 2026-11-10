import { Camera, GeoJSONSource, Images, Layer, Map, type CameraRef } from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import {
  ATLAS_PATTERNS,
  ATLAS_SKETCH_START,
  PLACES_SOURCE,
  REVEAL_INNER,
  REVEAL_OUTER,
  REVEAL_PENDING,
  YOU_SOURCE,
  type StyleLayer,
  buildAtlasStyle,
  patternDimLayers,
  patternName,
  placeLayers,
  revealLayers,
  revealMask,
  revealPendingLayers,
  routeLayers,
  themes,
  youLayers,
} from "@footatlas/map-style";
import { positionAt } from "@footatlas/core";
import { flightCamera, phaseAt, screenOffsetDp, sectionBounds, SCREEN_DP, tipAt, zoomForWidth } from "../navrat";
import { placeProps } from "../map/atlasPlaces";
import { MEDALLIONS } from "../map/medallionFiles";
import { PATTERNS } from "../map/patternFiles";
import { prepareMapAssets, type MapAssets } from "../map/mapAssets";
import { useTheme } from "../theme/ThemeProvider";
import { AtlasFrame } from "./AtlasFrame";
import type { FlightMapProps } from "./flightMapProps";
import { PEN_NIB, PEN_SIZE, PenTip } from "./PenTip";
import { RouteSketch } from "./RouteSketch";
import { T } from "./ui";

export type { FlightMapProps };

type Assets = { kind: "loading" } | { kind: "ready"; assets: MapAssets } | { kind: "failed" };

const REVEAL_INNER_M = 380;
const REVEAL_OUTER_M = 650;
/**
 * Nevybarvená část úseku (papírová čára) začíná kus před hrotem: kulatý konec čáry má poloměr ~1,1 × vnější okraj
 * masky, takže barva se rozlévá těsně za perem, ne až o 650 m za ním.
 */
const PENDING_LEAD_M = 0.6 * REVEAL_OUTER_M;
const EMPTY = { type: "FeatureCollection" as const, features: [] };
const line = (c: Array<[number, number]>) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: c } });
/**
 * Délka jednoho pohybu kamery za kreslení (rozhodnutí 0028): kamera dostane pokyn jednou za úsek s cílem na jeho
 * konci a plynulost (60 snímků za sekundu) si spočítá MapLibre sám.
 */
const SEG_MS = 700;
/** Čára a její nevybarvená část se posílají do mapy po 1/800 úseku (a jen při změně). */
const LINE_STEPS = 800;
/** Místo na obzoru se do úvodního a závěrečného záběru přidá, jen když je blíž než tohle za koncem úseku. */
const HORIZON_MAX_M = 3_000;
/**
 * Náklon kamery za letu. Návrh (§ 8.1) zkouší 30°, ale necháváme 0°: vzory atlasu (šrafy, stromy, vinice) jsou
 * rastrové obrázky a v náklonu se v horní části obrazovky slévají v šedou plochu, popisky IM Fell se zmenšují
 * a rozmazávají a hrot pera i předstih kamery se počítají v rovinné projekci (`screenOffsetDp`). Až se náklon ověří
 * na telefonu (navrh-v2.md § 11), stačí změnit tuto konstantu; pero se pak posune jen přibližně.
 */
export const FLIGHT_PITCH = 0;
/** Krytí vzorů za letu (1 = jak je ve stylu); po skončení se vrátí. */
const PATTERN_DIM = 0.5;
/** Okraje záběrů na celý úsek. */
const PAD = { top: 70, right: 36, bottom: 40, left: 36 };
const NO_PAD = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Mapa přehrání cesty (rozhodnutí 0033). Úvodní záběr ukáže celý úsek s místem na obzoru, kamera se ponoří na start
 * (≈ 2–3 km na šířku), pak sleduje hrot pera s předstihem (pokyn po `SEG_MS`, plynulost počítá MapLibre), čára se
 * kreslí a papír se kolem ní plynule barví, a závěrečný záběr ukáže celý vybarvený úsek nad souhrnem.
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
        <RouteSketch
          route={props.route}
          cumulative={props.cumulative}
          places={props.places}
          walkedM={tipAt(props.plan, props.elapsedMs)}
          height={props.height}
        />
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
  plan,
  elapsedMs: t,
  runKey,
  horizonM,
  reduceMotion,
  height,
  bottomInset,
  frame,
  assets,
}: FlightMapProps & { assets: MapAssets }) {
  const { name, colors } = useTheme();
  const mapTheme = themes[name === "dark" ? "parchment-night" : "parchment-day"];
  const mode = mapTheme.mode;
  const style = useMemo(() => buildAtlasStyle({ theme: mapTheme, tilesUrl: assets.tilesUrl, glyphs: assets.glyphs }), [mapTheme, assets]);
  const camera = useRef<CameraRef>(null);
  const { fromM, toM } = plan;
  const span = Math.max(1, toM - fromM);
  const [width, setWidth] = useState(SCREEN_DP);
  const coords = useMemo(() => route.map((p) => [p.lon, p.lat] as [number, number]), [route]);
  const start = useMemo(() => positionAt(route, cumulative, fromM), [route, cumulative, fromM]);
  const zoom = useMemo(() => zoomForWidth(plan.widthM, width, start.lat), [plan.widthM, width, start.lat]);
  // Úvodní i závěrečný záběr: úsek a k němu místo na obzoru („jsem tady, tamhle je cíl“).
  const overview = useMemo(() => {
    const reach = horizonM !== undefined && horizonM > toM && horizonM - toM <= HORIZON_MAX_M ? horizonM : toM;
    return sectionBounds(route, cumulative, fromM, reach);
  }, [route, cumulative, fromM, toM, horizonM]);
  const [view, setView] = useState<{ zoom: number; lat: number }>({ zoom, lat: start.lat });

  const phase = phaseAt(plan, t);
  const flying = !reduceMotion && (phase === "dive" || phase === "draw");

  // Hrot pera a čára: po 1/LINE_STEPS úseku, do mapy se posílá jen při změně.
  const tipM = tipAt(plan, t);
  const step = Math.round(((tipM - fromM) / span) * LINE_STEPS);
  const stepM = fromM + (step / LINE_STEPS) * span;
  const beforeData = useMemo(() => {
    if (fromM <= 0) return EMPTY;
    const a = positionAt(route, cumulative, fromM);
    return line([...coords.slice(0, Math.max(1, a.segment + 1)), [a.lon, a.lat]]);
  }, [route, cumulative, coords, fromM]);
  const sectionData = useMemo(() => {
    if (stepM <= fromM) return EMPTY;
    const a = positionAt(route, cumulative, fromM);
    const b = positionAt(route, cumulative, stepM);
    return line([[a.lon, a.lat], ...coords.slice(a.segment + 1, b.segment + 1), [b.lon, b.lat]]);
  }, [route, cumulative, coords, fromM, stepM]);
  // Nevybarvená část úseku: od kousku před hrotem do cíle. Maska se počítá jen jednou pro celý úsek (do `toM`),
  // plynulé barvení dělá zkracující se papírová čára (`revealPendingLayers`), viz rozhodnutí 0033.
  const pendingData = useMemo(() => {
    const p0 = Math.min(toM, stepM + PENDING_LEAD_M);
    if (p0 >= toM) return EMPTY;
    const a = positionAt(route, cumulative, p0);
    const b = positionAt(route, cumulative, toM);
    return line([[a.lon, a.lat], ...coords.slice(a.segment + 1, b.segment + 1), [b.lon, b.lat]]);
  }, [route, cumulative, coords, toM, stepM]);
  const restData = useMemo(() => line(coords), [coords]);
  const masks = useMemo(() => {
    const p = positionAt(route, cumulative, toM);
    const done = [...coords.slice(0, Math.max(1, p.segment + 1)), [p.lon, p.lat] as [number, number]];
    return { outer: revealMask(done, REVEAL_OUTER_M), inner: revealMask(done, REVEAL_INNER_M) };
  }, [coords, route, cumulative, toM]);
  const pendingLayers = useMemo(() => revealPendingLayers(mapTheme, start.lat, REVEAL_OUTER_M), [mapTheme, start.lat]);

  // Místa: přepočítat jen, když hrot mine další místo.
  const reached = places.filter((p) => p.atM <= tipM).length;
  const placesData = useMemo(() => {
    const here = reached > 0 ? Math.max(tipM, places.filter((p) => p.atM <= tipM).at(-1)!.atM) : tipM;
    const nextStopId = places.find((p) => p.kind === "stop" && p.atM > here)?.id;
    return {
      type: "FeatureCollection" as const,
      features: places.map((p) => ({
        type: "Feature" as const,
        id: p.id,
        properties: placeProps(p, here, nextStopId) as unknown as Record<string, string | number | boolean>,
        geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
      })),
    };
  }, [places, reached]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Za letu ztlumit vzory (šrafy, stromy, vinice), po skončení vrátit. Úprava existujících vrstev stylu: komponenty
  // `Layer` se stejným id převezmou vrstvu ze stylu (nevytvářejí novou) a jen jí změní krytí.
  const dimmed = phase !== "done";
  const dimLayers = useMemo(() => patternDimLayers(style, dimmed ? PATTERN_DIM : 1), [style, dimmed]);

  // ── Kamera ──────────────────────────────────────────────────────────────────────────────────────────────────
  const centerAt = (ms: number): [number, number] => {
    const p = positionAt(route, cumulative, flightCamera(plan, ms).centerM);
    return [p.lon, p.lat];
  };
  const overviewPad = { ...PAD, bottom: PAD.bottom + bottomInset };

  // Nové přehrání: úvodní záběr bez animace. Při „Omezit pohyb“ rovnou záběr, ve kterém zůstane i souhrn.
  useEffect(() => {
    camera.current?.fitBounds(overview, { padding: reduceMotion ? overviewPad : PAD, pitch: 0, bearing: 0, duration: 0 });
  }, [runKey, reduceMotion, overview]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pokyny kameře: ponoření (1 s), za kreslení jeden pokyn na úsek SEG_MS, závěrečný záběr (1,5 s). Přeskočení
  // („Přeskočit“) skočí rovnou na závěrečný záběr.
  const drawSeg = phase === "draw" ? Math.floor((t - plan.drawStartMs) / SEG_MS) : -1;
  const cue = `${runKey}:${phase}:${drawSeg}`;
  useEffect(() => {
    const cam = camera.current;
    if (!cam || reduceMotion) return;
    if (phase === "dive") {
      cam.easeTo({ center: centerAt(plan.drawStartMs), zoom, pitch: FLIGHT_PITCH, bearing: 0, padding: NO_PAD, duration: Math.max(16, plan.drawStartMs - t), easing: "ease" });
    } else if (phase === "draw") {
      const endMs = Math.min(plan.drawEndMs, plan.drawStartMs + (drawSeg + 1) * SEG_MS);
      cam.easeTo({ center: centerAt(endMs), zoom, pitch: FLIGHT_PITCH, bearing: 0, padding: NO_PAD, duration: Math.max(16, endMs - t), easing: "linear" });
    } else if (phase === "outro" || phase === "done") {
      cam.fitBounds(overview, { padding: overviewPad, pitch: 0, bearing: 0, duration: phase === "outro" ? Math.max(300, plan.totalMs - t) : 600, easing: "ease" });
    }
  }, [cue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hrot pera: za letu je kamera o předstih před ním, takže pero není uprostřed. Jeho posun od středu se spočítá
  // z plánu na konci každého úseku a dojede tam stejně dlouho a lineárně jako kamera (nativní animace).
  const pen = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  useEffect(() => {
    if (!flying) return;
    const offsetAt = (ms: number) => {
      const c = flightCamera(plan, ms);
      const a = positionAt(route, cumulative, c.centerM);
      const b = positionAt(route, cumulative, c.tipM);
      return screenOffsetDp({ lon: a.lon, lat: a.lat }, { lon: b.lon, lat: b.lat }, zoom);
    };
    if (phase === "dive") {
      pen.setValue({ x: 0, y: 0 });
      return;
    }
    const endMs = Math.min(plan.drawEndMs, plan.drawStartMs + (drawSeg + 1) * SEG_MS);
    pen.setValue(offsetAt(t));
    const anim = Animated.timing(pen, { toValue: offsetAt(endMs), duration: Math.max(16, endMs - t), easing: Easing.linear, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [cue, flying]); // eslint-disable-line react-hooks/exhaustive-deps

  // Značka „vy“ se v mapě kreslí jen mimo let (za letu je na jejím místě pero).
  const you = useMemo(() => positionAt(route, cumulative, stepM), [route, cumulative, stepM]);
  const pointData = useMemo(
    () => (flying ? EMPTY : { type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [you.lon, you.lat] } }),
    [flying, you],
  );
  const toLayers = (list: StyleLayer[], source: string, extra: Record<string, unknown> = {}) =>
    list
      .filter((l) => l.source === source)
      .map(({ source: _s, ...l }) => {
        const props = { ...l, ...extra } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        return <Layer key={l.id} {...props} />;
      });

  return (
    <View
      style={{ height, backgroundColor: colors.bg }}
      accessibilityLabel="Mapa ušlého úseku"
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width) || SCREEN_DP)}
    >
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
        <Camera ref={camera} initialViewState={{ bounds: overview, padding: PAD }} />
        {dimLayers.map((l) => (
          <Layer key={l.id} id={l.id} type="fill" paint={l.paint} />
        ))}
        <GeoJSONSource id={REVEAL_INNER} data={masks.inner}>
          {toLayers(revealLayers(mapTheme), REVEAL_INNER, { beforeId: ATLAS_SKETCH_START })}
        </GeoJSONSource>
        <GeoJSONSource id={REVEAL_OUTER} data={masks.outer}>
          {toLayers(revealLayers(mapTheme), REVEAL_OUTER, { beforeId: ATLAS_SKETCH_START })}
        </GeoJSONSource>
        <GeoJSONSource id={REVEAL_PENDING} data={pendingData}>
          {toLayers(pendingLayers, REVEAL_PENDING, { beforeId: ATLAS_SKETCH_START })}
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
      {flying && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: width / 2 - PEN_NIB.x,
            top: height / 2 - PEN_NIB.y,
            width: PEN_SIZE,
            height: PEN_SIZE,
            transform: [{ translateX: pen.x }, { translateY: pen.y }],
          }}
        >
          <PenTip ink={mapTheme.route.done} metal={colors.ochre} paper={mapTheme.atlas.paper} />
        </Animated.View>
      )}
      <AtlasFrame title={frame} zoom={view.zoom} lat={view.lat} />
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 12, bottom: 12 + (phase === "done" ? bottomInset : 0), backgroundColor: colors.surface, opacity: 0.85, paddingHorizontal: 5, borderRadius: 4 }}
      >
        <T variant="small" style={{ fontSize: 10 }}>
          © přispěvatelé OpenStreetMap
        </T>
      </View>
    </View>
  );
}
