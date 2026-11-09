import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, T } from "../components/ui";
import { vltavska } from "../data/vltavska";
import { formatDay, formatKmMark } from "../format";
import { useExpedition } from "../state/ExpeditionProvider";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Příběhy objevů: celoobrazovkové listování nově odemčenými místy (návrh M2), vlastním tempem.
 * Místa přicházejí v parametru `ids`, protože „od posledně“ se po odchodu z Domů smaže.
 */
export default function Discoveries() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { events, state } = useExpedition();
  const scroller = useRef<{ scrollTo: (o: { x: number; animated: boolean }) => void } | null>(null);
  const [index, setIndex] = useState(0);

  const places = (ids ?? "")
    .split(",")
    .map((id) => vltavska.placesById.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.hook !== undefined);
  const upcoming = state.nextStop ? vltavska.placesById.get(state.nextStop.id) : undefined;
  const pages = places.length + (upcoming?.riddle ? 1 : 0);

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  if (pages === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingHorizontal: 20, gap: 18 }}>
        <T variant="title">Zatím žádné příběhy</T>
        <Button label="Zpět" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
        <View style={{ flex: 1, flexDirection: "row", gap: 4 }}>
          {Array.from({ length: pages }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= index ? colors.accent : colors.line }} />
          ))}
        </View>
        <T variant="small">
          {index + 1} z {pages}
        </T>
        <Pressable accessibilityRole="button" accessibilityLabel="Zavřít" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 }}>
          <T variant="title">✕</T>
        </Pressable>
      </View>
      <ScrollView
        ref={(r) => {
          scroller.current = r;
        }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {places.map((p, i) => {
          const event = events.find((e) => e.kind === "place" && e.ref === p.id);
          const chapter = p.chapterId ? vltavska.chapters.find((c) => c.id === p.chapterId) : undefined;
          const chapterPos = chapter ? chapter.placeIds.indexOf(p.id) + 1 : 0;
          return (
            <ScrollView key={p.id} style={{ width }} contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 18 }}>
              <T variant="label">
                {p.kind === "stop" ? "Zastávka" : "Malý objev"} · {formatKmMark(p.atM)}
              </T>
              <T variant="display">{p.name}</T>
              <T style={{ fontFamily: fonts.displayItalic, fontSize: 24, lineHeight: 32 }}>{`„${p.hook}“`}</T>
              {p.context && <T variant="body">{p.context}</T>}
              <T variant="muted">
                {event ? `Došli jste sem ${formatDay(event.reachedDay)}` : "Odemčeno"}
                {chapter ? ` · kapitola ${chapter.title} ${chapterPos}/${chapter.placeIds.length}` : ""}
              </T>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Button kind="secondary" label="Podrobnosti" onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: p.id } })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={i + 1 < pages ? "Další ›" : "Hotovo"} onPress={() => (i + 1 < pages ? goTo(i + 1) : router.back())} />
                </View>
              </View>
            </ScrollView>
          );
        })}
        {upcoming?.riddle && (
          <ScrollView style={{ width }} contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 18 }}>
            <T variant="label">Co vás čeká</T>
            <T variant="display">{upcoming.name}</T>
            <Card style={{ gap: 6 }}>
              <T variant="label">Hádanka</T>
              <T variant="title">{upcoming.riddle.question}</T>
            </Card>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button kind="secondary" label="Tipnout" onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: upcoming.id } })} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Hotovo" onPress={() => router.back()} />
              </View>
            </View>
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
}
