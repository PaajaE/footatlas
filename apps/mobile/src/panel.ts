/** Polohy vysouvacího panelu Výpravy (docs/navrh-v2.md § 4): sbalený, poloviční (výchozí), celý. Bez Reactu. */

export type PanelSnap = "collapsed" | "half" | "full";
export const PANEL_SNAPS: readonly PanelSnap[] = ["collapsed", "half", "full"];

/** Výšky poloh pro výšku obrazovky `screenH`; sbalený ukazuje jen hlavičku (`headerH`), celý nechá nahoře `topGap`. */
export function panelHeights(screenH: number, headerH: number, topGap: number): Record<PanelSnap, number> {
  const full = Math.max(headerH, screenH - topGap);
  const half = Math.min(full, Math.max(headerH, Math.round(screenH * 0.5)));
  return { collapsed: Math.min(headerH, full), half, full };
}

/** Rychlost tahu (body za ms), od které panel skočí o polohu ve směru tahu bez ohledu na vzdálenost. */
export const FLING_V = 0.5;

/**
 * Kam panel dosedne po puštění: při rychlém tahu o polohu dál ve směru tahu (`vy` < 0 nahoru),
 * jinak k nejbližší výšce.
 */
export function snapAfterDrag(heights: Record<PanelSnap, number>, from: PanelSnap, h: number, vy: number): PanelSnap {
  const i = PANEL_SNAPS.indexOf(from);
  if (vy <= -FLING_V) return PANEL_SNAPS[Math.min(PANEL_SNAPS.length - 1, i + 1)]!;
  if (vy >= FLING_V) return PANEL_SNAPS[Math.max(0, i - 1)]!;
  let best: PanelSnap = from;
  for (const s of PANEL_SNAPS) if (Math.abs(heights[s] - h) < Math.abs(heights[best] - h)) best = s;
  return best;
}

/** Klepnutí na úchyt: sbalený → poloviční → celý → poloviční … (z celého se vrací dolů). */
export function snapAfterTap(from: PanelSnap): PanelSnap {
  return from === "half" ? "full" : "half";
}
