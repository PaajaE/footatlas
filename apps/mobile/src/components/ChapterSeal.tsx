import Svg, { Circle, Defs, Path, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { useId } from "react";
import { View } from "react-native";
import { chapterMonogram } from "../kapitoly";
import { wobblyCircle } from "../seal";
import { useTheme } from "../theme/ThemeProvider";

/** Barvy vosku jako u pečetí míst (`Seal.tsx`). */
const WAX = { light: "#C2463A", mid: "#9B2C22", dark: "#6A1A13", shadow: "#5A1610", text: "#F6D9CF", glint: "#E7A08F" };

/**
 * Pečeť kapitoly: uzavřená = plná vosková pečeť s monogramem názvu („ML“), otevřená = zamčený
 * čárkovaný kroužek se zámkem. Vlastní komponenta, aby se neměnila sdílená `Seal`.
 */
export function ChapterSeal({ title, closed, size = 44 }: { title: string; closed: boolean; size?: number }) {
  const { colors, fonts } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const label = closed ? `Pečeť kapitoly ${title}, uzavřená` : `Pečeť kapitoly ${title}, zatím zamčená`;
  if (closed) {
    const mono = chapterMonogram(title);
    return (
      <View accessible accessibilityLabel={label} style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 132 132">
          <Defs>
            <RadialGradient id={`cw${id}`} cx="40%" cy="35%" r="70%">
              <Stop offset="0" stopColor={WAX.light} />
              <Stop offset="0.6" stopColor={WAX.mid} />
              <Stop offset="1" stopColor={WAX.dark} />
            </RadialGradient>
          </Defs>
          <Path d={wobblyCircle(66, 68, 56, 3, 32)} fill={WAX.shadow} opacity={0.35} />
          <Path d={wobblyCircle(66, 66, 56, 3, 31)} fill={`url(#cw${id})`} />
          <Circle cx={66} cy={66} r={42} fill="none" stroke={WAX.shadow} strokeWidth={3} opacity={0.6} />
          <Circle cx={66} cy={66} r={44} fill="none" stroke={WAX.glint} strokeWidth={1} opacity={0.6} />
          <SvgText x={66} y={mono.length > 1 ? 81 : 84} textAnchor="middle" fontFamily={fonts.display} fontSize={mono.length > 1 ? 42 : 50} fill={WAX.text}>
            {mono}
          </SvgText>
        </Svg>
      </View>
    );
  }
  return (
    <View accessible accessibilityLabel={label} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 132 132">
        <Circle cx={66} cy={66} r={56} fill="none" stroke={colors.muted} strokeWidth={4} strokeDasharray="6 10" strokeLinecap="round" />
        {/* Zámek: oblouk a tělo. */}
        <Path d="M50 62 V50 a16 16 0 0 1 32 0 V62" fill="none" stroke={colors.muted} strokeWidth={6} strokeLinecap="round" />
        <Path d="M42 62 h48 v34 a4 4 0 0 1 -4 4 h-40 a4 4 0 0 1 -4 -4 Z" fill={colors.muted} opacity={0.75} />
      </Svg>
    </View>
  );
}
