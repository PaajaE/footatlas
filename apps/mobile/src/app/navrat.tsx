import { localDateKey } from "@footatlas/core";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlightMap } from "../components/FlightMap";
import { FlyLabel } from "../components/FlyLabel";
import { HaltCard } from "../components/HaltCard";
import { SectionLabel } from "../components/LabeledCard";
import { Seal } from "../components/Seal";
import { StageWax } from "../components/StageWax";
import { useClock } from "../components/useClock";
import { useReduceMotion } from "../components/useReduceMotion";
import { Button, T } from "../components/ui";
import { placePhoto } from "../data/photos";
import { vltavska, type AppPlace } from "../data/vltavska";
import { formatDistance, shortPlaceName } from "../format";
import { formatDayNumeric, pluralNewPlaces, tileDistance } from "../home";
import {
  activeFlyby,
  activeHalt,
  dayHeading,
  flightStageIndex,
  planStampsLanded,
  returnDateLine,
  returnHeading,
  returnPlan,
  returnRouteLabel,
  returnSource,
  sinceDay,
  tipAt,
  type Halt,
} from "../navrat";
import { isFerry } from "../privoz";
import { placesWithin } from "../riddle";
import { sealKm, toRoman } from "../seal";
import { useExpedition } from "../state/ExpeditionProvider";
import { useTheme } from "../theme/ThemeProvider";

const MAP_FALLBACK_H = 420;
/** Kolik rychlých razítek je za letu vidět najednou; starší se sečtou do „+N“. */
const QUICK_SHOWN = 4;

