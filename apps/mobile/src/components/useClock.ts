import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hodiny přehrávání: `elapsedMs` roste od 0 do `totalMs` (krok ≈ 50 ms), `skip` skočí na konec, `restart` začne znovu.
 * S `instant` (při „Omezit pohyb“) jsou hotové hned.
 */
export function useClock(totalMs: number, instant = false) {
  const [elapsed, setElapsed] = useState(instant ? totalMs : 0);
  const [runKey, setRunKey] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    stop();
    if (instant || totalMs <= 0) {
      setElapsed(totalMs);
      return;
    }
    setElapsed(0);
    const start = Date.now();
    timer.current = setInterval(() => {
      const e = Math.min(totalMs, Date.now() - start);
      setElapsed(e);
      if (e >= totalMs) stop();
    }, 50);
    return stop;
  }, [totalMs, instant, runKey]);

  const skip = useCallback(() => {
    stop();
    setElapsed(totalMs);
  }, [totalMs]);
  const restart = useCallback(() => setRunKey((k) => k + 1), []);
  return { elapsedMs: elapsed, finished: elapsed >= totalMs, skip, restart, runKey };
}
