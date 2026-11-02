import { View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { miniMap, rangeLabel, type DiaryDay } from "../../kronika/diary";
import { formatStepCount } from "../../kronika/earth";
import { useTheme } from "../../theme/ThemeProvider";
import { T } from "../ui";
import { Seal } from "./parts";

export type DiaryCard = DiaryDay & { title: string; insight: string };

const kmPill = (m: number) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);

/** Deník jako časová osa: čárkovaná nit, pečeť u dne a karta dne s minimapou úseku. */
export function DiaryView({ cards, scaleM }: { cards: DiaryCard[]; scaleM: number }) {
  const { colors, fonts } = useTheme();
  if (cards.length === 0) {
    return (
      <View style={{ padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, gap: 4 }}>
        <T variant="strong">Deník je zatím prázdný</T>
        <T variant="muted">Zapíše se sem každý den, kdy na výpravě ujdete aspoň kousek. První řádek přibude po prvních krocích.</T>
      </View>
    );
  }
  return (
    <View style={{ paddingLeft: 34, gap: 14 }}>
      <View pointerEvents="none" style={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 2 }}>
        <Svg width={2} height="100%">
          <Line x1={1} y1={0} x2={1} y2="100%" stroke={colors.accent} strokeWidth={2} strokeDasharray="6 4" />
        </Svg>
      </View>
      {cards.map((d) => {
        const mm = miniMap(d, scaleM);
        const found = d.places.length > 0;
        return (
          <View
            key={d.day}
            style={{ padding: 14, paddingTop: 12, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 8 }}
          >
            <View pointerEvents="none" style={{ position: "absolute", left: -35, top: found ? 10 : 17 }}>
              {found ? (
                <Seal size={26} />
              ) : (
                <View style={{ width: 12, height: 12, margin: 1, borderRadius: 6, borderWidth: 2, borderColor: colors.muted, backgroundColor: colors.bg, left: 6 }} />
              )}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <T variant="title" style={{ fontSize: 20, lineHeight: 24, flexShrink: 1 }}>
                {d.title}
              </T>
              <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.fg }}>
                <T variant="small" style={{ fontFamily: fonts.bodySemi, color: colors.bg }}>
                  {kmPill(d.distanceM)}
                </T>
              </View>
            </View>
            <T variant="body" style={{ fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 22 }}>
              {d.insight}
            </T>
            <View style={{ height: 18, justifyContent: "center" }} accessibilityLabel={rangeLabel(d)}>
              <View style={{ height: 2, backgroundColor: colors.line }} />
              <View
                style={{
                  position: "absolute",
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.accent,
                  left: `${mm.from * 100}%`,
                  width: `${mm.len * 100}%`,
                }}
              />
              {mm.marks.map((m, i) => (
                <View
                  key={i}
                  style={{
                    position: "absolute",
                    width: 12,
                    height: 12,
                    marginLeft: -6,
                    borderRadius: 6,
                    borderWidth: 1.6,
                    borderColor: colors.accent,
                    backgroundColor: colors.surface,
                    left: `${m * 100}%`,
                  }}
                />
              ))}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <T variant="small">{rangeLabel(d)}</T>
              {d.steps !== null && <T variant="small">asi {formatStepCount(d.steps)} kroků</T>}
            </View>
            {found && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {d.places.map((p) => (
                  <View key={p.id} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line }}>
                    <T variant="muted" style={{ fontSize: 13, lineHeight: 18, color: colors.fg }}>
                      {p.name}
                    </T>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
