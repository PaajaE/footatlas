import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { vltavska } from "../../data/vltavska";
import { formatDistanceNoWrap, shortPlaceName } from "../../format";
import { CHAPTERS_EXPLAINER, chapterStatus } from "../../kapitoly";
import { roman, stageProgress, stageStateLabel } from "../../kronika/collections";
import { ChapterSeal } from "../ChapterSeal";
import { useTheme } from "../../theme/ThemeProvider";
import { Card, T } from "../ui";
import { uniqueMonograms } from "../../monogram";
import { Seal } from "./parts";
import { PlaceStamp } from "./PlaceStamp";
import { useChapterExplainer } from "../../state/useChapterExplainer";

/** Buňka razítka s krátkým názvem pod ním: čtyři v řadě. */
const STAMP_CELL = "25%";

/**
 * Sbírky rozjeté výpravy: etapy (s pečetí a pohlednicí po dokončení), razítka míst seskupená po etapách
 * a pečeti kapitol. Názvosloví viz docs/nazvoslovi.md.
 */
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
  const explain = useChapterExplainer();
  if (!active) {
    return (
      <Card style={{ gap: 4 }}>
        <T variant="strong">Sbírky se plní na výpravě</T>
        <T variant="muted">Etapy, razítka míst a pečeti kapitol přibývají s každým ušlým kilometrem. Vyrazit můžete na Domů.</T>
      </Card>
    );
  }
  const places = vltavska.places;
  const got = places.filter((p) => p.atM <= walkedM).length;
  const monograms = uniqueMonograms(places.map((p) => p.name));
  const stages = vltavska.plan.stages;
  const stampGroups = stages.map((stage) => {
    const items = places.map((place, i) => ({ place, i })).filter(({ place }) => (stage.index === 0 ? place.atM <= stage.endM : place.atM > stage.startM && place.atM <= stage.endM));
    const end = vltavska.plan.places.filter((p) => p.atM <= stage.endM && p.kind === "stop").at(-1);
    return {
      stage,
      items,
      got: items.filter(({ place }) => place.atM <= walkedM).length,
      endName: stage.index === 0 ? "Praha" : end ? vltavska.placesById.get(end.id)?.name : undefined,
    };
  });
  return (
    <View style={{ gap: 14 }}>
      <T variant="label" style={{ fontSize: 14 }}>
        Etapy · {vltavska.name}
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
              onPress={() => router.push({ pathname: "/pohlednice", params: { stage: String(s.index), from: "sbirky" } })}
              style={{ width: "48%", flexGrow: 1, padding: 10, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 6 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {st.state === "done" ? <Seal size={22} /> : null}
                <T variant="label" style={{ fontSize: 14 }}>
                  Etapa {roman(s.index + 1)}
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

      <Card style={{ gap: 14, padding: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <T variant="label" style={{ fontSize: 14 }}>
            Razítka míst
          </T>
          <T variant="muted" style={{ fontSize: 13 }}>
            {got} z {places.length}
          </T>
        </View>
        {stampGroups.map((g) => (
          <View key={g.stage.index} style={{ gap: 8 }} accessibilityLabel={`Etapa ${roman(g.stage.index + 1)}: ${g.got} z ${g.items.length} razítek`}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8, borderBottomWidth: 1, borderColor: colors.line, paddingBottom: 4 }}>
              <T variant="strong" style={{ flex: 1, fontSize: 14, lineHeight: 20 }} numberOfLines={1}>
                {`Etapa ${roman(g.stage.index + 1)}${g.endName ? ` · ${g.endName}` : ""}`}
              </T>
              <T variant="small">{`${g.got} z ${g.items.length}`}</T>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 10 }}>
              {g.items.map(({ place: p, i }) => {
                const has = p.atM <= walkedM;
                return (
                  <View key={p.id} style={{ width: STAMP_CELL, alignItems: "center", gap: 4 }}>
                    <PlaceStamp
                      monogram={monograms[i]!}
                      name={p.name}
                      got={has}
                      seed={i * 7 + 3}
                      onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: p.id } })}
                    />
                    <T
                      variant="small"
                      numberOfLines={1}
                      style={{ fontSize: 11, lineHeight: 14, textAlign: "center", color: has ? colors.fgSoft : colors.muted }}
                    >
                      {has ? shortPlaceName(p.name, 12) : "?"}
                    </T>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        {nextStop && nextStop.remainingM >= 15 && <T variant="muted">Další razítko přibude za {formatDistanceNoWrap(nextStop.remainingM)}.</T>}
      </Card>

      {vltavska.chapters.length > 0 && (
        <View style={{ gap: 10 }}>
          <View style={{ gap: 2 }}>
            <T variant="label" style={{ fontSize: 14 }}>
              Pečeti kapitol
            </T>
            {explain && (
              <T variant="muted" style={{ fontSize: 13, lineHeight: 18 }}>
                {CHAPTERS_EXPLAINER}
              </T>
            )}
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
