import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Globe, Seal, useInk, ConfidenceBar } from "../components/kronika/parts";
import { Button, Card, Screen, T } from "../components/ui";
import { useChronicle } from "../db/ChronicleProvider";
import { vltavska } from "../data/vltavska";
import { healthSourceName } from "../health/names";
import { bigDistance, confidenceSentence, distanceSentence, earthShare, earthShareLabel, estimateSteps, formatStepCount, longestDaySentence } from "../kronika/earth";
import { useExpedition } from "../state/ExpeditionProvider";
import { useTheme } from "../theme/ThemeProvider";

const MONTHS_GEN = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];

const STARS = [
  [30, 30, 1.2],
  [300, 18, 1],
  [250, 60, 1.3],
  [60, 140, 1],
  [320, 170, 1.2],
  [20, 230, 1],
] as const;

/** Karta života: po prvním načtení historie, tmavá karta se zeměkoulí, čísla jen z kroniky. Sdílení obrázkem zatím není. */
export default function LifeCard() {
  const router = useRouter();
  const { fonts } = useTheme();
  const ink = useInk();
  const { stats } = useChronicle();
  const { active, stepLength } = useExpedition();
  const total = stats.totalM;
  const empty = !(total > 0);
  const big = bigDistance(total);
  const steps = estimateSteps(total, stepLength.meters);
  const sentences = useMemo(
    () =>
      [
        distanceSentence(total),
        stats.longestDay ? longestDaySentence(stats.longestDay.distanceM, { name: vltavska.name, totalM: vltavska.totalM }) : null,
      ].filter((s): s is string => s !== null),
    [total, stats.longestDay],
  );
  const sourceSentence = confidenceSentence(stats.byConfidence);
  const [howOpen, setHowOpen] = useState(false);
  const since = stats.firstDay ? `od ${MONTHS_GEN[Number(stats.firstDay.slice(5, 7)) - 1]} ${stats.firstDay.slice(0, 4)}` : null;

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <T variant="label" style={{ fontSize: 18, letterSpacing: 1 }}>
          FootAtlas
        </T>
        <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>
          {healthSourceName()}
          {since ? ` · ${since}` : ""}
        </T>
      </View>

      {empty ? (
        <Card style={{ gap: 12 }}>
          <T variant="strong">Karta života čeká na vaši historii</T>
          <T variant="muted">Až se v Kronice načtou kroky a vzdálenost, ukáže se tu, kolik jste toho za život ušli.</T>
          <Button label="Do Kroniky" onPress={() => router.replace("/kronika")} />
        </Card>
      ) : (
        <>
          <View style={{ borderRadius: 26, backgroundColor: ink.bg, padding: 18, paddingBottom: 16, alignItems: "center", gap: 6, overflow: "hidden" }}>
            <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
              <Svg width="100%" height="100%" viewBox="0 0 350 400" preserveAspectRatio="xMidYMin slice">
                {STARS.map(([x, y, r]) => (
                  <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={ink.text} opacity={0.45} />
                ))}
              </Svg>
            </View>
            <T variant="label" style={{ fontSize: 15, color: ink.label }}>
              Za život jste ušli
            </T>
            <Globe fraction={earthShare(total)} width={240} />
            <T variant="display" style={{ fontSize: 58, lineHeight: 62, color: ink.text }}>
              {big.value} {big.unit}
            </T>
            <T variant="muted" style={{ color: ink.soft, textAlign: "center" }}>
              {steps !== null ? `asi ${formatStepCount(steps)} kroků · ` : ""}
              {earthShareLabel(total)}
            </T>
          </View>

          <View style={{ gap: 10 }}>
            {sentences.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <Seal size={28} />
                <T variant="body" style={{ flex: 1, fontFamily: fonts.display, fontSize: 19, lineHeight: 24 }}>
                  {s}
                </T>
              </View>
            ))}
          </View>

          {sourceSentence && (
            <Card style={{ gap: 8, padding: 14 }}>
              <T variant="body" style={{ fontSize: 15, lineHeight: 22 }}>
                {sourceSentence}
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: howOpen }}
                onPress={() => setHowOpen((o) => !o)}
                style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}
              >
                <T variant="strong" accent style={{ fontSize: 14, lineHeight: 20 }}>
                  {howOpen ? "Skrýt podrobnosti" : "Jak počítáme?"}
                </T>
              </Pressable>
              {howOpen && (
                <View style={{ gap: 10 }}>
                  <ConfidenceBar by={stats.byConfidence} />
                  <T variant="muted">
                    {`Kde telefon zaznamenal ušlou vzdálenost (${healthSourceName()}), bereme ji tak, jak je. Kde zná jen kroky, vynásobíme je délkou vašeho kroku (teď ${Math.round(stepLength.meters * 100)} cm, změníte v Nastavení). Ručně zadané dny počítáme, jak jste je zadali.`}
                  </T>
                </View>
              )}
            </Card>
          )}
        </>
      )}

      <View style={{ gap: 10 }}>
        {!empty && (
          <Button
            label={active ? "Pokračovat ve výpravě" : "Vybrat první výpravu"}
            onPress={() => router.replace(active ? "/vyprava" : "/objevovat")}
          />
        )}
        <Button kind="secondary" label={empty ? "Zpět" : "Zavřít"} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      </View>
      <T variant="small" style={{ textAlign: "center" }}>
        Data zůstávají ve vašem telefonu. Kroky nikam neodcházejí, jen vy.
      </T>
    </Screen>
  );
}
