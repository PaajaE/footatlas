import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { vltavska } from "../../data/vltavska";
import { useTheme } from "../../theme/ThemeProvider";

const HEIGHT = 190;
const PAD = 26;

/** Tečkovaný náhled celé trasy výpravy, jen začátek a konec (bez popisků všech míst, ty by se na úzké trase překrývaly). */
export function RouteGlyph() {
  const { colors, fonts } = useTheme();
  const [width, setWidth] = useState(0);
  const route = vltavska.route;
  let body: React.ReactNode = null;
  if (width > 0 && route.length > 1) {
    const k = Math.cos((route[0]!.lat * Math.PI) / 180);
    const xs = route.map((p) => p.lon * k);
    const ys = route.map((p) => p.lat);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const spanX = Math.max(...xs) - minX || 1;
    const spanY = Math.max(...ys) - minY || 1;
    const scale = Math.min((width - 2 * PAD - 70) / spanX, (HEIGHT - 2 * PAD) / spanY);
    const offX = (width - spanX * scale) / 2;
    const offY = (HEIGHT - spanY * scale) / 2;
    const px = (lon: number) => offX + (lon * k - minX) * scale;
    const py = (lat: number) => HEIGHT - (offY + (lat - minY) * scale);
    const d = route.map((p, i) => `${i ? "L" : "M"}${px(p.lon).toFixed(1)} ${py(p.lat).toFixed(1)}`).join(" ");
    const a = route[0]!;
    const z = route[route.length - 1]!;
    body = (
      <Svg width={width} height={HEIGHT}>
        <Path d={d} fill="none" stroke={colors.water} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
        <Path d={d} fill="none" stroke={colors.fg} strokeWidth={2} strokeDasharray="1 6" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={px(a.lon)} cy={py(a.lat)} r={6} fill={colors.accent} stroke={colors.bg} strokeWidth={2.5} />
        <Circle cx={px(z.lon)} cy={py(z.lat)} r={6} fill={colors.bg} stroke={colors.fg} strokeWidth={1.8} />
        <SvgText x={px(a.lon) + 14} y={py(a.lat) + 4} fontFamily={fonts.displayItalic} fontSize={14} fill={colors.fg}>
          Vyšehrad
        </SvgText>
        <SvgText x={px(z.lon) + 14} y={py(z.lat) + 4} fontFamily={fonts.displayItalic} fontSize={14} fill={colors.fg}>
          Mělník
        </SvgText>
      </Svg>
    );
  }
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: HEIGHT, backgroundColor: colors.surfaceAlt }}
      accessibilityRole="image"
      accessibilityLabel="Náhled trasy výpravy od Vyšehradu po Mělník"
    >
      {body}
    </View>
  );
}
