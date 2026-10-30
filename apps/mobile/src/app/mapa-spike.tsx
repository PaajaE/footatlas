import { Camera, Map } from "@maplibre/maplibre-react-native";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { buildStyle, themes } from "@footatlas/map-style";
import { Button, Screen, T } from "../components/ui";

/**
 * Spike: zkouška, zda MapLibre Native čte `pmtiles://` přímo. Jen pro vývoj, nenahrazuje ExpeditionMap.
 * Zdroje dlaždic:
 *  - soubor na telefonu (adb push do složky aplikace),
 *  - HTTP s Range (tools/maps/serve.mjs přes `adb reverse tcp:8787 tcp:8787`).
 * Písma jsou z OpenFreeMap jen pro tuto zkoušku (produkce potřebuje vlastní hosting).
 */
const SOURCES = {
  file: "file:///data/user/0/cz.footatlas.app/files/vltava-koridor5.pmtiles",
  http: "http://127.0.0.1:8787/vltava-koridor5.pmtiles",
} as const;
const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

export default function MapaSpike() {
  const [mode, setMode] = useState<keyof typeof SOURCES | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const note = (s: string) => {
    console.log(`FA_MAP ${s}`);
    setEvents((e) => [...e, s]);
  };
  const style = useMemo(
    () => (mode ? buildStyle({ theme: themes["parchment-day"], tilesUrl: SOURCES[mode], glyphs: GLYPHS }) : null),
    [mode],
  );

  return (
    <Screen scroll={false}>
      <T variant="title">Mapa (spike)</T>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["file", "http"] as const).map((m) => (
          <View key={m} style={{ flex: 1 }}>
            <Button
              kind={mode === m ? "primary" : "secondary"}
              label={m === "file" ? "Soubor" : "HTTP"}
              onPress={() => {
                setEvents([]);
                setMode(m);
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ height: 460, borderRadius: 12, overflow: "hidden" }}>
        {style && (
          <Map
            key={mode}
            style={{ flex: 1 }}
            mapStyle={style as never}
            onDidFinishLoadingStyle={() => note("styl načten")}
            onDidFinishLoadingMap={() => note("mapa načtena")}
            onDidFailLoadingMap={() => note("mapa SELHALA")}
            onDidFinishRenderingMapFully={() => note("mapa vykreslena")}
          >
            <Camera initialViewState={{ center: [14.42, 50.08], zoom: 12 }} />
          </Map>
        )}
      </View>
      <T variant="small">{mode ? SOURCES[mode] : "Vyber zdroj dlaždic."}</T>
      <T variant="small">{events.join(" · ")}</T>
    </Screen>
  );
}
