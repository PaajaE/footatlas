import { localDateKey } from "@footatlas/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, Line, Path, Pattern, Rect, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LabeledCard, SectionLabel } from "../components/LabeledCard";
import { Seal } from "../components/Seal";
import { useReduceMotion } from "../components/useReduceMotion";
import { Button, T } from "../components/ui";
import { vltavska } from "../data/vltavska";
import { formatDistance } from "../format";
import { formatDayNumeric } from "../home";
import { ferryInfo, ferryTexts, isFerry } from "../privoz";
import { sealKm } from "../seal";
import { useExpedition } from "../state/ExpeditionProvider";
import { useTheme } from "../theme/ThemeProvider";

const SCENE_H = 300;
const CROSS_MS = 3500;
const START_DELAY_MS = 500;

/**
 * Přívoz jako scéna (docs/prototyp-snimky/05-privoz.jpg): malá mapa s lodí, která přeplouvá řeku mezi přístavišti,
 * pod ní „Převezli jste se na druhý břeh“, háček a kontext z obsahu a dlaždice Přívozy / Další přívoz ze skutečných dat.
 * Sezónnost přívozů se neuvádí: v podkladech není doložená.
 */
export default function Ferry() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ex = useExpedition();
  const reduce = useReduceMotion();
  const place = id ? vltavska.placesById.get(id) : undefined;
  const [run, setRun] = useState(0);
  const boat = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    setLanded(false);
    if (reduce) {
      boat.setValue(1);
      rise.setValue(1);
      setLanded(true);
      return;
    }
    boat.setValue(0);
    rise.setValue(0);
    const a = Animated.parallel([
      Animated.timing(boat, { toValue: 1, duration: CROSS_MS, delay: START_DELAY_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 1, duration: 600, delay: START_DELAY_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    const t = setTimeout(() => setLanded(true), START_DELAY_MS + CROSS_MS);
    a.start();
    return () => {
      a.stop();
      clearTimeout(t);
    };
  }, [run, reduce, boat, rise]);

  if (!place || !isFerry(place)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: insets.top + 24, gap: 16 }}>
        <T variant="title">Přívoz nenalezen</T>
        <Button label="Zpět" onPress={() => router.back()} />
      </View>
    );
  }

  const info = ferryInfo(vltavska.places, place.id);
  const texts = ferryTexts(place);
  const reached = ex.active && place.atM <= ex.walkedM;
  const W = width;
  const H = SCENE_H;
  const riverL = W * 0.4;
  const riverR = W * 0.57;
  const dockA = { x: W * 0.32, y: H * 0.64 };
  const dockB = { x: W * 0.65, y: H * 0.58 };
  const flip = (a: number, b: number) => boat.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const kmText = `Na trase · km ${(place.atM / 1000).toFixed(1).replace(".", ",")}`;
  const riverPath = `M${riverL} 0 C ${riverL + 14} ${H * 0.25}, ${riverL - 10} ${H * 0.55}, ${riverL + 6} ${H} L${riverR + 4} ${H} C ${riverR - 12} ${H * 0.6}, ${riverR + 10} ${H * 0.3}, ${riverR} 0 Z`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 8, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 2 }}>
          <SectionLabel size={15}>{kmText}</SectionLabel>
          <T style={{ fontFamily: fonts.display, fontSize: 38, lineHeight: 42, color: colors.fg }}>Přes řeku přívozem</T>
        </View>

        <View style={{ height: H, backgroundColor: colors.surfaceAlt, overflow: "hidden" }} accessible accessibilityLabel={`Mapa: přívoz přes Vltavu, ${place.name}`}>
          <Svg width={W} height={H}>
            <Defs>
              <Pattern id="blk" width={9} height={8} patternUnits="userSpaceOnUse">
                <Rect x={1} y={1} width={6} height={5} fill="none" stroke={colors.muted} strokeWidth={0.5} />
              </Pattern>
              <Pattern id="tre" width={8} height={8} patternUnits="userSpaceOnUse">
                <Circle cx={4} cy={3.5} r={2.3} fill="none" stroke={colors.muted} strokeWidth={0.6} />
              </Pattern>
            </Defs>
            <Rect x={0} y={0} width={riverL - 20} height={H * 0.5} fill="url(#blk)" opacity={0.8} />
            <Rect x={riverR + 20} y={0} width={W - riverR - 20} height={H * 0.45} fill="url(#blk)" opacity={0.8} />
            <Rect x={0} y={H * 0.78} width={riverL - 40} height={H * 0.22} fill="url(#tre)" opacity={0.8} />
            <Rect x={riverR + 30} y={H * 0.68} width={W - riverR - 30} height={H * 0.32} fill="url(#tre)" opacity={0.8} />
            <Path d={riverPath} fill={colors.water} />
            <SvgText x={(riverL + riverR) / 2 - 4} y={H * 0.3} fontFamily={fonts.displayItalic} fontSize={16} fill={colors.mutedStrong} rotation={-90} origin={`${(riverL + riverR) / 2 - 4}, ${H * 0.3}`} textAnchor="middle">
              Vltava
            </SvgText>
            <Line x1={W * 0.05} y1={H} x2={dockA.x} y2={dockA.y} stroke={colors.accent} strokeWidth={4} strokeLinecap="round" />
            <Line x1={dockA.x} y1={dockA.y} x2={dockB.x} y2={dockB.y} stroke={colors.fg} strokeWidth={1.4} strokeDasharray="4 4" />
            <Line x1={dockB.x} y1={dockB.y} x2={W * 0.84} y2={H * 0.1} stroke={colors.accent} strokeWidth={4} strokeLinecap="round" />
            {[dockA, dockB].map((d, i) => (
              <Rect key={i} x={d.x - 11} y={d.y - 7} width={22} height={14} fill="#EBD5AE" stroke={colors.fg} strokeWidth={1} />
            ))}
            <SvgText x={dockA.x} y={dockA.y + 24} fontFamily={fonts.displaySC} fontSize={9} letterSpacing={0.8} fill={colors.fg} textAnchor="middle">
              PŘÍSTAVIŠTĚ
            </SvgText>
            <SvgText x={dockB.x + 10} y={dockB.y - 12} fontFamily={fonts.displaySC} fontSize={9} letterSpacing={0.8} fill={colors.fg} textAnchor="middle">
              PŘÍSTAVIŠTĚ
            </SvgText>
            <SvgText x={W * 0.04} y={H * 0.12} fontFamily={fonts.displayItalic} fontSize={15} fill={colors.fg}>
              {place.name}
            </SvgText>
            <Circle cx={W * 0.84} cy={H * 0.1} r={8} fill={colors.accent} stroke="#FBF5E8" strokeWidth={2.5} />
          </Svg>
          {/* Loď přeplouvá po čárkované lince mezi přístavišti. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: -14,
              top: -9,
              transform: [{ translateX: flip(dockA.x, dockB.x) }, { translateY: flip(dockA.y - 4, dockB.y - 4) }],
            }}
          >
            <Svg width={28} height={18} viewBox="0 0 28 18">
              <Path d="M2 10 H26 L22 16 H6 Z" fill="#FBF5E8" stroke="#2B2118" strokeWidth={1.3} strokeLinejoin="round" />
              <Rect x={9} y={4} width={9} height={6} fill="#FBF5E8" stroke="#2B2118" strokeWidth={1.1} />
              <Line x1={13.5} y1={1} x2={13.5} y2={4} stroke="#2B2118" strokeWidth={1.1} />
            </Svg>
          </Animated.View>
          {landed && (
            <View pointerEvents="none" style={{ position: "absolute", left: dockB.x - 20, top: dockB.y + 6 }}>
              <Seal key={run} kind="stamp" size={72} animate name={place.name} expeditionName={vltavska.name} kmLabel={sealKm(place.atM)} dateLabel={formatDayNumeric(localDateKey(new Date()))} />
            </View>
          )}
        </View>

        <Animated.View
          style={{
            paddingHorizontal: 20,
            gap: 12,
            opacity: rise,
            transform: reduce ? [] : [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}
        >
          <View accessibilityLiveRegion="polite">
            <T style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.fg }}>
              {reached ? "Převezli jste se na druhý břeh" : "Tady se převážíte na druhý břeh"}
            </T>
          </View>
          {reached ? (
            <>
              {texts.quote && <T style={{ fontFamily: fonts.displayItalic, fontSize: 20, lineHeight: 27, color: colors.fg }}>{`„${texts.quote}“`}</T>}
              {texts.body && <T style={{ fontSize: 14, lineHeight: 21, color: colors.fgSoft }}>{texts.body}</T>}
            </>
          ) : (
            <T variant="muted" style={{ color: colors.mutedStrong }}>
              {`Až sem dojdete, za ${formatDistance(place.atM - ex.walkedM, { stepLengthM: ex.stepLength.meters })}, převezete se.`}
            </T>
          )}
          {info && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <LabeledCard label="Přívozy" gap={4} style={{ flex: 1, borderRadius: 16, padding: 12 }}>
                <T variant="body">{`${info.index} ze ${info.total} na trase`}</T>
              </LabeledCard>
              {info.next && (
                <LabeledCard label="Další přívoz" gap={4} style={{ flex: 1, borderRadius: 16, padding: 12 }}>
                  <T variant="body">{`${info.next.place.name} za ${formatDistance(info.next.distanceM)}`}</T>
                </LabeledCard>
              )}
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button kind="secondary" label="Přehrát znovu" onPress={() => setRun((n) => n + 1)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Pokračovat" onPress={() => router.back()} />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
