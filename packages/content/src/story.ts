import { z } from "zod";

/** Zdroj příběhu místa. */
const source = z.object({ title: z.string().min(1), url: z.url() });

/** Hádanka před odemčením: tři možnosti, jedna správná. */
export const riddle = z.object({
  question: z.string().min(1).max(110),
  options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
  answer: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});
export type Riddle = z.infer<typeof riddle>;

/** Příběh jednoho místa (návrh 5.1): háček, hádanka, kontext, tip na návštěvu. */
export const story = z.object({
  /** Id místa z výpravy. */
  id: z.string().min(1),
  /** Překvapivý fakt nebo pointa, ukáže se po odemčení. */
  hook: z.string().min(1).max(160),
  /** Nápověda u zamčeného místa. */
  teaser: z.string().min(1).max(100).optional(),
  riddle: riddle.optional(),
  context: z.string().min(1).max(400).optional(),
  /** „Až tam jednou půjdete“. */
  visitTip: z.string().min(1).max(220).optional(),
  chapterId: z.string().min(1).optional(),
  sources: z.array(source).min(1),
  /** Fakta prošla kontrolou dvěma zdroji. */
  verified: z.boolean(),
});
export type Story = z.infer<typeof story>;

/** Kapitola: nitka příběhu přes víc míst jedné výpravy (rozhodnutí 0026). */
export const storyChapter = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Název ve 2. pádě pro věty „do uzavření Mostů a lávek“. */
  titleGenitive: z.string().min(1).optional(),
  blurb: z.string().min(1),
  /** Téma atlasu, do kterého kapitola patří (`data/temata.json`, rozhodnutí 0031). */
  themeId: z.string().min(1).optional(),
  /** Úvod kapitoly, začátek příběhu (2–3 věty). */
  intro: z.string().min(1).max(400).optional(),
  /** Závěr po uzavření kapitoly (2–3 věty). */
  outro: z.string().min(1).max(400).optional(),
  /** Fakta prošla kontrolou dvěma zdroji. */
  verified: z.boolean().optional(),
});
export type StoryChapter = z.infer<typeof storyChapter>;

/** Soubor s obsahem výpravy (`obsah.json`). */
export const storyFile = z
  .object({
    expeditionId: z.string().min(1),
    chapters: z.array(storyChapter),
    stories: z.array(story),
  })
  .superRefine((f, ctx) => {
    const chapterIds = new Set<string>();
    f.chapters.forEach((c, i) => {
      if (chapterIds.has(c.id)) ctx.addIssue({ code: "custom", path: ["chapters", i, "id"], message: `Duplicitní kapitola ${c.id}` });
      chapterIds.add(c.id);
    });
    const ids = new Set<string>();
    f.stories.forEach((s, i) => {
      if (ids.has(s.id)) ctx.addIssue({ code: "custom", path: ["stories", i, "id"], message: `Duplicitní příběh ${s.id}` });
      ids.add(s.id);
      if (s.chapterId && !chapterIds.has(s.chapterId)) {
        ctx.addIssue({ code: "custom", path: ["stories", i, "chapterId"], message: `Neznámá kapitola ${s.chapterId}` });
      }
    });
  });
export type StoryFile = z.infer<typeof storyFile>;
