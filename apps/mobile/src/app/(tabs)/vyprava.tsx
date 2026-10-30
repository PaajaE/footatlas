import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, StageBar, T } from "../../components/ui";
import { ExpeditionMap } from "../../components/ExpeditionMap";
import { vltavska } from "../../data/vltavska";
import { formatKm } from "../../format";
import { useExpedition } from "../../state/ExpeditionProvider";
import { useTheme } from "../../theme/ThemeProvider";

export default function Expedition() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, active, walkedM, demo } = useExpedition();

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingHorizontal: 20, gap: 12 }}>
        <T variant="display">Výprava</T>
        <T variant="muted">Žádná výprava neběží. Spusťte ji na záložce Domů.</T>
      </View>
    );
  }

  const next = state.nextStop ? vltavska.placesById.get(state.nextStop.id) : null;
  const nextSmall = state.next && state.next.kind !== "stop" ? vltavska.placesById.get(state.next.id) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <T variant="title">{vltavska.name}</T>
          <T variant="strong" accent>
            {(state.walkedM / 1000).toFixed(1).replace(".", ",")} / {Math.round(vltavska.totalM / 1000)} km
          </T>
        </View>
        <StageBar stages={vltavska.plan.stages} walkedM={state.walkedM} />
        <T variant="small">
          Etapa {state.stage.index + 1} ze {vltavska.plan.stages.length} · {vltavska.routeTypeLabel}
          {demo.enabled ? " · ukázkový postup" : ""}
        </T>
      </View>

      <ExpeditionMap
        route={vltavska.route}
        cumulative={vltavska.cumulative}
        places={vltavska.places}
        walkedM={walkedM}
        height={420}
        onPlacePress={(id) => router.push({ pathname: "/zastavka/[id]", params: { id } })}
      />
      <T variant="small" style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        Náhled trasy bez podkladové mapy. Mapa přijde později.
      </T>

      <View style={{ flex: 1, justifyContent: "flex-end", padding: 16 }}>
        <Card style={{ gap: 10 }}>
          {state.completed || !next ? (
            <T variant="title">Výprava je dokončena</T>
          ) : (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <T variant="label">Další zastávka</T>
                <T variant="title" style={{ color: colors.accent }}>
                  {formatKm(state.toNextStopM ?? 0)}
                </T>
              </View>
              <T variant="title">{next.name}</T>
              {nextSmall && (
                <T variant="muted">
                  Malý objev za {formatKm(state.toNextM ?? 0)}: <T variant="strong">{nextSmall.name}</T>
                </T>
              )}
              <Button
                kind="secondary"
                label="Zobrazit zastávku"
                onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: next.id } })}
              />
            </>
          )}
        </Card>
      </View>
    </View>
  );
}
