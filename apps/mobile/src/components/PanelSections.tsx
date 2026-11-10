import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { vltavska } from "../data/vltavska";
import { placePhoto } from "../data/photos";
import { formatDistance, formatKm, formatKmMark } from "../format";
import { formatDayNumeric, formatWhen, stageLabel, zOf } from "../home";
import { chapterGoalTitle, nextGoal, stageGoalTitle } from "../cil";
import { CHAPTERS_EXPLAINER, chapterStatus, missingSentence, nearestChapter } from "../kapitoly";
import { toRoman } from "../seal";
import { useExpedition } from "../state/ExpeditionProvider";
import { localDateKey } from "@footatlas/core";
import { useTips } from "../state/useTips";
import { useChapterExplainer } from "../state/useChapterExplainer";
import { useTheme } from "../theme/ThemeProvider";
import { ChapterSeal } from "./ChapterSeal";
import { SectionLabel } from "./LabeledCard";
import { Medallion } from "./Medallion";
import { Seal } from "./Seal";
import { Card, StageBar, T } from "./ui";

/** Řádek „Etapa 1 ze 4 · Praha“ + „12,5 z 62 km“ a pruh etap. */
export function StageProgress() {
  const { colors, fonts } = useTheme();
  const { state } = useExpedition();
  const stages = vltavska.plan.stages;
  const endPlace = vltavska.plan.places.filter((p) => p.atM <= state.stage.endM && p.kind === "stop").at(-1);
  const endName = endPlace ? vltavska.placesById.get(endPlace.id)?.name : undefined;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <T variant="body" style={{ flex: 1, fontSize: 14, lineHeight: 20, color: colors.mutedStrong }} numberOfLines={1}>
          {stageLabel(state.stage.index, stages.length, endName)}
        </T>
        <T style={{ fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.accent }}>
          {formatKm(state.walkedM).replace(" km", "")} z {Math.round(vltavska.totalM / 1000)} km
        </T>
      </View>
      <StageBar stages={stages} walkedM={state.walkedM} />
    </View>
  );
}

/** Zastávka, kterou etapa končí (její poslední zastávka na trase). */
function stageEndPlaceId(stage: { endM: number }): string | undefined {
  return vltavska.plan.places.filter((p) => p.atM <= stage.endM && p.kind === "stop").at(-1)?.id;
}

/**
 * „Další cíl“ (docs/navrh-v2.md § 4): jedna karta podle `nextGoal`. Konec etapy do 3 km, uzavření kapitoly do 3 km,
 * jinak další zastávka (`NextStopCard`). Klepnutí otevře místo nebo kapitolu.
 */
export function NextGoalCard() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const { state, walkedM } = useExpedition();
  const goal = nextGoal({
    walkedM,
    completed: state.completed,
    stage: state.stage,
    stageEndPlaceId: stageEndPlaceId(state.stage),
    chapters: vltavska.chapters,
    placesById: vltavska.placesById,
    nextStop: state.nextStop ? { id: state.nextStop.id, atM: vltavska.placesById.get(state.nextStop.id)?.atM ?? walkedM } : null,
  });
  if (!goal) return null;
  if (goal.kind === "stop") return <NextStopCard />;

  const chapter = goal.kind === "chapter" ? vltavska.chapters.find((c) => c.id === goal.chapterId) : undefined;
  const status = chapter ? chapterStatus(chapter, vltavska.placesById, walkedM, true) : undefined;
  const title = goal.kind === "stage" ? stageGoalTitle(goal.stageIndex, goal.remainingM) : chapter ? chapterGoalTitle(chapter, goal.missing) : "";
  const note =
    goal.kind === "stage"
      ? `Na konci etapy ${toRoman(goal.stageIndex + 1)} na vás čeká pohlednice.`
      : `Poslední místo kapitoly je za ${formatDistance(goal.remainingM)}.`;
  const open = () => {
    if (goal.kind === "chapter") router.push({ pathname: "/kapitola/[id]", params: { id: goal.chapterId } });
    else if (goal.placeId) router.push({ pathname: "/zastavka/[id]", params: { id: goal.placeId } });
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={goal.kind === "chapter" ? "Otevře kapitolu" : "Otevře místo"} onPress={open}>
      <Card style={{ gap: 10, padding: 14 }}>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          {goal.kind === "stage" ? (
            <Seal kind="stage" size={64} roman={toRoman(goal.stageIndex + 1)} ringText={`ETAPA ${toRoman(goal.stageIndex + 1)} · ${vltavska.name.toUpperCase()}`} />
          ) : chapter && status ? (
            <ChapterSeal title={chapter.title} closed={false} size={64} />
          ) : null}
          <View style={{ flex: 1, gap: 2 }}>
            <SectionLabel>Další cíl</SectionLabel>
            <T style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.fg }}>{title}</T>
          </View>
        </View>
        <T style={{ fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 21, color: colors.fg }}>{note}</T>
        <T variant="muted" style={{ alignSelf: "flex-end", fontSize: 14, lineHeight: 20, color: colors.mutedStrong }}>
          {goal.kind === "chapter" ? "Otevřít kapitolu ›" : "Otevřít místo ›"}
        </T>
      </Card>
    </Pressable>
  );
}

