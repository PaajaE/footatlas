import { localDateKey } from "@footatlas/core";
import { View } from "react-native";
import { isWithinLastDays, pluralNewPlaces, sumLastDays, tileDistance } from "../../home";
import { useExpedition } from "../../state/ExpeditionProvider";
import { StatTile } from "../StatTile";

/**
 * Hlavička Deníku: dlaždice Dnes (součet za celý den) a Za 7 dní, přesunuté z bývalé obrazovky Domů
 * (rozhodnutí 0034). Hodnoty jsou ze skutečných dat výpravy; bez rozjeté výpravy se nezobrazují.
 */
export function DiaryTiles() {
  const { daily, events, active } = useExpedition();
  if (!active) return null;
  const today = localDateKey(new Date());
  const todayM = sumLastDays(daily, today, 1);
  const weekM = sumLastDays(daily, today, 7);
  const weekPlaces = events.filter((e) => e.kind === "place" && isWithinLastDays(e.reachedDay, today, 7)).length;
  const todayPlaces = events.filter((e) => e.kind === "place" && e.reachedDay === today).length;
  const t = tileDistance(todayM);
  const w = tileDistance(weekM);
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <StatTile label="Dnes" value={t.value} unit={t.unit} note={todayPlaces > 0 ? pluralNewPlaces(todayPlaces) : undefined} />
      <StatTile label="Za 7 dní" value={w.value} unit={w.unit} note={weekPlaces > 0 ? pluralNewPlaces(weekPlaces) : undefined} />
    </View>
  );
}
