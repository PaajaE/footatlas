import { View } from "react-native";
import { scaleBar } from "../map/atlasPlaces";
import { useTheme } from "../theme/ThemeProvider";
import { T } from "./ui";

/**
 * Rámeček listu atlasu nad mapou (snímek `01-navrat-inkoust.jpg`): dvojitá linka kolem a kartuše s titulkem
 * (např. „List I · Praha“) a měřítkem, které sleduje přiblížení. Nezachytává dotyky.
 */
export function AtlasFrame({ title, zoom, lat, insetTop = 0 }: { title: string; zoom: number; lat: number; insetTop?: number }) {
  const { colors, fonts } = useTheme();
  const bar = scaleBar(zoom, lat, 84);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <View style={{ position: "absolute", left: 4, right: 4, top: 4, bottom: 4, borderWidth: 1, borderColor: colors.fg, opacity: 0.55 }} />
      <View style={{ position: "absolute", left: 8, right: 8, top: 8, bottom: 8, borderWidth: 1, borderColor: colors.fg, opacity: 0.35 }} />
      <View
        style={{
          position: "absolute",
          right: 18,
          top: 18 + insetTop,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.fg,
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 5,
          minWidth: 128,
        }}
      >
        <View style={{ borderWidth: 1, borderColor: colors.line, position: "absolute", left: 2, right: 2, top: 2, bottom: 2 }} />
        <T variant="label" style={{ fontFamily: fonts.displaySC, textAlign: "center" }}>
          {title}
        </T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" }}>
          <View style={{ width: bar.widthPt, height: 4, borderWidth: 1, borderColor: colors.fg, backgroundColor: colors.fg + "33" }} />
          <T variant="small" style={{ fontSize: 10 }}>
            {bar.label}
          </T>
        </View>
      </View>
    </View>
  );
}