/**
 * Karta další zastávky: medailon, vzdálenost v metrech i krocích, hádanka kurzívou. Klepnutí na kartu otevře místo;
 * tip k hádance je jen vedlejší odkaz („Tipnout si“ / „Změnit tip“), ne hlavní tlačítko obrazovky (rozhodnutí 0029).
 */
export function NextStopCard() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const { state, stepLength } = useExpedition();
  const { tips } = useTips();
  const place = state.nextStop ? vltavska.placesById.get(state.nextStop.id) : undefined;
  if (!place) return null;
  const photo = placePhoto(place.photo);
  const toM = state.toNextStopM ?? 0;
  const distance = formatDistance(toM, { stepLengthM: stepLength.meters });
  const teaserText = place.riddle?.question ?? place.teaser;
  const tipped = tips[place.id] !== undefined;
  const open = () => router.push({ pathname: "/zastavka/[id]", params: { id: place.id } });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${place.kind === "stop" ? "Další zastávka" : "Další objev"} ${place.name}, ${distance}`}
      accessibilityHint="Otevře místo"
      onPress={open}
    >
    <Card style={{ gap: 12, padding: 14 }}>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <Medallion photo={photo} size={72} locked={photo === undefined} label={photo === undefined && toM < 1000 ? formatDistance(toM) : undefined} />
        <View style={{ flex: 1 }}>
          <SectionLabel>{place.kind === "stop" ? "Další zastávka" : "Další objev"}</SectionLabel>
          <T style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.fg }}>{place.name}</T>
          <T style={{ fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.accent }}>{distance}</T>
        </View>
      </View>
      {teaserText && (
        <T style={{ fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 24, color: colors.fg }}>{teaserText}</T>
      )}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        {place.riddle ? (
          <Pressable accessibilityRole="link" onPress={open} hitSlop={6} style={{ minHeight: 44, justifyContent: "center" }}>
            <T variant="strong" accent style={{ fontSize: 14, lineHeight: 20 }}>
              {tipped ? "Změnit tip" : "Tipnout si"}
            </T>
          </Pressable>
        ) : (
          <View />
        )}
        <T variant="muted" style={{ fontSize: 14, lineHeight: 20, color: colors.mutedStrong }}>
          Otevřít místo ›
        </T>
      </View>
    </Card>
    </Pressable>
  );
}

/** Poslední odemčená místa podle dne dosažení, vodorovně posuvná, s pečetí a odkazem do Kroniky. */
export function RecentlyDiscovered() {
  const router = useRouter();
  const { colors, fonts, radius } = useTheme();
  const { events, active, walkedM } = useExpedition();
  const recent = events
    .filter((e) => e.kind === "place" && active && e.atM <= walkedM)
    .sort((a, b) => b.atM - a.atM)
    .slice(0, 8);
  if (recent.length === 0) return null;
  const today = localDateKey(new Date());
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <SectionLabel>Nedávno odemčeno</SectionLabel>
        <Pressable accessibilityRole="link" onPress={() => router.push("/kronika")} style={{ minHeight: 44, justifyContent: "center" }}>
          <T variant="strong" accent style={{ fontSize: 14, lineHeight: 20 }}>
            Kronika
          </T>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
        {recent.map((e) => {
          const place = vltavska.placesById.get(e.ref);
          if (!place) return null;
          const km = `km ${(place.atM / 1000).toFixed(1).replace(".", ",")}`;
          return (
            <Pressable
              key={e.ref}
              accessibilityRole="button"
              accessibilityLabel={`${place.name}, ${formatWhen(e.reachedDay, today)}`}
              onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: place.id } })}
              style={{
                width: 128,
                padding: 12,
                gap: 8,
                borderRadius: radius.card - 2,
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.surface,
              }}
            >
              {place.kind === "stop" ? (
                <Seal kind="wax" size={44} name={place.name} kmLabel={km} dateLabel={formatDayNumeric(e.reachedDay)} photo={placePhoto(place.photo)} />
              ) : (
                <Seal kind="stamp" size={44} name={place.name} expeditionName={vltavska.name} kmLabel={km} dateLabel={formatDayNumeric(e.reachedDay)} />
              )}
              <T style={{ fontFamily: fonts.display, fontSize: 17, lineHeight: 20, color: colors.fg }} numberOfLines={2}>
                {place.name}
              </T>
              <T variant="small" style={{ lineHeight: 16 }}>{formatWhen(e.reachedDay, today)}</T>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * Nejbližší kapitola: z neuzavřených ta, které chybí nejméně míst, s větou „Ještě 1 místo do uzavření …“.
 * Klepnutí otevře kapitolu, odkaz „Všechny kapitoly“ vede do Atlasu (razítka a pečeti kapitol).
 */
export function Chapters() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const { walkedM, active } = useExpedition();
  const explain = useChapterExplainer();
  if (vltavska.chapters.length === 0) return null;
  const nearest = nearestChapter(vltavska.chapters, vltavska.placesById, walkedM, active);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <SectionLabel>Kapitoly</SectionLabel>
        {explain && (
          <T variant="muted" style={{ fontSize: 13, lineHeight: 18, color: colors.mutedStrong }}>
            {CHAPTERS_EXPLAINER}
          </T>
        )}
      </View>
      {nearest ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Kapitola ${nearest.chapter.title}, ${zOf(nearest.status.done, nearest.status.total)}. ${missingSentence(nearest.chapter, nearest.status.missing)}`}
          onPress={() => router.push({ pathname: "/kapitola/[id]", params: { id: nearest.chapter.id } })}
        >
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
            <ChapterSeal title={nearest.chapter.title} closed={false} size={44} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <T style={{ flex: 1, fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.fg }} numberOfLines={1}>
                  {nearest.chapter.title}
                </T>
                <T variant="small" style={{ fontSize: 13, lineHeight: 18 }}>
                  {zOf(nearest.status.done, nearest.status.total)}
                </T>
              </View>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.line, overflow: "hidden" }}>
                <View style={{ height: 5, width: `${(nearest.status.done / nearest.status.total) * 100}%`, backgroundColor: colors.accent }} />
              </View>
              <T style={{ fontFamily: fonts.displayItalic, fontSize: 15, lineHeight: 20, color: colors.fg }}>
                {missingSentence(nearest.chapter, nearest.status.missing)}
              </T>
            </View>
          </Card>
        </Pressable>
      ) : (
        <T variant="muted">Všechny kapitoly jsou uzavřené.</T>
      )}
      <Pressable
        accessibilityRole="link"
        onPress={() => router.navigate("/atlas")}
        style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}
      >
        <T variant="strong" accent style={{ fontSize: 14, lineHeight: 20 }}>
          Všechny kapitoly ›
        </T>
      </Pressable>
    </View>
  );
}

