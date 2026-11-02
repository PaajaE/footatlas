import { useRouter } from "expo-router";
import { Linking, Pressable, View } from "react-native";
import { Button, Card, Screen, T } from "../components/ui";
import { DATA_CREDITS, PHOTO_CREDITS } from "../data/credits";

/** Zdroje a licence (atribuce obrázků a mapových dat). */
export default function Credits() {
  const router = useRouter();
  return (
    <Screen>
      <T variant="title">Zdroje a licence</T>
      <Card style={{ gap: 6 }}>
        {DATA_CREDITS.map((c) => (
          <T key={c} variant="muted">
            {c}
          </T>
        ))}
      </Card>
      <Card style={{ gap: 10 }}>
        <T variant="strong">Fotografie</T>
        <T variant="muted">Z Wikimedia Commons, v aplikaci oříznuté do kruhu (u zatím nenavštívených míst i v odstínech šedi).</T>
        {PHOTO_CREDITS.map((c) => (
          <Pressable key={c.subject} accessibilityRole="link" onPress={() => Linking.openURL(c.url)} style={{ paddingVertical: 4 }}>
            <View>
              <T variant="body">{c.subject}</T>
              <T variant="small">
                {c.author} · {c.license}
              </T>
            </View>
          </Pressable>
        ))}
      </Card>
      <Button label="Hotovo" onPress={() => router.back()} />
    </Screen>
  );
}
