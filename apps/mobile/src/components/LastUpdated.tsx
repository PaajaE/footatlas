import { useEffect, useState } from "react";
import { View } from "react-native";
import { healthSourceName } from "../health/names";
import { useExpedition } from "../state/ExpeditionProvider";
import { T } from "./ui";

/** Starší čtení než tohle už stojí za vysvětlení, proč kroky chybí. */
const STALE_MS = 2 * 60_000;

function ago(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "Aktualizováno právě teď";
  if (min < 60) return `Aktualizováno před ${min} min`;
  return `Aktualizováno před ${Math.floor(min / 60)} h`;
}

/** Kdy se naposledy četly kroky. Přepočítává se jednou za minutu. */
export function LastUpdated() {
  const { lastReadAt, session, demo } = useExpedition();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (demo.enabled || !session || !lastReadAt) return null;
  const age = Math.max(0, now - lastReadAt.getTime());
  return (
    <View style={{ gap: 2 }}>
      <T variant="small">{ago(age)}</T>
      {age > STALE_MS ? <T variant="small">Kroky zapisuje {healthSourceName()} s prodlevou.</T> : null}
    </View>
  );
}
