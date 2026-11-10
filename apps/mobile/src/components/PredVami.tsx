import { useMemo, useRef, useState } from "react";
import { PanResponder, View, type LayoutChangeEvent } from "react-native";
import { localDateKey } from "@footatlas/core";
import { useChronicle } from "../db/ChronicleProvider";
import { vltavska } from "../data/vltavska";
import { shortPlaceName } from "../format";
import {
  mergeDaily,
  paceSentence,
  placesAhead,
  rewardSentence,
  scrubDistance,
  scrubSentence,
  stripLengthM,
  stripRows,
  typicalDailyM,
} from "../predvami";
import { useExpedition } from "../state/ExpeditionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { SectionLabel } from "./LabeledCard";
import { Seal } from "./Seal";
import { Card, T } from "./ui";

const STOP_SIZE = 34;
const DISCOVERY_SIZE = 26;
const ROW_H = 54;

/**
 * „Před vámi“ (docs/navrh-v2.md § 4.1, nahrazuje „Kam dnes dojdu“): pás trasy asi 8 km před chodcem s místy jako
 * zamčenými razítky (`Seal`; symboly dodá balík M), nad ním odhad podle vlastního tempa a pojmenovaná odměna.
 * Táhnutím prstem po pásu se ukazatel posouvá a text se mění („Do sem: 4,0 km, asi 50 minut, 3 místa“). Nic se neukládá.
 */
export function PredVami() {
  const { colors, fonts } = useTheme();
  const { state, walkedM, daily, stepLength } = useExpedition();
  const { days } = useChronicle();
  const [width, setWidth] = useState(0);
  const [scrubX, setScrubX] = useState<number | null>(null);
  const widthRef = useRef(0);
  widthRef.current = width;
  const startX = useRef(0);
  const clampX = (x: number) => Math.max(0, Math.min(widthRef.current, x));

  const today = localDateKey(new Date());
  const dailyM = useMemo(
    () => typicalDailyM(mergeDaily(daily, days.map((d) => ({ day: d.date, distanceM: d.distanceM }))), today),
    [daily, days, today],
  );
  const lengthM = stripLengthM(walkedM, vltavska.totalM);
  const ahead = placesAhead(vltavska.places, walkedM);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // Vodorovný tah patří pásu, svislý nechá posouvat panel.
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          startX.current = e.nativeEvent.locationX;
          setScrubX(clampX(startX.current));
        },
        onPanResponderMove: (_, g) => setScrubX(clampX(startX.current + g.dx)),
      }),
    [],
  );

  if (state.completed || lengthM <= 0) return null;

  const pace = paceSentence({ walkedM, ahead, dailyM, stepLengthM: stepLength.meters });
  const reward = rewardSentence(state.stage, walkedM, state.completed);
  const xOf = (atM: number) => (width * (atM - walkedM)) / lengthM;
  const xs = ahead.map((p) => xOf(p.atM));
  const rows = stripRows(xs, STOP_SIZE + 4);
  const scrubM = scrubX === null ? null : scrubDistance(scrubX, width, lengthM);
  const scrubCount = scrubM === null ? 0 : ahead.filter((p) => p.atM - walkedM <= scrubM).length;
  const stageEndX = state.stage.endM > walkedM && state.stage.endM <= walkedM + lengthM ? xOf(state.stage.endM) : null;
  const ticks = [0, 2000, 4000, 6000, 8000].filter((m) => m <= lengthM);

  return (
    <Card style={{ gap: 10, padding: 14 }}>
      <SectionLabel>Před vámi</SectionLabel>
      {pace && <T style={{ fontFamily: fonts.display, fontSize: 18, lineHeight: 23, color: colors.fg }}>{pace}</T>}
      {reward && (
        <T variant="strong" accent style={{ fontSize: 14, lineHeight: 19 }}>
          {reward}
        </T>
      )}

      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Pás trasy na ${Math.round(lengthM / 1000)} km před vámi, ${ahead.length} míst`}
        accessibilityValue={scrubM !== null ? { text: scrubSentence(scrubM, scrubCount) } : undefined}
        // Na webu by táhnutí myší vybíralo text a razítka; výběr se vypne.
        style={[{ height: ROW_H * 2 + 18, marginTop: 4 }, { userSelect: "none" } as object]}
        {...responder.panHandlers}
      >
        {width > 0 && (
          <>
            {/* Čára trasy uprostřed, chodec vlevo. */}
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: ROW_H - 1, height: 2, backgroundColor: colors.line }} />
            <View pointerEvents="none" style={{ position: "absolute", left: -5, top: ROW_H - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface }} />
            {stageEndX !== null && (
              <View pointerEvents="none" style={{ position: "absolute", left: stageEndX - 1, top: ROW_H - 14, width: 2, height: 28, backgroundColor: colors.ochre }} />
            )}
            {ticks.map((m) => (
              <T
                key={m}
                variant="small"
                style={{ position: "absolute", top: ROW_H * 2 + 2, left: Math.min(width - 34, Math.max(0, xOf(walkedM + m) - (m === 0 ? 0 : 14))), fontSize: 11, lineHeight: 14 }}
              >
                {m === 0 ? "vy" : `+${m / 1000} km`}
              </T>
            ))}
            {ahead.map((p, i) => {
              const size = p.kind === "stop" ? STOP_SIZE : DISCOVERY_SIZE;
              const x = xs[i]!;
              const up = rows[i] === 0;
              return (
                <View
                  key={p.id}
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: Math.max(0, Math.min(width - size, x - size / 2)),
                    top: up ? ROW_H - size - 6 : ROW_H + 6,
                    alignItems: "center",
                    width: size,
                  }}
                >
                  <Seal kind="locked" size={size} />
                </View>
              );
            })}
            {ahead
              .map((p, i) => ({ p, i }))
              .filter(({ p }) => p.kind === "stop")
              .slice(0, 3)
              .map(({ p, i }) => {
                const up = rows[i] === 0;
                const x = xs[i]!;
                return (
                  <T
                    key={`n-${p.id}`}
                    variant="small"
                    numberOfLines={1}
                    style={{
                      position: "absolute",
                      width: 110,
                      textAlign: "center",
                      left: Math.max(0, Math.min(width - 110, x - 55)),
                      top: up ? 0 : ROW_H * 2 - 14,
                      fontSize: 11,
                      lineHeight: 14,
                      color: colors.mutedStrong,
                    }}
                  >
                    {shortPlaceName(p.name, 18)}
                  </T>
                );
              })}
            {scrubX !== null && (
              <View pointerEvents="none" style={{ position: "absolute", left: Math.max(0, Math.min(width, scrubX)) - 1, top: 6, width: 2, height: ROW_H * 2 - 6, backgroundColor: colors.accent }} />
            )}
          </>
        )}
      </View>

      <T variant="small" style={{ fontSize: 13, lineHeight: 18, color: scrubM !== null ? colors.fg : colors.mutedStrong }}>
        {scrubM !== null ? scrubSentence(scrubM, scrubCount) : "Táhněte prstem po pásu, ukážu, kam až dojdete."}
      </T>
    </Card>
  );
}
