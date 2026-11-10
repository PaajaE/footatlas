import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, Pattern, Rect, Text as SvgText, TextPath } from "react-native-svg";
import { INTRO_AHEAD, INTRO_INK, INTRO_RIVER_D, pointAt, polylineLength, polylinePath } from "../../onboarding";
import { vltavska } from "../../data/vltavska";
import { useTheme } from "../../theme/ThemeProvider";
import { Seal } from "../Seal";
import { useReduceMotion } from "../useReduceMotion";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const W = 390;
const H = 330;
const DRAW_MS = 2800;
const START_DELAY_MS = 500;

/** Barvy ilustrované mapy mimo tokeny tématu; hodnoty z mockupu úvodu a z palety atlasu (map-style). */
const PALETTE = {
  light: { grey: "#B9AB8D", road: "#A39274", bld: "#DDA264", bldLine: "#B97A3B", tree: "#86A263", treeLine: "#5F7C45", wash: "#DCE4B8", riverLine: "#5E8F8C" },
  dark: { grey: "#54483A", road: "#6B5C48", bld: "#B8793F", bldLine: "#E0A468", tree: "#6F8F63", treeLine: "#9DBB8C", wash: "#38472F", riverLine: "#9CC1BC" },
} as const;

const LAND = {
  bld: ["M16 112L118 104L132 156L64 176L14 160Z", "M268 188L352 172L368 224L292 246L262 218Z", "M20 226L58 214L70 250L34 262Z"],
  tree: [
    "M150 256Q198 240 242 258Q252 304 190 316Q140 306 150 256Z",
    "M26 18Q92 6 124 40Q112 84 60 90Q16 72 26 18Z",
    "M300 150Q350 134 378 164Q372 200 322 192Z",
    "M178 118Q214 104 232 128Q222 146 190 146Z",
  ],
};
const ROADS = [
  "M-10 196C58 190 100 150 160 140S262 104 304 22",
  "M0 118L120 112L196 92L256 44L278 -6",
  "M104 336L130 276L200 258L300 262L400 232",
  "M326 336L340 254L392 214",
  "M60 40L96 120",
  "M206 330L214 290",
];
const THIN = ["M0 160L60 150L98 110", "M40 300L90 290L130 330", "M300 100L350 120L390 110", "M160 20L210 60L240 40"];

const PLACES: ReadonlyArray<{ t: number; name: string; dx: number; dy: number }> = [
  { t: 0, name: "Vyšehrad", dx: 11, dy: 20 },
  { t: 0.5, name: "Troja", dx: 11, dy: -9 },
  { t: 1, name: "Roztoky", dx: -64, dy: -9 },
];
const AHEAD: ReadonlyArray<{ t: number; name: string; dx: number; dy: number }> = [
  { t: 0.42, name: "Kralupy", dx: 11, dy: 4 },
  { t: 1, name: "Mělník", dx: -34, dy: 24 },
];

const SEAL_PX = 64;
/** Razítko u konce ušlého úseku dostane symbol skutečného místa (zámek Roztoky), ne monogram. */
const SEAL_PLACE = vltavska.places.find((pl) => pl.name.includes("Roztoky") && pl.symbol)?.id;

/**
 * Úvodní kresba: trasa po břehu Vltavy se nakreslí inkoustem a kolem ní se odkryje barva, zbytek zůstane skica.
 * Na konci dopadne pečeť. Při „Omezit pohyb“ se ukáže hotový stav.
 */
