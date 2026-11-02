import { Pressable, View } from "react-native";
import { tipOutcome, type Tip } from "../riddle";
import { useTheme } from "../theme/ThemeProvider";
import { LabeledCard } from "./LabeledCard";
import { T } from "./ui";
import type { AppRiddle } from "../data/vltavska";

/** Hádanka u zamčeného místa: tři možnosti, tip je dobrovolný, bez bodů a skóre. */
export function RiddleCard({ riddle, tip, onTip }: { riddle: AppRiddle; tip: Tip | undefined; onTip: (t: Tip) => void }) {
  const { colors, fonts, radius } = useTheme();
  return (
    <LabeledCard label="Hádanka" gap={10} style={{ padding: 16 }}>
      <T style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 29, color: colors.fg }}>{riddle.question}</T>
      <T variant="muted" style={{ color: colors.mutedStrong }}>
        {tip === undefined
          ? "Tipněte si, nic se nepočítá. Odpověď se ukáže, až místo odemknete."
          : "Váš tip je uložený. Můžete ho změnit, než místo odemknete."}
      </T>
      <View style={{ gap: 10 }} accessibilityRole="radiogroup">
        {riddle.options.map((text, i) => {
          const selected = tip === i;
          return (
            <Pressable
              key={i}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onTip(i as Tip)}
              style={{
                minHeight: 48,
                justifyContent: "center",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: radius.button,
                borderWidth: selected ? 2 : 1.5,
                borderColor: selected ? colors.accent : colors.line,
                backgroundColor: colors.chip,
              }}
            >
              <T variant="body" style={[{ fontSize: 16 }, selected ? { color: colors.accent, fontFamily: fonts.bodySemi } : undefined]}>
                {text}
              </T>
            </Pressable>
          );
        })}
      </View>
    </LabeledCard>
  );
}

/** Po odemčení: jedna věta o tipu. Bez tipu se nic neukazuje. */
export function TipResult({ riddle, tip }: { riddle: AppRiddle; tip: Tip | undefined }) {
  const outcome = tipOutcome(riddle.answer, tip);
  if (outcome === "none") return null;
  return (
    <LabeledCard label={outcome === "correct" ? "Tipovali jste správně" : "Tohle překvapí"} gap={4}>
      <T variant="body">{outcome === "correct" ? riddle.options[riddle.answer] : `Správně je: ${riddle.options[riddle.answer]}.`}</T>
    </LabeledCard>
  );
}