/**
 * Přehrání cesty, nový let (rozhodnutí 0033, docs/navrh-v2.md § 8): úvodní záběr na celý úsek, ponoření, pero kreslí
 * čáru a papír se kolem ní barví, místa za letu dostanou štítek nahoře (let nezastaví), u zastávek a konců etap
 * se plynule zastaví a zespodu vyjede karta. Závěrečný záběr ukáže celý vybarvený úsek nad souhrnem (nejvýš 40 %
 * výšky). Klepnutí na štítek nebo kartu otevře místo (a přehrání pozastaví), „Dál“ zastavení přeskočí, „Přeskočit“
 * skočí na závěrečný záběr. Úsek přichází v parametrech `from` a `to` (metry). Při „Omezit pohyb“ kamera neletí
 * (úvodní i závěrečný záběr bez pohybu) a razítka i karty se jen prolnou.
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
  const { height: windowH } = useWindowDimensions();
  const plan = useMemo(() => returnPlan(places, vltavska.plan.stages, fromM, toM), [places, fromM, toM]);
  const clock = useClock(plan.totalMs);
  const t = clock.elapsedMs;
  const tipM = tipAt(plan, t);
  const landed = new Set(planStampsLanded(plan, t));
  const quickIds = new Set(plan.stamps.map((s) => s.id));
  const quickLanded = places.filter((p) => quickIds.has(p.id) && landed.has(p.id));
  const halt = clock.finished ? undefined : activeHalt(plan, t);
  const flyby = clock.finished ? undefined : activeFlyby(plan, t);
  const flyPlace = flyby ? vltavska.places.find((p) => p.id === flyby.flyby.placeId) : undefined;
  /** Souhrn zabere nejvýš 40 % výšky; závěrečný záběr nechá úsek nad ním. */
  const sheetMaxH = Math.round(windowH * 0.4);

  const today = localDateKey(new Date());
  const since = sinceDay(ex.daySlices, fromM);
  const heading = returnSource(zdroj) === "kronika" ? dayHeading(since, today) : returnHeading(since, today);
  const dateLine = returnDateLine(returnSource(zdroj), new Date());
  const routeLabel = returnRouteLabel(vltavska.places, fromM, toM);
  const counter = tileDistance(Math.max(0, tipM - fromM));
  // Rámeček ukazuje etapu, ve které je hrot pera; po pečeti konce etapy se přepne na další.
  const frame = `Etapa ${toRoman(flightStageIndex(plan, vltavska.plan.stages, t) + 1)} · ${vltavska.name}`;
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
  const openFlyby = () => {
    if (!flyPlace) return;
    clock.pause();
    pausedForDetail.current = true;
    router.push({ pathname: "/zastavka/[id]", params: { id: flyPlace.id } });
  };
  const nextHalt = () => {
    if (halt) clock.seek(halt.halt.arriveMs + halt.halt.holdMs);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 6, gap: 2, backgroundColor: colors.bg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {/* Přehrání dne z Kroniky dnešní datum nemá: den říká nadpis pod ním. */}
          <T variant="small" style={{ fontSize: 13 }}>
            {dateLine ?? ""}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={clock.finished ? "Zavřít přehrávání" : "Přeskočit na závěrečný záběr"}
            onPress={clock.finished ? () => router.back() : t < plan.drawEndMs ? () => clock.seek(plan.drawEndMs) : clock.skip}
            style={{ minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "flex-end" }}
          >
            <T style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent }}>{clock.finished ? "Zavřít" : "Přeskočit"}</T>
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
          plan={plan}
          elapsedMs={t}
          runKey={clock.runKey}
          horizonM={next?.atM}
          reduceMotion={reduce}
          height={mapH}
          bottomInset={sheetMaxH}
          frame={frame}
        />
        {/* Místo za letu: štítek nahoře, nejvýš čtvrtina výšky; let nezastaví. */}
        {flyPlace && !shown && (
          <View key={`fly-${flyby!.index}-${clock.runKey}`} style={{ position: "absolute", left: 12, right: 12, top: 12 }}>
            <FlyLabel
              place={flyPlace}
              photo={placePhoto(flyPlace.photo)}
              expeditionName={vltavska.name}
              dateLabel={formatDayNumeric(today)}
              maxHeight={Math.round(windowH * 0.25)}
              onOpen={openFlyby}
            />
          </View>
        )}
        {/* Rychlá razítka (při mnoha místech) dopadají za letem; po skončení je převezme souhrn. Jen poslední
            QUICK_SHOWN v jedné řadě, starší jako „+N“, aby razítka nezakryla mapu. */}
        {!clock.finished && !shown && quickLanded.length > 0 && (
          <View pointerEvents="none" style={{ position: "absolute", left: 14, right: 14, bottom: 14, flexDirection: "row", alignItems: "center", gap: 6 }}>
            {quickLanded.length > QUICK_SHOWN && (
              <View style={{ minWidth: 34, height: 34, borderRadius: 17, paddingHorizontal: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
                <T style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accent }}>{`+${quickLanded.length - QUICK_SHOWN}`}</T>
              </View>
            )}
            {quickLanded.slice(-QUICK_SHOWN).map((p) => (
              <PlaceSeal key={p.id} place={p} size={48} animate today={today} />
            ))}
          </View>
        )}
        {/* Zastavení: kamera stojí na místě (předstih je při stání nulový), razítko nebo pečeť etapy dopadne na mapu.
            Web má jen statický náčrt. */}
        {halt && !reduce && Platform.OS !== "web" && (shownPlace || shown?.stageIndex !== undefined) && (
          <View key={`map-${haltKey}`} pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: mapH / 2 - 30, alignItems: "center" }}>
            {shown?.stageIndex !== undefined ? (
              <StageWax stageIndex={shown.stageIndex} place={shownPlace} photo={placePhoto(shownPlace?.photo)} dateLabel={formatDayNumeric(today)} size={60} animate />
            ) : (
              <PlaceSeal place={shownPlace!} size={60} animate today={today} />
            )}
          </View>
        )}
        {/* Karta zastávky vyjede zespodu (při „Omezit pohyb“ se jen prolne). */}
        {shown && !clock.finished && (
          <Animated.View
            key={`card-${shown.arriveMs}-${clock.runKey}`}
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: Math.max(insets.bottom, 12),
              opacity: card,
              transform: reduce ? [] : [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) }],
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

        {/* Souhrn: nejvýš 40 % výšky přes spodek mapy; nad ním je vidět celý vybarvený úsek se všemi razítky. */}
        {clock.finished && (
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              opacity: sheet,
              transform: reduce ? [] : [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
              maxHeight: sheetMaxH,
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
            {/* Obsah se posouvá, „Na obzoru“ a tlačítka jsou pevně dole: vždy vidět bez posouvání. */}
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, gap: 12 }} showsVerticalScrollIndicator={false}>
              <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
              {places.length > 0 || !next ? (
                <View style={{ gap: 0 }}>
                  <SectionLabel size={14}>Cestou jste odemkli</SectionLabel>
                  <T style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.fg }}>{newPlacesTitle(places.length)}</T>
                </View>
              ) : (
                // Bez nového místa: neříkat „nic“, ukázat, co je na obzoru.
                <View style={{ gap: 4 }}>
                  <SectionLabel size={14}>Na obzoru</SectionLabel>
                  <T style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.fg }}>{next.name}</T>
                  <T style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.accent }}>
                    {`ještě ${formatDistance(Math.max(0, next.atM - nowM), { stepLengthM: ex.stepLength.meters })}`}
                  </T>
                  {(next.riddle?.question ?? next.teaser) && (
                    <T style={{ fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 21, color: colors.fgSoft }}>{next.riddle?.question ?? next.teaser}</T>
                  )}
                </View>
              )}
              {places.length > 0 && (
                // Místa jako řada malých razítek s názvem pod nimi (ne useknutý text ve dvou sloupcích).
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 8 }} style={{ marginHorizontal: -6 }}>
                  {places.map((p) => (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.kind === "stop" ? "Zastávka" : "Objev"} ${p.name}${p === ferry ? ", scéna převozu" : ""}`}
                      // Přívoz: razítko otevře rovnou scénu převozu (dřív samostatné tlačítko „…: převezli jste se“).
                      onPress={() =>
                        p === ferry
                          ? router.push({ pathname: "/privoz", params: { id: p.id } })
                          : router.push({ pathname: "/zastavka/[id]", params: { id: p.id } })
                      }
                      style={{ width: 76, alignItems: "center", gap: 2, paddingVertical: 2 }}
                    >
                      <PlaceSeal place={p} size={52} today={today} />
                      <T style={{ fontSize: 12, lineHeight: 15, color: colors.fg, textAlign: "center" }} numberOfLines={2}>
                        {shortPlaceName(p.name, 22)}
                      </T>
                    </Pressable>
                  ))}
                </ScrollView>
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
            </ScrollView>
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16), gap: 10 }}>
              {next && places.length > 0 && (
                // Na obzoru jako jeden řádek nad tlačítky.
                <View
                  accessible
                  accessibilityLabel={`Na obzoru ${next.name}, ${formatDistance(Math.max(0, next.atM - nowM), { stepLengthM: ex.stepLength.meters })}`}
                  style={{ flexDirection: "row", alignItems: "baseline", gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 }}
                >
                  <SectionLabel size={13}>Na obzoru</SectionLabel>
                  <T numberOfLines={1} style={{ flex: 1, fontFamily: fonts.display, fontSize: 19, lineHeight: 23, color: colors.fg }}>
                    {next.name}
                  </T>
                  <T style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent }}>
                    {formatDistance(Math.max(0, next.atM - nowM), { stepLengthM: ex.stepLength.meters })}
                  </T>
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
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

/** Razítko místa: zastávka vosk (s fotkou), objev razítko. Symbol typu místa doplní `Seal` z balíku M. */
function PlaceSeal({ place, size, animate = false, today }: { place: AppPlace; size: number; animate?: boolean; today: string }) {
  const km = sealKm(place.atM);
  const date = formatDayNumeric(today);
  return place.kind === "stop" ? (
    <Seal kind="wax" size={size} animate={animate} name={place.name} kmLabel={km} dateLabel={date} photo={placePhoto(place.photo)} />
  ) : (
    <Seal kind="stamp" size={size} animate={animate} name={place.name} expeditionName={vltavska.name} kmLabel={km} dateLabel={date} />
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** „6 nových míst“, „1 nové místo“; bez nového místa (a bez místa na obzoru, tedy na konci výpravy) „Cíl výpravy“. */
function newPlacesTitle(n: number): string {
  return n === 0 ? "Cíl výpravy" : pluralNewPlaces(n);
}
