import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, View } from "react-native";
import { changeSentence, summarizeChange } from "@footatlas/core";
import { Button, Card, Screen, StageBar, T } from "../../components/ui";
import { vltavska } from "../../data/vltavska";
import { formatDayLong, formatKm, pluralPlaces } from "../../format";
import { healthSourceName } from "../../health/names";
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
        <T variant="small">{formatDayLong(new Date())}</T>
        <T variant="display">{vltavska.name}</T>
        <T variant="body">{vltavska.summary}</T>
        <Card style={{ gap: 12 }}>
          <T variant="label">{vltavska.routeTypeLabel}</T>
          <T variant="muted">
            {formatKm(vltavska.totalM)} ve {vltavska.plan.stages.length} etapách, {vltavska.places.length} míst na cestě.
            Počítá se jen pohyb od chvíle, kdy vyrazíte. Vaše historie zůstává v kronice.
          </T>
          <Button label="Vyrazit" onPress={ex.start} />
          <T variant="small">Při startu vás aplikace požádá o čtení kroků a vzdálenosti z {healthSourceName()}.</T>
        </Card>
        <StatusNote />
        <DevLink onPress={() => router.push("/dev")} />
      </Screen>
    );
  }

  const next = state.nextStop ? vltavska.placesById.get(state.nextStop.id) : null;
  const summary = summarizeChange(
    state,
    ex.demo.enabled ? ex.demo.seenM : (ex.session?.lastSeenWalkedM ?? 0),
    (id) => vltavska.placesById.get(id)?.name ?? id,
  );

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T variant="small">{formatDayLong(new Date())}</T>
        <T variant="small">{ex.demo.enabled ? "Ukázkový postup" : paused ? "Výprava je pozastavena" : vltavska.name}</T>
      </View>

      {state.completed ? (
        <>
          <T variant="label">Výprava dokončena</T>
          <T variant="display">{vltavska.name}</T>
        </>
      ) : (
        <>
          <T variant="label">
            Další zastávka · {formatKm(state.toNextStopM ?? 0)}
          </T>
          <T variant="display">{next?.name}</T>
          <T variant="muted">
            Etapa {state.stage.index + 1} ze {vltavska.plan.stages.length} · {formatKm(state.walkedM)} z {formatKm(vltavska.totalM)}
          </T>
        </>
      )}
      <StageBar stages={vltavska.plan.stages} walkedM={state.walkedM} />

      <Card style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <View
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}
        >
          <T variant="strong" style={{ color: colors.accentFg }}>
            ✓
          </T>
        </View>
        <View style={{ flex: 1 }}>
          <T variant="body">{changeSentence(summary)}</T>
        </View>
      </Card>

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
                accessibilityLabel={`${place.name}, ${formatKm(u.atM - state.walkedM)}`}
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
                <T variant="strong">{formatKm(u.atM - state.walkedM)}</T>
              </Pressable>
            );
          })}
        </View>
      )}

      {paused && (
        <Card style={{ gap: 10 }}>
          <T variant="muted">Pozastaveno. Postup máte uložený a nic se neztratí.</T>
          <Button label="Pokračovat" onPress={ex.resume} />
        </Card>
      )}
      <StatusNote />
      <DevLink onPress={() => router.push("/dev")} />
    </Screen>
  );

  function StatusNote() {
    if (status.kind === "unavailable") {
      return (
        <T variant="small">
          {status.reason === "denied"
            ? `Čtení z ${healthSourceName()} nebylo povoleno. Postup se bez něj nepočítá.`
            : `Zdravotní data nejsou na tomto zařízení dostupná (${status.reason}).`}
        </T>
      );
    }
    if (status.kind === "error") return <T variant="small">Čtení dat selhalo: {status.message}</T>;
    return null;
  }
}

function DevLink({ onPress }: { onPress: () => void }) {
  if (!__DEV__) return null;
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={{ paddingVertical: 12 }}>
      <T variant="small">Vývojářský panel</T>
    </Pressable>
  );
}
