import { Image, View, type ImageSourcePropType } from "react-native";
import Svg, { Circle, Defs, Line, Pattern, Text as SvgText } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { T } from "./ui";

/**
 * Medailon dalšího místa: kruhová šedá fotka v čárkovaném tužkovém kroužku se štítkem vzdálenosti („40 m“).
 * Bez fotky nebo u dalekého místa je to šrafovaný kruh s otazníkem.
 */
export function Medallion({
  photo,
  label,
  size = 72,
  locked = false,
}: {
  photo?: ImageSourcePropType;
  /** Štítek v tmavé pilulce pod fotkou, např. „40 m“. */
  label?: string;
  size?: number;
  /** Zamčený: šrafovaný kruh s otazníkem místo fotky. */
  locked?: boolean;
}) {
  const { colors, fonts } = useTheme();
  const k = size / 132;
  const showPhoto = photo !== undefined && !locked;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={label ? `Místo, ${label}` : "Místo"}>
      <Svg width={size} height={size} viewBox="0 0 132 132">
        <Defs>
          <Pattern id="med-hatch" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={6} stroke={colors.muted} strokeWidth={0.8} opacity={0.6} />
          </Pattern>
        </Defs>
        <Circle cx={66} cy={66} r={48} fill={showPhoto ? colors.bg : "url(#med-hatch)"} stroke={colors.muted} strokeWidth={1.4} strokeDasharray="3 3" />
        {!showPhoto && (
          <SvgText x={66} y={80} textAnchor="middle" fontFamily={fonts.display} fontSize={44} fill={colors.muted}>
            ?
          </SvgText>
        )}
      </Svg>
      {showPhoto && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 26 * k,
            top: 26 * k,
            width: 80 * k,
            height: 80 * k,
            borderRadius: 40 * k,
            overflow: "hidden",
            opacity: 0.85,
            filter: "grayscale(1) sepia(0.35)",
          }}
        >
          <Image source={photo} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
        </View>
      )}
      {label && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 14 * k,
            alignItems: "center",
          }}
        >
          <View style={{ backgroundColor: colors.chipActive, borderRadius: 999, paddingHorizontal: 8, minWidth: 52 * k, height: 20 * k + 2, alignItems: "center", justifyContent: "center" }}>
            <T variant="small" style={{ fontFamily: fonts.bodySemi, fontSize: Math.max(9, 11 * k * 1.1), lineHeight: 14, color: colors.chipActiveFg }}>
              {label}
            </T>
          </View>
        </View>
      )}
    </View>
  );
}
