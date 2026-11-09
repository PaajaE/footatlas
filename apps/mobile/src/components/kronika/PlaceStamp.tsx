import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { wobblyCircle } from "../../seal";
import { useTheme } from "../../theme/ThemeProvider";

/** Vosk je ve dne i v noci rumělkový, jako velké pečeti (`components/Seal.tsx`). */
const WAX = { body: "#9B2C22", shadow: "#5A1610", text: "#F6D9CF", glint: "#E7A08F" };

/**
 * Malá pečeť místa v mřížce Razítek: získané místo je rumělkový vosk s monogramem a klepnutím otevře detail
 * místa; nezískané je slepý tužkový obrys s monogramem jen naznačeným.
 */
export function PlaceStamp({
  monogram,
  name,
  got,
  seed,
  size = 40,
  onPress,
}: {
  monogram: string;
  name: string;
  got: boolean;
  /** Tvar okraje vosku; každé místo má jiný. */
  seed: number;
  size?: number;
  onPress?: () => void;
}) {
  const { colors, fonts } = useTheme();
  const fontSize = monogram.length > 2 ? size * 0.32 : size * 0.4;
  const face = (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 40 40" style={{ position: "absolute", left: 0, top: 0 }}>
        {got ? (
          <>
            <Path d={wobblyCircle(20, 21, 18, 1.2, seed + 1, 18)} fill={WAX.shadow} opacity={0.3} />
            <Path d={wobblyCircle(20, 20, 18, 1.2, seed, 18)} fill={WAX.body} />
            <Circle cx={20} cy={20} r={14.5} fill="none" stroke={WAX.glint} strokeWidth={0.7} opacity={0.7} />
          </>
        ) : (
          <>
            <Circle cx={20} cy={20} r={18} fill="none" stroke={colors.muted} strokeWidth={1} strokeDasharray="2 2.6" strokeLinecap="round" />
            <Circle cx={20} cy={20} r={14.5} fill="none" stroke={colors.line} strokeWidth={0.7} />
          </>
        )}
      </Svg>
      <Text
        allowFontScaling={false}
        style={{ fontFamily: fonts.display, fontSize, lineHeight: fontSize * 1.2, color: got ? WAX.text : colors.muted, opacity: got ? 1 : 0.55 }}
      >
        {monogram}
      </Text>
    </View>
  );
  if (!got || !onPress) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={got ? `${name}, razítko získáno` : `${name}, zatím bez razítka`}>
        {face}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, razítko získáno`}
      accessibilityHint="Otevře detail místa"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ rotate: `${(seed % 7) - 3}deg` }, { scale: pressed ? 0.92 : 1 }] })}
    >
      {face}
    </Pressable>
  );
}
