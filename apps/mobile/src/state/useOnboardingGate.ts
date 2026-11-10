import { useEffect, useState } from "react";
import { useChronicle } from "../db/ChronicleProvider";
import { onboardingGate, type GateDecision } from "../onboarding";
import { useExpedition } from "./ExpeditionProvider";
import { useOnboarding } from "./OnboardingProvider";

/** Po této době se na kroniku přestane čekat; chybná databáze nesmí držet splash screen. */
const CHRONICLE_WAIT_MS = 2500;

/** Rozhodne, zda se při spuštění ukáže úvod. Existující uživatelé se tiše poznačí jako hotoví. */
export function useOnboardingGate(): GateDecision {
  const onb = useOnboarding();
  const ex = useExpedition();
  const chronicle = useChronicle();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), CHRONICLE_WAIT_MS);
    return () => clearTimeout(id);
  }, []);

  const decision = onboardingGate({
    flagLoaded: onb.loaded,
    done: onb.done,
    expeditionReady: ex.ready,
    hasSession: ex.session !== null,
    chronicleReady: chronicle.ready,
    hasHistory: chronicle.stats.daysWithRecord > 0,
    chronicleTimedOut: timedOut,
  });

  const { complete } = onb;
  useEffect(() => {
    if (decision === "skip" && !onb.done) complete();
  }, [decision, onb.done, complete]);

  return decision;
}
