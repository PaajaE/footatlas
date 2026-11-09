import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { vltavska } from "../data/vltavska";
import { placePhoto } from "../data/photos";
import { formatDistance, formatKm } from "../format";
import {
  formatDayNumeric,
  formatWhen,
  isWithinLastDays,
  stageLabel,
  sumLastDays,
  tileDistance,
  pluralNewPlaces,
  zOf,
} from "../home";
import { CHAPTERS_EXPLAINER, missingSentence, nearestChapter } from "../kapitoly";
import { useExpedition } from "../state/ExpeditionProvider";
import { localDateKey } from "@footatlas/core";
import { useTips } from "../state/useTips";
import { useTheme } from "../theme/ThemeProvider";
import { ChapterSeal } from "./ChapterSeal";
import { SectionLabel } from "./LabeledCard";
import { Medallion } from "./Medallion";
import { Seal } from "./Seal";
import { StatTile } from "./StatTile";
import { Button, Card, StageBar, T } from "./ui";

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

/**
 * Tři dlaždice: Dnes, Za 7 dní, Pohlednice. Hodnoty jsou ze skutečných dat výpravy;
 * dlaždice, na které data nejsou (výprava hotová), se vynechá.
 */
export function StatTiles() {
  const { daily, events, state, active } = useExpedition();
  if (!active) return null;
  const today = localDateKey(new Date());
  const todayM = sumLastDays(daily, today, 1);
  const weekM = sumLastDays(daily, today, 7);
  const weekPlaces = events.filter((e) => e.kind === "place" && isWithinLastDays(e.reachedDay, today, 7)).length;
  const todayPlaces = events.filter((e) => e.kind === "place" && e.reachedDay === today).length;
  const toStageEnd = state.stage.endM - state.walkedM;
  const t = tileDistance(todayM);
  const w = tileDistance(weekM);
  const s = tileDistance(toStageEnd);
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <StatTile label="Dnes" value={t.value} unit={t.unit} note={todayPlaces > 0 ? pluralNewPlaces(todayPlaces) : undefined} />
      <StatTile label="Za 7 dní" value={w.value} unit={w.unit} note={weekPlaces > 0 ? pluralNewPlaces(weekPlaces) : undefined} />
      {!state.completed && toStageEnd > 0 && <StatTile label="Pohlednice" value={s.value} unit={s.unit} note="do konce etapy" />}
    </View>
  );
}

/** Karta další zastávky: medailon, vzdálenost v metrech i krocích, hádanka kurzívou, tlačítko k tipu. */
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
    <Card style={{ gap: 12, padding: 14 }}>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <Medallion photo={photo} size={72} locked={photo === undefined} label={photo === undefined && toM < 1000 ? formatDistance(toM) : undefined} />
        <View style={{ flex: 1 }}>
          <SectionLabel>{place.kind === "stop" ? "Další zastávka" : "Další malý objev"}</SectionLabel>
          <T style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.fg }}>{place.name}</T>
          <T style={{ fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.accent }}>{distance}</T>
        </View>
      </View>
      {teaserText && (
        <T style={{ fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 24, color: colors.fg }}>{teaserText}</T>
      )}
      <Button compact label={place.riddle ? (tipped ? "Změnit tip" : "Tipnout si odpověď") : "Podívat se na místo"} onPress={open} />
    </Card>
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
        <SectionLabel>Nedávno objeveno</SectionLabel>
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
 * Klepnutí otevře kapitolu, odkaz „Všechny kapitoly“ vede do Sbírek v Kronice.
 */
export function Chapters() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const { walkedM, active } = useExpedition();
  if (vltavska.chapters.length === 0) return null;
  const nearest = nearestChapter(vltavska.chapters, vltavska.placesById, walkedM, active);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <SectionLabel>Kapitoly</SectionLabel>
        <T variant="muted" style={{ fontSize: 13, lineHeight: 18, color: colors.mutedStrong }}>
          {CHAPTERS_EXPLAINER}
        </T>
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
        onPress={() => router.push({ pathname: "/kronika", params: { tab: "sbirky" } })}
        style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}
      >
        <T variant="strong" accent style={{ fontSize: 14, lineHeight: 20 }}>
          Všechny kapitoly ›
        </T>
      </Pressable>
    </View>
  );
}
