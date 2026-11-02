import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Card, Screen, StageBar, T } from "../../components/ui";
import { vltavska } from "../../data/vltavska";
import { formatKm } from "../../format";
import { useExpedition } from "../../state/ExpeditionProvider";
import { loadWish, saveWish } from "../../state/storage";

export default function Discover() {
  const router = useRouter();
  const { active, state, walkedM } = useExpedition();
  const [wish, setWish] = useState(false);
  useEffect(() => {
    loadWish().then(setWish);
  }, []);

  return (
    <Screen>
      <T variant="display">Objevovat</T>

      {active && (
        <Card style={{ gap: 10 }}>
          <T variant="label">Rozjetá výprava</T>
          <T variant="title">{vltavska.name}</T>
          <StageBar stages={vltavska.plan.stages} walkedM={walkedM} />
          <T variant="muted">
            Etapa {state.stage.index + 1} ze {vltavska.plan.stages.length} · {formatKm(walkedM)} z {formatKm(vltavska.totalM)}
          </T>
          <Button kind="secondary" label="Na mapu" onPress={() => router.navigate("/vyprava")} />
        </Card>
      )}

      <Card style={{ gap: 10 }}>
        <T variant="label">Připravujeme</T>
        <T variant="title">Další výprava</T>
        <T variant="muted">
          Knihovna se rozroste, až bude Vltavská stezka dotažená do detailu. Můžete si poznamenat, že chcete vědět, kdy to bude.
        </T>
        <Button
          kind={wish ? "secondary" : "primary"}
          label={wish ? "Poznamenáno ✓" : "Chci vědět, až bude"}
          onPress={() => {
            setWish(!wish);
            void saveWish(!wish);
          }}
        />
        <T variant="small">Poznámka zůstává jen v tomto telefonu.</T>
      </Card>
    </Screen>
  );
}
