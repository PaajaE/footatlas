/**
 * Geometrie symbolů razítek (navrh-v2 § 6.1, rozhodnutí 0032): jen tahy, žádné výplně, kresleno pro viewBox 24×24
 * a jednu tloušťku linky (`GLYPH_STROKE`) se zaoblenými konci. Drobné šrafy (`hatch`) se kreslí tenčí linkou.
 * Čistá data bez Reactu, aby šla vykreslit v aplikaci, v testech i do PNG náhledu (scripts/razitka-nahled.mjs).
 */
import type { PlaceSymbol } from "@footatlas/content/src/symbols";

export const GLYPH_VIEWBOX = 24;
export const GLYPH_STROKE = 1.6;
/** Šrafy jsou tenčí, aby se v malém slily do stínu a nepřehlušily obrys. */
export const HATCH_STROKE = 0.9;

export interface GlyphStroke {
  d: string;
  hatch?: true;
}

const n = (v: number) => Number(v.toFixed(2)).toString();

/** Vlnka hladiny: `count` obloučků po `step` od `x` doprava. */
function wave(x: number, y: number, count: number, step = 3, amp = 1): string {
  let d = `M${n(x)} ${n(y)} q${n(step / 2)} ${n(-amp)} ${n(step)} 0`;
  for (let i = 1; i < count; i++) d += ` t${n(step)} 0`;
  return d;
}

