import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { LifeBanner, RouteBanner, TripCard } from "../../components/objevovat/parts";
import { Button, Screen, T } from "../../components/ui";
import { useChronicle } from "../../db/ChronicleProvider";
import { vltavska } from "../../data/vltavska";
import { earthShare, formatKmBig, nextLifeStop } from "../../kronika/earth";
import { UPCOMING, wishCountLabel } from "../../kronika/upcoming";
import { useExpedition } from "../../state/ExpeditionProvider";
import { loadWishes, saveWishes } from "../../state/storage";
import { useTheme } from "../../theme/ThemeProvider";

const TYPES = [
  { name: "Skutečná trasa", note: "dá se jít i doopravdy" },
  { name: "Zjednodušená", note: "skutečná, ale uhlazená" },
  { name: "Vlastní virtuální", note: "spojuje zajímavá místa" },
  { name: "Symbolická", note: "třeba na Měsíc, pěšky" },
];

/** Objevovat: rozjetá výprava nahoře, připravované výpravy s poznámkou „Chci ji“ (jen v telefonu) a životní cesta. */
export default function Discover() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const { active, walkedM } = useExpedition();
  const { stats } = useChronicle();
  const [wishes, setWishes] = useState<Record<string, true>>({});
  useEffect(() => {
    loadWishes().then(setWishes);
  }, []);
  const toggle = (id: string) => {
    const next = { ...wishes };
    if (next[id]) delete next[id];
    else next[id] = true;
    setWishes(next);
    void saveWishes(next);
  };
  const pct = Math.round((Math.min(walkedM, vltavska.totalM) / vltavska.totalM) * 100);
  const total = stats.totalM;
  const next = nextLifeStop(total);

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <T variant="display">Objevovat</T>
        <T variant="muted" style={{ fontSize: 14 }}>
          Kam vás nohy zavedou příště. Žádný spěch, cesty počkají.
        </T>
      </View>
      <View style={{ height: 2, borderRadius: 1, backgroundColor: colors.line }} />

      <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
        <View style={{ backgroundColor: colors.bg }}>
          <RouteBanner walkedM={active ? walkedM : 0} />
          <View style={{ position: "absolute", left: 14, top: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.accent }}>
            <T variant="small" style={{ fontFamily: fonts.bodySemi, color: colors.accentFg }}>
              {active ? "Právě na cestě" : "První výprava"}
            </T>
          </View>
        </View>
        <View style={{ padding: 16, paddingTop: 14, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <T variant="title" style={{ fontSize: 26, lineHeight: 30 }}>
              {vltavska.name}
            </T>
            {active && (
              <T variant="strong" accent>
                {pct} %
              </T>
            )}
          </View>
          <T variant="muted">{vltavska.summary}</T>
          <T variant="small">
            {formatKmBig(vltavska.totalM)} · {vltavska.plan.stages.length} etapy · {vltavska.places.length} míst
          </T>
          <Button label={active ? "Pokračovat v cestě" : "Vyrazit"} onPress={() => (active ? router.navigate("/vyprava") : router.navigate("/"))} />
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <T variant="label">Připravujeme</T>
        <T variant="muted" style={{ fontSize: 13 }}>
          {wishCountLabel(UPCOMING.length, Object.keys(wishes).length)}
        </T>
      </View>
      {UPCOMING.map((t) => (
        <TripCard key={t.id} trip={t} wished={!!wishes[t.id]} onToggle={() => toggle(t.id)} />
      ))}
      <T variant="small">Poznámka „Chci ji“ zůstává jen v tomto telefonu.</T>

      {total > 0 && (
        <LifeBanner
          fraction={earthShare(total)}
          distance={`${formatKmBig(total)} vzdušnou čarou z Prahy`}
          next={next}
          onPress={() => router.navigate("/kronika")}
        />
      )}

      <View style={{ gap: 8 }}>
        <T variant="label">Poctivě označené trasy</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TYPES.map((t) => (
            <View key={t.name} style={{ width: "48%", flexGrow: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
              <T variant="strong" style={{ fontSize: 13, lineHeight: 18 }}>
                {t.name}
              </T>
              <T variant="small">{t.note}</T>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
