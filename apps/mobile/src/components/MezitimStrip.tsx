import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { T } from "./ui";

/**
 * Pruh „Mezitím“ nahoře na Výpravě (docs/navrh-v2.md § 5, nahrazuje kartu „Od posledně“): věta
 * „Mezitím · 23,4 km za 5 dní · 3 nová místa“, „Přehrát cestu“ a „Zavřít“. Spotřebuje se jako dřív (rozhodnutí 0024):
 * přehráním do konce, nebo „Zavřít“.
 */
export function MezitimStrip({
  heading,
  text,
  fromM,
  toM,
  onClose,
}: {
  heading: string;
  text: string;
  fromM: number;
  toM: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const play = () => router.push({ pathname: "/navrat", params: { from: String(Math.round(fromM)), to: String(Math.round(toM)) } });
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${heading}. ${text}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingLeft: 14,
        paddingRight: 6,
        paddingVertical: 6,
        borderRadius: 18,
        backgroundColor: colors.fg,
      }}
    >
      <T numberOfLines={2} style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 17, color: colors.bg }}>
        {text}
      </T>
      <Pressable
        accessibilityRole="button"
        onPress={play}
        style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.accent, justifyContent: "center" }}
      >
        <T style={{ fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 17, color: colors.accentFg }}>Přehrát cestu</T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zavřít pruh Mezitím"
        onPress={onClose}
        hitSlop={6}
        style={{ minHeight: 36, paddingHorizontal: 6, justifyContent: "center" }}
      >
        <T style={{ fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 17, color: colors.bg, opacity: 0.8 }}>Zavřít</T>
      </Pressable>
    </View>
  );
}
