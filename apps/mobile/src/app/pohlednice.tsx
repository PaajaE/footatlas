import { cumulativeM, localDateKey } from "@footatlas/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LabeledCard, SectionLabel } from "../components/LabeledCard";
import { RouteSketch } from "../components/RouteSketch";
import { Seal } from "../components/Seal";
import { useReduceMotion } from "../components/useReduceMotion";
import { Button, T } from "../components/ui";
import { placePhoto } from "../data/photos";
import { vltavska } from "../data/vltavska";
import { formatKm, pluralPlaces } from "../format";
import { formatDayNumeric, stageLabel, tileDistance } from "../home";
import {
  backText,
  formatDayRange,
  nextStageCard,
  pickPhotoKey,
  pluralDays,
  pluralDiscoveries,
  pluralStops,
  postcardShareText,
  postcardTitle,
  stageEndpoints,
  stageSummary,
} from "../pohlednice";
import { sealKm, toRoman } from "../seal";
import { useExpedition } from "../state/ExpeditionProvider";
import { loadPostcards, savePostcards } from "../state/storage";
import { useTheme } from "../theme/ThemeProvider";

const FLIP_MS = 400;

/**
 * Pohlednice z etapy (docs/prototyp-snimky/04-pohlednice.jpg): tři čísla z dat výpravy, otočná pohlednice
 * (líc: fotka nebo náčrt úseku s rukopisným nadpisem a pečetí etapy; rub: razítka, data a věty z objevů etapy),
 * karta další etapy a „Uložit do Kroniky“. Otevírá se po dokončení etapy a z detailu místa („Poslat jako pohlednici“).
 * Ze Sbírek (`from=sbirky`) u etapy, kterou má chodec dávno za sebou, je to jen prohlížení: pohlednice, „Poslat“
 * a „Zpět“, bez „Etapa dokončena“, karty další etapy a bez „Uložit do Kroniky“, je-li už uložená (rozhodnutí 0029).
 * Tlačítka jsou v pevném pruhu dole nad systémovou lištou (safe area).
 * „Sdílet obrázek“ chybí: bez nativního modulu na snímek obrazovky ho nejde udělat (rozhodnutí 0022).
 */
