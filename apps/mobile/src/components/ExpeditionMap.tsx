import { Camera, GeoJSONSource, Images, Layer, Map, type CameraRef } from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { buildStyle, routeLayers, themes } from "@footatlas/map-style";
import { positionAt } from "@footatlas/core";
import { MEDALLIONS } from "../map/medallionFiles";
import { prepareMapAssets, type MapAssets } from "../map/mapAssets";
import { useTheme } from "../theme/ThemeProvider";
import type { ExpeditionMapProps } from "./expeditionMapProps";
import { RouteSketch } from "./RouteSketch";
import { Button, T } from "./ui";

export type { ExpeditionMapProps };

type Assets = { kind: "loading" } | { kind: "ready"; assets: MapAssets } | { kind: "failed"; message: string };

const ITALIC = ["Noto Sans Italic"];
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

function LiveMap({ route, cumulative, places, walkedM, height, onPlacePress, assets }: ExpeditionMapProps & { assets: MapAssets }) {
  const { name, colors } = useTheme();
  const mapTheme = themes[name === "dark" ? "parchment-night" : "parchment-day"];
  const style = useMemo(() => buildStyle({ theme: mapTheme, tilesUrl: assets.tilesUrl, glyphs: assets.glyphs }), [mapTheme, assets]);

  const coords = useMemo(() => route.map((p) => [p.lon, p.lat] as [number, number]), [route]);
  const bounds = useMemo(() => {
    const lons = route.map((p) => p.lon);
    const lats = route.map((p) => p.lat);
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)] as [number, number, number, number];
  }, [route]);

  const you = useMemo(() => positionAt(route, cumulative, walkedM), [route, cumulative, walkedM]);
  const camera = useRef<CameraRef>(null);
  const [overview, setOverview] = useState(false);

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
  const nextStopId = useMemo(() => places.find((p) => p.kind === "stop" && p.atM > walkedM)?.id, [places, walkedM]);
  const placesData = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: places.map((p) => {
        const reached = p.atM <= walkedM;
        const state = reached ? "reached" : p.id === nextStopId ? "next" : "locked";
        return {
          type: "Feature" as const,
          id: p.id,
          properties: {
            id: p.id,
            name: p.name,
            stop: p.kind === "stop",
            reached,
            medallion: `${state}-${p.id}`,
            // Menší číslo = přednost při rozmísťování: další zastávka, pak dosažené, pak zamčené.
            rank: state === "next" ? 0 : reached ? 1 : 2,
          },
          geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
        };
      }),
    }),
    [places, walkedM, nextStopId],
  );
  // Medailony zastávek (fotka v kroužku, odznak „došlo se“, šedá pro zamčené) jsou hotové obrázky pro daný motiv.
  const medallionImages = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of places) {
      if (p.kind !== "stop") continue;
      for (const state of ["reached", "next", "locked"]) {
        const m = MEDALLIONS[`${name === "dark" ? "night" : "day"}-${state}-${p.id}`];
        if (m !== undefined) out[`${state}-${p.id}`] = m;
      }
    }
    return out;
  }, [places, name]);
  const line = (c: Array<[number, number]>) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: c } });
  const point = { type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [you.lon, you.lat] } };

  const layersFor = (source: string) =>
    routeLayers(mapTheme)
      .filter((l) => l.source === source)
      .map(({ source: _s, ...l }) => {
        // Vrstvy z map-style jsou prostý popis stylu (bez typů knihovny); knihovna je přijímá tak, jak jsou.
        const props = l as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        return <Layer key={l.id} {...props} />;
      });

  return (
    <View style={{ height, backgroundColor: colors.surface }} accessibilityLabel="Mapa trasy výpravy">
      <Map style={{ flex: 1 }} mapStyle={style as never} compass={false} logo={false} touchRotate={false} touchPitch={false} tintColor={mapTheme.palette.road}>
        <Images images={medallionImages} />
        <Camera ref={camera} initialViewState={{ center: initial.center, zoom: initial.zoom }} />

        <GeoJSONSource id="route-rest" data={line(coords)}>
          {layersFor("route-rest")}
        </GeoJSONSource>
        {/* Zdroj je připojený vždy (před startem prázdný): dodatečné přidání zdroje do už načteného stylu se na zařízení neukázalo. */}
        <GeoJSONSource id="route-done" data={walkedM > 0 ? line(done) : EMPTY}>
          {layersFor("route-done")}
        </GeoJSONSource>

        <GeoJSONSource
          id="places"
          data={placesData}
          onPress={(e) => {
            const id = e.nativeEvent.features?.[0]?.properties?.id;
            if (typeof id === "string") onPlacePress?.(id);
          }}
        >
          {/* Malé objevy: tečky (dosažené plné, ostatní prázdné), jako v mockupu. */}
          <Layer
            id="places-discovery"
            type="circle"
            filter={["!", ["get", "stop"]]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2, 13, ["case", ["get", "reached"], 5.2, 4.6]],
              "circle-color": ["case", ["get", "reached"], colors.accent, colors.surface],
              "circle-stroke-color": ["case", ["get", "reached"], colors.surface, colors.fg],
              "circle-stroke-width": ["case", ["get", "reached"], 1.6, 1.3],
            }}
          />
          {/* Zastávky: medailon s popiskem; ikona se s přiblížením zvětšuje, popisek ustoupí, když se nevejde. */}
          <Layer
            id="places-stop"
            type="symbol"
            filter={["get", "stop"]}
            layout={{
              "icon-image": ["get", "medallion"],
              "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.36, 10.5, 0.6, 12, 0.95, 13, 1],
              "icon-allow-overlap": true,
              "symbol-sort-key": ["get", "rank"],
              "text-field": ["get", "name"],
              "text-font": ITALIC,
              "text-size": 13,
              "text-anchor": "left",
              "text-offset": ["interpolate", ["linear"], ["zoom"], 9, ["literal", [0.9, 0]], 12, ["literal", [1.9, 0]]],
              "text-optional": true,
            }}
            paint={{ "text-color": colors.fg, "text-halo-color": colors.surface, "text-halo-width": 2 }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="you" data={point}>
          <Layer id="you-halo" type="circle" paint={{ "circle-radius": 13, "circle-color": colors.accent, "circle-opacity": 0.22 }} />
          <Layer
            id="you-dot"
            type="circle"
            paint={{ "circle-radius": 6, "circle-color": colors.accent, "circle-stroke-color": colors.accentFg, "circle-stroke-width": 2.5 }}
          />
        </GeoJSONSource>
      </Map>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={overview ? "Přiblížit na moji polohu" : "Zobrazit celou trasu"}
        onPress={() => {
          if (overview) camera.current?.flyTo({ center: initial.center, zoom: initial.zoom, duration: 600 });
          else camera.current?.fitBounds(bounds, { padding: { top: 40, right: 28, bottom: 40, left: 28 }, duration: 600 });
          setOverview(!overview);
        }}
        style={{
          position: "absolute",
          right: 10,
          top: 10,
          minHeight: 36,
          paddingHorizontal: 12,
          justifyContent: "center",
          borderRadius: 18,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
        }}
      >
        <T variant="small" style={{ color: colors.fg }}>
          {overview ? "Moje poloha" : "Celá trasa"}
        </T>
      </Pressable>
      {/* Atribuce dat OSM je povinná (ODbL) a má být vidět; tlačítko „i“ knihovny ji jen otevírá. */}
      <View pointerEvents="none" style={{ position: "absolute", left: 6, bottom: 4, backgroundColor: colors.surface, opacity: 0.85, paddingHorizontal: 5, borderRadius: 4 }}>
        <T variant="small" style={{ fontSize: 10 }}>
          © přispěvatelé OpenStreetMap
        </T>
      </View>
    </View>
  );
}
