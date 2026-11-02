import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { changeSentence, summarizeChange } from "@footatlas/core";
import { Chapters, NextRiddle, RecentlyDiscovered, WhereToday } from "../../components/HomeSections";
import { LastUpdated } from "../../components/LastUpdated";
import { Button, Card, Screen, StageBar, T } from "../../components/ui";
import { vltavska } from "../../data/vltavska";
import { formatDayLong, formatDistance, formatKm, pluralPlaces } from "../../format";
import { fromHealthSource } from "../../health/names";
import { useExpedition } from "../../state/ExpeditionProvider";
import { useTheme } from "../../theme/ThemeProvider";

const KIND_LABEL = { stop: "Zastávka", discovery: "Malý objev" } as const;

export default function Home() {
  const { colors } = useTheme();
  const router = useRouter();
  const ex = useExpedition();
  const { state, active, paused, status } = ex;

  // „Od posledně“ se ukazuje při otevření a zapamatuje se až po odchodu z obrazovky.
  useFocusEffect(
    useCallback(() => {
      return () => ex.markSeen();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ex.markSeen]),
  );

  if (!ex.ready) return <Screen>{null}</Screen>;

  if (!active) {
    return (
      <Screen>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T variant="small">{formatDayLong(new Date())}</T>
          <SettingsButton onPress={() => router.push("/nastaveni")} />
        </View>
        <T variant="display">{vltavska.name}</T>
        <T variant="body">{vltavska.summary}</T>
        <Card style={{ gap: 12 }}>
          <T variant="label">{vltavska.routeTypeLabel}</T>
          <T variant="muted">
            {formatKm(vltavska.totalM)} ve {vltavska.plan.stages.length} etapách, {vltavska.places.length} míst na cestě.
            Počítá se jen pohyb od chvíle, kdy vyrazíte. Vaše historie zůstává v kronice.
          </T>
          <Button label="Vyrazit" onPress={ex.start} />
          <T variant="small">Při startu vás aplikace požádá o čtení kroků a vzdálenosti {fromHealthSource()}.</T>
        </Card>
        <StatusNote />
      </Screen>
    );
  }

  const next = state.nextStop ? vltavska.placesById.get(state.nextStop.id) : null;
  const summary = summarizeChange(
    state,
    ex.demo.enabled ? ex.demo.seenM : (ex.session?.lastSeenWalkedM ?? 0),
    (id) => vltavska.placesById.get(id)?.name ?? id,
  );

  // Příběhy nově odemčených míst k listování; jen místa, která příběh mají.
  const storyIds = state.newlyReached.filter((p) => vltavska.placesById.get(p.id)?.hook !== undefined).map((p) => p.id);

  return (
    <Screen onRefresh={ex.demo.enabled ? undefined : ex.refresh} refreshing={ex.refreshing}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <T variant="small">{formatDayLong(new Date())}</T>
        <T variant="small" style={{ flex: 1, textAlign: "right" }} numberOfLines={1}>
          {ex.demo.enabled ? "Ukázkový postup" : paused ? "Výprava je pozastavena" : vltavska.name}
        </T>
        <SettingsButton onPress={() => router.push("/nastaveni")} />
      </View>

      {state.completed ? (
        <>
          <T variant="label">Výprava dokončena</T>
          <T variant="display">{vltavska.name}</T>
        </>
      ) : (
        <>
          <T variant="label">
            Další zastávka · {formatDistance(state.toNextStopM ?? 0, { stepLengthM: ex.stepLength.meters })}
          </T>
          <T variant="display">{next?.name}</T>
          <T variant="muted">
            Etapa {state.stage.index + 1} ze {vltavska.plan.stages.length} · {formatKm(state.walkedM)} z {formatKm(vltavska.totalM)}
          </T>
        </>
      )}
      <StageBar stages={vltavska.plan.stages} walkedM={state.walkedM} />
      <LastUpdated />

      <Card style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <View
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}
        >
          <T variant="strong" style={{ color: colors.accentFg }}>
            ✓
          </T>
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <T variant="body">{changeSentence(summary)}</T>
          {storyIds.length > 0 && (
            <Button
              kind="secondary"
              label={storyIds.length === 1 ? "Projít objev" : `Projít je (${storyIds.length})`}
              onPress={() => router.push({ pathname: "/objevy", params: { ids: storyIds.join(",") } })}
            />
          )}
        </View>
      </Card>
      {!state.completed && <NextRiddle />}

      {!state.completed && (
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <T variant="strong">Na dalších 5 km</T>
            <T variant="strong" accent>
              {state.upcoming.length === 0 ? "nic dalšího" : pluralPlaces(state.upcoming.length)}
            </T>
          </View>
          {state.upcoming.length === 0 && <T variant="muted">Nejbližší místo je dál než 5 km.</T>}
          {state.upcoming.map((u) => {
            const place = vltavska.placesById.get(u.id)!;
            return (
              <Pressable
                key={u.id}
                accessibilityRole="button"
                accessibilityLabel={`${place.name}, ${formatDistance(u.atM - state.walkedM)}`}
                onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: u.id } })}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, minHeight: 56 }}
              >
                <View style={{ flex: 1 }}>
                  <T variant="title" numberOfLines={1}>
                    {place.name}
                  </T>
                  <T variant="muted">
                    {KIND_LABEL[place.kind]} · km {(place.atM / 1000).toFixed(1).replace(".", ",")}
                  </T>
                </View>
                <T variant="strong">{formatDistance(u.atM - state.walkedM)}</T>
              </Pressable>
            );
          })}
        </View>
      )}

      <WhereToday />
      <RecentlyDiscovered />
      <Chapters />

      {paused && (
        <Card style={{ gap: 10 }}>
          <T variant="muted">Pozastaveno. Postup máte uložený a nic se neztratí.</T>
          <Button label="Pokračovat" onPress={ex.resume} />
        </Card>
      )}
      <StatusNote />
    </Screen>
  );

  function StatusNote() {
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
}

/** Ozubené kolo v hlavičce, otevírá Nastavení. */
function SettingsButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Nastavení"
      onPress={onPress}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 }}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        {teeth.map((a) => (
          <Line key={a} x1={12} y1={2.5} x2={12} y2={5.5} stroke={colors.accent} strokeWidth={3} strokeLinecap="round" transform={`rotate(${a} 12 12)`} />
        ))}
        <Circle cx={12} cy={12} r={6.5} stroke={colors.accent} strokeWidth={2.2} fill="none" />
        <Circle cx={12} cy={12} r={2.4} fill={colors.accent} />
      </Svg>
    </Pressable>
  );
}
