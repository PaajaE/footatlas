import { Camera, GeoJSONSource, Images, Layer, Map, type CameraRef } from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import {
  ATLAS_LABEL_FONT,
  ATLAS_PATTERNS,
  ATLAS_SKETCH_START,
  REVEAL_INNER,
  REVEAL_OUTER,
  buildAtlasStyle,
  patternName,
  revealLayers,
  revealMask,
  routeLayers,
  themes,
} from "@footatlas/map-style";
import { positionAt } from "@footatlas/core";
import { placeProps } from "../map/atlasPlaces";
import { MEDALLIONS } from "../map/medallionFiles";
import { PATTERNS } from "../map/patternFiles";
import { prepareMapAssets, type MapAssets } from "../map/mapAssets";
import { useTheme } from "../theme/ThemeProvider";
import type { ExpeditionMapProps } from "./expeditionMapProps";
import { AtlasFrame } from "./AtlasFrame";
import { RouteSketch } from "./RouteSketch";
import { Button, T } from "./ui";

export type { ExpeditionMapProps };

type Assets = { kind: "loading" } | { kind: "ready"; assets: MapAssets } | { kind: "failed"; message: string };

/** Poloměry vybarvené části kolem ušlé trasy: plně (vnitřní) a do měkkého okraje (vnější), v metrech. */
const REVEAL_INNER_M = 380;
const REVEAL_OUTER_M = 650;
const EMPTY = { type: "FeatureCollection" as const, features: [] };

/**
 * Mapa výpravy: vlastní OSM dlaždice z přibaleného souboru, pergamenový styl z `packages/map-style`
 * a trasa, zastávky a poloha nad ní (rozhodnutí 0001). Než se data připraví (první spuštění kopíruje
 * soubor do úložiště), a při selhání se ukazuje náhled trasy bez podkladu.
 */
