import { Pressable, View } from "react-native";
import { T } from "../ui";
import { useTheme } from "../../theme/ThemeProvider";

/** Přepínač Deník / Cesta / Rok / Sbírky: pilulky v jedné liště, vybraná je zvednutá. */
export function Segmented<K extends string>({ items, value, onChange }: { items: ReadonlyArray<{ key: K; label: string }>; value: K; onChange: (k: K) => void }) {
  const { colors, fonts } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 14, backgroundColor: `${colors.line}AA` }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={it.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(it.key)}
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 11,
              backgroundColor: on ? colors.surface : "transparent",
              shadowColor: "#2B2118",
              shadowOpacity: on ? 0.15 : 0,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              elevation: on ? 1 : 0,
            }}
          >
            <T variant="strong" style={{ fontFamily: on ? fonts.bodySemi : fonts.body, fontSize: 14, color: on ? colors.fg : colors.muted }}>
              {it.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
