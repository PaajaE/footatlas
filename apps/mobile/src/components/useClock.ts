import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hodiny přehrávání: `elapsedMs` roste od 0 do `totalMs` (krok ≈ 50 ms), `skip` skočí na konec, `restart` začne znovu.
 * `pause` a `resume` hodiny zastaví a pustí dál od stejného času (návrat z detailu místa), `seek` skočí na daný čas
 * (tlačítko „Dál“ u zastavení). S `instant` (hotové hned) se nepřehrává vůbec.
 */
export function useClock(totalMs: number, instant = false) {
  const [elapsed, setElapsed] = useState(instant ? totalMs : 0);
  const [runKey, setRunKey] = useState(0);
  const [paused, setPaused] = useState(false);
  /** Mění se při každém skoku, aby se počátek odměřování nastavil znovu. */
  const [epoch, setEpoch] = useState(0);
  const at = useRef(instant ? totalMs : 0);

  // Nové přehrání (jiná délka, „Přehrát znovu“).
  useEffect(() => {
    const start = instant || totalMs <= 0 ? totalMs : 0;
    at.current = start;
    setElapsed(start);
    setPaused(false);
    setEpoch((k) => k + 1);
  }, [totalMs, instant, runKey]);

  useEffect(() => {
    if (paused || at.current >= totalMs) return;
    const origin = Date.now() - at.current;
    const timer = setInterval(() => {
      const e = Math.min(totalMs, Date.now() - origin);
      at.current = e;
      setElapsed(e);
      if (e >= totalMs) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [paused, epoch, totalMs]);

  const seek = useCallback(
    (ms: number) => {
      at.current = Math.min(totalMs, Math.max(0, ms));
      setElapsed(at.current);
      setEpoch((k) => k + 1);
    },
    [totalMs],
  );
  const skip = useCallback(() => seek(totalMs), [seek, totalMs]);
  const restart = useCallback(() => setRunKey((k) => k + 1), []);
  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);
  return { elapsedMs: elapsed, finished: elapsed >= totalMs, paused, skip, restart, seek, pause, resume, runKey };
}
