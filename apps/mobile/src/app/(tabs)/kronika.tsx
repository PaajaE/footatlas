import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Screen, T } from "../../components/ui";
import { useChronicle } from "../../db/ChronicleProvider";
import { vltavska } from "../../data/vltavska";
import { formatDay, formatDayLong, formatKm } from "../../format";
import { useExpedition } from "../../state/ExpeditionProvider";
import { fromHealthSource } from "../../health/names";

const dayDate = (day: string) => new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
const longDay = (day: string) => `${formatDayLong(dayDate(day)).toLowerCase()} ${day.slice(0, 4)}`;
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

/** Statistiky kroniky z uložených dnů (docs/kronika-sqlite.md). Životní cesta a výpravy přijdou později. */
export default function Chronicle() {
  const { ready, stats, lastReadAt, sync, syncNow } = useChronicle();
  const { events, active } = useExpedition();
  const reached = events.filter((e) => e.kind === "place" || e.kind === "finish").sort((a, b) => b.atM - a.atM);
  const stagesDone = events.filter((e) => e.kind === "stage").length;
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? reached : reached.slice(0, 5);
  const empty = stats.daysWithRecord === 0;
  const busy = sync.kind === "syncing";

  return (
    <Screen>
      <T variant="display">Kronika</T>

      {active && (
        <Card style={{ gap: 6 }}>
          <T variant="label">Výprava</T>
          <T variant="title">{vltavska.name}</T>
          <T variant="muted">
            {stagesDone} z {vltavska.plan.stages.length} etap dokončeno · {reached.filter((e) => e.kind === "place").length} míst odemčeno
          </T>
          {reached.length === 0 ? (
            <T variant="small">Zatím žádné místo; první se odemkne po prvních ušlých metrech.</T>
          ) : (
            shown.map((e) => {
              const place = e.kind === "place" ? vltavska.placesById.get(e.ref) : null;
              return (
                <View key={`${e.kind}-${e.ref}`} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <T variant="body" style={{ flex: 1 }} numberOfLines={1}>
                    {e.kind === "finish" ? "Cíl výpravy" : (place?.name ?? e.ref)}
                  </T>
                  <T variant="small" style={{ flexShrink: 0 }}>
                    {formatDay(e.reachedDay)}
                  </T>
                </View>
              );
            })
          )}
          {reached.length > 5 && (
            <Button kind="secondary" label={showAll ? "Zobrazit méně" : `Zobrazit všechna (${reached.length})`} onPress={() => setShowAll(!showAll)} />
          )}
        </Card>
      )}

      {!ready ? (
        <T variant="muted">Načítám…</T>
      ) : empty ? (
        <Card style={{ gap: 12 }}>
          <T variant="muted">
            Kronika se plní z kroků a vzdálenosti {fromHealthSource()}. Po povolení se přečte celá dostupná historie a uloží se jen v tomto telefonu.
          </T>
          <Button label={busy ? "Načítám…" : "Načíst historii"} disabled={busy} onPress={() => syncNow(true)} />
        </Card>
      ) : (
        <>
          <Card style={{ gap: 4 }}>
            <T variant="label">Celkem</T>
            <T variant="display">{formatKm(stats.totalM, 0)}</T>
            <T variant="muted">
              od {longDay(stats.firstDay!)} · {stats.daysWithRecord} dní se záznamem
            </T>
            {stats.longestDay && (
              <T variant="muted">
                Nejdelší den {formatKm(stats.longestDay.distanceM)} ({longDay(stats.longestDay.day)})
              </T>
            )}
          </Card>

          <Card style={{ gap: 6 }}>
            <T variant="strong">Podle roků</T>
            {stats.byYear.map((y) => (
              <View key={y.year} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <T variant="body">{y.year}</T>
                <T variant="body">
                  {formatKm(y.distanceM, 0)} · {y.days} dní
                </T>
              </View>
            ))}
          </Card>

          <Card style={{ gap: 6 }}>
            <T variant="strong">Z čeho se kronika skládá</T>
            <T variant="muted">
              Ověřeno přímo ze zdravotních dat: {formatKm(stats.byConfidence.verified, 0)} ({pct(stats.byConfidence.verified, stats.totalM)} %)
            </T>
            <T variant="muted">
              Odhad z kroků podle vaší délky kroku: {formatKm(stats.byConfidence.estimated, 0)} ({pct(stats.byConfidence.estimated, stats.totalM)} %)
            </T>
            {stats.byConfidence.manual > 0 && <T variant="muted">Ručně zadáno: {formatKm(stats.byConfidence.manual, 0)}</T>}
          </Card>

          <Button kind="secondary" label={busy ? "Aktualizuji…" : "Aktualizovat"} disabled={busy} onPress={() => syncNow(false)} />
          {lastReadAt && <T variant="small">Naposledy přečteno {new Date(lastReadAt).toLocaleString("cs-CZ")}.</T>}
        </>
      )}

      {sync.kind === "error" && <T variant="small">Čtení se nepovedlo: {sync.message}</T>}
      {sync.kind === "unavailable" && (
        <T variant="small">
          {sync.reason === "denied" ? `Čtení ${fromHealthSource()} nebylo povoleno.` : `${fromHealthSource()} na tomto zařízení není dostupné.`}
        </T>
      )}
    </Screen>
  );
}
