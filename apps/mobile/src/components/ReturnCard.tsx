import { useRouter } from "expo-router";
import { View } from "react-native";
import { vltavska } from "../data/vltavska";
import { returnRouteLabel } from "../navrat";
import { tileDistance } from "../home";
import { useTheme } from "../theme/ThemeProvider";
import { LabeledCard } from "./LabeledCard";
import { Button, T } from "./ui";

/**
 * Karta „Od posledně“ ve chvíli, kdy přibylo ≥ 300 m nebo místo (rozhodnutí 0022): velké číslo, úsek „A → B“
 * a tlačítko k návratu „Inkoust“. Úsek se předává parametry, protože Domů si „od posledně“ při odchodu zapamatuje.
 */
export function ReturnCard({ fromM, toM, sentence }: { fromM: number; toM: number; sentence: string }) {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const d = tileDistance(toM - fromM);
  const route = returnRouteLabel(vltavska.places, fromM, toM);
  return (
    <LabeledCard label="Od posledně" gap={10}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <T style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.fg }}>{`${d.value} ${d.unit}`}</T>
        {route && (
          <T variant="small" style={{ fontSize: 13, flexShrink: 1 }}>
            {route}
          </T>
        )}
      </View>
      <T style={{ fontFamily: fonts.display, fontSize: 18, lineHeight: 24, color: colors.fgSoft }}>{sentence}</T>
      <Button label="Přehrát návrat" onPress={() => router.push({ pathname: "/navrat", params: { from: String(Math.round(fromM)), to: String(Math.round(toM)) } })} />
    </LabeledCard>
  );
}
