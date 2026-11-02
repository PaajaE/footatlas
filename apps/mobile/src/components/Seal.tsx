import { useEffect, useId, useRef } from "react";
import { Animated, Easing, Image, Text, View, type ImageSourcePropType } from "react-native";
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop, Text as SvgText, TextPath } from "react-native-svg";
import { DROP_MS, REDUCED_FADE_MS, RING_MS, grungeDash, progressArcs, ringPath, wobblyCircle } from "../seal";
import { useTheme } from "../theme/ThemeProvider";
import { useReduceMotion } from "./useReduceMotion";

/** Vosk je ve dne i v noci rumělkový; barvy odpovídají `Pecete.dc.html`. */
const WAX = { light: "#C2463A", mid: "#9B2C22", dark: "#6A1A13", shadow: "#5A1610", text: "#F6D9CF", glint: "#E7A08F" };

type Common = {
  /** Strana čtverce v bodech; kresba je navržená na 132. */
  size?: number;
  /** Přehrát dopad razítka (600 ms s přestřelem, kruh kolem 700 ms). Při „Omezit pohyb“ jen prolnutí 400 ms. */
  animate?: boolean;
  /** Zpoždění dopadu; mezi razítky nechat aspoň MIN_STAMP_GAP_MS. */
  delayMs?: number;
};

export type SealProps = Common &
  (
    | { kind: "wax"; name: string; kmLabel: string; dateLabel: string; photo?: ImageSourcePropType }
    | { kind: "stamp"; name: string; expeditionName: string; kmLabel: string; dateLabel: string }
    | { kind: "locked"; label?: string }
    | { kind: "chapter"; title: string; expeditionName: string; done: number; total: number }
    | { kind: "stage"; roman: string; ringText: string }
  );

/**
 * Pečeť, razítko a tužkový kroužek podle prototypu (docs/mockupy/Pecete.dc.html).
 * Nepravidelný okraj je vykreslený tvarem (ne filtrem), aby vypadal stejně na telefonu i na webu.
 * Haptika „light“ při dopadu zatím chybí: balíček expo-haptics v projektu není a nový nativní modul vyžaduje nový build.
 */
export function Seal(props: SealProps) {
  const { size = 132, animate = false, delayMs = 0 } = props;
  return (
    <DropIn size={size} animate={animate} delayMs={delayMs} label={describe(props)}>
      <Body {...props} size={size} />
    </DropIn>
  );
}

/** Dopad razítka: 600 ms s přestřelem, kruh kolem 700 ms. Při „Omezit pohyb“ jen prolnutí 400 ms. */
function DropIn({
  size,
  animate,
  delayMs,
  label,
  children,
}: {
  size: number;
  animate: boolean;
  delayMs: number;
  label: string;
  children: React.ReactNode;
}) {
  const reduce = useReduceMotion();
  const progress = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const ring = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) return;
    progress.setValue(0);
    ring.setValue(0);
    const run = reduce
      ? Animated.timing(progress, { toValue: 1, duration: REDUCED_FADE_MS, delay: delayMs, easing: Easing.linear, useNativeDriver: true })
      : Animated.parallel([
          Animated.timing(progress, { toValue: 1, duration: DROP_MS, delay: delayMs, easing: Easing.bezier(0.2, 1.5, 0.4, 1), useNativeDriver: true }),
          Animated.timing(ring, { toValue: 1, duration: RING_MS, delay: delayMs + 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]);
    run.start();
    return () => run.stop();
  }, [animate, delayMs, reduce, progress, ring]);

  const motion = animate && !reduce;
  const style = {
    width: size,
    height: size,
    opacity: progress.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: "clamp" }),
    transform: motion
      ? [
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) },
          { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["-30deg", "-8deg"] }) },
        ]
      : [{ rotate: "-8deg" }],
  };

  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel={label}>
      {motion && <PulseRing size={size} ring={ring} />}
      <Animated.View style={style}>{children}</Animated.View>
    </View>
  );
}

/**
 * Pečeť v rohu fotky na detailu místa: rumělkový vosk a tři řádky (místo, kilometr, den).
 * U dlouhých názvů se místo názvu píše druh místa.
 */