/**
 * Místa výpravy po etapách (docs/navrh-v2.md § 4, bod 5): odemčená s datem, zamčená s km. Rozbalená je jen etapa,
 * na které chodec je; ostatní se rozbalí klepnutím na nadpis.
 */
export function PlacesByStage() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const { events, walkedM, state } = useExpedition();
  const [open, setOpen] = useState<number>(state.stage.index);
  const today = localDateKey(new Date());
  const days = new Map(events.filter((e) => e.kind === "place").map((e) => [e.ref, e.reachedDay]));
  const stages = vltavska.plan.stages;
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>Místa</SectionLabel>
      {stages.map((stage) => {
        const items = vltavska.places.filter((p) => (stage.index === 0 ? p.atM <= stage.endM : p.atM > stage.startM && p.atM <= stage.endM));
        const got = items.filter((p) => p.atM <= walkedM).length;
        const expanded = open === stage.index;
        return (
          <View key={stage.index} style={{ borderTopWidth: 1, borderColor: colors.line }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? -1 : stage.index)}
              style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}
            >
              <T style={{ fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.fg }}>Etapa {toRoman(stage.index + 1)}</T>
              <T variant="small" style={{ fontSize: 13 }}>
                {zOf(got, items.length)} {expanded ? "▴" : "▾"}
              </T>
            </Pressable>
            {expanded &&
              items.map((p) => {
                const reached = p.atM <= walkedM;
                const day = days.get(p.id);
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name}, ${reached ? (day ? formatWhen(day, today) : "odemčeno") : `za ${formatDistance(p.atM - walkedM)}`}`}
                    onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: p.id } })}
                    style={{ minHeight: 40, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}
                  >
                    {reached ? (
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent }} />
                    ) : (
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.4, borderStyle: "dashed", borderColor: colors.muted }} />
                    )}
                    <T variant="body" style={{ flex: 1, fontSize: 15, lineHeight: 20, color: reached ? colors.fg : colors.mutedStrong }} numberOfLines={1}>
                      {p.name}
                    </T>
                    <T variant="small" style={{ fontSize: 13, lineHeight: 18 }}>
                      {reached ? (day ? formatWhen(day, today) : "odemčeno") : formatKmMark(p.atM)}
                    </T>
                  </Pressable>
                );
              })}
          </View>
        );
      })}
    </View>
  );
}
