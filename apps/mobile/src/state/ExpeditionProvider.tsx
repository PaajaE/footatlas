import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  computeState,
  isPaused,
  localDateKey,
  markSeen as markSessionSeen,
  pauseSession,
  resumeSession,
  sessionWalkedM,
  startSession,
  type DailyRecord,
  type ExpeditionSession,
  type ExpeditionState,
} from "@footatlas/core";
import { vltavska } from "../data/vltavska";
import { healthSource } from "../health";
import { DEFAULT_DEMO, loadDemo, loadSession, saveDemo, saveSession, type DemoState } from "./storage";

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
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [status, setStatus] = useState<DataStatus>({ kind: "loading" });
  const sessionRef = useRef<ExpeditionSession | null>(null);
  sessionRef.current = session;

  const persistSession = useCallback(async (next: ExpeditionSession | null) => {
    setSession(next);
    await saveSession(next);
  }, []);

  const refreshFor = useCallback(async (s: ExpeditionSession | null) => {
    if (!s) {
      setRecords([]);
      setStatus({ kind: "ok" });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      const availability = await healthSource.availability();
      if (availability !== "available") {
        setRecords([]);
        setStatus({ kind: "unavailable", reason: availability });
        return;
      }
      const from = new Date(`${s.periods[0]!.from}T00:00:00`);
      setRecords(await healthSource.readDaily(from, new Date()));
      setStatus({ kind: "ok" });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [d, s] = await Promise.all([loadDemo(), loadSession()]);
      setDemoState(d);
      setSession(s);
      setReady(true);
      if (!d.enabled) await refreshFor(s);
      else setStatus({ kind: "ok" });
    })();
  }, [refreshFor]);

  const today = () => localDateKey(new Date());

  const start = useCallback(async () => {
    const s = startSession(vltavska.id, today());
    await persistSession(s);
    try {
      // Žádost o oprávnění až ve chvíli, kdy uživatel výpravu spouští (spec 9.1: nic se nežádá předem).
      const access = await healthSource.requestAccess();
      if (!access.read) {
        setRecords([]);
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
    if (s) await persistSession(pauseSession(s, today()));
  }, [persistSession]);

  const resume = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    const next = resumeSession(s, today());
    await persistSession(next);
    await refreshFor(next);
  }, [persistSession, refreshFor]);

  const refresh = useCallback(async () => {
    if (!demo.enabled) await refreshFor(sessionRef.current);
  }, [demo.enabled, refreshFor]);

  const setDemo = useCallback((patch: Partial<DemoState>) => {
    setDemoState((prev) => {
      const next = { ...prev, ...patch };
      void saveDemo(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(async () => {
    await persistSession(null);
    setRecords([]);
    setDemoState(DEFAULT_DEMO);
    await saveDemo(DEFAULT_DEMO);
    setStatus({ kind: "ok" });
  }, [persistSession]);

  const walkedM = demo.enabled ? demo.walkedM : session ? sessionWalkedM(records, session) : 0;
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
