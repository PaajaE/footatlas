import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { T } from "./ui";

/** Kulaté tlačítko nastavení s paprsky (jako ve vzoru). */
export function SettingsButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Nastavení"
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.fg} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={3} />
        <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
      </Svg>
    </Pressable>
  );
}

/**
 * Záhlaví obrazovky: malé datum nad velkým názvem (IM Fell), vpravo kulaté tlačítko nastavení,
 * pod tím tenká dělicí linka přes celou šířku obsahu.
 */
export function ScreenHeader({
  date,
  title,
  onSettings,
  divider = true,
}: {
  date: string;
  title: string;
  onSettings?: () => void;
  divider?: boolean;
}) {
  const { colors, fonts } = useTheme();
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }} accessibilityRole="header">
          <T variant="small" style={{ fontSize: 13, color: colors.muted }}>
            {date}
          </T>
          <T style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.fg }} numberOfLines={1}>
            {title}
          </T>
        </View>
        {onSettings && <SettingsButton onPress={onSettings} />}
      </View>
      {divider && <View style={{ height: 1, backgroundColor: colors.line }} />}
    </View>
  );
}