export function SealBadge({
  name,
  kindLabel,
  kmLabel,
  dateLabel,
  size = 88,
  animate = false,
  delayMs = 0,
}: {
  name: string;
  kindLabel: string;
  kmLabel: string;
  dateLabel: string;
  size?: number;
  animate?: boolean;
  delayMs?: number;
}) {
  const { fonts } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const top = name.length <= 10 ? name : kindLabel;
  return (
    <DropIn size={size} animate={animate} delayMs={delayMs} label={`Pečeť: ${name}, ${kmLabel}, ${dateLabel}`}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} viewBox="0 0 88 88" style={{ position: "absolute" }}>
          <Defs>
            <RadialGradient id={`b${id}`} cx="40%" cy="35%" r="70%">
              <Stop offset="0" stopColor={WAX.light} />
              <Stop offset="0.6" stopColor={WAX.mid} />
              <Stop offset="1" stopColor={WAX.dark} />
            </RadialGradient>
          </Defs>
          <Circle cx={44} cy={46} r={42} fill={WAX.shadow} opacity={0.35} />
          <Circle cx={44} cy={44} r={41} fill={`url(#b${id})`} stroke="#8E2A20" strokeWidth={5} />
        </Svg>
        <Text style={{ fontFamily: fonts.displaySC, fontSize: 10, letterSpacing: 1, color: WAX.text }} numberOfLines={1}>
          {top}
        </Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 22, color: WAX.text }}>{kmLabel}</Text>
        <Text style={{ fontFamily: fonts.displaySC, fontSize: 9, color: WAX.text }}>{dateLabel}</Text>
      </View>
    </DropIn>
  );
}

function describe(p: SealProps): string {
  switch (p.kind) {
    case "wax":
      return `Pečeť: ${p.name}, ${p.kmLabel}, ${p.dateLabel}`;
    case "stamp":
      return `Razítko: ${p.name}, ${p.kmLabel}, ${p.dateLabel}`;
    case "locked":
      return p.label ? `Zamčeno, ${p.label}` : "Zamčeno";
    case "chapter":
      return `Kapitola ${p.title}, ${p.done} z ${p.total}`;
    case "stage":
      return `Pečeť etapy ${p.roman}`;
  }
}

function PulseRing({ size, ring }: { size: number; ring: Animated.Value }) {
  const { colors } = useTheme();
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: colors.accent,
        opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
        transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.35] }) }],
      }}
    />
  );
}

