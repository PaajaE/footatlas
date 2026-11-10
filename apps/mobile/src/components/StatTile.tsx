import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { T } from "./ui";

/** Dlaždice čísla: popisek, velké číslo s jednotkou v IM Fell a drobný podpis. Vedle sebe v hlavičce Deníku. */
export function StatTile({ label, value, unit, note }: { label: string; value: string; unit?: string; note?: string }) {
  const { colors, fonts } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ""}${note ? `, ${note}` : ""}`}
      style={{
        flex: 1,
        gap: 0,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
      }}
    >
      <T variant="small" style={{ fontSize: 12, lineHeight: 14, color: colors.muted }}>
        {label}
      </T>
      <T style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.fg }} numberOfLines={1}>
        {value}
        {unit ? ` ${unit}` : ""}
      </T>
      {note && (
        <T variant="small" style={{ fontSize: 12, lineHeight: 14, color: colors.mutedStrong }} numberOfLines={2}>
          {note}
        </T>
      )}
    </View>
  );
}
