import { Pressable, View } from "react-native";
import { tipOutcome, type Tip } from "../riddle";
import { useTheme } from "../theme/ThemeProvider";
import { Card, T } from "./ui";
import type { AppRiddle } from "../data/vltavska";

/** Hádanka u zamčeného místa: tři možnosti, tip je dobrovolný, bez bodů a skóre. */
export function RiddleCard({ riddle, tip, onTip }: { riddle: AppRiddle; tip: Tip | undefined; onTip: (t: Tip) => void }) {
  const { colors, radius } = useTheme();
  return (
    <Card style={{ gap: 10 }}>
      <T variant="label">Hádanka</T>
      <T variant="title">{riddle.question}</T>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
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
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radius.button,
                borderWidth: selected ? 2 : 1.5,
                borderColor: selected ? colors.accent : colors.line,
                backgroundColor: selected ? colors.bg : "transparent",
              }}
            >
              <T variant="body" style={selected ? { color: colors.accent } : undefined}>
                {text}
              </T>
            </Pressable>
          );
        })}
      </View>
      <T variant="small">
        {tip === undefined
          ? "Tipnout si můžete, nic se nepočítá. Odpověď se ukáže, až místo odemknete."
          : "Váš tip je uložený. Můžete ho změnit, než místo odemknete."}
      </T>
    </Card>
  );
}

/** Po odemčení: jedna věta o tipu. Bez tipu se nic neukazuje. */
export function TipResult({ riddle, tip }: { riddle: AppRiddle; tip: Tip | undefined }) {
  const outcome = tipOutcome(riddle.answer, tip);
  if (outcome === "none") return null;
  return (
    <Card style={{ gap: 4 }}>
      <T variant="label">{outcome === "correct" ? "Tipovali jste správně" : "Tohle překvapí"}</T>
      <T variant="body">
        {outcome === "correct" ? riddle.options[riddle.answer] : `Správně je: ${riddle.options[riddle.answer]}.`}
      </T>
    </Card>
  );
}
