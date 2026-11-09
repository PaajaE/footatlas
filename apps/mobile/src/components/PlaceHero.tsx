import { useRouter } from "expo-router";
import { useId } from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Line, Path, Pattern, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { placeMonogram } from "../monogram";
import { T } from "./ui";

/** Výška fotky; zástupný list (místo bez fotky nebo zamčené) je o něco nižší. */
export const HERO_HEIGHT = 300;
export const HERO_HEIGHT_NO_PHOTO = 260;

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

/** Ukáže záhlaví fotku? Jen u odemčeného místa s fotkou; zamčené místo fotku neodhalí (žádná šedá rozmazaná plocha). */
export function heroShowsPhoto(photo: ImageSourcePropType | undefined, locked: boolean): photo is ImageSourcePropType {
  return photo !== undefined && !locked;
}

/**
 * Fotka přes celou šířku se slévavým přechodem do pergamenu. Místo bez fotky a každé zamčené místo má
 * zástupný list atlasu (`PlaceSheet`): papír, šrafování, rámeček, monogram v kruhu a druh místa; zamčené
 * navíc jemný závoj a zámek.
 */
export function PlaceHero({
  photo,
  locked,
  name,
  kindLabel,
  children,
}: {
  photo?: ImageSourcePropType;
  locked: boolean;
  /** Název místa (monogram a popisek pro čtečku). */
  name: string;
  /** Druh místa nad monogramem, např. „Objev · etapa III“. */
  kindLabel: string;
  /** Prvky na fotce (tlačítko Mapa, pečeť, štítek). */
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const showPhoto = heroShowsPhoto(photo, locked);
  const height = (showPhoto ? HERO_HEIGHT : HERO_HEIGHT_NO_PHOTO) + insets.top;
  const fadeId = `hero-fade${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View style={{ height, overflow: "hidden" }}>
      {showPhoto ? (
        <Image source={photo} resizeMode="cover" style={{ ...fill, width: "100%", height: "100%" }} />
      ) : (
        <PlaceSheet name={name} kindLabel={kindLabel} locked={locked} topInset={insets.top} />
      )}
      {/* Přechod do pergamenu dole a lehké ztmavení nahoře kvůli čitelnosti tlačítka na fotce. */}
      <Svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
        <Defs>
          <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2B2118" stopOpacity={showPhoto ? 0.35 : 0} />
            <Stop offset="0.3" stopColor="#2B2118" stopOpacity={0} />
            <Stop offset={showPhoto ? "0.6" : "0.78"} stopColor={colors.bg} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${fadeId})`} />
      </Svg>
      {children}
    </View>
  );
}

const MEDALLION = 112;

/**
 * Zástupný obrázek místa ve stylu atlasu: list papíru se šikmým tužkovým šrafováním, dvojitý rámeček,
 * uprostřed kruh s monogramem (IM Fell) a nad ním druh místa kapitálkami. Zamčené místo má přes list
 * jemný papírový závoj a na kruhu zámek; monogram je slepý (jen obrys barvy tužky).
 */
export function PlaceSheet({ name, kindLabel, locked, topInset = 0 }: { name: string; kindLabel: string; locked: boolean; topInset?: number }) {
  const { colors, fonts } = useTheme();
  const hatchId = `sheet-hatch${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const monogram = placeMonogram(name);
  const ink = locked ? colors.muted : colors.fg;
  return (
    <View
      style={fill}
      accessible
      accessibilityRole="image"
      accessibilityLabel={locked ? `${name}, zatím zamčeno` : `${name}, kresba bez fotky`}
    >
      <Svg width="100%" height="100%" style={fill}>
        <Defs>
          <Pattern id={hatchId} width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={9} stroke={colors.muted} strokeWidth={0.8} opacity={0.28} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={colors.surfaceAlt} />
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${hatchId})`} />
      </Svg>
      {/* Dvojitý rámeček listu atlasu; dole se ztrácí v přechodu do pergamenu. */}
      <View pointerEvents="none" style={{ position: "absolute", left: 12, right: 12, top: topInset + 64, bottom: -20, borderWidth: 1, borderColor: colors.ochre, opacity: 0.45 }} />
      <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, top: topInset + 68, bottom: -20, borderWidth: 0.6, borderColor: colors.ochre, opacity: 0.35 }} />
      {/* Zamčené místo: jemný papírový závoj přes list, ne šedá rozmazaná plocha. */}
      {locked && <View pointerEvents="none" style={{ ...fill, backgroundColor: colors.bg, opacity: 0.4 }} />}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: topInset + 74, alignItems: "center", gap: 8 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: fonts.displaySC, fontSize: 13, letterSpacing: 2, color: locked ? colors.muted : colors.ochre, paddingHorizontal: 32 }}
        >
          {kindLabel}
        </Text>
        <View style={{ width: MEDALLION, height: MEDALLION, alignItems: "center", justifyContent: "center" }}>
          <Svg width={MEDALLION} height={MEDALLION} viewBox="0 0 112 112" style={fill}>
            <Circle cx={56} cy={56} r={53} fill={colors.bg} stroke={locked ? colors.muted : colors.ochre} strokeWidth={1.4} />
            <Circle cx={56} cy={56} r={46} fill="none" stroke={locked ? colors.muted : colors.ochre} strokeWidth={0.8} strokeDasharray="2 3" opacity={0.8} />
          </Svg>
          <Text style={{ fontFamily: fonts.display, fontSize: monogram.length > 2 ? 34 : 42, lineHeight: 50, color: ink, opacity: locked ? 0.7 : 1 }}>{monogram}</Text>
          {locked && (
            <View
              style={{ position: "absolute", right: -4, bottom: -2, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}
            >
              <LockIcon color={colors.mutedStrong} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/** Visací zámek, tah tužkou. */
export function LockIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path d="M5.5 8 V5.8 a3.5 3.5 0 0 1 7 0 V8" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Rect x={3.5} y={8} width={11} height={8} rx={1.6} fill="none" stroke={color} strokeWidth={1.6} />
      <Line x1={9} y1={11} x2={9} y2={13} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

const fill = { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 } as const;
