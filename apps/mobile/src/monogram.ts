/** Monogram místa pro pečeti ve Sbírkách a zástupný obrázek místa bez fotky. Čistá logika, bez Reactu. */

/** Krátká slova, která do monogramu nepatří („Výhled na Říp“ → „VŘ“, ne „VNŘ“). */
const SKIP = new Set(["a", "u", "v", "ve", "na", "nad", "pod", "do", "od", "z", "ze", "k", "ke", "s", "se", "o", "po", "při", "za", "před", "mezi", "the"]);

function words(name: string): string[] {
  return name
    .split(/[\s\-–—/·,.()„“"']+/u)
    .map((w) => w.trim())
    .filter((w) => /\p{L}/u.test(w));
}

const firstLetter = (w: string): string => (w.match(/\p{L}/u)?.[0] ?? "").toLocaleUpperCase("cs");

/** Za těmito slovy následuje jen zeměpisné upřesnění („Libčice nad Vltavou“), do monogramu se nebere. */
const QUALIFIER = new Set(["nad", "pod"]);

/**
 * Monogram z názvu místa: první písmena prvního a posledního významného slova („Červený mlýn“ → „ČM“,
 * „Zámek Veltrusy“ → „ZV“, „Výhled na Říp“ → „VŘ“, „Plavební komora Troja“ → „PT“). Upřesnění „nad …“ a „pod …“
 * se vynechá, takže „Libčice nad Vltavou“ je jednoslovná. Jednoslovný název dá první dvě písmena („Vepřek“ → „Ve“).
 * Prázdný nebo nepísmenný název dá „?“.
 */
export function placeMonogram(name: string): string {
  let all = words(name);
  const cut = all.findIndex((w, i) => i > 0 && QUALIFIER.has(w.toLocaleLowerCase("cs")));
  if (cut > 0) all = all.slice(0, cut);
  if (all.length === 0) return "?";
  const significant = all.filter((w) => !SKIP.has(w.toLocaleLowerCase("cs")));
  const use = significant.length > 0 ? significant : all;
  if (use.length === 1) {
    const letters = [...use[0]!].filter((ch) => /\p{L}/u.test(ch));
    if (letters.length < 2) return firstLetter(use[0]!);
    return letters[0]!.toLocaleUpperCase("cs") + letters[1]!.toLocaleLowerCase("cs");
  }
  return firstLetter(use[0]!) + firstLetter(use[use.length - 1]!);
}

/** Celý seznam monogramů; když se dva shodují, u druhého a dalších se přidá pořadí („ZV“, „ZV²“). */
export function uniqueMonograms(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  const SUP = ["", "", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
  return names.map((n) => {
    const m = placeMonogram(n);
    const count = (seen.get(m) ?? 0) + 1;
    seen.set(m, count);
    return count === 1 ? m : `${m}${SUP[count] ?? count}`;
  });
}
