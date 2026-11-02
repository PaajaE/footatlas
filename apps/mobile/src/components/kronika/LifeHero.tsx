import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { bigDistance, earthShare, earthShareLabel, formatStepCount } from "../../kronika/earth";
import { useTheme } from "../../theme/ThemeProvider";
import { T } from "../ui";
import { Globe, useInk } from "./parts";

/**
 * Tmavá karta nahoře v Kronice: zeměkoule, „Ušli jste“, velké číslo a střídavé postřehy. Klepnutí otevře Kartu života.
 * Všechna čísla jsou z kroniky; kroky jsou odhad z délky kroku.
 */
export function LifeHero({ totalM, steps, facts, onPress }: { totalM: number; steps: number | null; facts: string[]; onPress: () => void }) {
  const ink = useInk();
  const { fonts } = useTheme();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (facts.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % facts.length), 5000);
    return () => clearInterval(id);
  }, [facts.length]);
  const big = bigDistance(totalM);
  const fact = facts[i % Math.max(1, facts.length)];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ušli jste ${big.value} ${big.unit}. Otevřít kartu života`}
      onPress={onPress}
      style={{ borderRadius: 22, backgroundColor: ink.bg, padding: 16, paddingBottom: 14, gap: 10, overflow: "hidden" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Globe fraction={earthShare(totalM)} width={160} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T variant="label" style={{ fontSize: 13, color: ink.label }}>
            Ušli jste
          </T>
          <T variant="display" style={{ fontSize: 40, lineHeight: 44, color: ink.text }} numberOfLines={1}>
            {big.value}
          </T>
          <T variant="muted" style={{ color: ink.soft }}>
            {big.unit}
            {steps !== null ? ` · asi ${formatStepCount(steps)} kroků` : ""}
          </T>
          <View style={{ marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: `${ink.arc}2E` }}>
            <T variant="small" style={{ fontFamily: fonts.bodySemi, color: ink.pill }}>
              {earthShareLabel(totalM, true)}
            </T>
          </View>
        </View>
      </View>
      {fact && (
        <T variant="body" style={{ fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 23, color: ink.text, minHeight: 46 }}>
          {fact}
        </T>
      )}
      {facts.length > 1 && (
        <View style={{ flexDirection: "row", gap: 5 }}>
          {facts.map((_, k) => (
            <View key={k} style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: k === i % facts.length ? ink.arc : `${ink.text}40` }} />
          ))}
        </View>
      )}
    </Pressable>
  );
}
