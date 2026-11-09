import { localDateKey } from "@footatlas/core";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlightMap } from "../components/FlightMap";
import { HaltCard } from "../components/HaltCard";
import { SectionLabel } from "../components/LabeledCard";
import { Seal } from "../components/Seal";
import { useClock } from "../components/useClock";
import { useReduceMotion } from "../components/useReduceMotion";
import { Button, T } from "../components/ui";
import { placePhoto } from "../data/photos";
import { vltavska } from "../data/vltavska";
import { formatDayLong, formatDistance } from "../format";
import { formatDayNumeric, pluralNewPlaces, tileDistance } from "../home";
import {
  activeHalt,
  counterM,
  dayHeading,
  easeInOut,
  flightAt,
  flightDurationMs,
  holdZoomAt,
  planStampsLanded,
  returnHeading,
  returnPlan,
  returnRouteLabel,
  returnSource,
  sinceDay,
  type Halt,
} from "../navrat";
import { isFerry } from "../privoz";
import { placesWithin } from "../riddle";
import { sealKm, toRoman } from "../seal";
import { useExpedition } from "../state/ExpeditionProvider";
import { useTheme } from "../theme/ThemeProvider";

const MAP_FALLBACK_H = 420;

/**
 * Návrat „Inkoust“ (M1, docs/prototyp-snimky/01-navrat-inkoust.jpg): kamera letí po úseku, který přibyl od posledně,
 * počítadlo roste a razítka dopadají za letem. U míst se let zastaví a zespodu vyjede karta místa (rozhodnutí 0025,
 * plán v `returnPlan`): klepnutí otevře detail (návrat pozastaví), „Dál“ zastavení přeskočí, „Přeskočit vše“ skočí na
 * souhrn. Úsek přichází v parametrech `from` a `to` (metry), protože „od posledně“ se po odchodu z Domů maže.
 * Při „Omezit pohyb“ kamera stojí nad celým úsekem a karty se jen prolnou.
 */