export function ExpeditionMap(props: ExpeditionMapProps) {
  const [state, setState] = useState<Assets>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ kind: "loading" });
    prepareMapAssets().then(
      (assets) => live && setState({ kind: "ready", assets }),
      (e) => live && setState({ kind: "failed", message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  if (state.kind !== "ready") {
    return (
      <View>
        <RouteSketch {...props} />
        <View style={{ paddingHorizontal: 20, paddingTop: 6, gap: 6 }}>
          {state.kind === "loading" && <T variant="small">Připravuji mapu; při prvním spuštění se stahuje (26 MB), potřebuje připojení.</T>}
          {state.kind === "failed" && (
            <>
              <T variant="small">Podkladová mapa se nenačetla ({state.message}).</T>
              <Button kind="secondary" label="Zkusit znovu" onPress={() => setAttempt((n) => n + 1)} />
            </>
          )}
        </View>
      </View>
    );
  }
  return <LiveMap {...props} assets={state.assets} />;
}

function LiveMap({ route, cumulative, places, walkedM, height, onPlacePress, assets, insets, frame, controls = true }: ExpeditionMapProps & { assets: MapAssets }) {
  const { name, colors, fonts } = useTheme();
  const mapTheme = themes[name === "dark" ? "parchment-night" : "parchment-day"];
  const mode = mapTheme.mode;
  const style = useMemo(() => buildAtlasStyle({ theme: mapTheme, tilesUrl: assets.tilesUrl, glyphs: assets.glyphs }), [mapTheme, assets]);

  const coords = useMemo(() => route.map((p) => [p.lon, p.lat] as [number, number]), [route]);
  const bounds = useMemo(() => {
    const lons = route.map((p) => p.lon);
    const lats = route.map((p) => p.lat);
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)] as [number, number, number, number];
  }, [route]);

  const you = useMemo(() => positionAt(route, cumulative, walkedM), [route, cumulative, walkedM]);
  const camera = useRef<CameraRef>(null);
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);

  // Úvodní pohled: kolem polohy a další zastávky (jako v mockupu), ne celá trasa; ta je na tlačítko.
  const initial = useMemo(() => {
    const next = places.find((p) => p.kind === "stop" && p.atM > walkedM);
    const lon = next ? (you.lon + next.lon) / 2 : you.lon;
    const lat = next ? (you.lat + next.lat) / 2 : you.lat;
    const dLat = next ? Math.abs(next.lat - you.lat) * 111_000 : 0;
    const dLon = next ? Math.abs(next.lon - you.lon) * 111_000 * Math.cos((you.lat * Math.PI) / 180) : 0;
    const span = Math.max(dLat, dLon, 1500);
    // Metrů na bod obrazovky při zoomu z na této šířce: ≈ 50 300 / 2^z; do šířky ~260 bodů se vejde `span`.
    const zoom = Math.min(13, Math.max(9.5, Math.log2((50_300 * 260) / (span * 1.5))));
    return { center: [lon, lat] as [number, number], zoom: Math.round(zoom * 10) / 10 };
  }, [places, walkedM, you]);
  const done = useMemo(() => [...coords.slice(0, Math.max(1, you.segment + 1)), [you.lon, you.lat] as [number, number]], [coords, you]);

  // Maska vybarvení: papír s dírou kolem ušlého úseku (vnější okraj plně krycí, vnitřní zčásti, aby byl okraj měkký).
  const masks = useMemo(
    () => ({
      outer: revealMask(walkedM > 0 ? done : [], REVEAL_OUTER_M),
      inner: revealMask(walkedM > 0 ? done : [], REVEAL_INNER_M),
    }),
    [done, walkedM],
  );

  const nextStopId = useMemo(() => places.find((p) => p.kind === "stop" && p.atM > walkedM)?.id, [places, walkedM]);
  const placesData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: places.map((p) => ({
        type: "Feature" as const,
        id: p.id,
        properties: placeProps(p, walkedM, nextStopId) as unknown as Record<string, string | number | boolean>,
        geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
      })),
    }),
    [places, walkedM, nextStopId],
  );

  // Obrázky pro mapu: pečeti a razítka míst (jen těch, které trasa má), štítek, kresby a vzory výplní stylu.
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

  const line = (c: Array<[number, number]>) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: c } });
  const point = { type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [you.lon, you.lat] } };

  // Vrstvy z map-style jsou prostý popis stylu (bez typů knihovny); knihovna je přijímá tak, jak jsou.
  const toLayers = (list: ReturnType<typeof routeLayers>, source: string, extra: Record<string, unknown> = {}) =>
    list
      .filter((l) => l.source === source)
      .map(({ source: _s, ...l }) => {
        const props = { ...l, ...extra } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        return <Layer key={l.id} {...props} />;
      });
  const routeFor = (source: string) => toLayers(routeLayers(mapTheme), source);
  const revealFor = (source: string) => toLayers(revealLayers(mapTheme), source, { beforeId: ATLAS_SKETCH_START });

  const insetTop = insets?.top ?? 0;
  const insetBottom = insets?.bottom ?? 0;
  const fitAll = () => camera.current?.fitBounds(bounds, { padding: { top: 40 + insetTop, right: 28, bottom: 40 + insetBottom, left: 28 }, duration: 600 });
  const toMe = () => camera.current?.flyTo({ center: [you.lon, you.lat], zoom: Math.max(initial.zoom, 13.5), duration: 600 });
  const pill = {
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: "center" as const,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: "#2B2118",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  };

  return (
    <View style={{ height, backgroundColor: colors.bg }} accessibilityLabel="Mapa trasy výpravy">
      <Map
        style={{ flex: 1 }}
        mapStyle={style as never}
        compass={false}
        logo={false}
        touchRotate={false}
        touchPitch={false}
        tintColor={mapTheme.palette.road}
        onRegionDidChange={frame ? (e) => setView({ zoom: e.nativeEvent.zoom, lat: e.nativeEvent.center[1]! }) : undefined}
      >
        <Images images={images} />
        <Camera ref={camera} initialViewState={{ center: initial.center, zoom: initial.zoom }} />

        {/* Krycí vrstvy (papír s dírou kolem ušlé trasy) se vkládají pod skicu; zdroje jsou připojené vždy. */}
        <GeoJSONSource id={REVEAL_INNER} data={masks.inner}>
          {revealFor(REVEAL_INNER)}
        </GeoJSONSource>
        <GeoJSONSource id={REVEAL_OUTER} data={masks.outer}>
          {revealFor(REVEAL_OUTER)}
        </GeoJSONSource>

        <GeoJSONSource id="route-rest" data={line(coords)}>
          {routeFor("route-rest")}
        </GeoJSONSource>
        {/* Zdroj je připojený vždy (před startem prázdný): dodatečné přidání zdroje do už načteného stylu se na zařízení neukázalo. */}
        <GeoJSONSource id="route-done" data={walkedM > 0 ? line(done) : EMPTY}>
          {routeFor("route-done")}
        </GeoJSONSource>

        <GeoJSONSource
          id="places"
          data={placesData}
          onPress={(e) => {
            const id = e.nativeEvent.features?.[0]?.properties?.id;
            if (typeof id === "string") onPlacePress?.(id);
          }}
        >
          {/* Kresby k místům podle názvu (loď u přívozu, zámek, most), nad pečetí; mizí, když se nevejdou. */}
          <Layer
            id="places-drawing"
            type="symbol"
            minzoom={11.5}
            filter={["!=", ["get", "drawing"], ""]}
            layout={{
              "icon-image": ["concat", "drawing-", ["get", "drawing"]],
              "icon-size": ["interpolate", ["linear"], ["zoom"], 11.5, 0.5, 15, 0.85],
              "icon-offset": ["literal", [0, -34]],
              "icon-allow-overlap": false,
              "symbol-sort-key": ["get", "rank"],
            }}
            paint={{ "icon-opacity": 0.85 }}
          />
          {/* Malé objevy: inkoustové razítko (dosažené) nebo tečkovaný kroužek s otazníkem; název až v detailu. */}
          <Layer
            id="places-discovery"
            type="symbol"
            filter={["!", ["get", "stop"]]}
            layout={{
              "icon-image": ["get", "image"],
              "icon-size": ["interpolate", ["linear"], ["zoom"], 8, 0.3, 10.5, 0.5, 13, 0.72, 15, 0.9],
              "icon-allow-overlap": true,
              "symbol-sort-key": ["get", "rank"],
              "text-field": ["step", ["zoom"], "", 12.3, ["get", "name"]],
              "text-font": ATLAS_LABEL_FONT,
              "text-size": 13,
              "text-anchor": "left",
              "text-offset": ["literal", [1.5, 0]],
              "text-optional": true,
            }}
            paint={{ "text-color": mapTheme.atlas.label, "text-halo-color": mapTheme.atlas.labelHalo, "text-halo-width": 1.8 }}
          />
          {/* Zastávky: pečeť (dosažená), šedý medailon (další), šrafovaný kroužek (zamčená). Velikost roste s přiblížením. */}
          <Layer
            id="places-stop"
            type="symbol"
            filter={["get", "stop"]}
            layout={{
              "icon-image": ["get", "image"],
              "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.4, 10.5, 0.62, 12, 0.92, 13.5, 1.1],
              "icon-allow-overlap": true,
              "symbol-sort-key": ["get", "rank"],
              "text-field": ["get", "name"],
              "text-font": ATLAS_LABEL_FONT,
              "text-size": 14,
              "text-anchor": "left",
              "text-offset": ["interpolate", ["linear"], ["zoom"], 9, ["literal", [1.0, 0]], 12, ["literal", [2.0, 0]]],
              "text-optional": true,
            }}
            paint={{ "text-color": mapTheme.atlas.label, "text-halo-color": mapTheme.atlas.labelHalo, "text-halo-width": 2 }}
          />
          {/* Štítek s metry pod medailonem další zastávky: tmavá pilulka roztažená pod text. */}
          <Layer
            id="places-next-label"
            type="symbol"
            minzoom={10}
            filter={["==", ["get", "state"], "next"]}
            layout={{
              "icon-image": "pill",
              "icon-text-fit": "both",
              "icon-text-fit-padding": ["literal", [1, 7, 1, 7]],
              "icon-allow-overlap": true,
              "text-field": ["get", "label"],
              "text-font": ATLAS_LABEL_FONT,
              "text-size": 12,
              "text-anchor": "top",
              "text-offset": ["interpolate", ["linear"], ["zoom"], 10, ["literal", [0, 1.5]], 13.5, ["literal", [0, 2.5]]],
              "text-allow-overlap": true,
            }}
            paint={{ "text-color": colors.bg }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="you" data={point}>
          <Layer id="you-halo" type="circle" paint={{ "circle-radius": 15, "circle-color": colors.accent, "circle-opacity": 0.2 }} />
          <Layer
            id="you-dot"
            type="circle"
            paint={{ "circle-radius": 8, "circle-color": colors.accent, "circle-stroke-color": colors.surface, "circle-stroke-width": 3 }}
          />
        </GeoJSONSource>
      </Map>
      {frame ? <AtlasFrame title={frame} zoom={view?.zoom ?? initial.zoom} lat={view?.lat ?? initial.center[1]} insetTop={insetTop} /> : null}
      {controls ? (
        <View style={{ position: "absolute", right: 12, bottom: 12 + insetBottom, gap: 8, alignItems: "flex-end" }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Přiblížit na moji polohu" onPress={toMe} style={pill}>
            <T variant="strong" style={{ color: colors.fg, fontFamily: fonts.bodySemi, fontSize: 14 }}>
              Moje poloha
            </T>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Zobrazit celou trasu" onPress={fitAll} style={pill}>
            <T variant="strong" style={{ color: colors.fg, fontFamily: fonts.bodySemi, fontSize: 14 }}>
              Celá trasa
            </T>
          </Pressable>
        </View>
      ) : null}
      {/* Atribuce dat OSM je povinná (ODbL) a má být vidět; tlačítko „i“ knihovny ji jen otevírá. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 6, bottom: 4 + insetBottom, backgroundColor: colors.surface, opacity: 0.85, paddingHorizontal: 5, borderRadius: 4 }}
      >
        <T variant="small" style={{ fontSize: 10 }}>
          © přispěvatelé OpenStreetMap
        </T>
      </View>
    </View>
  );
}
