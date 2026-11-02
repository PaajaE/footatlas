import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { vltavska } from "../data/vltavska";
import { formatDay, formatDistance } from "../format";
import { joinNames, placesWithin } from "../riddle";
import { useExpedition } from "../state/ExpeditionProvider";
import { useTips } from "../state/useTips";
import { useTheme } from "../theme/ThemeProvider";
import { Button, Card, T } from "./ui";

/** Hádanka další zastávky přímo na Domů, s tlačítkem k tipu. */
export function NextRiddle() {
  const router = useRouter();
  const { state } = useExpedition();
  const { tips } = useTips();
  const place = state.nextStop ? vltavska.placesById.get(state.nextStop.id) : undefined;
  if (!place?.riddle) return null;
  const tipped = tips[place.id] !== undefined;
  return (
    <Card style={{ gap: 10 }}>
      <T variant="label">Hádanka na cestu</T>
      <T variant="title">{place.riddle.question}</T>
      <Button
        kind="secondary"
        label={tipped ? "Změnit tip" : "Tipnout"}
        onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: place.id } })}
      />
    </Card>
  );
}

const REACH_OPTIONS = [1000, 2000, 4000] as const;

/** „Kam dnes dojdu?“: co by se odemklo při 1, 2, 4 km nebo na konci etapy. Nic se nenastavuje ani neukládá. */
export function WhereToday() {
  const router = useRouter();
  const { colors, radius } = useTheme();
  const { state, walkedM, stepLength } = useExpedition();
  const [choice, setChoice] = useState<number | "stage">(2000);
  if (state.completed) return null;

  const toM = choice === "stage" ? state.stage.endM : Math.min(walkedM + choice, vltavska.totalM);
  const found = placesWithin(vltavska.places, walkedM, toM);
  const label = choice === "stage" ? "konec etapy" : `${choice / 1000} km`;
  const names = found.map((p) => p.name);
  const nearest = vltavska.places.find((p) => p.atM > walkedM);

  const chips: Array<{ key: number | "stage"; text: string }> = [
    ...REACH_OPTIONS.map((m) => ({ key: m, text: `${m / 1000} km` })),
    { key: "stage", text: "Konec etapy" },
  ];

  return (
    <Card style={{ gap: 12 }}>
      <T variant="label">Kam dnes dojdu?</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {chips.map((c) => {
          const selected = choice === c.key;
          return (
            <Pressable
              key={String(c.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setChoice(c.key)}
              style={{
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: 16,
                borderRadius: radius.pill,
                borderWidth: selected ? 2 : 1.5,
                borderColor: selected ? colors.accent : colors.line,
                backgroundColor: selected ? colors.accent : "transparent",
              }}
            >
              <T variant="strong" style={selected ? { color: colors.accentFg } : undefined}>
                {c.text}
              </T>
            </Pressable>
          );
        })}
      </View>
      {found.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Za ${label}: ${joinNames(names)}`}
          onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: found[0]!.id } })}
        >
          <T variant="body">
            <T variant="strong">{choice === "stage" ? "Do konce etapy" : `Za ${label}`}</T>
            {`: ${joinNames(names)}.`}
          </T>
        </Pressable>
      ) : (
        <T variant="muted">
          {nearest
            ? `Za ${label} nic nového. Nejbližší místo, ${nearest.name}, je za ${formatDistance(nearest.atM - walkedM, { stepLengthM: stepLength.meters })}.`
            : `Za ${label} už nic nezbývá.`}
        </T>
      )}
    </Card>
  );
}

/** Poslední odemčená místa podle dne dosažení. */
export function RecentlyDiscovered() {
  const router = useRouter();
  const { events, active, walkedM } = useExpedition();
  const recent = events
    .filter((e) => e.kind === "place" && active && e.atM <= walkedM)
    .sort((a, b) => b.atM - a.atM)
    .slice(0, 3);
  if (recent.length === 0) return null;
  return (
    <View style={{ gap: 4 }}>
      <T variant="strong">Nedávno objeveno</T>
      {recent.map((e) => {
        const place = vltavska.placesById.get(e.ref);
        if (!place) return null;
        return (
          <Pressable
            key={e.ref}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/zastavka/[id]", params: { id: place.id } })}
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 48 }}
          >
            <T variant="body" style={{ flex: 1 }} numberOfLines={1}>
              {place.name}
            </T>
            <T variant="small">{formatDay(e.reachedDay)}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Kapitoly s postupem: kolik míst nitky už jste prošli. */
export function Chapters() {
  const { colors } = useTheme();
  const { walkedM, active } = useExpedition();
  if (vltavska.chapters.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      <T variant="strong">Kapitoly</T>
      {vltavska.chapters.map((c) => {
        const members = c.placeIds.map((id) => vltavska.placesById.get(id)!).filter(Boolean);
        const done = members.filter((m) => active && m.atM <= walkedM).length;
        return (
          <Card key={c.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <T variant="title">{c.title}</T>
              <T variant="small">
                {done} z {members.length}
              </T>
            </View>
            <View style={{ flexDirection: "row", gap: 4 }}>
              {members.map((m) => (
                <View key={m.id} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: active && m.atM <= walkedM ? colors.accent : colors.line }} />
              ))}
            </View>
            <T variant="muted">{c.blurb}</T>
          </Card>
        );
      })}
    </View>
  );
}