function Body(p: SealProps & { size: number }) {
  const { colors, fonts } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { size } = p;
  const svg = { width: size, height: size, viewBox: "0 0 132 132" };

  if (p.kind === "wax" || p.kind === "stage") {
    const gradient = `wax${id}`;
    const ringId = `ring${id}`;
    const stage = p.kind === "stage";
    const edgeSeed = stage ? 21 : 11;
    return (
      <View style={{ width: size, height: size }}>
        <Svg {...svg}>
          <Defs>
            <RadialGradient id={gradient} cx="40%" cy="35%" r="70%">
              <Stop offset="0" stopColor={WAX.light} />
              <Stop offset="0.6" stopColor={WAX.mid} />
              <Stop offset="1" stopColor={WAX.dark} />
            </RadialGradient>
            <Path id={ringId} d={ringPath(66, 66, stage ? 40 : 49)} />
          </Defs>
          <Path d={wobblyCircle(66, 68, 56, stage ? 3.4 : 2.8, edgeSeed + 1)} fill={WAX.shadow} opacity={0.35} />
          <Path d={wobblyCircle(66, 66, 56, stage ? 3.4 : 2.8, edgeSeed)} fill={`url(#${gradient})`} />
          <Circle cx={66} cy={66} r={stage ? 46 : 42} fill="none" stroke={WAX.shadow} strokeWidth={stage ? 2.5 : 3} opacity={0.6} />
          {!stage && <Circle cx={66} cy={66} r={44} fill="none" stroke={WAX.glint} strokeWidth={1} opacity={0.6} />}
          <SvgText fontFamily={fonts.displaySC} fontSize={stage ? 10 : 9} letterSpacing={stage ? 2 : 1.6} fill={WAX.text}>
            <TextPath href={`#${ringId}`} startOffset={stage ? "4%" : "2%"}>
              {stage ? p.ringText : `${p.name} · ${p.kmLabel} · ${p.dateLabel} ·`}
            </TextPath>
          </SvgText>
          {stage && (
            <SvgText x={66} y={80} textAnchor="middle" fontFamily={fonts.display} fontSize={40} fill={WAX.text}>
              {p.roman}
            </SvgText>
          )}
        </Svg>
        {!stage && p.photo && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: (28 / 132) * size,
              top: (28 / 132) * size,
              width: (76 / 132) * size,
              height: (76 / 132) * size,
              borderRadius: (38 / 132) * size,
              overflow: "hidden",
            }}
          >
            <Image source={p.photo} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
          </View>
        )}
      </View>
    );
  }

  if (p.kind === "stamp") {
    const ink = colors.accent;
    const ringId = `ring${id}`;
    return (
      <Svg {...svg}>
        <Defs>
          <Path id={ringId} d={ringPath(66, 66, 40)} />
        </Defs>
        <G fill="none" stroke={ink} opacity={0.92}>
          <Circle cx={66} cy={66} r={54} strokeWidth={3.5} strokeDasharray={grungeDash(2 * Math.PI * 54, 4)} />
          <Circle cx={66} cy={66} r={48} strokeWidth={1.2} strokeDasharray={grungeDash(2 * Math.PI * 48, 9)} />
          <Circle cx={66} cy={66} r={30} strokeWidth={1.2} strokeDasharray={grungeDash(2 * Math.PI * 30, 15)} />
        </G>
        <SvgText fontFamily={fonts.displaySC} fontSize={11} letterSpacing={2} fill={ink} opacity={0.92}>
          <TextPath href={`#${ringId}`} startOffset="3%">{`${p.name} · ${p.expeditionName} ·`}</TextPath>
        </SvgText>
        <SvgText x={66} y={66} textAnchor="middle" fontFamily={fonts.display} fontSize={17} fill={ink} opacity={0.92}>
          {p.kmLabel}
        </SvgText>
        <SvgText x={66} y={80} textAnchor="middle" fontFamily={fonts.displaySC} fontSize={9} letterSpacing={1} fill={ink} opacity={0.92}>
          {p.dateLabel}
        </SvgText>
      </Svg>
    );
  }

  if (p.kind === "locked") {
    return (
      <Svg {...svg}>
        <Circle cx={66} cy={66} r={50} fill="none" stroke={colors.muted} strokeWidth={1.4} strokeDasharray="2 4" strokeLinecap="round" />
        <SvgText x={66} y={p.label ? 62 : 76} textAnchor="middle" fontFamily={fonts.display} fontSize={30} fill={colors.muted}>
          ?
        </SvgText>
        {p.label && (
          <SvgText x={66} y={84} textAnchor="middle" fontFamily={fonts.bodySemi} fontSize={12} fill={colors.fg}>
            {p.label}
          </SvgText>
        )}
      </Svg>
    );
  }

  // Kapitola: oblouky postupu kolem kroužku s číslem splněných míst.
  const ringId = `ring${id}`;
  return (
    <Svg {...svg}>
      <Defs>
        <Path id={ringId} d={ringPath(66, 66, 44)} />
      </Defs>
      <Circle cx={66} cy={66} r={58} fill={colors.surfaceAlt} stroke={colors.ochre} strokeWidth={1.2} />
      {progressArcs(p.done, p.total, 66, 66, 56).map((a, i) => (
        <Path key={i} d={a.path} fill="none" stroke={a.done ? colors.accent : colors.line} strokeWidth={5} strokeLinecap="round" />
      ))}
      <SvgText fontFamily={fonts.displaySC} fontSize={11} letterSpacing={2} fill={colors.ochre}>
        <TextPath href={`#${ringId}`} startOffset="8%">{`Kapitola · ${p.title} · ${p.expeditionName}`}</TextPath>
      </SvgText>
      <SvgText x={66} y={76} textAnchor="middle" fontFamily={fonts.display} fontSize={30} fill={colors.fg}>
        {`${p.done} z ${p.total}`}
      </SvgText>
    </Svg>
  );
}
