import { useRouter } from "expo-router";
import { Image, Platform, Pressable, View, type ImageSourcePropType } from "react-native";
import Svg, { Defs, LinearGradient, Path, Pattern, Rect, Line, Stop, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { T } from "./ui";

/** Výška fotky; místa bez fotky mají nižší pruh, aby obrazovka nebyla prázdná. */
export const HERO_HEIGHT = 300;
export const HERO_HEIGHT_NO_PHOTO = 150;

/** Pilulka „‹ Mapa“ vlevo nahoře: zpátky tam, odkud se místo otevřelo. */
export function BackPill({ label = "Mapa", onPress, onPhoto }: { label?: string; onPress?: () => void; onPhoto: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === "Mapa" ? "Zpět na mapu" : "Zpět"}
      onPress={onPress ?? (() => router.back())}
      style={{
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: onPhoto ? "rgba(248,241,225,0.92)" : colors.surface,
        borderWidth: onPhoto ? 0 : 1,
        borderColor: colors.line,
      }}
    >
      <Svg width={14} height={14} viewBox="0 0 14 14">
        <Path d="M9 2 L4 7 L9 12" fill="none" stroke={onPhoto ? "#2B2118" : colors.fg} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <T variant="strong" style={{ fontSize: 14, color: onPhoto ? "#2B2118" : colors.fg }}>
        {label}
      </T>
    </Pressable>
  );
}

/**
 * Fotka přes celou šířku se slévavým přechodem do pergamenu. Zamčené místo má fotku rozmazanou a šedou;
 * bez fotky je místo ní šrafovaná plocha (u zamčeného s otazníkem), aby rozložení zůstalo stejné.
 */
export function PlaceHero({
  photo,
  locked,
  children,
}: {
  photo?: ImageSourcePropType;
  locked: boolean;
  /** Prvky na fotce (tlačítko Mapa, pečeť, štítek). */
  children?: React.ReactNode;
}) {
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const height = (photo ? HERO_HEIGHT : HERO_HEIGHT_NO_PHOTO) + insets.top;
  const blur = Platform.OS === "web" ? "blur(10px) " : "";
  return (
    <View style={{ height, overflow: "hidden" }}>
      {photo ? (
        <View
          style={
            locked
              ? ({ ...fill, filter: `${blur}grayscale(1) sepia(0.35)`, opacity: 0.9 } as object)
              : fill
          }
        >
          <Image source={photo} resizeMode="cover" blurRadius={locked && Platform.OS !== "web" ? 14 : 0} style={{ width: "100%", height: "100%" }} />
        </View>
      ) : (
        <Svg width="100%" height="100%" style={{ position: "absolute", left: 0, top: 0 }}>
          <Defs>
            <Pattern id="hero-hatch" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <Line x1={0} y1={0} x2={0} y2={8} stroke={colors.muted} strokeWidth={0.8} opacity={0.35} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill={colors.surfaceAlt} />
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#hero-hatch)" />
        </Svg>
      )}
      {!photo && locked && (
        <View style={{ ...fill, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
          <T style={{ fontFamily: fonts.display, fontSize: 72, color: colors.muted, opacity: 0.6 }}>?</T>
        </View>
      )}
      {/* Přechod do pergamenu dole a lehké ztmavení nahoře kvůli čitelnosti tlačítka. */}
      <Svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
        <Defs>
          <LinearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2B2118" stopOpacity={photo ? 0.35 : 0} />
            <Stop offset="0.3" stopColor="#2B2118" stopOpacity={0} />
            <Stop offset="0.6" stopColor={colors.bg} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#hero-fade)" />
      </Svg>
      {children}
    </View>
  );
}

const fill = { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 } as const;
