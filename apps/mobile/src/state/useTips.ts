import { useCallback, useEffect, useState } from "react";
import type { Tip } from "../riddle";
import { loadTips, saveTips } from "./storage";

/** Tipy k hádankám. Načtou se při otevření obrazovky; `setTip` je zapíše hned i do telefonu. */
export function useTips() {
  const [tips, setTips] = useState<Record<string, Tip>>({});
  useEffect(() => {
    let cancelled = false;
    loadTips().then((t) => {
      if (!cancelled) setTips(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const setTip = useCallback((placeId: string, tip: Tip) => {
    setTips((prev) => {
      const next = { ...prev, [placeId]: tip };
      void saveTips(next);
      return next;
    });
  }, []);
  return { tips, setTip };
}
