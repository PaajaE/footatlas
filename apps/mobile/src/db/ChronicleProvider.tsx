import type { SQLiteDatabase } from "expo-sqlite";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { chronicleDays, chronicleStats, syncFrom, type DailyRecord, type SourceId } from "@footatlas/core";
import { healthSource } from "../health";
import { useExpedition } from "../state/ExpeditionProvider";
import { lastReadAt as readLastReadAt, loadAllDays, recomputeStale, saveRaw } from "./chronicleStore";
import { getDatabase } from "./database";
import type { ChronicleValue, SyncState } from "./types";

const Ctx = createContext<ChronicleValue | null>(null);
const SOURCE: SourceId = healthSource.platform === "ios" ? "healthkit" : "health_connect";

/** Kronika v SQLite (docs/kronika-sqlite.md). Čtení zdravotních dat se spouští jen na výzvu uživatele nebo po prvním načtení. */
export function ChronicleProvider({ children }: { children: ReactNode }) {
  const { stepLength } = useExpedition();
  const dbRef = useRef<SQLiteDatabase | null>(null);
  const [ready, setReady] = useState(false);
  const [days, setDays] = useState<DailyRecord[]>([]);
  const [lastRead, setLastRead] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>({ kind: "idle" });
  const busy = useRef(false);
  const stepRef = useRef(stepLength.meters);
  stepRef.current = stepLength.meters;

  const reload = useCallback(async (db: SQLiteDatabase) => {
    setDays(chronicleDays(await loadAllDays(db)));
    setLastRead(await readLastReadAt(db, SOURCE));
  }, []);

  const syncNow = useCallback(
    async (askAccess: boolean) => {
      const db = dbRef.current;
      if (!db || busy.current) return;
      busy.current = true;
      setSync({ kind: "syncing" });
      try {
        const availability = await healthSource.availability();
        if (availability !== "available") {
          setSync({ kind: "unavailable", reason: availability });
          return;
        }
        if (askAccess) {
          const access = await healthSource.requestAccess();
          if (!access.read) {
            setSync({ kind: "unavailable", reason: "denied" });
            return;
          }
        }
        if (!healthSource.readRawDaily) throw new Error("Zdroj dat neumí číst surové denní součty.");
        const now = new Date();
        const from = syncFrom(await readLastReadAt(db, SOURCE), now);
        const raw = await healthSource.readRawDaily(from, now);
        await saveRaw(db, healthSource.platform, SOURCE, raw, stepRef.current, now);
        await recomputeStale(db, healthSource.platform, stepRef.current);
        await reload(db);
        setSync({ kind: "idle" });
      } catch (e) {
        setSync({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        busy.current = false;
      }
    },
    [reload],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await getDatabase();
        if (cancelled) return;
        dbRef.current = db;
        await reload(db);
        setReady(true);
        // Dál čte jen kronika, která už jednou načtená byla (oprávnění už uživatel dal).
        if ((await readLastReadAt(db, SOURCE)) !== null) void syncNow(false);
      } catch (e) {
        setSync({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload, syncNow]);

  // Po změně délky kroku se dny přepočítají z uložených surových hodnot, bez nového čtení dat.
  useEffect(() => {
    const db = dbRef.current;
    if (!ready || !db) return;
    void recomputeStale(db, healthSource.platform, stepLength.meters).then((n) => (n > 0 ? reload(db) : undefined));
  }, [ready, stepLength.meters, reload]);

  const stats = useMemo(() => chronicleStats(days), [days]);
  const value: ChronicleValue = { ready, days, stats, lastReadAt: lastRead, sync, syncNow };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChronicle(): ChronicleValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChronicle mimo ChronicleProvider");
  return v;
}
