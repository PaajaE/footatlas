import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { CollectionsView } from "../../components/kronika/CollectionsView";
import { RouteBanner, TripCard } from "../../components/objevovat/parts";
import { Seal } from "../../components/Seal";
import { Button, Card, Screen, T } from "../../components/ui";
import { vltavska } from "../../data/vltavska";
import { formatDistance } from "../../format";
import { formatKmBig } from "../../kronika/earth";
import { UPCOMING, wishCountLabel } from "../../kronika/upcoming";
import { toRoman } from "../../seal";
import { useExpedition } from "../../state/ExpeditionProvider";
import { loadPostcards, loadWishes, saveWishes } from "../../state/storage";
import { useTheme } from "../../theme/ThemeProvider";

const TYPES = [
  { name: "Skutečná trasa", note: "dá se jít i doopravdy" },
  { name: "Zjednodušená", note: "skutečná, ale uhlazená" },
  { name: "Vlastní virtuální", note: "spojuje zajímavá místa" },
  { name: "Symbolická", note: "třeba na Měsíc, pěšky" },
];

/**
 * Atlas (docs/navrh-v2.md § 3, rozhodnutí 0034): co jsem nasbíral a kam dál. Skládá dřívější obsah Objevovat
 * (výpravy: aktuální, dokončené, připravované) a Sbírek z Kroniky (razítka a pečeti kapitol, `CollectionsView`),
 * pohlednice etap a zatím prázdnou sekci Témata (balík N).
 */
export default function Atlas() {
  const { colors, fonts } = useTheme();
  const router = useRouter();
  const { active, walkedM, state } = useExpedition();
  const [wishes, setWishes] = useState<Record<string, true>>({});
  const [saved, setSaved] = useState<number[]>([]);
  useEffect(() => {
    loadWishes().then(setWishes);
  }, []);
  useFocusEffect(
    useCallback(() => {
      loadPostcards().then(setSaved);
    }, []),
  );
  const toggle = (id: string) => {
    const next = { ...wishes };
    if (next[id]) delete next[id];
    else next[id] = true;
    setWishes(next);
    void saveWishes(next);
  };
  const pct = Math.round((Math.min(walkedM, vltavska.totalM) / vltavska.totalM) * 100);
  const done = active && state.completed;
  const stages = vltavska.plan.stages;

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <T variant="display">Atlas</T>
        <T variant="muted" style={{ fontSize: 14 }}>
          Co jste nasbírali a kam vás nohy zavedou příště.
        </T>
      </View>
      <View style={{ height: 2, borderRadius: 1, backgroundColor: colors.line }} />

      {/* Výpravy: aktuální (nebo dokončená), připravované. */}
      <T variant="label">{done ? "Dokončené výpravy" : active ? "Aktuální výprava" : "Výpravy"}</T>
      <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
        <View style={{ backgroundColor: colors.bg }}>
          <RouteBanner walkedM={active ? walkedM : 0} />
          <View style={{ position: "absolute", left: 14, top: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.accent }}>
            <T variant="small" style={{ fontFamily: fonts.bodySemi, color: colors.accentFg }}>
              {done ? "Dokončeno" : active ? "Právě na cestě" : "První výprava"}
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
            {formatKmBig(vltavska.totalM)} · {stages.length} etapy · {vltavska.places.length} míst
          </T>
          <Button label={active ? "Na mapu výpravy" : "Vyrazit"} onPress={() => router.navigate("/vyprava")} />
        </View>
      </View>
      {!done && (
        <Card style={{ gap: 2 }}>
          <T variant="strong">Dokončené výpravy</T>
          <T variant="muted">Zatím žádná. Až dojdete do cíle, výprava se sem přesune i s razítky a pohlednicemi.</T>
        </Card>
      )}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <T variant="label">Další výpravy</T>
        <T variant="muted" style={{ fontSize: 13 }}>
          {wishCountLabel(UPCOMING.length, Object.keys(wishes).length)}
        </T>
      </View>
      {UPCOMING.map((t) => (
        <TripCard key={t.id} trip={t} wished={!!wishes[t.id]} onToggle={() => toggle(t.id)} />
      ))}
      <T variant="small">Poznámka „Chci ji“ zůstává jen v tomto telefonu.</T>

      {/* Razítka a pečeti kapitol (dřívější Sbírky v Kronice). */}
      <T variant="label">Razítka a pečeti</T>
      {active ? (
        <CollectionsView active={active} walkedM={walkedM} nextStop={state.toNextM !== null ? { remainingM: state.toNextM } : null} />
      ) : (
        <Card style={{ gap: 4 }}>
          <T variant="strong">Razítka se sbírají na výpravě</T>
          <T variant="muted">Etapy, razítka míst a pečeti kapitol přibývají s každým ušlým kilometrem. Vyrazit můžete na záložce Výprava.</T>
        </Card>
      )}

      {/* Pohlednice: jedna za každou dokončenou etapu. */}
      <T variant="label">Pohlednice</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {stages.map((s) => {
          const got = active && walkedM >= s.endM;
          const r = toRoman(s.index + 1);
          return (
            <Pressable
              key={s.index}
              disabled={!got}
              accessibilityRole="button"
              accessibilityLabel={got ? `Pohlednice etapy ${r}` : `Pohlednice etapy ${r}, zatím zamčená`}
              onPress={() => router.push({ pathname: "/pohlednice", params: { stage: String(s.index), from: "sbirky" } })}
              style={{
                width: "47%",
                flexGrow: 1,
                padding: 12,
                gap: 8,
                alignItems: "center",
                borderRadius: 16,
                borderWidth: 1,
                borderStyle: got ? "solid" : "dashed",
                borderColor: colors.line,
                backgroundColor: got ? colors.surface : "transparent",
              }}
            >
              {got ? <Seal kind="stage" size={52} roman={r} ringText={`ETAPA ${r} · ${vltavska.name.toUpperCase()}`} /> : <Seal kind="locked" size={52} />}
              <T variant="strong" style={{ fontSize: 14, lineHeight: 18 }}>
                Etapa {r}
              </T>
              <T variant="small" style={{ fontSize: 12, lineHeight: 16, textAlign: "center" }}>
                {got ? (saved.includes(s.index) ? "uložená v Kronice" : "otevřít") : active ? `ještě ${formatDistance(s.endM - walkedM)}` : "na výpravě"}
              </T>
            </Pressable>
          );
        })}
      </View>

      {/* Témata: řady kapitol napříč výpravami (docs/navrh-v2.md § 7). Obsah dodá balík N. */}
      <T variant="label">Témata</T>
      <Card style={{ gap: 4 }}>
        <T variant="strong">Témata se připravují</T>
        <T variant="muted">Mosty, šlechtická sídla, přívozy… Kapitoly z různých výprav se tu spojí do témat, která rostou s každou další cestou.</T>
      </Card>

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
