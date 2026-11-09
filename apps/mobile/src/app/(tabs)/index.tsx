import { useRouter } from "expo-router";
import { changeDetails, summarizeChange } from "@footatlas/core";
import { Chapters, NextStopCard, RecentlyDiscovered, StageProgress, StatTiles } from "../../components/HomeSections";
import { WhereToday } from "../../components/WhereToday";
import { ReturnCard } from "../../components/ReturnCard";
import { LastUpdated } from "../../components/LastUpdated";
import { ScreenHeader } from "../../components/ScreenHeader";
import { LabeledCard } from "../../components/LabeledCard";
import { Button, Screen, T } from "../../components/ui";
import { vltavska } from "../../data/vltavska";
import { formatDayLong, formatKm } from "../../format";
import { fromHealthSource } from "../../health/names";
import { shouldShowReturn } from "../../navrat";
import { useExpedition } from "../../state/ExpeditionProvider";

export default function Home() {
  const router = useRouter();
  const ex = useExpedition();
  const { state, active, paused, status } = ex;

  if (!ex.ready) return <Screen>{null}</Screen>;

  const today = formatDayLong(new Date());
  const settings = () => router.push("/nastaveni");

  if (!active) {
    return (
      <Screen>
        <ScreenHeader date={today} title={vltavska.name} onSettings={settings} />
        <T variant="body">{vltavska.summary}</T>
        <LabeledCard label={vltavska.routeTypeLabel} gap={12}>
          <T variant="muted">
            {formatKm(vltavska.totalM)} ve {vltavska.plan.stages.length} etapách, {vltavska.places.length} míst na cestě.
            Počítá se jen pohyb od chvíle, kdy vyrazíte. Vaše historie zůstává v kronice.
          </T>
          <Button label="Vyrazit" onPress={ex.start} />
          <T variant="small">Při startu vás aplikace požádá o čtení kroků a vzdálenosti {fromHealthSource()}.</T>
        </LabeledCard>
        <StatusNote />
      </Screen>
    );
  }

  const previousM = ex.demo.enabled ? ex.demo.seenM : (ex.session?.lastSeenWalkedM ?? 0);
  const summary = summarizeChange(state, previousM, (id) => vltavska.placesById.get(id)?.name ?? id);
  const showReturn = shouldShowReturn({
    deltaM: summary.deltaM,
    newPlaceCount: state.newlyReached.length,
    newStageCount: state.newlyCompletedStages.length,
  });

  const dateLine = ex.demo.enabled ? `${today} · ukázkový postup` : paused ? `${today} · výprava je pozastavena` : today;

  return (
    <Screen top={16} gap={16} onRefresh={ex.demo.enabled ? undefined : ex.refresh} refreshing={ex.refreshing}>
      <ScreenHeader date={dateLine} title={vltavska.name} onSettings={settings} />
      {state.completed ? <T variant="label">Výprava dokončena</T> : null}
      {/* Pořadí bez opakování (rozhodnutí 0024): postup, od posledně, další zastávka, kam dnes dojdu, objevy, kapitoly. */}
      <StageProgress />
      <LastUpdated />
      <StatTiles />
      {showReturn && <ReturnCard fromM={previousM} toM={state.walkedM} details={changeDetails(summary)} />}
      {!state.completed && <NextStopCard />}
      <WhereToday />
      <RecentlyDiscovered />
      <Chapters />

      {paused && (
        <LabeledCard label="Pozastaveno" gap={10}>
          <T variant="muted">Postup máte uložený a nic se neztratí.</T>
          <Button label="Pokračovat" onPress={ex.resume} />
        </LabeledCard>
      )}
      <StatusNote />
    </Screen>
  );

  function StatusNote() {
    if (status.kind === "unavailable") {
      return (
        <T variant="small">
          {status.reason === "denied"
            ? `Čtení ${fromHealthSource()} nebylo povoleno. Postup se bez něj nepočítá.`
            : `Zdravotní data nejsou na tomto zařízení dostupná (${status.reason}).`}
        </T>
      );
    }
    if (status.kind === "error") return <T variant="small">Čtení dat selhalo: {status.message}</T>;
    return null;
  }
}
