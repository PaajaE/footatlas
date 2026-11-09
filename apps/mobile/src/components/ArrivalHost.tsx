import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Animated, Easing, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { placePhoto } from "../data/photos";
import { vltavska, type AppPlace } from "../data/vltavska";
import { formatDistanceNoWrap } from "../format";
import { formatDayNumeric } from "../home";
import { isFerry } from "../privoz";
import { detectArrival, watchStep, type Arrival, type WatchState } from "../prichod";
import { tipOutcome, type Tip } from "../riddle";
import { sealKm, toRoman } from "../seal";
import { useExpedition } from "../state/ExpeditionProvider";
import { loadTips } from "../state/storage";
import { useTheme } from "../theme/ThemeProvider";
import { LabeledCard, SectionLabel } from "./LabeledCard";
import { Seal } from "./Seal";
import { useReduceMotion } from "./useReduceMotion";
import { Button, T } from "./ui";
import { localDateKey } from "@footatlas/core";

/**
 * Příchod naživo (M4, docs/prototyp-snimky/03-hadanka.jpg): když živá obnova při otevřené aplikaci odemkne místo,
 * přes aktuální obrazovku dopadne pečeť s hláškou „Právě jste došli“, odpovědí na hádanku a vyhodnocením tipu.
 * Jen v popředí, bez zvuku, jde zavřít klepnutím. Po návratu z pozadí se příchod neukazuje (to je věc návratu).
 */
export function ArrivalHost() {
  const ex = useExpedition();
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [tips, setTips] = useState<Record<string, Tip>>({});
  const watch = useRef<WatchState>({ baseline: null, rebaseFrom: undefined });
  const lastReadMs = ex.lastReadAt ? ex.lastReadAt.getTime() : null;
  const lastReadRef = useRef<number | null>(lastReadMs);
  lastReadRef.current = lastReadMs;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") watch.current = { baseline: watch.current.baseline, rebaseFrom: lastReadRef.current };
    });
    return () => sub.remove();
  }, []);

  // Při změně postupu: porovnat s předchozí hodnotou. Dokud se data nenačetla (status „ok“), nic.
  useEffect(() => {
    if (!ex.ready || ex.status.kind !== "ok") return;
    const { next, between } = watchStep(watch.current, { walkedM: ex.walkedM, lastReadAt: lastReadMs });
    watch.current = next;
    if (!between || AppState.currentState !== "active") return;
    const found = detectArrival(between[0], between[1], vltavska.places, vltavska.plan.stages);
    if (!found) return;
    void loadTips().then(setTips, () => undefined);
    setArrival((prev) =>
      prev
        ? {
            placeIds: [...prev.placeIds, ...found.placeIds],
            stageIndexes: [...prev.stageIndexes, ...found.stageIndexes],
            focusId: found.focusId ?? prev.focusId,
          }
        : found,
    );
  }, [ex.ready, ex.status.kind, ex.walkedM, lastReadMs]);

  if (!arrival) return null;
  return (
    <ArrivalSheet
      arrival={arrival}
      tips={tips}
      onClose={() => {
        setArrival(null);
        ex.markSeen();
      }}
    />
  );
}

function ArrivalSheet({ arrival, tips, onClose }: { arrival: Arrival; tips: Record<string, Tip>; onClose: () => void }) {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const ex = useExpedition();
  const places = arrival.placeIds.map((id) => vltavska.placesById.get(id)).filter((p): p is AppPlace => !!p);
  const focus = (arrival.focusId ? vltavska.placesById.get(arrival.focusId) : undefined) ?? places.at(-1);
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: reduce ? 400 : 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter, reduce]);

  const go = (fn: () => void) => () => {
    onClose();
    fn();
  };
  const today = formatDayNumeric(localDateKey(new Date()));
  const stage = arrival.stageIndexes.at(-1);
  const ferry = places.find(isFerry);
  const outcome = focus?.riddle ? tipOutcome(focus.riddle.answer, tips[focus.id]) : "none";
  const next = vltavska.places.find((p) => p.kind === "stop" && p.atM > ex.walkedM);

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }} accessibilityViewIsModal>
      <Animated.View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: enter, backgroundColor: "rgba(43,33,24,0.55)" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zavřít" onPress={onClose} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        style={{
          opacity: enter,
          transform: reduce ? [] : [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
          maxHeight: "86%",
          backgroundColor: colors.bg,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          borderTopWidth: 1,
          borderColor: colors.line,
        }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, 20), gap: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          {focus && (
            <View style={{ alignItems: "center", paddingVertical: 4 }}>
              {focus.kind === "stop" ? (
                <Seal kind="wax" size={120} animate delayMs={250} name={focus.name} kmLabel={sealKm(focus.atM)} dateLabel={today} photo={placePhoto(focus.photo)} />
              ) : (
                <Seal kind="stamp" size={120} animate delayMs={250} name={focus.name} expeditionName={vltavska.name} kmLabel={sealKm(focus.atM)} dateLabel={today} />
              )}
            </View>
          )}
          <View style={{ gap: 2 }} accessibilityLiveRegion="polite">
            <SectionLabel size={15}>{focus ? "Právě jste došli" : "Etapa dokončena"}</SectionLabel>
            <T style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.fg }}>{focus ? focus.name : `Etapa ${toRoman((stage ?? 0) + 1)}`}</T>
            {places.length > 1 && (
              <T variant="muted" style={{ color: colors.mutedStrong }}>
                {`a ještě ${places.length - 1} ${places.length - 1 === 1 ? "místo" : places.length - 1 <= 4 ? "místa" : "míst"} cestou`}
              </T>
            )}
          </View>
          {focus?.hook && <T style={{ fontFamily: fonts.displayItalic, fontSize: 21, lineHeight: 28, color: colors.fg }}>{`„${focus.hook}“`}</T>}
          {focus?.riddle && (
            <LabeledCard label={outcome === "correct" ? "Tipovali jste správně" : outcome === "wrong" ? "Tohle překvapí" : "Odpověď na hádanku"} gap={6}>
              <T style={{ fontFamily: fonts.display, fontSize: 19, lineHeight: 24, color: colors.fgSoft }}>{focus.riddle.question}</T>
              <T variant="strong">{focus.riddle.options[focus.riddle.answer]}</T>
            </LabeledCard>
          )}
          {focus && !focus.hook && <T variant="body" style={{ color: colors.fgSoft }}>{focus.text}</T>}
          {next && (
            <T variant="muted" style={{ color: colors.mutedStrong }}>
              {`Další zastávka: ${next.name}, ${formatDistanceNoWrap(next.atM - ex.walkedM, { stepLengthM: ex.stepLength.meters })}.`}
            </T>
          )}
          <View style={{ gap: 10 }}>
            {focus && <Button label="Zobrazit místo" onPress={go(() => router.push({ pathname: "/zastavka/[id]", params: { id: focus.id } }))} />}
            {ferry && <Button kind="secondary" label="Převezli jste se na druhý břeh" onPress={go(() => router.push({ pathname: "/privoz", params: { id: ferry.id } }))} />}
            {stage !== undefined && (
              <Button kind="secondary" label={`Pohlednice z etapy ${toRoman(stage + 1)}`} onPress={go(() => router.push({ pathname: "/pohlednice", params: { stage: String(stage) } }))} />
            )}
            <Button kind="secondary" label="Zavřít" onPress={onClose} />
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
