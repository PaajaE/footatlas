import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { vltavska } from "../data/vltavska";
import { formatDistance, formatKm, pluralPlaces } from "../format";
import { reachEmptyText, reachQuip, walkEstimate, type ReachChoice } from "../home";
import { placesWithin } from "../riddle";
import { useExpedition } from "../state/ExpeditionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { Chip } from "./Chip";
import { SectionLabel } from "./LabeledCard";
import { useReduceMotion } from "./useReduceMotion";
import { Card, T } from "./ui";

/**
 * „Kam dnes dojdu?“: co by se odemklo při 1, 2, 4 km nebo na konci etapy. Nic se nenastavuje ani neukládá.
 * Na Domů stojí pod kartou další zastávky, proto větu o ní neopakuje (`reachEmptyText`, rozhodnutí 0024).
 * Přesunuto z `HomeSections.tsx`, které paralelně upravuje jiný balík.
 */
export function WhereToday() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const { state, walkedM, stepLength } = useExpedition();
  const reduce = useReduceMotion();
  const [choice, setChoice] = useState<ReachChoice>(2000);
  const swap = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) return;
    swap.setValue(0);
    Animated.timing(swap, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [choice, reduce, swap]);
  if (state.completed) return null;

  const stageRemainingM = Math.max(0, state.stage.endM - walkedM);
  const reachM = choice === "stage" ? stageRemainingM : choice;
  const toM = Math.min(walkedM + reachM, vltavska.totalM);
  const found = placesWithin(vltavska.places, walkedM, toM);
  const label = choice === "stage" ? formatKm(stageRemainingM) : `${choice / 1000} km`;
  const names = found.map((p) => p.name);
  const nearest = vltavska.places.find((p) => p.atM > walkedM);
  const quip = reachQuip(choice, names);

  const chips: Array<{ key: ReachChoice; text: string }> = [
    { key: 1000, text: "1 km" },
    { key: 2000, text: "2 km" },
    { key: 4000, text: "4 km" },
    { key: "stage", text: formatKm(stageRemainingM) },
  ];

  return (
    <Card style={{ gap: 12, padding: 14 }}>
      <View>
        <SectionLabel>Kam dnes dojdu?</SectionLabel>
        <T variant="muted" style={{ fontSize: 13, lineHeight: 17, color: colors.mutedStrong }}>
          Vyberte procházku, ukážu, co cestou odemknete.
        </T>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {chips.map((c) => (
          <Chip key={String(c.key)} label={c.text} selected={choice === c.key} onPress={() => setChoice(c.key)} />
        ))}
      </View>
      <Animated.View
        style={{
          gap: 8,
          opacity: reduce ? 1 : swap,
          transform: reduce ? [] : [{ translateY: swap.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        }}
      >
        {found.length > 0 ? (
          <>
            <T style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 25, color: colors.fg }}>
              {choice === "stage" ? `Za ${label}: konec etapy` : `Za ${label}: ${pluralPlaces(found.length)}`}
            </T>
            {found.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, ${formatDistance(p.atM - walkedM)}`}
                onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: p.id } })}
                hitSlop={{ top: 4, bottom: 4 }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.4, borderStyle: "dashed", borderColor: colors.muted }} />
                <T variant="body" style={{ flex: 1, fontSize: 14, lineHeight: 18 }} numberOfLines={1}>
                  {p.name}
                </T>
                <T variant="small" style={{ fontSize: 13, lineHeight: 18 }}>
                  {formatDistance(p.atM - walkedM)}
                </T>
              </Pressable>
            ))}
            <T variant="small" style={{ fontSize: 13, lineHeight: 17, color: colors.mutedStrong }}>
              {walkEstimate(toM - walkedM, stepLength.meters)}
            </T>
            {quip && <T style={{ fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 21, color: colors.ochre }}>{quip}</T>}
          </>
        ) : (
          <T variant="muted">
            {reachEmptyText(
              label,
              nearest,
              nearest ? formatDistance(nearest.atM - walkedM, { stepLengthM: stepLength.meters }) : "",
              state.nextStop?.id,
            )}
          </T>
        )}
      </Animated.View>
    </Card>
  );
}
