import { localDateKey, summarizeChange } from "@footatlas/core";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, RefreshControl, ScrollView, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExpeditionMap } from "../../components/ExpeditionMap";
import { LabeledCard } from "../../components/LabeledCard";
import { LastUpdated } from "../../components/LastUpdated";
import { LifePathView } from "../../components/kronika/LifePathView";
import { MezitimStrip } from "../../components/MezitimStrip";
import { Chapters, NextGoalCard, PlacesByStage, RecentlyDiscovered, StageProgress } from "../../components/PanelSections";
import { PredVami } from "../../components/PredVami";
import { ScreenHeader, SettingsButton } from "../../components/ScreenHeader";
import { Button, Screen, T } from "../../components/ui";
import { useChronicle } from "../../db/ChronicleProvider";
import { vltavska } from "../../data/vltavska";
import { formatDayLong, formatKm } from "../../format";
import { fromHealthSource } from "../../health/names";
import { lifeRoute } from "../../kronika/earth";
import { mezitimHeading, mezitimStrip, shouldAutoOpen } from "../../mezitim";
import { shouldShowReturn, sinceDay } from "../../navrat";
import { panelHeights, snapAfterDrag, snapAfterTap, type PanelSnap } from "../../panel";
import { useExpedition } from "../../state/ExpeditionProvider";
import { useLastOpened } from "../../state/useLastOpened";
import { useTheme } from "../../theme/ThemeProvider";

/** Pro které otevření aplikace se už Mezitím pustilo samo (jednou za otevření, i když se obrazovka připojí znovu). */
let autoOpenedFor: number | null = null;

/**
 * Výprava (docs/navrh-v2.md § 3 a § 4, rozhodnutí 0034): první záložka. S rozjetou výpravou mapa přes celou obrazovku,
 * nahoře pruh Mezitím a vysouvací panel (sbalený, poloviční, celý). Bez výpravy výběr výpravy a pod ním Životní cesta.
 */
export default function Expedition() {
  const ex = useExpedition();
  if (!ex.ready) return <Screen>{null}</Screen>;
  return ex.active ? <ActiveExpedition /> : <ChooseExpedition />;
}

function StatusNote() {
  const { status } = useExpedition();
  if (status.kind === "unavailable") {
    return (
      <T variant="small">
        {status.reason === "denied"
          ? `Čtení ${fromHealthSource()} nebylo povoleno. Postup se bez něj nepočítá.`
          : `Zdravotní data nejsou na tomto zařízení dostupná (${status.reason}).`}
      </T>
    );
  }
  if (status.kind === "error") return <T variant="small">Čtení dat selhalo: {status.message}</T>;
  return null;
}

/** Bez aktivní výpravy: výběr výpravy (dřívější „Vyrazit“) a pod ním Životní cesta z Kroniky. */
function ChooseExpedition() {
  const router = useRouter();
  const ex = useExpedition();
  const { days, stats } = useChronicle();
  const route = useMemo(() => lifeRoute(days), [days]);
  return (
    <Screen>
      <ScreenHeader date={formatDayLong(new Date())} title="Výprava" onSettings={() => router.push("/nastaveni")} />
      <LabeledCard label="Vyberte výpravu" gap={12}>
        <T variant="title">{vltavska.name}</T>
        <T variant="body">{vltavska.summary}</T>
        <T variant="muted">
          {vltavska.routeTypeLabel}: {formatKm(vltavska.totalM)} ve {vltavska.plan.stages.length} etapách, {vltavska.places.length} míst na
          cestě. Počítá se jen pohyb od chvíle, kdy vyrazíte. Vaše historie zůstává v kronice.
        </T>
        <Button label="Vyrazit" onPress={ex.start} />
        <T variant="small">Při startu vás aplikace požádá o čtení kroků a vzdálenosti {fromHealthSource()}.</T>
        <Button kind="secondary" label="Další výpravy v Atlasu" onPress={() => router.navigate("/atlas")} />
      </LabeledCard>
      <StatusNote />
      <View style={{ gap: 10 }}>
        <T variant="label">Životní cesta</T>
        <LifePathView route={route} firstDay={stats.firstDay} />
      </View>
    </Screen>
  );
}

const SHADOW = {
  shadowColor: "#2B2118",
  shadowOpacity: 0.25,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 1 },
  elevation: 5,
};