export function IntroMap() {
  const { colors, fonts, name } = useTheme();
  const c = PALETTE[name];
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [reached, setReached] = useState(0);
  const [seal, setSeal] = useState(false);
  const p = useRef(new Animated.Value(0)).current;

  const len = useMemo(() => polylineLength(INTRO_INK), []);
  const inkD = useMemo(() => polylinePath(INTRO_INK), []);
  const aheadD = useMemo(() => polylinePath(INTRO_AHEAD), []);
  const offset = p.interpolate({ inputRange: [0, 1], outputRange: [len, 0] });
  const end = pointAt(INTRO_INK, 1);

  useEffect(() => {
    const id = p.addListener(({ value }) => setReached((r) => Math.max(r, value >= 0.999 ? 3 : value >= 0.5 ? 2 : value > 0.001 ? 1 : 0)));
    if (reduce) {
      p.setValue(1);
      setSeal(true);
      return () => p.removeListener(id);
    }
    const a = Animated.timing(p, { toValue: 1, duration: DRAW_MS, delay: START_DELAY_MS, easing: Easing.bezier(0.45, 0.05, 0.4, 1), useNativeDriver: false });
    a.start(({ finished }) => finished && setSeal(true));
    return () => {
      a.stop();
      p.removeListener(id);
    };
  }, [p, reduce]);

  const s = width / W;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const land = (colour: boolean) => (
    <>
      {colour && <Rect x={-20} y={-20} width={W + 40} height={H + 40} fill={c.wash} opacity={0.55} />}
      {LAND.bld.map((d) => (
        <Path key={d} d={d} fill={`url(#${colour ? "ob-bldC" : "ob-bldG"})`} />
      ))}
      {LAND.tree.map((d) => (
        <Path key={d} d={d} fill={`url(#${colour ? "ob-treeC" : "ob-treeG"})`} />
      ))}
      {ROADS.map((d) => (
        <Path key={d} d={d} fill="none" stroke={c.road} strokeWidth={1.3} strokeLinecap="round" />
      ))}
      {THIN.map((d) => (
        <Path key={d} d={d} fill="none" stroke={c.road} strokeWidth={0.8} strokeDasharray="5 3" opacity={0.8} />
      ))}
      {colour ? (
        <>
          <Path d={INTRO_RIVER_D} fill="none" stroke={colors.water} strokeWidth={26} strokeLinecap="round" />
          <Path d={INTRO_RIVER_D} fill="none" stroke={c.riverLine} strokeWidth={1} strokeDasharray="7 4" opacity={0.7} />
          <SvgText fontFamily={fonts.displayItalic} fontSize={15} letterSpacing={1} fill={c.riverLine}>
            <TextPath href="#ob-riverText">Vltava</TextPath>
          </SvgText>
        </>
      ) : (
        <>
          <Path d={INTRO_RIVER_D} fill="none" stroke={c.grey} strokeWidth={26} strokeLinecap="round" opacity={0.35} />
          <Path d={INTRO_RIVER_D} fill="none" stroke={colors.bg} strokeWidth={22} strokeLinecap="round" />
        </>
      )}
    </>
  );

  const label = (n: string, x: number, y: number, done: boolean, ahead = false) => (
    <SvgText key={n} x={x} y={y} fontFamily={fonts.displayItalic} fontSize={13} fill={done ? colors.fg : colors.muted} opacity={done ? 1 : ahead ? 0.7 : 0}>
      {n}
    </SvgText>
  );

  return (
    <View onLayout={onLayout} style={{ width: "100%", height: width > 0 ? H * s : 0 }} accessibilityRole="image" accessibilityLabel="Mapa s trasou po břehu Vltavy: ušlý úsek je vybarvený a červený, zbytek je skica a čárkovaná čára">
      {width > 0 && (
        <>
          <Svg width={width} height={H * s} viewBox={`0 0 ${W} ${H}`}>
            <Defs>
              <Pattern id="ob-bldG" patternUnits="userSpaceOnUse" width={8} height={8}>
                <Rect x={1.5} y={1.5} width={5} height={5} fill="none" stroke={c.grey} strokeWidth={1} />
              </Pattern>
              <Pattern id="ob-bldC" patternUnits="userSpaceOnUse" width={8} height={8}>
                <Rect x={1.5} y={1.5} width={5} height={5} fill={c.bld} stroke={c.bldLine} strokeWidth={1} />
              </Pattern>
              <Pattern id="ob-treeG" patternUnits="userSpaceOnUse" width={11} height={11}>
                <Circle cx={5.5} cy={4} r={2.7} fill="none" stroke={c.grey} strokeWidth={1} />
                <Path d="M5.5 6.7v3.6" stroke={c.grey} strokeWidth={1} />
              </Pattern>
              <Pattern id="ob-treeC" patternUnits="userSpaceOnUse" width={11} height={11}>
                <Circle cx={5.5} cy={4} r={2.9} fill={c.tree} stroke={c.treeLine} strokeWidth={1} />
                <Path d="M5.5 6.9v3.4" stroke={c.treeLine} strokeWidth={1} />
              </Pattern>
              <Path id="ob-riverText" d="M130 233C175 214 232 214 262 176" />
              {/* Maska odkrývá barvu kolem ušlé trasy; měkký okraj jsou tři vrstvy různé šířky. */}
              <Mask id="ob-reveal" maskUnits="userSpaceOnUse" x={-20} y={-20} width={W + 40} height={H + 40}>
                <Rect x={-20} y={-20} width={W + 40} height={H + 40} fill="#000" />
                {[
                  [96, 0.3],
                  [70, 0.6],
                  [44, 1],
                ].map(([w, o]) => (
                  <AnimatedPath key={w} d={inkD} fill="none" stroke="#fff" strokeOpacity={o} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={offset} />
                ))}
              </Mask>
            </Defs>
            <G>
              {land(false)}
            </G>
            <G mask="url(#ob-reveal)">
              {land(true)}
            </G>
            <Path d={aheadD} fill="none" stroke={colors.fg} strokeWidth={2.8} strokeDasharray="7 5" strokeLinecap="round" opacity={0.85} />
            <AnimatedPath d={inkD} fill="none" stroke={colors.accent} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={offset} />
            {PLACES.map((pl, i) => {
              const [x, y] = pointAt(INTRO_INK, pl.t);
              const done = reached > i;
              return (
                <G key={pl.name}>
                  {done ? (
                    <Circle cx={x} cy={y} r={6} fill={colors.accent} stroke={colors.bg} strokeWidth={2.5} />
                  ) : (
                    <Circle cx={x} cy={y} r={5} fill={colors.bg} stroke={colors.muted} strokeWidth={1.4} strokeDasharray="2 2" />
                  )}
                  {label(pl.name, x + pl.dx, y + pl.dy, done)}
                </G>
              );
            })}
            {AHEAD.map((pl) => {
              const [x, y] = pointAt(INTRO_AHEAD, pl.t);
              return (
                <G key={pl.name}>
                  <Circle cx={x} cy={y} r={5} fill={colors.bg} stroke={colors.muted} strokeWidth={1.4} strokeDasharray="2 2" />
                  {label(pl.name, x + pl.dx, y + pl.dy, false, true)}
                </G>
              );
            })}
          </Svg>
          {seal && (
            <View pointerEvents="none" style={{ position: "absolute", left: end[0] * s - SEAL_PX / 2, top: end[1] * s - SEAL_PX / 2 }}>
              <Seal kind="wax" name="Roztoky" kmLabel="" dateLabel="" size={SEAL_PX} animate placeId={SEAL_PLACE} />
            </View>
          )}
        </>
      )}
    </View>
  );
}