export default function Return() {
  const { from, to, zdroj } = useLocalSearchParams<{ from?: string; to?: string; zdroj?: string }>();
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const ex = useExpedition();
  const reduce = useReduceMotion();
  const [mapH, setMapH] = useState(MAP_FALLBACK_H);

  const total = vltavska.totalM;
  const fromM = clamp(Number(from) || 0, 0, total);
  const toM = clamp(Number(to) || ex.walkedM, fromM, total);
  const deltaM = toM - fromM;
  const places = useMemo(() => placesWithin(vltavska.places, fromM, toM), [fromM, toM]);
  const stages = vltavska.plan.stages.filter((s) => s.endM > fromM && s.endM <= toM);
  const duration = flightDurationMs(deltaM);
  const plan = useMemo(() => returnPlan(places, vltavska.plan.stages, fromM, toM, duration), [places, fromM, toM, duration]);
  const clock = useClock(plan.totalMs);
  const t = clock.elapsedMs;
  // Čas letu stojí během zastavení; poloha, počítadlo i kamera z něj počítají ze stejných hodin.
  const flightMs = flightAt(plan, t);
  const flightDone = t >= plan.motionEndMs;
  const walkedNow = fromM + easeInOut(flightMs / duration) * deltaM;
  const landed = new Set(planStampsLanded(plan, t));
  const quickIds = new Set(plan.stamps.map((s) => s.id));
  const halt = clock.finished ? undefined : activeHalt(plan, t);
  // Přiblížení u místa po dvacetinách, aby kamera nedostávala nový pokyn v každém kroku hodin, když se nic nemění.
  const holdZoom = Math.round(holdZoomAt(plan, t) * 20) / 20;

  const today = localDateKey(new Date());
  const since = sinceDay(ex.daySlices, fromM);
  const heading = returnSource(zdroj) === "kronika" ? dayHeading(since, today) : returnHeading(since, today);
  const routeLabel = returnRouteLabel(vltavska.places, fromM, toM);
  const counter = tileDistance(counterM(deltaM, duration, flightMs));
  const frame = `List I · ${vltavska.name}`;

  // Návrat z Domů se spotřebuje, až dojede do konce; přehrání dne z Kroniky ne (rozhodnutí 0024).
  useEffect(() => {
    if (clock.finished && returnSource(zdroj) === "domu") ex.markSeen(toM);
  }, [clock.finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const nowM = Math.max(toM, ex.walkedM);
  const next = vltavska.places.find((p) => p.kind === "stop" && p.atM > nowM);
  const storyIds = places.filter((p) => p.hook !== undefined).map((p) => p.id);
  const ferry = places.find(isFerry);

  // Spodní panel vyjede po skončení přehrávání.
  const sheet = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!clock.finished) {
      sheet.setValue(0);
      return;
    }
    Animated.timing(sheet, { toValue: 1, duration: reduce ? 400 : 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [clock.finished, reduce, sheet]);

  // Karta zastavení: drží si poslední zastavení, aby mohla po skončení zajet.
  const [shown, setShown] = useState<Halt | undefined>(undefined);
  const card = useRef(new Animated.Value(0)).current;
  const haltKey = halt ? `${halt.index}-${clock.runKey}` : undefined;
  useEffect(() => {
    if (halt) {
      setShown(halt.halt);
      card.setValue(0);
      Animated.timing(card, { toValue: 1, duration: reduce ? 300 : 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return;
    }
    Animated.timing(card, { toValue: 0, duration: reduce ? 300 : 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setShown(undefined);
    });
  }, [haltKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownPlace = shown?.placeId ? vltavska.places.find((p) => p.id === shown.placeId) : undefined;

  // Klepnutí na kartu: pozastavit a otevřít detail; po návratu na obrazovku pokračovat od stejného místa.
  const pausedForDetail = useRef(false);
  const openHalt = () => {
    if (!shown) return;
    clock.pause();
    pausedForDetail.current = true;
    if (shownPlace) router.push({ pathname: "/zastavka/[id]", params: { id: shownPlace.id } });
    else if (shown.stageIndex !== undefined) router.push({ pathname: "/pohlednice", params: { stage: String(shown.stageIndex) } });
  };
  useFocusEffect(
    useCallback(() => {
      if (pausedForDetail.current) {
        pausedForDetail.current = false;
        clock.resume();
      }
    }, [clock.resume]), // eslint-disable-line react-hooks/exhaustive-deps
  );
  const nextHalt = () => {
    if (halt) clock.seek(halt.halt.arriveMs + halt.halt.holdMs);
  };

  const km = (m: number) => sealKm(m);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 6, gap: 2, backgroundColor: colors.bg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T variant="small" style={{ fontSize: 13 }}>
            {formatDayLong(new Date())}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={clock.finished ? "Zavřít návrat" : "Přeskočit vše"}
            onPress={clock.finished ? () => router.back() : clock.skip}
            style={{ minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "flex-end" }}
          >
            <T style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent }}>{clock.finished ? "Zavřít" : "Přeskočit vše"}</T>
          </Pressable>
        </View>
        <T style={{ fontFamily: fonts.displaySC, fontSize: 15, letterSpacing: 0.6, color: colors.ochre, marginTop: -8 }}>{heading}</T>
        <View
          style={{ flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}
          accessible
          accessibilityLabel={`${tileDistance(deltaM).value} ${tileDistance(deltaM).unit}${routeLabel ? `, ${routeLabel}` : ""}`}
        >
          <T style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 50, color: colors.fg }}>{`${counter.value} ${counter.unit}`}</T>
          {routeLabel && (
            <T variant="small" style={{ fontSize: 13, flexShrink: 1 }}>
              {routeLabel}
            </T>
          )}
        </View>
      </View>

      <View style={{ flex: 1 }} onLayout={(e) => setMapH(Math.round(e.nativeEvent.layout.height) || MAP_FALLBACK_H)}>
        <FlightMap
          route={vltavska.route}
          cumulative={vltavska.cumulative}
          places={vltavska.places}
          fromM={fromM}
          toM={toM}
          walkedM={walkedNow}
          durationMs={duration}
          runKey={clock.runKey}
          finished={flightDone}
          holdZoom={holdZoom}
          reduceMotion={reduce}
          height={mapH}
          frame={frame}
        />
        {/* Rychlá razítka (místa bez zastavení) dopadají za letem; po skončení je převezme spodní panel. */}
        {!clock.finished && !shown && places.some((p) => quickIds.has(p.id) && landed.has(p.id)) && (
          <View pointerEvents="none" style={{ position: "absolute", left: 14, right: 14, bottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {places
              .filter((p) => quickIds.has(p.id) && landed.has(p.id))
              .map((p) =>
                p.kind === "stop" ? (
                  <Seal key={p.id} kind="wax" size={56} animate name={p.name} kmLabel={km(p.atM)} dateLabel={formatDayNumeric(today)} photo={placePhoto(p.photo)} />
                ) : (
                  <Seal key={p.id} kind="stamp" size={56} animate name={p.name} expeditionName={vltavska.name} kmLabel={km(p.atM)} dateLabel={formatDayNumeric(today)} />
                ),
              )}
          </View>
        )}
        {/* Zastavení: razítko dopadne na místo na mapě (kamera na něm stojí uprostřed; web má jen statický náčrt). */}
        {halt && !reduce && shownPlace && Platform.OS !== "web" && (
          <View
            key={`map-${haltKey}`}
            pointerEvents="none"
            style={{ position: "absolute", left: 0, right: 0, top: mapH / 2 - 30, alignItems: "center" }}
          >
            {shownPlace.kind === "stop" ? (
              <Seal kind="wax" size={60} animate name={shownPlace.name} kmLabel={km(shownPlace.atM)} dateLabel={formatDayNumeric(today)} photo={placePhoto(shownPlace.photo)} />
            ) : (
              <Seal kind="stamp" size={60} animate name={shownPlace.name} expeditionName={vltavska.name} kmLabel={km(shownPlace.atM)} dateLabel={formatDayNumeric(today)} />
            )}
          </View>
        )}
        {/* Karta místa vyjede zespodu (při „Omezit pohyb“ se jen prolne). */}
        {shown && !clock.finished && (
          <Animated.View
            key={`card-${shown.arriveMs}-${clock.runKey}`}
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: Math.max(insets.bottom, 12),
              opacity: card,
              transform: reduce ? [] : [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [220, 0] }) }],
            }}
          >
            <HaltCard
              place={shownPlace}
              photo={placePhoto(shownPlace?.photo)}
              stageIndex={shown.stageIndex}
              expeditionName={vltavska.name}
              dateLabel={formatDayNumeric(today)}
              remaining={halt ? halt.remaining : 0}
              onOpen={openHalt}
              onNext={nextHalt}
            />
          </Animated.View>
        )}
      </View>

      {clock.finished && (
        <Animated.View
          style={{
            opacity: sheet,
            transform: reduce ? [] : [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            maxHeight: "62%",
            backgroundColor: colors.surface,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderTopWidth: 1,
            borderColor: colors.line,
            shadowColor: "#2B2118",
            shadowOpacity: 0.3,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: -1 },
            elevation: 6,
          }}
        >
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 20), gap: 14 }} showsVerticalScrollIndicator={false}>
            <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
            <View style={{ gap: 2 }}>
              <SectionLabel size={15}>Cestou jste potkali</SectionLabel>
              <T style={{ fontFamily: fonts.display, fontSize: 36, lineHeight: 40, color: colors.fg }}>{newPlacesTitle(places.length)}</T>
            </View>
            {places.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 10 }}>
                {places.slice(0, 10).map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: p.id } })}
                    style={{ width: "50%", flexDirection: "row", alignItems: "center", gap: 10, minHeight: 32, paddingRight: 8 }}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent + "22", alignItems: "center", justifyContent: "center" }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
                    </View>
                    <T style={{ flex: 1, fontSize: 16, color: colors.fg }} numberOfLines={1}>
                      {p.name}
                    </T>
                  </Pressable>
                ))}
                {places.length > 10 && (
                  <T variant="small" style={{ fontSize: 14, width: "100%" }}>
                    a {places.length - 10} dalších
                  </T>
                )}
              </View>
            )}
            {stages.length > 0 && (
              <View style={{ gap: 8 }}>
                {stages.map((s) => (
                  <Button
                    key={s.index}
                    kind="secondary"
                    label={`Etapa ${toRoman(s.index + 1)} dokončena · pohlednice`}
                    onPress={() => router.push({ pathname: "/pohlednice", params: { stage: String(s.index) } })}
                  />
                ))}
              </View>
            )}
            {ferry && (
              <Button kind="secondary" label={`${ferry.name}: převezli jste se`} onPress={() => router.push({ pathname: "/privoz", params: { id: ferry.id } })} />
            )}
            {next && (
              <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <T style={{ flex: 1, fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.fg }}>{next.name}</T>
                  <T style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent }}>
                    {formatDistance(Math.max(0, next.atM - nowM), { stepLengthM: ex.stepLength.meters })}
                  </T>
                </View>
                {(next.riddle?.question ?? next.teaser) && (
                  <T style={{ fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 23, color: colors.fgSoft }}>{next.riddle?.question ?? next.teaser}</T>
                )}
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  kind="secondary"
                  label="Přehrát znovu"
                  onPress={() => {
                    sheet.setValue(0);
                    clock.restart();
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                {storyIds.length > 0 ? (
                  <Button label="Projít objevy" onPress={() => router.push({ pathname: "/objevy", params: { ids: storyIds.join(",") } })} />
                ) : (
                  <Button label="Hotovo" onPress={() => router.back()} />
                )}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** „6 nových míst“, „1 nové místo“; bez nového místa věta o úseku. */
function newPlacesTitle(n: number): string {
  return n === 0 ? "Žádné nové místo" : pluralNewPlaces(n);
}
