import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, RadialGradient, Stop } from "react-native-svg";
import { confidenceShares, formatKmBig, orbitArc } from "../../kronika/earth";
import { T } from "../ui";
import { useTheme } from "../../theme/ThemeProvider";
import { darkTheme, lightTheme } from "../../theme/tokens";

/**
 * Barvy „inkoustové“ karty (zeměkoule, banner): ve světlém vzhledu tmavá karta se světlým textem,
 * v tmavém naopak krémová karta s tmavým textem (noční snímky prototypu). Odvozeno z tokenů obou témat.
 */
export function useInk() {
  const { name, colors } = useTheme();
  const other = name === "dark" ? lightTheme.colors : darkTheme.colors;
  return {
    bg: colors.fg,
    text: other.fg,
    soft: other.muted,
    label: other.ochre,
    /** Oranžová stopa oblouku; stejná na obou kartách. */
    arc: darkTheme.colors.accent,
    /** Text pilulky na oranžovém podkladě: na krémové kartě tmavší rumělka kvůli kontrastu. */
    pill: name === "dark" ? lightTheme.colors.accent : "#F0A487",
  };
}

let globeCounter = 0;

const CONTINENTS = [
  "M60 60 q16 -12 34 -4 q12 10 2 22 q-10 12 -26 8 q-18 -4 -10 -26 Z",
  "M104 96 q22 -6 30 10 q2 18 -16 26 q-16 4 -18 -12 Z",
  "M150 48 q26 -8 44 6 q8 14 -8 20 q-20 6 -34 -6 Z",
  "M170 116 q18 -2 22 14 q-2 16 -18 12 q-12 -8 -4 -26 Z",
];
const MERIDIANS = "M38 23 Q8 105 38 187 M78 23 Q56 105 78 187 M118 23 Q108 105 118 187 M158 23 Q160 105 158 187 M198 23 Q212 105 198 187";

/**
 * Zeměkoule s obloukem ušlé části obvodu Země. `fraction` je podíl obvodu (0 až 1);
 * oblouk je ilustrace, ne mapa. Šířka určuje velikost, poměr stran je pevný.
 */
export function Globe({ fraction, width, halo = true }: { fraction: number; width: number; halo?: boolean }) {
  const ink = useInk();
  const id = useMemo(() => `glb${++globeCounter}`, []);
  const arc = orbitArc(fraction, 120, 105, 104, 30);
  const draw = fraction > 0.0005;
  return (
    <Svg width={width} height={(width * 210) / 240} viewBox="0 0 240 210" accessibilityLabel="Zeměkoule s obloukem ušlé části cesty kolem Země">
      <Defs>
        <ClipPath id={`${id}c`}>
          <Circle cx={120} cy={105} r={82} />
        </ClipPath>
        <RadialGradient id={`${id}s`} cx="36%" cy="30%" r="78%">
          <Stop offset="0%" stopColor="#5A7B75" />
          <Stop offset="100%" stopColor="#1A2523" />
        </RadialGradient>
        <RadialGradient id={`${id}h`} cx="50%" cy="50%" r="50%">
          <Stop offset="70%" stopColor={ink.arc} stopOpacity={0} />
          <Stop offset="100%" stopColor={ink.arc} stopOpacity={0.35} />
        </RadialGradient>
      </Defs>
      {halo && <Circle cx={120} cy={105} r={100} fill={`url(#${id}h)`} opacity={0.6} />}
      <Circle cx={120} cy={105} r={82} fill={`url(#${id}s)`} />
      <G clipPath={`url(#${id}c)`}>
        <Path d={MERIDIANS} stroke="#D9B068" strokeWidth={0.7} fill="none" opacity={0.5} />
        <G fill="#B08A5A" opacity={0.8}>
          {CONTINENTS.map((d) => (
            <Path key={d} d={d} />
          ))}
        </G>
        <Path d="M38 70 Q120 58 202 70 M38 140 Q120 152 202 140" stroke="#D9B068" strokeWidth={0.6} fill="none" opacity={0.35} />
      </G>
      <Circle cx={120} cy={105} r={82} fill="none" stroke="#D9B068" strokeWidth={1.2} />
      <Ellipse cx={120} cy={105} rx={104} ry={30} fill="none" stroke="#D9B068" strokeWidth={0.8} strokeDasharray="2 4" opacity={0.55} />
      {draw && (
        <>
          <Path d={arc.path} fill="none" stroke={ink.arc} strokeWidth={3.6} strokeLinecap="round" />
          <Circle cx={arc.end.x} cy={arc.end.y} r={6} fill={ink.arc} stroke={ink.bg} strokeWidth={2.4} />
        </>
      )}
    </Svg>
  );
}

/** Kroužková pečeť u dne a sbírek (lokální varianta; sdílená komponenta pečeti přijde s balíkem A). */
export function Seal({ size = 24, filled = false }: { size?: number; filled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={12} cy={12} r={10.6} fill={filled ? `${colors.accent}22` : colors.bg} stroke={colors.accent} strokeWidth={2.2} />
      <Circle cx={12} cy={12} r={7} fill="none" stroke={colors.accent} strokeWidth={1.2} />
    </Svg>
  );
}

const TAN = "#B08A5A";

/** Pruh „Z čeho číslo je“: ověřeno / odhad z kroků / zadáno ručně, jen to, co data skutečně obsahují. */
export function ConfidenceBar({ by, compact = false }: { by: { verified: number; estimated: number; manual: number }; compact?: boolean }) {
  const { colors } = useTheme();
  const sh = confidenceShares(by);
  const parts = [
    { key: "verified", share: sh.verified, color: colors.fg, m: by.verified, text: "změřeno telefonem" },
    { key: "estimated", share: sh.estimated, color: TAN, m: by.estimated, text: "dopočítáno z kroků" },
    { key: "manual", share: sh.manual, color: colors.line, m: by.manual, text: "zadáno ručně" },
  ].filter((p) => p.m > 0);
  if (parts.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: colors.line }}>
        {parts.map((p) => (
          <View key={p.key} style={{ flex: p.share, backgroundColor: p.color }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: compact ? 14 : 6 }}>
        {parts.map((p) => (
          <View key={p.key} style={{ flex: compact ? undefined : 1, minWidth: compact ? undefined : 0 }}>
            {compact ? (
              <T variant="small">
                {p.text} {Math.round(p.share * 100)} %
              </T>
            ) : (
              <>
                <T variant="strong" style={{ fontSize: 13, lineHeight: 18 }}>
                  {formatKmBig(p.m)}
                </T>
                <T variant="small">{p.text}</T>
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
