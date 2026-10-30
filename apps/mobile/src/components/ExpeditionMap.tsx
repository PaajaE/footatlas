import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { positionAt, type RoutePoint } from "@footatlas/core";
import type { AppPlace } from "../data/vltavska";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Rozhraní mapové vrstvy výpravy. Teď ho plní jednoduchý náhled trasy (`ExpeditionMap` níže),
 * později se vymění za MapLibre s OSM dlaždicemi (rozhodnutí 0001). Obrazovky znají jen tento typ.
 */
export interface ExpeditionMapProps {
  route: readonly RoutePoint[];
  cumulative: readonly number[];
  places: readonly AppPlace[];
  walkedM: number;
  height: number;
  onPlacePress?: (id: string) => void;
}

const PAD = 28;

/** Náhled trasy v rovinném průmětu (bez podkladové mapy). Sever je nahoře. */
export function ExpeditionMap({ route, cumulative, places, walkedM, height, onPlacePress }: ExpeditionMapProps) {
  const { colors, fonts } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  let body: React.ReactNode = null;
  if (width > 0 && route.length > 1) {
    const lat0 = route[0]!.lat;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const xs = route.map((p) => p.lon * k);
    const ys = route.map((p) => p.lat);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const scale = Math.min((width - 2 * PAD) / (maxX - minX || 1), (height - 2 * PAD) / (maxY - minY || 1));
    const offX = (width - (maxX - minX) * scale) / 2;
    const offY = (height - (maxY - minY) * scale) / 2;
    const px = (lon: number) => offX + (lon * k - minX) * scale;
    const py = (lat: number) => height - (offY + (lat - minY) * scale);

    const you = positionAt(route, cumulative, walkedM);

    // Popisky zastávek bez překryvů: bere se v pořadí po trase a popisek, který by zasáhl už položený, se vynechá.
    const taken: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
    const labelled = new Set<string>();
    for (const p of places) {
      if (p.kind !== "stop") continue;
      const x0 = px(p.lon) + 10;
      const y0 = py(p.lat) - 8;
      const box = { x0, x1: x0 + p.name.length * 5.8 + 4, y0, y1: y0 + 14 };
      const clash = taken.some((t) => box.x0 < t.x1 && box.x1 > t.x0 && box.y0 < t.y1 && box.y1 > t.y0);
      if (!clash) {
        taken.push(box);
        labelled.add(p.id);
      }
    }
    const full = route.map((p, i) => `${i ? "L" : "M"}${px(p.lon).toFixed(1)} ${py(p.lat).toFixed(1)}`).join(" ");
    const doneIdx = Math.max(1, you.segment + 1);
    const done =
      route
        .slice(0, doneIdx)
        .map((p, i) => `${i ? "L" : "M"}${px(p.lon).toFixed(1)} ${py(p.lat).toFixed(1)}`)
        .join(" ") + ` L${px(you.lon).toFixed(1)} ${py(you.lat).toFixed(1)}`;

    body = (
      <Svg width={width} height={height}>
        <Path d={full} stroke={colors.water} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d={full} stroke={colors.routeRemaining} strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" fill="none" />
        {walkedM > 0 && <Path d={done} stroke={colors.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
        {places.map((p) => {
          const reached = p.atM <= walkedM;
          const stop = p.kind === "stop";
          const x = px(p.lon);
          const y = py(p.lat);
          return (
            <G key={p.id} onPress={onPlacePress ? () => onPlacePress(p.id) : undefined}>
              <Circle
                cx={x}
                cy={y}
                r={stop ? 7 : 3.5}
                fill={reached ? colors.accent : colors.surface}
                stroke={reached ? colors.accent : colors.fg}
                strokeWidth={stop ? 2.5 : 1.5}
              />
              {stop && labelled.has(p.id) && (
                <>
                  {/* Obrys textu barvou pozadí, aby byl čitelný přes trasu; paintOrder react-native-svg nepodporuje. */}
                  <SvgText x={x + 12} y={y + 4} fontFamily={fonts.bodyMedium} fontSize={11} fill={colors.surface} stroke={colors.surface} strokeWidth={4}>
                    {p.name}
                  </SvgText>
                  <SvgText x={x + 12} y={y + 4} fontFamily={fonts.bodyMedium} fontSize={11} fill={colors.fg}>
                    {p.name}
                  </SvgText>
                </>
              )}
            </G>
          );
        })}
        <Circle cx={px(you.lon)} cy={py(you.lat)} r={13} fill={colors.accent} fillOpacity={0.22} />
        <Circle cx={px(you.lon)} cy={py(you.lat)} r={6} fill={colors.accent} stroke={colors.accentFg} strokeWidth={2.5} />
      </Svg>
    );
  }
  return (
    <View
      onLayout={onLayout}
      style={{ height, backgroundColor: colors.surface, overflow: "hidden" }}
      accessibilityRole="image"
      accessibilityLabel="Náhled trasy výpravy bez podkladové mapy"
    >
      {body}
    </View>
  );
}
