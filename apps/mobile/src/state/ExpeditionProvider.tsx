import { AppState } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  computeState,
  isPaused,
  localDateKey,
  journeyEvents,
  markSeen as markSessionSeen,
  pauseSession,
  resolveStepLength,
  resumeSession,
  sessionSlices,
  sessionStart,
  startSession,
  walkedBySlice,
  type ExpeditionSession,
  type ExpeditionState,
  type JourneyEvent,
  type SliceDistance,
  type StepLength,
  type StepProfile,
} from "@footatlas/core";
import { vltavska } from "../data/vltavska";
import { healthSource } from "../health";
import { DEFAULT_DEMO, loadDemo, loadStepProfile, saveDemo, saveStepProfile, type DemoState } from "./storage";
import { loadJourneyEvents, loadSession, recordJourneyEvents, saveSession } from "./sessionStore";
import { FOREGROUND_INTERVAL_MS, shouldRefresh } from "./refreshPolicy";

export type DataStatus =
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "unavailable"; reason: string }
  | { kind: "error"; message: string };

interface ExpeditionContextValue {
  ready: boolean;
  demo: DemoState;
  session: ExpeditionSession | null;
  /** Výprava běží (nebo je zapnutý ukázkový postup). */
  active: boolean;
  paused: boolean;
  status: DataStatus;
  /** Dosažená místa, etapy a cíl rozjeté výpravy s dnem dosažení (uložené v databázi). */
  events: JourneyEvent[];
  /** Vzdálenost výpravy po úsecích a dnech (pro deník v Kronice); nejstarší první. */
  daySlices: SliceDistance[];
  /** Kdy se naposledy úspěšně přečetla zdravotní data. */
  lastReadAt: Date | null;
  /** Běží čtení vyvolané stažením prstem (jen pro kolečko obnovy). */
  refreshing: boolean;
  stepProfile: StepProfile;
  /** Délka kroku, kterou se kroky přepočítávají na vzdálenost. */
  stepLength: StepLength;
  setStepProfile: (p: StepProfile) => Promise<void>;
  walkedM: number;
  state: ExpeditionState;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Zapamatuje si, kam až uživatel viděl postup (pro „od posledně“). */
  markSeen: () => void;
  setDemo: (patch: Partial<DemoState>) => void;
  resetAll: () => Promise<void>;
}

const Ctx = createContext<ExpeditionContextValue | null>(null);

