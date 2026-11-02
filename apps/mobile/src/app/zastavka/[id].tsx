import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { Button, Card, Screen, T } from "../../components/ui";
import { vltavska } from "../../data/vltavska";
import { formatDay, formatDistance } from "../../format";
import { useExpedition } from "../../state/ExpeditionProvider";
import { useTheme } from "../../theme/ThemeProvider";

export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const { walkedM, active, events, stepLength } = useExpedition();
  const place = id ? vltavska.placesById.get(id) : undefined;

  if (!place) {
    return (
      <Screen>
        <T variant="title">Místo nenalezeno</T>
        <Button label="Zpět" onPress={() => router.back()} />
      </Screen>
    );
  }

  const reached = active && place.atM <= walkedM;
  const stage = vltavska.plan.stages.find((s) => place.atM > s.startM && place.atM <= s.endM) ?? vltavska.plan.stages[0]!;
  const event = events.find((e) => e.kind === "place" && e.ref === place.id);
  const chapter = place.chapterId ? vltavska.chapters.find((c) => c.id === place.chapterId) : undefined;
  const members = chapter ? chapter.placeIds.map((pid) => vltavska.placesById.get(pid)!).filter(Boolean) : [];
  const reachedCount = members.filter((m) => active && m.atM <= walkedM).length;
  const remaining = formatDistance(place.atM - walkedM, { stepLengthM: stepLength.meters });
  const unlockText = remaining === "Jste tady" ? "Jste na místě, odemkne se každým krokem." : `Odemkne se za ${remaining}.`;
  const hasStory = place.hook !== undefined;

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zpět" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: "center" }}>
          <T variant="strong" accent>
            ‹ Zpět
          </T>
        </Pressable>
        <T variant="small">
          {place.kind === "stop" ? "Zastávka" : "Malý objev"} · km {(place.atM / 1000).toFixed(1).replace(".", ",")}
        </T>
      </View>
      <T variant="label">Etapa {stage.index + 1}</T>
      <T variant="display">{place.name}</T>

      {!hasStory && <T variant="body">{place.text}</T>}

      {hasStory && reached && (
        <>
          <T style={{ fontFamily: fonts.displayItalic, fontSize: 22, lineHeight: 30 }}>{`„${place.hook}“`}</T>
          {place.context && <T variant="body">{place.context}</T>}
          {place.visitTip && (
            <Card style={{ gap: 6 }}>
              <T variant="label">Až tam jednou půjdete</T>
              <T variant="body">{place.visitTip}</T>
            </Card>
          )}
          <T variant="muted">{event ? `Došli jste sem ${formatDay(event.reachedDay)}` : "Odemčeno"}</T>
          {chapter && members.length > 0 && (
            <Card style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <T variant="strong">{chapter.title}</T>
                <T variant="small">
                  {reachedCount} z {members.length}
                </T>
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {members.map((m) => (
                  <View
                    key={m.id}
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: active && m.atM <= walkedM ? colors.accent : colors.line,
                    }}
                  />
                ))}
              </View>
              <T variant="muted">{chapter.blurb}</T>
            </Card>
          )}
        </>
      )}

      {hasStory && !reached && (
        <>
          <T variant="label">Zatím zamčeno</T>
          {place.teaser && <T style={{ fontFamily: fonts.displayItalic, fontSize: 20, lineHeight: 28 }}>{place.teaser}</T>}
          {place.riddle && (
            <Card style={{ gap: 6 }}>
              <T variant="label">Hádanka</T>
              <T variant="title">{place.riddle.question}</T>
            </Card>
          )}
          <Card style={{ gap: 6 }}>
            <T variant="muted">
              {active ? unlockText : "Odemkne se po ušlé vzdálenosti od startu."}
            </T>
          </Card>
        </>
      )}

      {!hasStory && (
        <Card style={{ gap: 6 }}>
          <T variant="strong">{reached ? "Odemčeno" : "Zatím zamčeno"}</T>
          <T variant="muted">
            {reached
              ? "Toto místo jste už minuli."
              : active
                ? unlockText
                : "Odemkne se po ušlé vzdálenosti od startu."}
          </T>
        </Card>
      )}
      <Button label="Zpět na mapu" onPress={() => router.back()} />
    </Screen>
  );
}
