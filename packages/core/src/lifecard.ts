/** Orientační vzdálenosti po zemi z Prahy, v km (zaokrouhlené). */
const FROM_PRAGUE: ReadonlyArray<{ name: string; genitive: string; km: number }> = [
  { name: "Řím", genitive: "do Říma", km: 920 },
  { name: "Reykjavík", genitive: "do Reykjavíku", km: 2_500 },
  { name: "Dubaj", genitive: "do Dubaje", km: 4_500 },
  { name: "New York", genitive: "do New Yorku", km: 6_600 },
  { name: "Tokio", genitive: "do Tokia", km: 9_100 },
];

/** Věta pro kartu života, např. "To je z Prahy do Tokia a ještě 5 100 km navíc." */
export function lifeCardSentence(totalKm: number): string {
  const reached = [...FROM_PRAGUE].reverse().find((c) => c.km <= totalKm);
  if (!reached) return "Zatím jste na začátku cesty, ale ta vaše teprve začíná.";
  const extra = Math.round((totalKm - reached.km) / 100) * 100;
  const base = `To je z Prahy ${reached.genitive}`;
  return extra >= 100 ? `${base} a ještě ${fmt(extra)} km navíc.` : `${base}.`;
}

function fmt(n: number): string {
  return n.toLocaleString("cs-CZ").replace(/ /g, " ");
}
