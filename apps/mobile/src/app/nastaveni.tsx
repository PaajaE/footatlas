import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { Button, Card, Screen, T } from "../components/ui";
import { useExpedition } from "../state/ExpeditionProvider";
import { useSchemeChoice, useTheme, type SchemeChoice } from "../theme/ThemeProvider";

const CHOICES: Array<{ value: SchemeChoice; label: string }> = [
  { value: "light", label: "Světlý" },
  { value: "dark", label: "Tmavý" },
  { value: "auto", label: "Podle systému" },
];

export default function Nastaveni() {
  const router = useRouter();
  const { colors, fonts, radius } = useTheme();
  const { choice, setChoice } = useSchemeChoice();
  const { stepLength } = useExpedition();

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zpět" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: "center" }}>
          <T variant="strong" accent>
            ‹ Zpět
          </T>
        </Pressable>
      </View>
      <T variant="display">Nastavení</T>

      <Card style={{ gap: 12 }}>
        <T variant="label">Vzhled</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CHOICES.map((c) => {
            const selected = choice === c.value;
            return (
              <Pressable
                key={c.value}
                accessibilityRole="button"
                accessibilityLabel={c.label}
                accessibilityState={{ selected }}
                onPress={() => setChoice(c.value)}
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  justifyContent: "center",
                  paddingHorizontal: 16,
                  borderRadius: radius.button,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.accent : colors.line,
                  backgroundColor: selected ? colors.accent : "transparent",
                }}
              >
                <T variant="strong" style={{ color: selected ? colors.accentFg : colors.fg, fontFamily: fonts.bodySemi }}>
                  {c.label}
                </T>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <T variant="label">Délka kroku</T>
        <T variant="body">{Math.round(stepLength.meters * 100)} cm</T>
        <Button kind="secondary" label="Upravit délku kroku" onPress={() => router.push("/delka-kroku")} />
      </Card>

      <Card style={{ gap: 10 }}>
        <T variant="label">Zdroje a licence</T>
        <Button kind="secondary" label="Zdroje a licence" onPress={() => router.push("/zdroje")} />
      </Card>

      {__DEV__ && (
        <Card style={{ gap: 10 }}>
          <T variant="label">Vývoj</T>
          <Button kind="secondary" label="Vývojářský panel" onPress={() => router.push("/dev")} />
        </Card>
      )}
    </Screen>
  );
}
