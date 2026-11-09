import { z } from "zod";

/**
 * Symboly razítek a pečetí (návrh v2 § 6.1). Téma má symbol své pečeti (§ 6.3).
 * Seznam sdílí s balíkem M (razítka), který přidá `symbol` i místům.
 */
export const THEME_SYMBOLS = [
  "hradiste", "zamek", "most", "lavka", "ostrov", "zdymadlo", "pristav", "privoz",
  "vor", "skala", "obec", "nota", "mlyn", "vyhled", "rakos", "soutok",
] as const;
export const themeSymbol = z.enum(THEME_SYMBOLS);
export type ThemeSymbol = z.infer<typeof themeSymbol>;

/** Tvary počítaného slova pro věty („1 most“, „3 mosty“, „10 mostů“). */
export const themeUnit = z.object({
  one: z.string().min(1),
  few: z.string().min(1),
  many: z.string().min(1),
});
export type ThemeUnit = z.infer<typeof themeUnit>;

/**
 * Téma: prochází celým atlasem a roste s každou výpravou (návrh v2 § 7, rozhodnutí 0031).
 * Kapitoly různých výprav se stejným `themeId` se v tématu sčítají.
 */
export const theme = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Název ve 2. pádě („Počátků Čech“). */
  titleGenitive: z.string().min(1),
  symbol: themeSymbol,
  /** Úvod tématu (2–3 věty), nezávislý na konkrétní výpravě. */
  intro: z.string().min(1).max(400),
  /** Milníky v počtu odemčených míst, vzestupně (např. 3, 10, 25). */
  milestones: z
    .array(z.number().int().positive())
    .min(1)
    .refine((m) => m.every((x, i) => i === 0 || x > m[i - 1]!), "Milníky musí být ostře vzestupné"),
  /** Jak se místům tématu říká ve větách; chybí-li, použije se „místo“. */
  unit: themeUnit.optional(),
  /** Fakta prošla kontrolou dvěma zdroji. */
  verified: z.boolean(),
});
export type Theme = z.infer<typeof theme>;

/** Soubor témat sdílený všemi výpravami (`data/temata.json`). */
export const themeFile = z
  .object({ themes: z.array(theme).min(1) })
  .superRefine((f, ctx) => {
    const ids = new Set<string>();
    f.themes.forEach((t, i) => {
      if (ids.has(t.id)) ctx.addIssue({ code: "custom", path: ["themes", i, "id"], message: `Duplicitní téma ${t.id}` });
      ids.add(t.id);
    });
  });
export type ThemeFile = z.infer<typeof themeFile>;

/** Načte a ověří soubor témat; při chybě vyhodí výjimku s popisem. */
export function parseThemes(raw: unknown): Theme[] {
  return themeFile.parse(raw).themes;
}

/**
 * Křížová kontrola obsahu výpravy proti tématům: každá kapitola musí mít `themeId`
 * a to musí existovat. Vrací seznam chyb (prázdný = v pořádku).
 */
export function checkChapterThemes(
  chapters: ReadonlyArray<{ id: string; themeId?: string }>,
  themes: ReadonlyArray<{ id: string }>,
): string[] {
  const known = new Set(themes.map((t) => t.id));
  const issues: string[] = [];
  for (const c of chapters) {
    if (!c.themeId) issues.push(`Kapitola ${c.id} nemá themeId`);
    else if (!known.has(c.themeId)) issues.push(`Kapitola ${c.id} odkazuje na neznámé téma ${c.themeId}`);
  }
  return issues;
}