export default function Postcard() {
  const { stage: stageParam, place: placeParam, chapter: chapterParam, from } = useLocalSearchParams<{ stage?: string; place?: string; chapter?: string; from?: string }>();
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const ex = useExpedition();
  const reduce = useReduceMotion();
  const stages = vltavska.plan.stages;

  // Pohlednice z uzavřené kapitoly (rozhodnutí 0026): líc s názvem kapitoly, rub z jejích míst, etapa podle posledního místa.
  const chapter = chapterParam ? vltavska.chapters.find((c) => c.id === chapterParam) : undefined;
  const chapterPlaces = chapter ? chapter.placeIds.map((id) => vltavska.placesById.get(id)!).filter(Boolean) : [];
  const place = placeParam ? vltavska.placesById.get(placeParam) : chapterPlaces.at(-1);
  const placeStage = place ? stages.find((s) => place.atM > s.startM && place.atM <= s.endM) : undefined;
  const stage = placeStage ?? stages[Math.min(stages.length - 1, Math.max(0, Number(stageParam) || 0))]!;
  const roman = toRoman(stage.index + 1);

  const summary = useMemo(() => stageSummary(stage, vltavska.places, ex.daySlices, ex.walkedM), [stage, ex.daySlices, ex.walkedM]);
  const { start, end } = stageEndpoints(stage, vltavska.places);
  const photoKey = chapter ? pickPhotoKey(chapterPlaces) : (place?.photo ?? pickPhotoKey(summary.places));
  const photo = placePhoto(photoKey);
  const title = chapter ? chapter.title : place ? place.name : postcardTitle(stage.index);
  const km = tileDistance(summary.walkedM);
  const next = stages[stage.index + 1];
  const nextCard = next ? nextStageCard(next, vltavska.places, { km: formatKm, places: pluralPlaces }) : undefined;
  const chapterReached = chapterPlaces.filter((p) => p.atM <= ex.walkedM);
  const text = backText(chapter ? chapterReached : summary.places);
  const today = formatDayNumeric(localDateKey(new Date()));
  const label = stageLabel(stage.index, stages.length, end?.name);

  // Náčrt úseku, když etapa nemá fotku: stejná trasa, jen oříznutá na etapu.
  const sketch = useMemo(() => {
    const pts = vltavska.route.filter((_, i) => vltavska.cumulative[i]! >= stage.startM && vltavska.cumulative[i]! <= stage.endM);
    return { route: pts, cumulative: cumulativeM(pts) };
  }, [stage]);

  const [flipped, setFlipped] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(flip, { toValue: flipped ? 1 : 0, duration: reduce ? 250 : FLIP_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [flipped, reduce, flip]);

  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void loadPostcards().then((l) => setSaved(l.includes(stage.index)));
  }, [stage.index]);
  const save = async () => {
    const l = await loadPostcards();
    if (!l.includes(stage.index)) await savePostcards([...l, stage.index]);
    setSaved(true);
  };

  const cardH = 230;
  const face = { position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0, borderRadius: 6, overflow: "hidden" as const, backfaceVisibility: "hidden" as const };
  const frontStyle = reduce
    ? { opacity: flip.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }
    : { transform: [{ perspective: 1200 }, { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] };
  const backStyle = reduce
    ? { opacity: flip.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }
    : { transform: [{ perspective: 1200 }, { rotateY: flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] }) }] };
  const lastTwo = (chapter ? chapterReached : summary.places).slice(-2);

  // Prohlížení ze Sbírek: etapa je dokončená a chodec už je v další (nebo má celou výpravu za sebou).
  const archive = !chapter && from === "sbirky" && summary.completed && (ex.state.completed || ex.state.stage.index > stage.index);
  const heading = chapter ? "Kapitola uzavřena" : archive ? "Pohlednice z etapy" : summary.completed ? "Etapa dokončena" : "Pohlednice z etapy";
  const showSave = !chapter && !(archive && saved);
  const send = () => {
    const message = postcardShareText({
      title,
      subtitle: chapter ? `Kapitola · ${vltavska.name}` : `Etapa ${roman}`,
      lines: text.slice(0, 3),
      expedition: vltavska.name,
    });
    void Share.share({ message }).catch(() => undefined);
  };
  const [footerH, setFooterH] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: footerH + 16, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 2 }}>
          <SectionLabel size={15}>{heading}</SectionLabel>
          <T style={{ fontFamily: fonts.display, fontSize: 38, lineHeight: 42, color: colors.fg }}>{chapter ? chapter.title : `Etapa ${roman}${stage.index === 0 ? " · Praha" : end ? ` · ${end.name}` : ""}`}</T>
          {!chapter && start && end && (
            <T variant="muted" style={{ fontSize: 15, color: colors.mutedStrong }}>
              {`${start.name} → ${end.name}`}
            </T>
          )}
        </View>

        {!chapter && !archive && (
          <View style={{ flexDirection: "row", gap: 14 }}>
            <Stat value={`${km.value} ${km.unit}`} note="ušlo se" />
            {summary.days !== undefined && summary.firstDay && summary.lastDay && (
              <Stat value={pluralDays(summary.days)} note={formatDayRange(summary.firstDay, summary.lastDay)} />
            )}
            <Stat value={pluralPlaces(summary.places.length)} note={`${pluralStops(summary.stops)}, ${pluralDiscoveries(summary.discoveries)}`} />
          </View>
        )}

        <View style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pohlednice ${title}. Klepnutím ji otočíte na ${flipped ? "líc" : "rub"}.`}
            onPress={() => setFlipped((f) => !f)}
            style={{ height: cardH + 16 }}
          >
            <View
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                backgroundColor: colors.surface,
                shadowColor: "#2B2118",
                shadowOpacity: 0.45,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
                elevation: 4,
              }}
            >
              <View style={{ flex: 1 }}>
                <Animated.View pointerEvents="none" style={[face, frontStyle]}>
                  {photo ? (
                    <Image source={photo} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, backgroundColor: colors.surfaceAlt }}>
                      <RouteSketch route={sketch.route} cumulative={sketch.cumulative} places={vltavska.places.filter((p) => p.atM > stage.startM && p.atM <= stage.endM)} walkedM={summary.walkedM} height={cardH - 16} />
                    </View>
                  )}
                  <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 30, paddingBottom: 10, backgroundColor: "rgba(43,33,24,0.38)" }}>
                    <T style={{ fontFamily: fonts.displayItalic, fontSize: 34, lineHeight: 40, color: "#FBF5E8" }}>{title}</T>
                  </View>
                  <View style={{ position: "absolute", right: 10, top: 8 }}>
                    <Seal kind="stage" size={84} roman={roman} ringText={`ETAPA ${roman} · ${vltavska.name} ·`} />
                  </View>
                </Animated.View>
                <Animated.View pointerEvents="none" style={[face, { backgroundColor: colors.surface, padding: 12, flexDirection: "row", gap: 12 }, backStyle]}>
                  <View style={{ flex: 1, gap: 6, borderRightWidth: 1, borderRightColor: colors.line, paddingRight: 12 }}>
                    {text.length > 0 ? (
                      text.slice(0, 3).map((line, i) => (
                        <T key={i} style={{ fontFamily: fonts.displayItalic, fontSize: 15, lineHeight: 20, color: colors.fg }} numberOfLines={5}>
                          {line}
                        </T>
                      ))
                    ) : (
                      <T style={{ fontFamily: fonts.displayItalic, fontSize: 15, lineHeight: 20, color: colors.fgSoft }}>Zatím tu nic není. Pohlednice se popíše cestou.</T>
                    )}
                  </View>
                  <View style={{ width: 104, alignItems: "center", gap: 4 }}>
                    <T variant="small" style={{ fontSize: 12, color: colors.mutedStrong }}>
                      {summary.firstDay && summary.lastDay ? formatDayRange(summary.firstDay, summary.lastDay) : today}
                    </T>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>
                      {lastTwo.map((p) =>
                        p.kind === "stop" ? (
                          <Seal key={p.id} kind="wax" size={52} name={p.name} kmLabel={sealKm(p.atM)} dateLabel={today} photo={placePhoto(p.photo)} />
                        ) : (
                          <Seal key={p.id} kind="stamp" size={52} name={p.name} expeditionName={vltavska.name} kmLabel={sealKm(p.atM)} dateLabel={today} />
                        ),
                      )}
                    </View>
                    <T variant="small" style={{ fontSize: 11, textAlign: "center", color: colors.mutedStrong }}>
                      {vltavska.name}
                    </T>
                  </View>
                </Animated.View>
              </View>
            </View>
          </Pressable>
          <T variant="muted" style={{ textAlign: "center", color: colors.mutedStrong }}>
            Klepnutím pohlednici otočíte
          </T>
        </View>

        {!chapter && !archive && nextCard && (
          <LabeledCard label={nextCard.heading} gap={8} style={{ borderRadius: 22, padding: 16 }}>
            <T variant="small" style={{ fontSize: 14, color: colors.mutedStrong }}>
              {nextCard.meta}
            </T>
            {nextCard.teaser && <T style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.fg }}>{nextCard.teaser}</T>}
            {nextCard.firstRiddle && <T variant="muted" style={{ color: colors.mutedStrong }}>{`První hádanka: ${nextCard.firstRiddle}`}</T>}
          </LabeledCard>
        )}

      </ScrollView>

      <View
        onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          gap: 8,
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.line,
        }}
      >
        {showSave && <Button kind={saved ? "secondary" : "primary"} label={saved ? "Uloženo v Kronice" : "Uložit do Kroniky"} onPress={save} disabled={saved} />}
        <Button kind={showSave ? "secondary" : "primary"} label="Poslat" onPress={send} />
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <T style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: colors.accent }}>
            {!chapter && !archive && next ? `Pokračovat na etapu ${toRoman(next.index + 1)}` : "Zpět"}
          </T>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ value, note }: { value: string; note: string }) {
  const { colors, fonts } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${value}, ${note}`}>
      <T style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.fg }}>{value}</T>
      <T variant="small" style={{ fontSize: 13, color: colors.mutedStrong }}>
        {note}
      </T>
    </View>
  );
}
