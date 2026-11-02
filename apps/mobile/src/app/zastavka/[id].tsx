import { localDateKey } from "@footatlas/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LabeledCard, SectionLabel } from "../../components/LabeledCard";
import { BackPill, PlaceHero } from "../../components/PlaceHero";
import { RiddleCard, TipResult } from "../../components/Riddle";
import { SealBadge } from "../../components/Seal";
import { Button, Card, Screen, T } from "../../components/ui";
import { creditForPhoto, creditLine } from "../../data/credits";
import { placePhoto } from "../../data/photos";
import { vltavska, type AppPlace } from "../../data/vltavska";
import { formatDayLong, formatDistance } from "../../format";
import { approachFraction, dayFromKey, formatDayNumeric, neighbours, sumLastDays, tileDistance, zOf } from "../../home";
import { sealKm, toRoman } from "../../seal";
import { useExpedition } from "../../state/ExpeditionProvider";
import { useTips } from "../../state/useTips";
import { useTheme } from "../../theme/ThemeProvider";

const KIND_LABEL = { stop: "Zastávka", discovery: "Malý objev" } as const;

export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, fonts, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { walkedM, active, events, daily, stepLength } = useExpedition();
  const { tips, setTip } = useTips();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const place = id ? vltavska.placesById.get(id) : undefined;

  if (!place) {
    return (
      <Screen>
        <T variant="title">Místo nenalezeno</T>
        <Button label="Zpět" onPress={() => router.back()} />
      </Screen>
    );
  }

  const reached = active && place.atM <= walkedM;
  const stage = vltavska.plan.stages.find((s) => place.atM > s.startM && place.atM <= s.endM) ?? vltavska.plan.stages[0]!;
  const event = events.find((e) => e.kind === "place" && e.ref === place.id);
  const chapter = place.chapterId ? vltavska.chapters.find((c) => c.id === place.chapterId) : undefined;
  const members = chapter ? chapter.placeIds.map((pid) => vltavska.placesById.get(pid)!).filter(Boolean) : [];
  const reachedCount = members.filter((m) => active && m.atM <= walkedM).length;
  const nextInChapter = members.find((m) => !(active && m.atM <= walkedM));
  const { prev, next } = neighbours(vltavska.places, place.id);
  const photo = placePhoto(place.photo);
  const credit = creditForPhoto(place.photo);
  const remaining = formatDistance(place.atM - walkedM, { stepLengthM: stepLength.meters });
  const hasStory = place.hook !== undefined;
  const eyebrowBase = `${KIND_LABEL[place.kind]} · etapa ${toRoman(stage.index + 1)}`;
  const reachedDay = event?.reachedDay ?? localDateKey(new Date());

  const open = (p: AppPlace) => router.replace({ pathname: "/zastavka/[id]", params: { id: p.id } });

  const hero = (
    <PlaceHero photo={photo} locked={!reached}>
      <View style={{ position: "absolute", left: 14, top: insets.top + 14 }}>
        <BackPill onPhoto={photo !== undefined} />
      </View>
      {!reached && (
        <View
          style={{
            position: "absolute",
            right: 14,
            top: insets.top + 14,
            minHeight: 40,
            paddingHorizontal: 14,
            borderRadius: 999,
            justifyContent: "center",
            backgroundColor: "rgba(43,33,24,0.85)",
          }}
        >
          <T variant="strong" style={{ fontSize: 14, color: "#FBF5E8" }}>
            Zatím zamčeno
          </T>
        </View>
      )}
      {reached && (
        <View style={{ position: "absolute", right: 18, bottom: 6 }}>
          <SealBadge
            animate
            delayMs={500}
            name={place.name}
            kindLabel={KIND_LABEL[place.kind]}
            kmLabel={sealKm(place.atM)}
            dateLabel={formatDayNumeric(reachedDay)}
          />
        </View>
      )}
    </PlaceHero>
  );

  const title = (
    <View style={{ gap: 2 }}>
      <SectionLabel size={15}>
        {reached ? `${eyebrowBase}${place.atM === 0 ? " · start výpravy" : ""}` : `${KIND_LABEL[place.kind]} · km ${(place.atM / 1000).toFixed(1).replace(".", ",")}`}
      </SectionLabel>
      <T style={{ fontFamily: fonts.display, fontSize: 42, lineHeight: 46, color: colors.fg }}>
        {place.name}
      </T>
    </View>
  );

  const body = !hasStory ? (
    <>
      <T variant="body" style={{ color: colors.fgSoft }}>{place.text}</T>
      <Card style={{ gap: 6 }}>
        <T variant="strong">{reached ? "Odemčeno" : "Zatím zamčeno"}</T>
        <T variant="muted">
          {reached ? "Toto místo jste už minuli." : active ? unlockText(remaining) : "Odemkne se po ušlé vzdálenosti od startu."}
        </T>
      </Card>
    </>
  ) : reached ? (
    <>
      <T style={{ fontFamily: fonts.displayItalic, fontSize: 24, lineHeight: 31, color: colors.fg }}>{`„${place.hook}“`}</T>
      {place.context && <T style={{ fontSize: 15, lineHeight: 23, color: colors.fgSoft }}>{place.context}</T>}
      {place.riddle && <TipResult riddle={place.riddle} tip={tips[place.id]} />}
      {place.visitTip && (
        <LabeledCard label="Až tam jednou půjdete">
          <T style={{ fontSize: 14, lineHeight: 21, color: colors.fgSoft }}>{place.visitTip}</T>
        </LabeledCard>
      )}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/kronika")} style={{ flex: 1 }}>
          <LabeledCard label="Ve vašem deníku" gap={6} style={{ flex: 1, borderRadius: radius.card - 2, padding: 12 }}>
            <T style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 23, color: colors.fg }}>{formatDayLong(dayFromKey(reachedDay))}</T>
            <T variant="small" style={{ fontSize: 13, color: colors.mutedStrong }}>
              {dayNote(sumLastDays(daily, reachedDay, 1))}
            </T>
          </LabeledCard>
        </Pressable>
        {chapter && members.length > 0 && (
          <LabeledCard label={chapter.title} gap={6} style={{ flex: 1, borderRadius: radius.card - 2, padding: 12 }}>
            <View style={{ flexDirection: "row", gap: 4 }}>
              {members.map((m) => (
                <View key={m.id} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: active && m.atM <= walkedM ? colors.accent : colors.line }} />
              ))}
            </View>
            <T variant="small" style={{ fontSize: 13, color: colors.mutedStrong }}>
              {nextInChapter
                ? `${zOf(reachedCount, members.length)} · další ${nextInChapter.name} za ${formatDistance(nextInChapter.atM - walkedM)}`
                : zOf(reachedCount, members.length)}
            </T>
          </LabeledCard>
        )}
      </View>
    </>
  ) : (
    <>
      {active && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <T variant="body" style={{ flex: 1, color: colors.mutedStrong }} numberOfLines={1}>
              {prev ? `Předtím: ${prev.name}` : "Od startu"}
            </T>
            <T style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.accent }}>
              {remaining === "Jste tady" ? remaining : `ještě ${remaining}`}
            </T>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: "hidden" }}>
            <View style={{ width: `${approachFraction(walkedM, prev?.atM, place.atM) * 100}%`, height: 6, backgroundColor: colors.accent }} />
          </View>
        </View>
      )}
      {place.teaser && <T style={{ fontFamily: fonts.displayItalic, fontSize: 20, lineHeight: 28, color: colors.fg }}>{place.teaser}</T>}
      {place.riddle && <RiddleCard riddle={place.riddle} tip={tips[place.id]} onTip={(t) => setTip(place.id, t)} />}
      {!active && (
        <Card>
          <T variant="muted">Odemkne se po ušlé vzdálenosti od startu.</T>
        </Card>
      )}
      <View style={{ gap: 8 }}>
        <SectionLabel>Cestou sem</SectionLabel>
        {[prev, next].map((p) =>
          p ? (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              onPress={() => open(p)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 32 }}
            >
              <NeighbourRing reached={active && p.atM <= walkedM} />
              <T variant="body" style={{ flex: 1, fontSize: 16 }} numberOfLines={1}>
                {p.name}
              </T>
              {active && <T variant="small" style={{ fontSize: 14 }}>{neighbourDistance(p.atM - walkedM)}</T>}
            </Pressable>
          ) : null,
        )}
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {hero}
        <View style={{ paddingHorizontal: 20, gap: 14, marginTop: -18 }}>
          {title}
          {body}
          {reached && credit && (
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: creditsOpen }}
                onPress={() => setCreditsOpen((v) => !v)}
                style={{ minHeight: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.line }}
              >
                <T variant="muted" style={{ color: colors.mutedStrong }}>Zdroje a licence</T>
                <T style={{ fontSize: 18, color: colors.mutedStrong }}>{creditsOpen ? "–" : "+"}</T>
              </Pressable>
              {creditsOpen && (
                <T variant="small" style={{ fontSize: 13, lineHeight: 19, color: colors.mutedStrong }}>
                  {creditLine(credit)} Mapa: © přispěvatelé OpenStreetMap.
                </T>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      {next && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 20),
          }}
        >
          <Svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
            <Defs>
              <LinearGradient id="bar-fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.bg} stopOpacity={0} />
                <Stop offset="0.3" stopColor={colors.bg} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#bar-fade)" />
          </Svg>
          {/* „Poslat jako pohlednici“ přijde v balíku D; do té doby jen pokračování na další místo. */}
          <Button label={next.kind === "stop" ? "Další zastávka" : "Další místo"} onPress={() => open(next)} />
        </View>
      )}
    </View>
  );

  function neighbourDistance(deltaM: number): string {
    const d = formatDistance(Math.abs(deltaM));
    if (d === "Jste tady") return d;
    return deltaM <= 0 ? `před ${d}` : `za ${d}`;
  }
}

/** Podpis dlaždice deníku: kolik se ten den ušlo; bez dat jen věta o dni. */
function dayNote(distanceM: number): string {
  if (distanceM < 10) return "Tehdy jste sem došli.";
  const t = tileDistance(distanceM);
  return `${t.value} ${t.unit} ušlých ten den.`;
}

function unlockText(remaining: string): string {
  return remaining === "Jste tady" ? "Jste na místě, odemkne se každým krokem." : `Odemkne se za ${remaining}.`;
}

function NeighbourRing({ reached }: { reached: boolean }) {
  const { colors } = useTheme();
  return reached ? (
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent + "22", alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
    </View>
  ) : (
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.4, borderStyle: "dashed", borderColor: colors.muted }} />
  );
}