export function ExpeditionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [demo, setDemoState] = useState<DemoState>(DEFAULT_DEMO);
  const [session, setSession] = useState<ExpeditionSession | null>(null);
  /** Vzdálenost výpravy z posledního načtení zdravotních dat. */
  const [measuredM, setMeasuredM] = useState(0);
  const [status, setStatus] = useState<DataStatus>({ kind: "loading" });
  const [storedEvents, setEvents] = useState<JourneyEvent[]>([]);
  const [measuredSlices, setMeasuredSlices] = useState<SliceDistance[]>([]);
  const [lastReadAt, setLastReadAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const lastReadRef = useRef<number | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [stepProfile, setStepProfileState] = useState<StepProfile>({});
  const stepLength = useMemo(() => resolveStepLength(stepProfile), [stepProfile]);
  const sessionRef = useRef<ExpeditionSession | null>(null);
  sessionRef.current = session;
  const stepLengthRef = useRef(stepLength.meters);
  stepLengthRef.current = stepLength.meters;

  const persistSession = useCallback(async (next: ExpeditionSession | null) => {
    setSession(next);
    await saveSession(next);
  }, []);

  const readHealth = useCallback(async (s: ExpeditionSession | null) => {
    if (!s) {
      setMeasuredM(0);
      setMeasuredSlices([]);
      setEvents([]);
      setStatus({ kind: "ok" });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      const availability = await healthSource.availability();
      if (availability !== "available") {
        setMeasuredM(0);
        setMeasuredSlices([]);
        setStatus({ kind: "unavailable", reason: availability });
        return;
      }
      // Celé dny z denních součtů, části dne (den zahájení, pozastavení, obnovení) čtením intervalu.
      const now = new Date();
      const slices = sessionSlices(s, now);
      const [daily, intervalM] = await Promise.all([
        healthSource.readDaily(sessionStart(s), now, stepLengthRef.current),
        Promise.all(
          slices.map((x) => (x.whole || !healthSource.readInterval ? null : healthSource.readInterval(x.from, x.to, stepLengthRef.current))),
        ),
      ]);
      const perSlice = walkedBySlice(slices, daily, intervalM);
      setMeasuredM(perSlice.reduce((sum, x) => sum + x.distanceM, 0));
      setMeasuredSlices(perSlice);
      setStatus({ kind: "ok" });
      lastReadRef.current = now.getTime();
      setLastReadAt(now);
      // Den dosažení se počítá z dat, ne z okamžiku otevření aplikace; zapsané se už nemění.
      try {
        await recordJourneyEvents(journeyEvents(vltavska.plan, perSlice), now);
        setEvents(await loadJourneyEvents());
      } catch {
        // Události jsou doplněk; chyba databáze nesmí shodit načtení postupu.
      }
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  /** Čtení nikdy neběží paralelně: když jedno běží, další se přeskočí. */
  const refreshFor = useCallback(
    async (s: ExpeditionSession | null, queue = true) => {
      if (inFlightRef.current) {
        // Změna výpravy (start, pauza, délka kroku) nesmí zůstat bez nového čtení.
        if (queue) pendingRef.current = true;
        return;
      }
      inFlightRef.current = true;
      try {
        await readHealth(s);
        while (pendingRef.current) {
          pendingRef.current = false;
          await readHealth(sessionRef.current);
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [readHealth],
  );

  useEffect(() => {
    (async () => {
      const [d, s, p] = await Promise.all([loadDemo(), loadSession(), loadStepProfile()]);
      stepLengthRef.current = resolveStepLength(p).meters;
      setStepProfileState(p);
      setEvents(await loadJourneyEvents().catch(() => []));
      setDemoState(d);
      setSession(s);
      setReady(true);
      if (!d.enabled) await refreshFor(s);
      else setStatus({ kind: "ok" });
    })();
  }, [refreshFor]);

  const setStepProfile = useCallback(
    async (p: StepProfile) => {
      stepLengthRef.current = resolveStepLength(p).meters;
      setStepProfileState(p);
      await saveStepProfile(p);
      // Vzdálenost se z kroků počítá znovu, neukládá se (rozhodnutí 0004).
      if (!demo.enabled) await refreshFor(sessionRef.current);
    },
    [demo.enabled, refreshFor],
  );

  const start = useCallback(async () => {
    const s = startSession(vltavska.id, new Date());
    await persistSession(s);
    try {
      // Žádost o oprávnění až ve chvíli, kdy uživatel výpravu spouští (spec 9.1: nic se nežádá předem).
      const access = await healthSource.requestAccess();
      if (!access.read) {
        setMeasuredM(0);
        setStatus({ kind: "unavailable", reason: "denied" });
        return;
      }
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      return;
    }
    await refreshFor(s);
  }, [persistSession, refreshFor]);

  const pause = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    const next = pauseSession(s, new Date());
    await persistSession(next);
    // Znovu načíst, aby se započítal pohyb až do okamžiku pozastavení.
    await refreshFor(next);
  }, [persistSession, refreshFor]);

  const resume = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    const next = resumeSession(s, new Date());
    await persistSession(next);
    await refreshFor(next);
  }, [persistSession, refreshFor]);

  // Kolečko „obnovuji“ jen při stažení prstem; automatická čtení běží potichu.
  const refresh = useCallback(async () => {
    if (demo.enabled) return;
    setRefreshing(true);
    try {
      await refreshFor(sessionRef.current, false);
    } finally {
      setRefreshing(false);
    }
  }, [demo.enabled, refreshFor]);

  const demoRef = useRef(demo.enabled);
  demoRef.current = demo.enabled;

  // Při návratu do popředí načíst znovu (s minimálním odstupem).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setAppActive(next === "active");
      if (next !== "active" || demoRef.current || !sessionRef.current) return;
      if (shouldRefresh({ now: Date.now(), lastReadAt: lastReadRef.current, inFlight: inFlightRef.current })) {
        void refreshFor(sessionRef.current, false);
      }
    });
    return () => sub.remove();
  }, [refreshFor]);

  const setDemo = useCallback((patch: Partial<DemoState>) => {
    setDemoState((prev) => {
      const next = { ...prev, ...patch };
      void saveDemo(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(async () => {
    await persistSession(null);
    setEvents([]);
    setMeasuredM(0);
    setMeasuredSlices([]);
    setDemoState(DEFAULT_DEMO);
    await saveDemo(DEFAULT_DEMO);
    setStatus({ kind: "ok" });
  }, [persistSession]);

  // Dokud je aplikace v popředí a výprava běží, čte se jednou za minutu. Na pozadí nic.
  const polling = ready && appActive && !demo.enabled && session !== null && !isPaused(session);
  useEffect(() => {
    if (!polling) return;
    const id = setInterval(() => void refreshFor(sessionRef.current, false), FOREGROUND_INTERVAL_MS);
    return () => clearInterval(id);
  }, [polling, refreshFor]);

  const walkedM = demo.enabled ? demo.walkedM : session ? measuredM : 0;
  // V ukázkovém postupu se události dopočítají na místě (jako by vše bylo ušlé dnes) a neukládají se.
  const events = useMemo(
    () => (demo.enabled ? journeyEvents(vltavska.plan, [{ day: localDateKey(new Date()), distanceM: demo.walkedM }]) : storedEvents),
    [demo.enabled, demo.walkedM, storedEvents],
  );
  const daySlices = useMemo<SliceDistance[]>(
    () => (demo.enabled ? [{ day: localDateKey(new Date()), distanceM: demo.walkedM }] : measuredSlices),
    [demo.enabled, demo.walkedM, measuredSlices],
  );
  const previousM = demo.enabled ? demo.seenM : (session?.lastSeenWalkedM ?? 0);
  const active = demo.enabled || session !== null;
  const paused = !demo.enabled && session !== null && isPaused(session);

  const state = useMemo(
    () => computeState(vltavska.plan, walkedM, { previousWalkedM: previousM }),
    [walkedM, previousM],
  );

  const markSeen = useCallback(() => {
    if (demo.enabled) {
      if (demo.walkedM > demo.seenM) setDemo({ seenM: demo.walkedM });
      return;
    }
    const s = sessionRef.current;
    if (!s) return;
    const next = markSessionSeen(s, walkedM);
    if (next !== s) void persistSession(next);
  }, [demo, walkedM, persistSession, setDemo]);

  const value: ExpeditionContextValue = {
    ready,
    demo,
    session,
    active,
    paused,
    status,
    events,
    daySlices,
    lastReadAt,
    refreshing,
    stepProfile,
    stepLength,
    setStepProfile,
    walkedM,
    state,
    start,
    pause,
    resume,
    refresh,
    markSeen,
    setDemo,
    resetAll,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExpedition(): ExpeditionContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useExpedition mimo ExpeditionProvider");
  return v;
}
