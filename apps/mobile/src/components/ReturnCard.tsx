import { localDateKey } from "@footatlas/core";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { vltavska } from "../data/vltavska";
import { returnHeading, returnRouteLabel, sinceDay } from "../navrat";
import { useExpedition } from "../state/ExpeditionProvider";
import { tileDistance } from "../home";
import { useTheme } from "../theme/ThemeProvider";
import { SectionLabel } from "./LabeledCard";
import { Button, Card, T } from "./ui";

/**
 * Kompaktní karta „Od posledně“ ve chvíli, kdy přibylo ≥ 300 m nebo místo (rozhodnutí 0022): číslo, úsek „A → B“,
 * co se cestou stalo (bez opakování čísla) a tlačítko „Přehrát cestu“. Na Domů je až pod kartou další zastávky; když není co ukázat, nezobrazuje se.
 * Úsek se předává parametry. Karta zůstává, dokud se návrat nepřehraje do konce nebo se nezavře („Zavřít“);
 * neviděné dny se sčítají a nadpis pak říká „Od 24. 10. přibylo“ (rozhodnutí 0024).
 */
export function ReturnCard({ fromM, toM, details }: { fromM: number; toM: number; details: string }) {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const { daySlices, markSeen } = useExpedition();
  const heading = returnHeading(sinceDay(daySlices, fromM), localDateKey(new Date()));
  const d = tileDistance(toM - fromM);
  const route = returnRouteLabel(vltavska.places, fromM, toM);
  return (
    <Card style={{ gap: 8, padding: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <SectionLabel>{heading}</SectionLabel>
        <T style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.fg }}>{`${d.value} ${d.unit}`}</T>
      </View>
      {details !== "" && <T style={{ fontFamily: fonts.display, fontSize: 16, lineHeight: 21, color: colors.fgSoft }}>{details}</T>}
      {route && (
        <T variant="small" style={{ fontSize: 13, lineHeight: 17 }}>
          {route}
        </T>
      )}
      <Button
        compact
        label="Přehrát cestu"
        onPress={() => router.push({ pathname: "/navrat", params: { from: String(Math.round(fromM)), to: String(Math.round(toM)) } })}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zavřít kartu Od posledně"
        onPress={() => markSeen()}
        style={{ alignSelf: "center", minHeight: 44, paddingHorizontal: 16, justifyContent: "center" }}
      >
        <T variant="small" style={{ fontSize: 13 }}>
          Zavřít
        </T>
      </Pressable>
    </Card>
  );
}
