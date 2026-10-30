import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { Button, Card, Screen, T } from "../../components/ui";
import { vltavska } from "../../data/vltavska";
import { formatKm } from "../../format";
import { useExpedition } from "../../state/ExpeditionProvider";

export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { walkedM, active } = useExpedition();
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

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T variant="small" accent>
          ‹ Zpět
        </T>
        <T variant="small">
          {place.kind === "stop" ? "Zastávka" : "Malý objev"} · km {(place.atM / 1000).toFixed(1).replace(".", ",")}
        </T>
      </View>
      <T variant="label">Etapa {stage.index + 1}</T>
      <T variant="display">{place.name}</T>
      <T variant="body">{place.text}</T>

      <Card style={{ gap: 6 }}>
        <T variant="strong">{reached ? "Odemčeno" : "Zatím zamčeno"}</T>
        <T variant="muted">
          {reached
            ? "Toto místo jste už minuli."
            : active
              ? `Odemkne se za ${formatKm(Math.max(0, place.atM - walkedM))}.`
              : "Odemkne se po ušlé vzdálenosti od startu."}
        </T>
      </Card>

      {place.draft && (
        <Card style={{ gap: 6 }}>
          <T variant="strong">Koncept obsahu</T>
          <T variant="muted">
            Text je ukázkový a nebyl ověřen dvěma zdroji. Překvapivý fakt, fotografie s licencí a zdroje se doplní před vydáním
            výpravy.
          </T>
        </Card>
      )}
      <Button label="Zpět na mapu" onPress={() => router.back()} />
    </Screen>
  );
}
