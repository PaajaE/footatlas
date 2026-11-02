import type { JourneyEvent } from "@footatlas/core";

export { loadSession, saveSession } from "./storage";

/** Na webu se události výpravy neukládají (náhled obrazovek). */
export async function recordJourneyEvents(_events: readonly JourneyEvent[], _now: Date): Promise<void> {}

export async function loadJourneyEvents(): Promise<JourneyEvent[]> {
  return [];
}
