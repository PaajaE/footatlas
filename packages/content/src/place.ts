import { z } from "zod";

/** Šablona místa výpravy (spec 7.3). Plné zastávky vyžadují dva nezávislé zdroje. */
const source = z.object({ title: z.string().min(1), url: z.url() });
const image = z.object({
  url: z.url(),
  author: z.string().min(1),
  license: z.string().min(1),
});

const base = {
  id: z.string().min(1),
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** Odemkne se po ušlé vzdálenosti od startu, v metrech. */
  unlockAtM: z.number().nonnegative(),
};

export const stop = z.object({
  ...base,
  kind: z.literal("stop"),
  text: z.string().min(1),
  surprisingFact: z.string().min(1),
  image,
  sources: z.array(source).min(2),
  /** Datum poslední kontroly faktů, YYYY-MM-DD. */
  factCheckedOn: z.iso.date(),
  chapterId: z.string().optional(),
});

export const discovery = z.object({
  ...base,
  kind: z.literal("discovery"),
  text: z.string().min(1),
  image: image.optional(),
  sources: z.array(source).min(1),
});

export const place = z.discriminatedUnion("kind", [stop, discovery]);
export type Place = z.infer<typeof place>;
