import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StageBar, T } from "../../components/ui";
import { ExpeditionMap } from "../../components/ExpeditionMap";
import { vltavska } from "../../data/vltavska";
import { formatDistance, formatKm } from "../../format";
import { nextFerry, placesWord, roman, stageStamps, stampsWord } from "../../map/vypravaInfo";
import { useExpedition } from "../../state/ExpeditionProvider";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * Výprava podle `docs/prototyp-snimky/09-vyprava.jpg`: mapa přes celou obrazovku, nahoře plovoucí karta
 * (název, pruh etap, list a razítka), dole panel s další zastávkou a třemi údaji ze skutečných dat.
 */
export default function Expedition() {
  const { colors, fonts, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, active, walkedM, demo, stepLength } = useExpedition();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cardH, setCardH] = useState(0);
  const [sheetH, setSheetH] = useState(0);

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingHorizontal: 20, gap: 12 }}>
        <T variant="display">Výprava</T>
        <T variant="muted">Žádná výprava neběží. Spusťte ji na záložce Domů.</T>
      </View>
    );
  }

  const next = state.nextStop ? vltavska.placesById.get(state.nextStop.id) : null;
  const nextSmall = state.next && state.next.kind !== "stop" ? vltavska.placesById.get(state.next.id) : null;

  // Údaje panelu jen ze skutečných dat; co se nedá zjistit, se vynechá.
  const ferry = nextFerry(vltavska.places, walkedM);
  const upcoming = state.completed ? 0 : state.upcoming.length;
  const toStageEnd = state.completed ? 0 : Math.max(0, state.stage.endM - walkedM);
  const facts: Array<{ label: string; value: string }> = [];
  if (upcoming > 0) facts.push({ label: "Na dalších 5 km", value: `${upcoming} ${placesWord(upcoming)}` });
  if (ferry) facts.push({ label: "Přívoz", value: `za ${formatDistance(ferry.atM - walkedM)}` });
  if (toStageEnd > 0) facts.push({ label: "Konec etapy", value: `za ${formatDistance(toStageEnd)}` });

  const stamps = stageStamps(vltavska.places, state.stage, state.walkedM);
  const riddle = next?.riddle?.question ?? next?.hook;
  const topInset = insets.top + 8 + cardH + 8;
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const shadow = {
    shadowColor: "#2B2118",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 5,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
      {size.h > 0 && (
        <ExpeditionMap
          route={vltavska.route}
          cumulative={vltavska.cumulative}
          places={vltavska.places}
          walkedM={walkedM}
          height={size.h}
          insets={{ top: topInset, bottom: sheetH }}
          onPlacePress={(id) => router.push({ pathname: "/zastavka/[id]", params: { id } })}
        />
      )}

      {/* Pergamenový pás pod stavovým řádkem, aby se hodiny a ikony nepletly do popisků mapy. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.bg, opacity: 0.85 }}
      />

      <View
        onLayout={(e) => setCardH(e.nativeEvent.layout.height)}
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 12,
          right: 12,
          backgroundColor: colors.surface,
          borderRadius: radius.card + 4,
          borderWidth: 1,
          borderColor: colors.line,
          paddingHorizontal: 18,
          paddingTop: 12,
          paddingBottom: 12,
          gap: 8,
          ...shadow,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <T variant="title" style={{ flex: 1 }} numberOfLines={1}>
            {vltavska.name}
          </T>
          <T variant="strong" accent style={{ flexShrink: 0 }}>
            {formatKm(state.walkedM)} / {formatKm(vltavska.totalM)}
          </T>
        </View>
        <StageBar stages={vltavska.plan.stages} walkedM={state.walkedM} />
        <T variant="small">
          List {roman(state.stage.index + 1)} · {stamps.reached} {stampsWord(stamps.reached)} z {stamps.total}
          {demo.enabled ? " · ukázkový postup" : ""}
        </T>
      </View>

      <Pressable
        disabled={state.completed || !next}
        accessibilityRole="button"
        accessibilityLabel={next ? `Zobrazit zastávku ${next.name}` : "Výprava je dokončena"}
        onPress={() => next && router.push({ pathname: "/zastavka/[id]", params: { id: next.id } })}
        onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          borderTopWidth: 1,
          borderColor: colors.line,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 14,
          gap: 8,
          ...shadow,
        }}
      >
        <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 6 }} />
        {state.completed || !next ? (
          <T variant="title">Výprava je dokončena</T>
        ) : (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <T variant="label">Další zastávka</T>
              <T variant="title" style={{ color: colors.accent, fontSize: 24 }}>
                {formatDistance(state.toNextStopM ?? 0, { stepLengthM: stepLength.meters })}
              </T>
            </View>
            <T variant="display" style={{ fontSize: 30, lineHeight: 36 }}>
              {next.name}
            </T>
            {riddle ? (
              <T variant="body" style={{ fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 23 }}>
                {riddle}
              </T>
            ) : null}
            {nextSmall && (
              <T variant="muted">
                Malý objev za {formatDistance(state.toNextM ?? 0)}: <T variant="strong">{nextSmall.name}</T>
              </T>
            )}
            {facts.length > 0 && (
              <View style={{ flexDirection: "row", gap: 12, borderTopWidth: 1, borderColor: colors.line, paddingTop: 10, marginTop: 2 }}>
                {facts.map((f) => (
                  <View key={f.label} style={{ flex: 1, gap: 2 }}>
                    <T variant="small">{f.label}</T>
                    <T variant="strong">{f.value}</T>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </Pressable>
    </View>
  );
}
