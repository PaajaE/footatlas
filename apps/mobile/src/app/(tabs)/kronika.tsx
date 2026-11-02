import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { CollectionsView } from "../../components/kronika/CollectionsView";
import { DiaryView } from "../../components/kronika/DiaryView";
import { LifeHero } from "../../components/kronika/LifeHero";
import { LifePathView } from "../../components/kronika/LifePathView";
import { Segmented } from "../../components/kronika/Segmented";
import { YearView } from "../../components/kronika/YearView";
import { Button, Card, Screen, T } from "../../components/ui";
import { useChronicle } from "../../db/ChronicleProvider";
import { vltavska } from "../../data/vltavska";
import { fromHealthSource } from "../../health/names";
import { diaryCards, buildDiary } from "../../kronika/diary";
import { distanceSentence, estimateSteps, lifeRoute, longestDaySentence } from "../../kronika/earth";
import { useExpedition } from "../../state/ExpeditionProvider";
import { loadLifeCardSeen, saveLifeCardSeen } from "../../state/storage";
import { localDateKey } from "@footatlas/core";

type Tab = "denik" | "cesta" | "rok" | "sbirky";
const TABS = [
  { key: "denik", label: "Deník" },
  { key: "cesta", label: "Cesta" },
  { key: "rok", label: "Rok" },
  { key: "sbirky", label: "Sbírky" },
] as const;

const MONTHS_GEN = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
/** „března 2019“ pro větu „píše se od …“. */
function sinceLabel(day: string): string {
  return `${MONTHS_GEN[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;
}

/** Kronika: zeměkoule s ušlou vzdáleností a přepínač Deník / Cesta / Rok / Sbírky (docs/design-prototyp.md). */
export default function Chronicle() {
  const router = useRouter();
  const { ready, stats, days, lastReadAt, sync, syncNow } = useChronicle();
  const { active, walkedM, state, events, daySlices, stepLength } = useExpedition();
  const [tab, setTab] = useState<Tab>("denik");
  const empty = stats.daysWithRecord === 0;
  const busy = sync.kind === "syncing";

  // Karta života se ukáže jednou po prvním načtení historie (když ji uživatel právě vyvolal).
  const wantCard = useRef(false);
  useEffect(() => {
    if (!wantCard.current || empty) return;
    wantCard.current = false;
    void loadLifeCardSeen().then((seen) => {
      if (seen) return;
      void saveLifeCardSeen();
      router.push("/karta-zivota");
    });
  }, [empty, router]);

  const today = localDateKey(new Date());
  const cards = useMemo(() => {
    const nameOf = (id: string) => vltavska.placesById.get(id)?.name ?? id;
    const diary = buildDiary(daySlices, events, nameOf, stepLength.meters);
    const next = state.next;
    return diaryCards(diary, today, next && state.toNextM !== null ? { name: nameOf(next.id), remainingM: state.toNextM } : null);
  }, [daySlices, events, stepLength.meters, state.next, state.toNextM, today]);

  const total = stats.totalM;
  const facts = [
    distanceSentence(total),
    stats.longestDay ? longestDaySentence(stats.longestDay.distanceM, { name: vltavska.name, totalM: vltavska.totalM }) : null,
  ].filter((f): f is string => f !== null);
  const route = useMemo(() => lifeRoute(days), [days]);

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <T variant="display">Kronika</T>
        {stats.firstDay && (
          <T variant="small" style={{ fontSize: 13, paddingBottom: 6 }}>
            píše se od {sinceLabel(stats.firstDay)}
          </T>
        )}
      </View>

      {!ready ? (
        <T variant="muted">Načítám…</T>
      ) : empty ? (
        <Card style={{ gap: 12 }}>
          <T variant="muted">
            Kronika se plní z kroků a vzdálenosti {fromHealthSource()}. Po povolení se přečte celá dostupná historie a uloží se jen v tomto telefonu.
          </T>
          <Button
            label={busy ? "Načítám…" : "Načíst historii"}
            disabled={busy}
            onPress={() => {
              wantCard.current = true;
              void syncNow(true);
            }}
          />
        </Card>
      ) : (
        <LifeHero totalM={total} steps={estimateSteps(total, stepLength.meters)} facts={facts} onPress={() => router.push("/karta-zivota")} />
      )}

      <Segmented items={TABS} value={tab} onChange={setTab} />

      {tab === "denik" && (
        <>
          {active ? (
            <DiaryView cards={cards} scaleM={walkedM} />
          ) : (
            <Card style={{ gap: 4 }}>
              <T variant="strong">Deník se začne psát s první výpravou</T>
              <T variant="muted">Každý den na výpravě tu dostane svou kartu: ujetou trasu, místa, která jste odemkli, a krátký postřeh.</T>
            </Card>
          )}
        </>
      )}
      {tab === "cesta" && <LifePathView route={route} firstDay={stats.firstDay} />}
      {tab === "rok" && <YearView days={days} by={stats.byConfidence} stepLengthM={stepLength.meters} />}
      {tab === "sbirky" && (
        <CollectionsView
          active={active}
          walkedM={walkedM}
          nextStop={state.toNextM !== null ? { remainingM: state.toNextM } : null}
        />
      )}

      {!empty && ready && (
        <View style={{ gap: 6 }}>
          <Button kind="secondary" label={busy ? "Aktualizuji…" : "Aktualizovat"} disabled={busy} onPress={() => syncNow(false)} />
          {lastReadAt && <T variant="small">Naposledy přečteno {new Date(lastReadAt).toLocaleString("cs-CZ")}.</T>}
        </View>
      )}

      {sync.kind === "error" && <T variant="small">Čtení se nepovedlo: {sync.message}</T>}
      {sync.kind === "unavailable" && sync.reason !== "unsupported" && (
        <T variant="small">
          {sync.reason === "denied" ? `Čtení ${fromHealthSource()} nebylo povoleno.` : `${fromHealthSource()} na tomto zařízení není dostupné.`}
        </T>
      )}
    </Screen>
  );
}
