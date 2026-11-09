import { useMemo } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { vltavska } from "../../data/vltavska";
import { useTheme } from "../../theme/ThemeProvider";
import { T } from "../ui";
import { groupThousands } from "../../kronika/earth";
import { Globe, useInk } from "../kronika/parts";
import type { UpcomingExpedition } from "../../kronika/upcoming";
import { UPCOMING_NOTE, UPCOMING_TYPE_LABEL } from "../../kronika/upcoming";

/** Náhled trasy rozjeté výpravy: čára z bodů trasy, ušlá část rumělkově, zbytek tečkovaně. */
export function RouteBanner({ walkedM, height = 150 }: { walkedM: number; height?: number }) {
  const { colors } = useTheme();
  const W = 350;
  const built = useMemo(() => {
    const route = vltavska.route;
    if (route.length < 2) return null;
    const k = Math.cos((route[0]!.lat * Math.PI) / 180);
    const xs = route.map((p) => p.lon * k);
    const ys = route.map((p) => p.lat);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 22;
    const s = Math.min((W - 2 * pad) / (maxX - minX || 1), (height - 2 * pad) / (maxY - minY || 1));
    const ox = (W - (maxX - minX) * s) / 2;
    const oy = (height - (maxY - minY) * s) / 2;
    const stride = Math.max(1, Math.floor(route.length / 160));
    const pts: Array<{ x: number; y: number; m: number }> = [];
    for (let i = 0; i < route.length; i += stride) {
      pts.push({ x: ox + (xs[i]! - minX) * s, y: height - (oy + (ys[i]! - minY) * s), m: vltavska.cumulative[i] ?? 0 });
    }
    const last = route.length - 1;
    if ((route.length - 1) % stride !== 0) pts.push({ x: ox + (xs[last]! - minX) * s, y: height - (oy + (ys[last]! - minY) * s), m: vltavska.cumulative[last] ?? 0 });
    return pts;
  }, [height]);
  if (!built) return null;
  const line = (pts: typeof built) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const done = built.filter((p) => p.m <= walkedM);
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMid meet" accessibilityElementsHidden>
      <Path d={line(built)} fill="none" stroke={colors.water} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <Path d={line(built)} fill="none" stroke={colors.muted} strokeWidth={1.4} strokeDasharray="2 4" />
      {done.length > 1 && <Path d={line(done)} fill="none" stroke={colors.accent} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />}
    </Svg>
  );
}

/** Karta připravované výpravy: náhled trasy, štítek typu, název, popis, délka a „Chci ji“. */
export function TripCard({ trip, wished, onToggle }: { trip: UpcomingExpedition; wished: boolean; onToggle: () => void }) {
  const { colors, fonts } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 12, padding: 12, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
      <View style={{ width: 96, height: 110, borderRadius: 12, overflow: "hidden", backgroundColor: colors.line }}>
        <Svg width={96} height={110} viewBox="0 0 96 110" accessibilityElementsHidden>
          <Path d={trip.sketch} fill="none" stroke={colors.surface} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line }}>
          <T variant="small" style={{ fontSize: 11 }}>
            {UPCOMING_TYPE_LABEL[trip.type]}
          </T>
        </View>
        <T variant="title" style={{ fontSize: 21, lineHeight: 24 }}>
          {trip.name}
        </T>
        <T variant="muted" style={{ fontSize: 13, lineHeight: 18 }}>
          {trip.blurb}
        </T>
        <T style={{ fontFamily: fonts.displayItalic, fontSize: 14, lineHeight: 19, color: colors.mutedStrong }}>{UPCOMING_NOTE}</T>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: "auto" }}>
          <T variant="small" style={{ flexShrink: 1 }}>
            {trip.meta}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: wished }}
            accessibilityLabel={wished ? `${trip.name}: na seznamu přání` : `Chci ji: ${trip.name}`}
            onPress={onToggle}
            style={{
              minHeight: 36,
              paddingHorizontal: 12,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: wished ? colors.fg : "transparent",
              borderWidth: wished ? 0 : 1.5,
              borderColor: colors.line,
            }}
          >
            <T variant="strong" style={{ fontSize: 13, color: wished ? colors.bg : colors.fg, fontFamily: fonts.bodySemi }}>
              {wished ? "Na seznamu přání" : "Chci ji"}
            </T>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Tmavý banner životní cesty; klepnutí vede do Kroniky. */
export function LifeBanner({ fraction, distance, next, onPress }: { fraction: number; distance: string; next: { name: string; remainingKm: number } | null; onPress: () => void }) {
  const ink = useInk();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Otevřít životní cestu v Kronice"
      onPress={onPress}
      style={{ flexDirection: "row", gap: 14, alignItems: "center", padding: 16, borderRadius: 20, backgroundColor: ink.bg }}
    >
      <Globe fraction={fraction} width={64} halo={false} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <T variant="label" style={{ fontSize: 13, color: ink.label }}>
          Životní cesta
        </T>
        <T variant="title" style={{ fontSize: 21, lineHeight: 25, color: ink.text }}>
          {distance}
        </T>
        <T variant="muted" style={{ color: ink.soft }}>
          {next ? `Za ${groupThousands(next.remainingKm)} km ${next.name}. Vede se v Kronice.` : "Vede se v Kronice."}
        </T>
      </View>
    </Pressable>
  );
}
