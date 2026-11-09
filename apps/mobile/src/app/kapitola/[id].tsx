import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChapterSeal } from "../../components/ChapterSeal";
import { SectionLabel } from "../../components/LabeledCard";
import { Medallion } from "../../components/Medallion";
import { BackPill } from "../../components/PlaceHero";
import { Seal } from "../../components/Seal";
import { Button, Card, Screen, T } from "../../components/ui";
import { placePhoto } from "../../data/photos";
import { vltavska } from "../../data/vltavska";
import { formatDay, formatKm } from "../../format";
import { zOf } from "../../home";
import { chapterPlaces, chapterStatus, missingSentence } from "../../kapitoly";
import { sealKm } from "../../seal";
import { useExpedition } from "../../state/ExpeditionProvider";
import { saveChapterOpened } from "../../state/storage";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * Kapitola (rozhodnutí 0026): název a úvod jako začátek příběhu, postup s pečetí, místa v pořadí trasy
 * (odemčená s fotkou nebo razítkem a dnem odemčení, zamčená s hádankou a vzdáleností) a po uzavření závěr
 * a pohlednice. Kapitoly zatím patří jen k aktuální výpravě.
 */
export default function ChapterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, fonts, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { walkedM, active, events } = useExpedition();
  const chapter = id ? vltavska.chapters.find((c) => c.id === id) : undefined;
  // Po první otevřené kapitole už vysvětlující věta o kapitolách není potřeba (rozhodnutí 0029).
  useEffect(() => {
    if (chapter) void saveChapterOpened();
  }, [chapter]);

  if (!chapter) {
    return (
      <Screen>
        <T variant="title">Kapitola nenalezena</T>
        <Button label="Zpět" onPress={() => router.back()} />
      </Screen>
    );
  }

  const status = chapterStatus(chapter, vltavska.placesById, walkedM, active);
  const list = chapterPlaces(chapter, vltavska.placesById, events, walkedM, active);
  const pct = status.total === 0 ? 0 : (status.done / status.total) * 100;
  const open = (placeId: string) => router.push({ pathname: "/zastavka/[id]", params: { id: placeId } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20) + 8, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row" }}>
          <BackPill label="Zpět" onPhoto={false} />
        </View>

        <View style={{ gap: 4 }}>
          <SectionLabel size={15}>{`Kapitola · ${vltavska.name}`}</SectionLabel>
          <T style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.fg }}>{chapter.title}</T>
        </View>
        <T style={{ fontFamily: fonts.displayItalic, fontSize: 19, lineHeight: 27, color: colors.fg }}>{chapter.intro ?? chapter.blurb}</T>

        <Card style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14 }}>
          <ChapterSeal title={chapter.title} closed={status.closed} size={64} />
          <View style={{ flex: 1, gap: 6 }}>
            <T style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.fg }}>{`${zOf(status.done, status.total)} míst`}</T>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.line, overflow: "hidden" }}>
              <View style={{ height: 5, width: `${pct}%`, backgroundColor: colors.accent }} />
            </View>
            <T variant="small" style={{ fontSize: 13, lineHeight: 18, color: colors.mutedStrong }}>
              {status.closed ? "Kapitola je uzavřená pečetí." : missingSentence(chapter, status.missing)}
            </T>
          </View>
        </Card>

        <View style={{ gap: 4 }}>
          <SectionLabel>Místa kapitoly</SectionLabel>
          {list.map((entry, i) => {
            const p = entry.place;
            const photo = placePhoto(p.photo);
            const line = entry.reached
              ? entry.reachedDay
                ? `Odemčeno ${formatDay(entry.reachedDay)}`
                : "Odemčeno"
              : active
                ? `za ${formatKm(entry.remainingM)}`
                : `km ${(p.atM / 1000).toFixed(1).replace(".", ",")} od startu`;
            const heading = entry.reached ? p.name : (p.riddle?.question ?? p.teaser ?? p.name);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="link"
                accessibilityLabel={entry.reached ? `${p.name}, ${line}` : `Zamčené místo, ${heading}, ${line}`}
                onPress={() => open(p.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 10,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.line,
                  minHeight: 64,
                }}
              >
                {entry.reached ? (
                  photo ? (
                    <Medallion photo={photo} size={52} />
                  ) : (
                    <Seal kind="stamp" size={52} name={p.name} expeditionName={vltavska.name} kmLabel={sealKm(p.atM)} dateLabel={entry.reachedDay ? formatDay(entry.reachedDay) : ""} />
                  )
                ) : (
                  <Medallion size={52} locked />
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <T
                    style={
                      entry.reached
                        ? { fontFamily: fonts.display, fontSize: 19, lineHeight: 23, color: colors.fg }
                        : { fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 21, color: colors.fgSoft }
                    }
                    numberOfLines={3}
                  >
                    {heading}
                  </T>
                  <T variant="small" style={{ fontSize: 13, lineHeight: 18, color: entry.reached ? colors.mutedStrong : colors.accent }}>
                    {line}
                  </T>
                </View>
                <T variant="muted" style={{ fontSize: 18 }}>
                  ›
                </T>
              </Pressable>
            );
          })}
        </View>

        {status.closed && (
          <Card style={{ gap: 12, padding: 16, borderRadius: radius.card }}>
            <SectionLabel>Konec kapitoly</SectionLabel>
            {chapter.outro && <T style={{ fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 25, color: colors.fg }}>{chapter.outro}</T>}
            <Button label="Poslat jako pohlednici" onPress={() => router.push({ pathname: "/pohlednice", params: { chapter: chapter.id } })} />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