/** Kružnice jako dva oblouky (tah, ne výplň). */
function ring(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)} a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0 a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0`;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function radial(cx: number, cy: number, r0: number, r1: number, deg: number): string {
  const [x0, y0] = polar(cx, cy, r0, deg);
  const [x1, y1] = polar(cx, cy, r1, deg);
  return `M${n(x0)} ${n(y0)} L${n(x1)} ${n(y1)}`;
}

const s = (d: string): GlyphStroke => ({ d });
const h = (d: string): GlyphStroke => ({ d, hatch: true });

/** Mlýnské kolo: obvod, náboj, šest loukotí a korečky po obvodu, dole voda. */
function mill(): GlyphStroke[] {
  const cx = 12;
  const cy = 10;
  const R = 6.6;
  const out: GlyphStroke[] = [s(ring(cx, cy, R)), s(ring(cx, cy, 1.4))];
  for (let i = 0; i < 3; i++) out.push(s(radial(cx, cy, 1.4, R, i * 60 + 30)), s(radial(cx, cy, 1.4, R, i * 60 + 210)));
  // Korečky: krátký výstupek ven a lomený konec ve směru otáčení, aby kolo nevypadalo jako kormidlo.
  for (let i = 0; i < 10; i++) {
    const a = i * 36;
    const [x0, y0] = polar(cx, cy, R, a);
    const [x1, y1] = polar(cx, cy, R + 1.9, a);
    const [x2, y2] = polar(cx, cy, R + 1.9, a + 14);
    out.push(s(`M${n(x0)} ${n(y0)} L${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)}`));
  }
  out.push(s(wave(1.5, 21.2, 7)));
  return out;
}

export const GLYPHS: Record<PlaceSymbol, GlyphStroke[]> = {
  // Val s palisádou na kopci.
  hradiste: [
    s("M2 20 Q12 9 22 20"),
    s("M8 15.4 V10.4"),
    s("M10.7 14.6 V9"),
    s("M13.3 14.6 V9"),
    s("M16 15.4 V10.4"),
    s("M6.6 12.4 H17.4"),
    h("M5 18.6 l1.6 -1.6"),
    h("M7.4 18.6 l1.6 -1.6"),
    h("M15 18.6 l1.6 -1.6"),
    h("M17.4 18.6 l1.6 -1.6"),
  ],
  // Průčelí se dvěma věžemi.
  zamek: [
    s("M2.5 20.5 H21.5"),
    s("M4 20.5 V9.5 H8.5 V20.5"),
    s("M3.4 9.5 L6.25 4 L9.1 9.5"),
    s("M15.5 20.5 V9.5 H20 V20.5"),
    s("M14.9 9.5 L17.75 4 L20.6 9.5"),
    s("M8.5 12.5 L12 9.5 L15.5 12.5"),
    s("M10.4 20.5 V17.6 a1.6 1.6 0 0 1 3.2 0 V20.5"),
    s("M6.25 12.5 V14"),
    s("M17.75 12.5 V14"),
  ],
  // Kamenný oblouk se dvěma pilíři.
  most: [
    s("M2 8.5 H22"),
    s("M2 11 H22"),
    s("M7.5 11 V19"),
    s("M16.5 11 V19"),
    s("M7.5 18 A4.5 5 0 0 1 16.5 18"),
    s("M2 14 Q6.6 14 7.5 18"),
    s("M22 14 Q17.4 14 16.5 18"),
    s(wave(3, 21.5, 6)),
  ],
  // Lehký oblouk lávky se závěsy.
  lavka: [
    s("M3 16 Q12 4 21 16"),
    s("M2 16 H22"),
    h("M7.5 11.5 V16"),
    h("M12 10 V16"),
    h("M16.5 11.5 V16"),
    s(wave(3, 20.5, 6)),
  ],
  // Ostrůvek se dvěma stromy ve vlnách.
  ostrov: [
    s("M4 16 Q12 10.5 20 16"),
    s("M10 13.4 V10.2"),
    s(ring(10, 7.6, 2.6)),
    s("M12.9 11.6 L14.8 5.6 L16.7 11.6 Z"),
    s("M14.8 11.6 V13.2"),
    s(wave(3, 18.5, 6)),
    s(wave(6, 21.5, 4)),
  ],
  // Vrata plavební komory.
  zdymadlo: [
    s("M3 4.5 H21"),
    s("M3 4.5 V18"),
    s("M21 4.5 V18"),
    s("M3 7.5 H21"),
    s("M3 17 H21"),
    s("M12 7.5 V17"),
    s("M3.8 16.2 L11.2 8.3"),
    s("M20.2 16.2 L12.8 8.3"),
    s(wave(3, 20.8, 6)),
  ],
  // Kotva.
  pristav: [
    s(ring(12, 4.3, 1.8)),
    s("M12 6.1 V20.5"),
    s("M8 9 H16"),
    s("M4.5 14 Q5.5 20.5 12 20.5 Q18.5 20.5 19.5 14"),
    s("M3 15.6 L4.5 14 L6.4 15"),
    s("M21 15.6 L19.5 14 L17.6 15"),
  ],
  // Loďka s veslem.
  privoz: [
    s("M2.5 13.5 H21.5 L18.6 17.5 H5.4 Z"),
    s("M6.5 4 L16.4 18.4"),
    s("M15.6 17.2 L17.8 20.4 L19.4 19.3 L17.2 16.1"),
    s(wave(2, 20.5, 4)),
  ],
  // Vor z klád s kormidelním veslem.
  vor: [
    s("M4.6 5.5 H17.4 a1.6 1.6 0 0 1 0 3.2 H4.6 a1.6 1.6 0 0 1 0 -3.2 Z"),
    s("M4.6 9.5 H17.4 a1.6 1.6 0 0 1 0 3.2 H4.6 a1.6 1.6 0 0 1 0 -3.2 Z"),
    s("M4.6 13.5 H17.4 a1.6 1.6 0 0 1 0 3.2 H4.6 a1.6 1.6 0 0 1 0 -3.2 Z"),
    s("M7 4.5 V17.7"),
    s("M15 4.5 V17.7"),
    s("M19 11.1 L22.5 8"),
    s(wave(3, 20.5, 6)),
  ],
  // Skalní stěna nad vodou.
  skala: [
    s("M2 18 L4 12.5 L6.5 11 L8 6 L11 4.5 L13 7 L15.5 6.5 L17 10 L19.5 11.5 L22 18 Z"),
    h("M8 6 L9.4 10.6"),
    h("M13 7 L12.2 11.8"),
    h("M17 10 L16.2 14"),
    h("M6.5 11 L7 15"),
    s(wave(3, 21.2, 6)),
  ],
  // Kostelní věž a střechy.
  obec: [
    s("M2 20.5 H22"),
    s("M10 20.5 V9.4 H14 V20.5"),
    s("M9.4 9.4 L12 3.4 L14.6 9.4"),
    s("M12 3.4 V1.6"),
    s("M12 12.5 V14.5"),
    s("M3.4 20.5 V15.4 L6.7 12.4 L10 15.4"),
    s("M14 15.4 L17.3 12.4 L20.6 15.4 V20.5"),
    s("M6.7 17 V18.6"),
    s("M17.3 17 V18.6"),
  ],
  // Lyra s notou.
  nota: [
    s("M8 18 C4.4 14.6 4 8.4 6.6 5.6"),
    s("M16 18 C19.6 14.6 20 8.4 17.4 5.6"),
    s("M6.6 5.6 q-1.6 -1.8 -3 -0.2"),
    s("M17.4 5.6 q1.6 -1.8 3 -0.2"),
    s("M5.8 8.6 H18.2"),
    s("M8 18 H16"),
    s("M10 20.5 H14"),
    s("M12 18 V20.5"),
    h("M9.4 8.6 V12.6"),
    h("M14.6 8.6 V18"),
    s(ring(11.1, 14.8, 1.25)),
    s("M12.35 14.8 V9.2 q1.4 0.8 1.4 2.4"),
  ],
  // Mlýnské kolo nad vodou.
  mlyn: mill(),
  // Hora na obzoru (Říp) a pole v popředí.
  vyhled: [
    s("M2 16 H22"),
    s("M5 16 C6.4 10 8.6 7.6 12 7.6 C15.4 7.6 17.6 10 19 16"),
    s("M11 7.7 V6.4 a1 1 0 0 1 2 0 V7.7"),
    h("M8.6 12.2 L10 14"),
    h("M11.4 11.4 L12.8 13.2"),
    h("M14.2 12.2 L15.6 14"),
    s("M2 19.5 Q8 17.8 14 19.5"),
    s("M10 22 Q16 20.2 22 22"),
  ],
  // Rákosí ve vodě.
  rakos: [
    s("M7.5 19 Q7.8 13 6.6 8.5"),
    s("M5.6 4.2 a1 1 0 0 1 2 0 V7.2 a1 1 0 0 1 -2 0 Z"),
    s("M12 19 V8.8"),
    s("M11 4.2 a1 1 0 0 1 2 0 V7.6 a1 1 0 0 1 -2 0 Z"),
    s("M12 3.2 V2"),
    s("M14.4 19 Q15 13.6 19.4 10"),
    s("M9.4 19 Q8.4 15.6 4 13.4"),
    s(wave(2.5, 19.6, 3)),
    s(wave(13.5, 19.6, 3)),
    s(wave(6, 22, 4)),
  ],
  // Dvě řeky, které se spojují v jednu.
  soutok: [
    s("M2 4.6 Q7.6 8 8.2 13.6 V21.5"),
    s("M22 4.6 Q16.4 8 15.8 13.6 V21.5"),
    s("M7.6 2.4 Q11.2 5.4 12 10 Q12.8 5.4 16.4 2.4"),
    s(wave(9.6, 16.4, 2, 2.4, 1)),
  ],
};
