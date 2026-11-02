import { useRouter } from "expo-router";
import { View } from "react-native";
import { vltavska } from "../data/vltavska";
import { returnRouteLabel } from "../navrat";
import { tileDistance } from "../home";
import { useTheme } from "../theme/ThemeProvider";
import { SectionLabel } from "./LabeledCard";
import { Button, Card, T } from "./ui";

/**
 * Kompaktní karta „Od posledně“ ve chvíli, kdy přibylo ≥ 300 m nebo místo (rozhodnutí 0022): číslo, úsek „A → B“,
 * věta a tlačítko k návratu „Inkoust“. Na Domů je až pod kartou další zastávky; když není co ukázat, nezobrazuje se.
 * Úsek se předává parametry, protože Domů si „od posledně“ při odchodu zapamatuje.
 */
export function ReturnCard({ fromM, toM, sentence }: { fromM: number; toM: number; sentence: string }) {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const d = tileDistance(toM - fromM);
  const route = returnRouteLabel(vltavska.places, fromM, toM);
  return (
    <Card style={{ gap: 8, padding: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <SectionLabel>Od posledně</SectionLabel>
        <T style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.fg }}>{`${d.value} ${d.unit}`}</T>
      </View>
      <T style={{ fontFamily: fonts.display, fontSize: 16, lineHeight: 21, color: colors.fgSoft }}>{sentence}</T>
      {route && (
        <T variant="small" style={{ fontSize: 13, lineHeight: 17 }}>
          {route}
        </T>
      )}
      <Button
        compact
        label="Přehrát návrat"
        onPress={() => router.push({ pathname: "/navrat", params: { from: String(Math.round(fromM)), to: String(Math.round(toM)) } })}
      />
    </Card>
  );
}