function ActiveExpedition() {
  const { colors, fonts, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ex = useExpedition();
  const { state, walkedM, demo, paused } = ex;
  const opening = useLastOpened();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [topH, setTopH] = useState(0);
  const [headerH, setHeaderH] = useState(96);
  const [snap, setSnap] = useState<PanelSnap>("half");

  // Mezitím: stejná podmínka a spotřebování jako dřívější karta „Od posledně“ (rozhodnutí 0022 a 0024).
  const previousM = demo.enabled ? demo.seenM : (ex.session?.lastSeenWalkedM ?? 0);
  const summary = summarizeChange(state, previousM, (id) => vltavska.placesById.get(id)?.name ?? id);
  const show = shouldShowReturn({
    deltaM: summary.deltaM,
    newPlaceCount: state.newlyReached.length,
    newStageCount: state.newlyCompletedStages.length,
  });
  const today = localDateKey(new Date());
  const since = sinceDay(ex.daySlices, previousM);
  const fromM = previousM;
  const toM = state.walkedM;

  useEffect(() => {
    if (!opening || autoOpenedFor === opening.openedAt) return;
    if (!shouldAutoOpen({ show, newStageCount: state.newlyCompletedStages.length, previousOpenMs: opening.previousMs, nowMs: opening.openedAt })) return;
    autoOpenedFor = opening.openedAt;
    router.push({ pathname: "/navrat", params: { from: String(Math.round(fromM)), to: String(Math.round(toM)) } });
  }, [opening, show, state.newlyCompletedStages.length, fromM, toM, router]);

  // Panel: výšky poloh podle obrazovky; sbalený ukazuje jen hlavičku etapy.
  const heights = panelHeights(size.h, headerH, insets.top + 8 + topH + 8);
  const height = useRef(new Animated.Value(0)).current;
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const heightsRef = useRef(heights);
  heightsRef.current = heights;
  const dragStart = useRef(0);

  useEffect(() => {
    if (size.h <= 0) return;
    Animated.timing(height, { toValue: heights[snap], duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [snap, size.h, heights.collapsed, heights.half, heights.full, height]); // eslint-disable-line react-hooks/exhaustive-deps

  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          height.stopAnimation((v) => (dragStart.current = v));
        },
        onPanResponderMove: (_, g) => {
          const hs = heightsRef.current;
          height.setValue(Math.max(hs.collapsed, Math.min(hs.full, dragStart.current - g.dy)));
        },
        onPanResponderRelease: (_, g) => {
          const hs = heightsRef.current;
          const next = Math.abs(g.dy) < 6 && Math.abs(g.dx) < 6 ? snapAfterTap(snapRef.current) : snapAfterDrag(hs, snapRef.current, dragStart.current - g.dy, g.vy);
          setSnap(next);
          Animated.timing(height, { toValue: hs[next], duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
        },
      }),
    [height],
  );

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const topInset = insets.top + 8 + topH + 8;
  const note = demo.enabled ? "ukázkový postup" : paused ? "výprava je pozastavena" : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
      {size.h > 0 && (
        <ExpeditionMap
          route={vltavska.route}
          cumulative={vltavska.cumulative}
          places={vltavska.places}
          walkedM={walkedM}
          height={size.h}
          insets={{ top: topInset, bottom: snap === "full" ? heights.half : heights[snap] }}
          onPlacePress={(id) => router.push({ pathname: "/zastavka/[id]", params: { id } })}
        />
      )}

      {/* Pergamenový pás pod stavovým řádkem, aby se hodiny a ikony nepletly do popisků mapy. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.bg, opacity: 0.85 }}
      />

      {/* Nahoře: pruh Mezitím (je-li co přehrát), jinak název výpravy; vpravo nastavení. */}
      <View
        onLayout={(e) => setTopH(e.nativeEvent.layout.height)}
        style={{ position: "absolute", top: insets.top + 8, left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <View style={{ flex: 1, ...SHADOW, borderRadius: 18 }}>
          {show ? (
            <MezitimStrip
              heading={mezitimHeading(since, today)}
              text={mezitimStrip(summary.deltaM, since, today, state.newlyReached.length)}
              fromM={fromM}
              toM={toM}
              onClose={() => ex.markSeen()}
            />
          ) : (
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.surface,
              }}
            >
              <T numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.fg }}>
                {vltavska.name}
              </T>
              {note && <T variant="small">{note}</T>}
            </View>
          )}
        </View>
        <View style={{ ...SHADOW, borderRadius: 22 }}>
          <SettingsButton onPress={() => router.push("/nastaveni")} />
        </View>
      </View>

      {size.h > 0 && (
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height,
            backgroundColor: colors.surface,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderTopWidth: 1,
            borderColor: colors.line,
            overflow: "hidden",
            ...SHADOW,
          }}
        >
          {/* Hlavička etapy je zároveň úchyt: táhnutím se panel posouvá, klepnutím přepíná poloviční a celý. */}
          <View
            {...drag.panHandlers}
            onLayout={(e) => setHeaderH(Math.ceil(e.nativeEvent.layout.height))}
            accessible
            accessibilityRole="button"
            accessibilityLabel={snap === "full" ? "Zmenšit panel" : "Zvětšit panel"}
            onAccessibilityTap={() => setSnap(snapAfterTap(snap))}
            style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, gap: 8 }}
          >
            <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 4 }} />
            <StageProgress />
          </View>
          <ScrollView
            scrollEnabled={snap !== "collapsed"}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              demo.enabled ? undefined : <RefreshControl refreshing={ex.refreshing} onRefresh={ex.refresh} tintColor={colors.accent} colors={[colors.accent]} />
            }
          >
            {state.completed ? <T variant="label">Výprava dokončena</T> : null}
            {/* Pořadí podle docs/navrh-v2.md § 4: další cíl, před vámi, kapitoly, místa. */}
            <NextGoalCard />
            <PredVami />
            <Chapters />
            <RecentlyDiscovered />
            <PlacesByStage />
            {paused && (
              <LabeledCard label="Pozastaveno" gap={10}>
                <T variant="muted">Postup máte uložený a nic se neztratí.</T>
                <Button label="Pokračovat" onPress={ex.resume} />
              </LabeledCard>
            )}
            <LastUpdated />
            <StatusNote />
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}
