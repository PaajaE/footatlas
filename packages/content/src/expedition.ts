import { z } from "zod";
import { draftPlace, place } from "./place";

/** Typ trasy (spec 5.4); každá trasa nese viditelný štítek. */
export const routeType = z.enum(["real", "simplified", "virtual", "symbolic", "imported"]);
export type RouteType = z.infer<typeof routeType>;

export const routeTypeLabel: Record<RouteType, string> = {
  real: "Skutečná trasa",
  simplified: "Zjednodušená trasa",
  virtual: "Vlastní virtuální trasa",
  symbolic: "Symbolická cesta",
  imported: "Skutečná trasa · vlastní import",
};

const chapter = z.object({ id: z.string().min(1), title: z.string().min(1) });

/**
 * Výprava jako obsahový balíček. Geometrie (body trasy) je v samostatném souboru `routeFile`,
 * aby se dala stahovat a ukládat odděleně. Vzdálenosti jsou v metrech od startu.
 */
export const expedition = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    summary: z.string().min(1),
    /** `draft`: obsah nemusí být ověřený, výpravu nelze vydat. */
    status: z.enum(["draft", "published"]),
    routeType,
    /** Odkud trasa pochází (nutné u `real` a `simplified`). */
    routeSource: z.string().min(1).optional(),
    routeFile: z.string().min(1),
    totalM: z.number().positive(),
    /** Konce etap v metrech; poslední je `totalM`. Chybí-li, rozdělí se rovnoměrně. */
    stageEndsM: z.array(z.number().positive()).optional(),
    chapters: z.array(chapter).default([]),
    places: z.array(z.union([place, draftPlace])).min(1),
  })
  .superRefine((e, ctx) => {
    const ids = new Set<string>();
    e.places.forEach((p, i) => {
      if (ids.has(p.id)) ctx.addIssue({ code: "custom", path: ["places", i, "id"], message: `Duplicitní id místa ${p.id}` });
      ids.add(p.id);
      if (p.unlockAtM > e.totalM) {
        ctx.addIssue({ code: "custom", path: ["places", i, "unlockAtM"], message: "Místo leží za koncem trasy" });
      }
      if (e.status === "published" && "draft" in p) {
        ctx.addIssue({ code: "custom", path: ["places", i, "draft"], message: `Místo ${p.id} je rozpracované, výprava nejde vydat` });
      }
      if ("chapterId" in p && p.chapterId && !e.chapters.some((c) => c.id === p.chapterId)) {
        ctx.addIssue({ code: "custom", path: ["places", i, "chapterId"], message: `Neznámá kapitola ${p.chapterId}` });
      }
    });
    if (e.stageEndsM) {
      const sorted = [...e.stageEndsM].sort((a, b) => a - b);
      if (sorted.at(-1) !== e.totalM) {
        ctx.addIssue({ code: "custom", path: ["stageEndsM"], message: "Poslední etapa musí končit v cíli" });
      }
    }
    if ((e.routeType === "real" || e.routeType === "simplified") && !e.routeSource) {
      ctx.addIssue({ code: "custom", path: ["routeSource"], message: "U skutečné a zjednodušené trasy uveďte zdroj geometrie a licenci" });
    }
  });
export type Expedition = z.infer<typeof expedition>;
