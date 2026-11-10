import type { Theme } from "@footatlas/content";
import temataJson from "@footatlas/content/data/temata.json";
import type { TTheme } from "../temata";

/**
 * Témata atlasu (rozhodnutí 0031). Sdílí je všechny výpravy, proto žijí mimo složku výpravy.
 * Schéma ověřují testy v `packages/content`; tady se jen převezmou.
 */
export const themes: readonly TTheme[] = (temataJson as unknown as { themes: Theme[] }).themes;

export const themesById: ReadonlyMap<string, TTheme> = new Map(themes.map((t) => [t.id, t]));
