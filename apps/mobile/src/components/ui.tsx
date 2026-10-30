import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

type Variant = "display" | "title" | "label" | "body" | "muted" | "strong" | "small";

/** Text podle tématu. Žádné barvy ani písma natvrdo v obrazovkách. */
export function T({
  variant = "body",
  style,
  children,
  accent,
  numberOfLines,
}: {
  variant?: Variant;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  accent?: boolean;
  numberOfLines?: number;
}) {
  const { colors, fonts } = useTheme();
  const base: Record<Variant, TextStyle> = {
    display: { fontFamily: fonts.display, fontSize: 38, lineHeight: 42, color: colors.fg },
    title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.fg },
    label: { fontFamily: fonts.displaySC, fontSize: 15, letterSpacing: 0.6, color: colors.ochre },
    body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.fg },
    muted: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
    strong: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22, color: colors.fg },
    small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.muted },
  };
  return (
    <Text numberOfLines={numberOfLines} style={[base[variant], accent && { color: colors.accent }, style]}>
      {children}
    </Text>
  );
}

/** Obrazovka s okrajem podle bezpečných oblastí a pozadím z tématu. */
export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = { paddingTop: insets.top + 24, paddingHorizontal: 20 };
  if (!scroll) return <View style={[styles.fill, pad, { backgroundColor: colors.bg }]}>{children}</View>;
  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      <ScrollBody pad={pad}>{children}</ScrollBody>
    </View>
  );
}

function ScrollBody({ children, pad }: { children: React.ReactNode; pad: ViewStyle }) {
  return (
    <ScrollView contentContainerStyle={[pad, { paddingBottom: 32, gap: 18 }]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.card, padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const { colors, fonts, radius } = useTheme();
  const primary = kind === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.button,
          paddingHorizontal: 18,
          backgroundColor: primary ? colors.accent : "transparent",
          borderWidth: primary ? 0 : 1.5,
          borderColor: colors.line,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: primary ? colors.accentFg : colors.fg }}>{label}</Text>
    </Pressable>
  );
}

/** Vodorovný pruh postupu; segmenty odpovídají etapám. */
export function StageBar({ stages, walkedM }: { stages: Array<{ startM: number; endM: number }>; walkedM: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {stages.map((s, i) => {
        const frac = Math.max(0, Math.min(1, (walkedM - s.startM) / (s.endM - s.startM)));
        return (
          <View
            key={i}
            style={{ flex: s.endM - s.startM, height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: "hidden" }}
          >
            <View style={{ width: `${frac * 100}%`, height: 6, backgroundColor: colors.accent }} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
