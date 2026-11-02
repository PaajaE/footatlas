import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, View } from "react-native";
import { vltavska } from "../data/vltavska";
import { placePhoto } from "../data/photos";
import { formatDistance, formatKm, pluralPlaces } from "../format";
import {
  formatDayNumeric,
  formatWhen,
  isWithinLastDays,
  reachQuip,
  stageLabel,
  sumLastDays,
  tileDistance,
  walkEstimate,
  pluralNewPlaces,
  zOf,
  type ReachChoice,
} from "../home";
import { placesWithin } from "../riddle";
import { useExpedition } from "../state/ExpeditionProvider";
import { localDateKey } from "@footatlas/core";
import { useTips } from "../state/useTips";
import { useTheme } from "../theme/ThemeProvider";
import { Chip } from "./Chip";
import { SectionLabel } from "./LabeledCard";
import { Medallion } from "./Medallion";
import { Seal } from "./Seal";
import { StatTile } from "./StatTile";
import { useReduceMotion } from "./useReduceMotion";
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

/** „Kam dnes dojdu?“: co by se odemklo při 1, 2, 4 km nebo na konci etapy. Nic se nenastavuje ani neukládá. */
export function WhereToday() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const { state, walkedM, stepLength } = useExpedition();
  const reduce = useReduceMotion();
  const [choice, setChoice] = useState<ReachChoice>(2000);
  const swap = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) return;
    swap.setValue(0);
    Animated.timing(swap, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [choice, reduce, swap]);
  if (state.completed) return null;

  const stageRemainingM = Math.max(0, state.stage.endM - walkedM);
  const reachM = choice === "stage" ? stageRemainingM : choice;
  const toM = Math.min(walkedM + reachM, vltavska.totalM);
  const found = placesWithin(vltavska.places, walkedM, toM);
  const label = choice === "stage" ? formatKm(stageRemainingM) : `${choice / 1000} km`;
  const names = found.map((p) => p.name);
  const nearest = vltavska.places.find((p) => p.atM > walkedM);
  const quip = reachQuip(choice, names);

  const chips: Array<{ key: ReachChoice; text: string }> = [
    { key: 1000, text: "1 km" },
    { key: 2000, text: "2 km" },
    { key: 4000, text: "4 km" },
    { key: "stage", text: formatKm(stageRemainingM) },
  ];

  return (
    <Card style={{ gap: 12, padding: 14 }}>
      <View>
        <SectionLabel>Kam dnes dojdu?</SectionLabel>
        <T variant="muted" style={{ fontSize: 13, lineHeight: 17, color: colors.mutedStrong }}>
          Vyberte procházku, ukážu, co cestou odemknete.
        </T>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {chips.map((c) => (
          <Chip key={String(c.key)} label={c.text} selected={choice === c.key} onPress={() => setChoice(c.key)} />
        ))}
      </View>
      <Animated.View
        style={{
          gap: 8,
          opacity: reduce ? 1 : swap,
          transform: reduce ? [] : [{ translateY: swap.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        }}
      >
        {found.length > 0 ? (
          <>
            <T style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 25, color: colors.fg }}>
              {choice === "stage" ? `Za ${label}: konec etapy` : `Za ${label}: ${pluralPlaces(found.length)}`}
            </T>
            {found.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, ${formatDistance(p.atM - walkedM)}`}
                onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: p.id } })}
                hitSlop={{ top: 4, bottom: 4 }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.4, borderStyle: "dashed", borderColor: colors.muted }} />
                <T variant="body" style={{ flex: 1, fontSize: 14, lineHeight: 18 }} numberOfLines={1}>
                  {p.name}
                </T>
                <T variant="small" style={{ fontSize: 13, lineHeight: 18 }}>
                  {formatDistance(p.atM - walkedM)}
                </T>
              </Pressable>
            ))}
            <T variant="small" style={{ fontSize: 13, lineHeight: 17, color: colors.mutedStrong }}>
              {walkEstimate(toM - walkedM, stepLength.meters)}
            </T>
            {quip && <T style={{ fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 21, color: colors.ochre }}>{quip}</T>}
          </>
        ) : (
          <T variant="muted">
            {nearest
              ? `Za ${label} nic nového. Nejbližší místo, ${nearest.name}, je za ${formatDistance(nearest.atM - walkedM, { stepLengthM: stepLength.meters })}.`
              : `Za ${label} už nic nezbývá.`}
          </T>
        )}
      </Animated.View>
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

/** Kapitoly s postupem: kolik míst nitky už jste prošli. */
export function Chapters() {
  const { colors, fonts } = useTheme();
  const { walkedM, active } = useExpedition();
  if (vltavska.chapters.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      <SectionLabel>Kapitoly</SectionLabel>
      {vltavska.chapters.map((c) => {
        const members = c.placeIds.map((id) => vltavska.placesById.get(id)!).filter(Boolean);
        const done = members.filter((m) => active && m.atM <= walkedM).length;
        const pct = members.length === 0 ? 0 : (done / members.length) * 100;
        return (
          <View key={c.id} style={{ gap: 5 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <T style={{ fontFamily: fonts.display, fontSize: 18, lineHeight: 24, color: colors.fg }}>{c.title}</T>
              <T variant="small" style={{ fontSize: 13, lineHeight: 18 }}>
                {zOf(done, members.length)}
              </T>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.line, overflow: "hidden" }}>
              <View style={{ height: 5, width: `${pct}%`, backgroundColor: colors.accent }} />
            </View>
            <T variant="muted" style={{ fontSize: 13, lineHeight: 18, color: colors.mutedStrong }}>
              {c.blurb}
            </T>
          </View>
        );
      })}
    </View>
  );
}
