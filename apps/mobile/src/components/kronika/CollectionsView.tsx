import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { vltavska } from "../../data/vltavska";
import { formatDistanceNoWrap } from "../../format";
import { CHAPTERS_EXPLAINER, chapterStatus } from "../../kapitoly";
import { roman, stageProgress, stageStateLabel } from "../../kronika/collections";
import { ChapterSeal } from "../ChapterSeal";
import { useTheme } from "../../theme/ThemeProvider";
import { Card, T } from "../ui";
import { uniqueMonograms } from "../../monogram";
import { Seal } from "./parts";
import { PlaceStamp } from "./PlaceStamp";

/** Sbírky rozjeté výpravy: listy atlasu (etapy), razítka míst a pečeti kapitol. */
export function CollectionsView({
  active,
  walkedM,
  nextStop,
}: {
  active: boolean;
  walkedM: number;
  nextStop: { remainingM: number } | null;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  if (!active) {
    return (
      <Card style={{ gap: 4 }}>
        <T variant="strong">Sbírky se plní na výpravě</T>
        <T variant="muted">Listy atlasu, razítka míst a pečeti kapitol přibývají s každým ušlým kilometrem. Vyrazit můžete na Domů.</T>
      </Card>
    );
  }
  const places = vltavska.places;
  const got = places.filter((p) => p.atM <= walkedM).length;
  const monograms = uniqueMonograms(places.map((p) => p.name));
  return (
    <View style={{ gap: 14 }}>
      <T variant="label" style={{ fontSize: 14 }}>
        Listy atlasu · {vltavska.name}
      </T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {vltavska.plan.stages.map((s) => {
          const p = stageProgress(s, walkedM);
          const st = stageStateLabel(p);
          return (
            <Pressable
              key={s.index}
              disabled={st.state !== "done"}
              accessibilityRole={st.state === "done" ? "button" : undefined}
              accessibilityHint={st.state === "done" ? "Otevře pohlednici z etapy" : undefined}
              onPress={() => router.push({ pathname: "/pohlednice", params: { stage: String(s.index) } })}
              style={{ width: "48%", flexGrow: 1, padding: 10, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 6 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {st.state === "done" ? <Seal size={22} /> : null}
                <T variant="label" style={{ fontSize: 14 }}>
                  List {roman(s.index + 1)}
                </T>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: "hidden" }}>
                <View style={{ width: `${p * 100}%`, height: 6, backgroundColor: colors.accent }} />
              </View>
              <T variant="small">{st.label}</T>
              {st.state === "done" && <T variant="small" accent>Pohlednice z etapy</T>}
            </Pressable>
          );
        })}
      </View>

      <Card style={{ gap: 10, padding: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <T variant="label" style={{ fontSize: 14 }}>
            Razítka
          </T>
          <T variant="muted" style={{ fontSize: 13 }}>
            {got} z {places.length}
          </T>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityLabel={`Razítka míst: ${got} z ${places.length}`}>
          {places.map((p, i) => (
            <PlaceStamp
              key={p.id}
              monogram={monograms[i]!}
              name={p.name}
              got={p.atM <= walkedM}
              seed={i * 7 + 3}
              onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: p.id } })}
            />
          ))}
        </View>
        {nextStop && nextStop.remainingM >= 15 && <T variant="muted">Nejbližší prázdné políčko se zaplní za {formatDistanceNoWrap(nextStop.remainingM)}.</T>}
      </Card>

      {vltavska.chapters.length > 0 && (
        <View style={{ gap: 10 }}>
          <View style={{ gap: 2 }}>
            <T variant="label" style={{ fontSize: 14 }}>
              Pečeti kapitol
            </T>
            <T variant="muted" style={{ fontSize: 13, lineHeight: 18 }}>
              {CHAPTERS_EXPLAINER}
            </T>
          </View>
          {vltavska.chapters.map((c) => {
            const pr = chapterStatus(c, vltavska.placesById, walkedM, active);
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`Kapitola ${c.title}, ${pr.done} z ${pr.total} míst${pr.closed ? ", uzavřená" : ""}`}
                accessibilityHint="Otevře kapitolu"
                onPress={() => router.push({ pathname: "/kapitola/[id]", params: { id: c.id } })}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}
              >
                <ChapterSeal title={c.title} closed={pr.closed} size={40} />
                <View style={{ flex: 1 }}>
                  <T variant="title" style={{ fontSize: 19, lineHeight: 23 }}>
                    {c.title}
                  </T>
                  <T variant="small">{pr.closed ? `Uzavřeno · ${pr.total} míst` : `${pr.done} z ${pr.total} míst`}</T>
                </View>
                <T variant="muted" style={{ fontSize: 18 }}>
                  ›
                </T>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
