import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import type { DailyRecord } from "@footatlas/core";
import { formatKmBig } from "../../kronika/earth";
import { bestMonthSentence, records, weekdayAverages, yearGrid, yearsWithRecords, yearTotalM } from "../../kronika/year";
import { useTheme } from "../../theme/ThemeProvider";
import { Card, T } from "../ui";
import { ConfidenceBar } from "./parts";

const GAP = 1;

/** Rok den po dni: mřížka, nejsilnější měsíc, dny v týdnu a rekordy; vše z uložených denních záznamů. */
export function YearView({
  days,
  by,
  stepLengthM,
}: {
  days: DailyRecord[];
  by: { verified: number; estimated: number; manual: number };
  stepLengthM: number;
}) {
  const { colors, fonts } = useTheme();
  const years = useMemo(() => yearsWithRecords(days), [days]);
  const [year, setYear] = useState<number | null>(null);
  const current = year !== null && years.includes(year) ? year : (years[years.length - 1] ?? null);
  const [width, setWidth] = useState(0);
  useEffect(() => setYear(null), [days]);
  if (current === null) {
    return (
      <Card style={{ gap: 4 }}>
        <T variant="strong">Rok se vybarví z vaší kroniky</T>
        <T variant="muted">Až se načte historie kroků, uvidíte každý den roku jako jedno políčko.</T>
      </Card>
    );
  }
  const grid = yearGrid(days, current);
  const cell = width > 0 ? Math.max(3, (width - GAP * (grid.length - 1)) / grid.length) : 5;
  const idx = years.indexOf(current);
  const levelColor = [colors.line, `${colors.accent}40`, `${colors.accent}70`, `${colors.accent}B0`, colors.accent] as const;
  const monthLabels = [0, 3, 6, 9].map((m) => {
    const first = `${current}-${String(m + 1).padStart(2, "0")}-01`;
    return { m, col: grid.findIndex((w) => w.some((c) => c.day === first)), text: ["leden", "duben", "červenec", "říjen"][m / 3]! };
  });
  const best = bestMonthSentence(days, current);
  const weekdays = weekdayAverages(days, current, new Date());
  const maxAvg = weekdays ? Math.max(...weekdays.stats.map((s) => s.avgM)) : 0;
  const recs = records(days, stepLengthM);

  const arrow = (dir: -1 | 1, label: string) => {
    const target = years[idx + dir];
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={target === undefined} onPress={() => target !== undefined && setYear(target)} hitSlop={10}>
        <T variant="strong" style={{ opacity: target === undefined ? 0.25 : 1, fontSize: 18 }}>
          {dir < 0 ? "‹" : "›"}
        </T>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 10, padding: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <T variant="label" style={{ fontSize: 14 }}>
            Rok {current} den po dni
          </T>
          <T variant="muted" style={{ fontSize: 13 }}>
            {formatKmBig(yearTotalM(days, current))}
          </T>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 }}>
          {arrow(-1, "Předchozí rok")}
          <T variant="strong">{current}</T>
          {arrow(1, "Další rok")}
        </View>
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: "row", gap: GAP }} accessibilityLabel={`Mřížka roku ${current}, jeden čtverec je jeden den`}>
          {grid.map((week, w) => (
            <View key={w} style={{ gap: GAP }}>
              {week.map((c, r) => (
                <View key={r} style={{ width: cell, height: cell, borderRadius: 1, backgroundColor: c.day === null ? "transparent" : levelColor[c.level] }} />
              ))}
            </View>
          ))}
        </View>
        <View style={{ height: 14 }}>
          {width > 0 &&
            monthLabels.map((l) => (
              <T key={l.m} variant="small" style={{ position: "absolute", left: Math.max(0, l.col * (cell + GAP)), fontSize: 10, lineHeight: 14 }}>
                {l.text}
              </T>
            ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <T variant="small" style={{ fontSize: 11 }}>
            méně
          </T>
          {levelColor.map((c, i) => (
            <View key={i} style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: c }} />
          ))}
          <T variant="small" style={{ fontSize: 11 }}>
            víc
          </T>
        </View>
        {best && (
          <T variant="body" style={{ fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 22 }}>
            {best}
          </T>
        )}
      </Card>

      {weekdays && (
        <Card style={{ gap: 10, padding: 14 }}>
          <T variant="label" style={{ fontSize: 14 }}>
            Kdy chodíte nejvíc
          </T>
          <T variant="small" style={{ fontSize: 12, marginTop: -6 }}>
            Průměr v km na den se záznamem
          </T>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 100 }}>
            {weekdays.stats.map((s) => (
              <View key={s.label} style={{ flex: 1, alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                <T variant="small" style={{ fontSize: 11 }}>
                  {(s.avgM / 1000).toFixed(1).replace(".", ",")}
                </T>
                <View
                  style={{
                    width: "100%",
                    height: Math.max(2, (s.avgM / maxAvg) * 64),
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    borderBottomLeftRadius: 2,
                    borderBottomRightRadius: 2,
                    backgroundColor: s.avgM === maxAvg ? colors.accent : colors.ochre,
                    opacity: s.avgM === maxAvg ? 1 : 0.55,
                  }}
                />
                <T variant="small" style={{ fontSize: 11 }}>
                  {s.label}
                </T>
              </View>
            ))}
          </View>
          <T variant="muted">{weekdays.sentence} Čísla jsou průměr v kilometrech za jeden takový den.</T>
        </Card>
      )}

      {recs.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {recs.map((r) => (
            <View key={r.label} style={{ width: "48%", flexGrow: 1, padding: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 2 }}>
              <T variant="small">{r.label}</T>
              <T variant="title" style={{ fontSize: 26, lineHeight: 30 }}>
                {r.value}
              </T>
              <T variant="small" style={{ color: colors.muted }}>
                {r.note}
              </T>
            </View>
          ))}
        </View>
      )}

      <Card style={{ gap: 8, padding: 14 }}>
        <T variant="label" style={{ fontSize: 14 }}>
          Odkud čísla jsou
        </T>
        <ConfidenceBar by={by} compact />
      </Card>
    </View>
  );
}
