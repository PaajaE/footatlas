import { Pressable } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { T } from "./ui";

/** Čip (1 km, 2 km, Konec etapy; přepínače): vybraný je tmavý, ve tmě krémový. */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors, fonts } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        borderWidth: selected ? 0 : 1.5,
        borderColor: colors.line,
        backgroundColor: selected ? colors.chipActive : colors.chip,
      }}
    >
      <T style={{ fontFamily: selected ? fonts.bodySemi : fonts.body, fontSize: 14, color: selected ? colors.chipActiveFg : colors.fg }}>
        {label}
      </T>
    </Pressable>
  );
}
