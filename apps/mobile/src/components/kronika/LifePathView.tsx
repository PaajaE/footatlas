import { View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { formatDay } from "../../format";
import { formatKmBig, groupThousands, type LifeRoute } from "../../kronika/earth";
import { useTheme } from "../../theme/ThemeProvider";
import { T } from "../ui";
import { Seal } from "./parts";

/** Životní cesta: města vzdušnou čarou z Prahy, ta dosažená s dnem, kdy součet kroniky hranici překročil. */
export function LifePathView({ route, firstDay }: { route: LifeRoute | null; firstDay: string | null }) {
  const { colors } = useTheme();
  if (!route || !firstDay) {
    return (
      <View style={{ padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, gap: 4 }}>
        <T variant="strong">Cesta se vykreslí z vaší kroniky</T>
        <T variant="muted">Až se načte historie kroků, uvidíte, kam byste z Prahy došli.</T>
      </View>
    );
  }
  const done = route.stations.filter((s) => s.state === "done");
  const next = route.stations.filter((s) => s.state === "next");
  type Row = { key: string; kind: "start" | "done" | "here" | "next"; name: string; km: string; note: string };
  const rows: Row[] = [
    { key: "start", kind: "start", name: "Praha", km: "start", note: `první zapsaný den: ${formatDay(firstDay)}` },
    ...done.map<Row>((s) => ({
      key: s.name,
      kind: "done",
      name: s.name,
      km: `${groupThousands(s.km)} km`,
      note: s.reachedDay ? formatDay(s.reachedDay) : "",
    })),
    { key: "here", kind: "here", name: "Jste tady", km: formatKmBig(route.totalKm * 1000), note: "součet vaší kroniky" },
    ...next.map<Row>((s) => ({
      key: s.name,
      kind: "next",
      name: s.name,
      km: `${groupThousands(s.km)} km`,
      note: `ještě ${groupThousands(s.remainingKm ?? 0)} km`,
    })),
  ];
  const rowH = 64;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <T variant="label" style={{ fontSize: 14 }}>
          Životní cesta · vzdušnou čarou z Prahy
        </T>
        <T variant="title" style={{ fontSize: 26, lineHeight: 30 }}>
          Kam až byste došli z Prahy
        </T>
        <T variant="muted">
          Každý ušlý kilometr vás posunul o kousek dál. Vzdálenosti jsou vzdušnou čarou, ne po silnicích; datum je den, kdy součet vaší kroniky tu hranici překročil.
        </T>
      </View>
      <View style={{ height: rows.length * rowH }}>
        <View pointerEvents="none" style={{ position: "absolute", left: 27, top: 20, bottom: 20, width: 2 }}>
          <Svg width={2} height="100%">
            <Line x1={1} y1={0} x2={1} y2="100%" stroke={colors.muted} strokeWidth={2} strokeDasharray="3 5" />
          </Svg>
        </View>
        {rows.map((r, i) => (
          <View key={r.key} style={{ position: "absolute", left: 0, right: 0, top: i * rowH, height: rowH, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 56, alignItems: "center" }}>
              {r.kind === "here" ? (
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.surface }} />
              ) : r.kind === "next" ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.muted, backgroundColor: colors.bg }} />
              ) : (
                <Seal size={26} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <T variant="title" style={{ fontSize: 21, lineHeight: 24, flexShrink: 1, color: r.kind === "next" ? colors.muted : r.kind === "here" ? colors.accent : colors.fg }}>
                  {r.name}
                </T>
                <T variant="small" style={{ color: r.kind === "next" ? colors.muted : r.kind === "here" ? colors.accent : colors.fg }}>
                  {r.km}
                </T>
              </View>
              <T variant="small" numberOfLines={1}>
                {r.note}
              </T>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
