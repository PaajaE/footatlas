import type { ComponentType } from "react";
import Svg, { G, Path } from "react-native-svg";
import type { PlaceSymbol } from "@footatlas/content/src/symbols";
import { GLYPHS, GLYPH_STROKE, GLYPH_VIEWBOX, HATCH_STROKE } from "./glyphs";

export { GLYPHS, GLYPH_STROKE, GLYPH_VIEWBOX } from "./glyphs";

export interface GlyphProps {
  /** Barva inkoustu (rumělka, vosk, tužka). */
  color: string;
  /** Tloušťka hlavní linky ve viewBoxu 24; výchozí 1,6. Šrafy se zúží ve stejném poměru. */
  strokeWidth?: number;
  opacity?: number;
}

/**
 * Kresba symbolu jako skupina `<G>` ve viewBoxu 24×24, aby šla vložit do jiného SVG (razítko, pečeť)
 * přes `transform`. Samostatně se kreslí přes `StampSymbol`.
 */
function glyph(name: PlaceSymbol): ComponentType<GlyphProps> {
  function Glyph({ color, strokeWidth = GLYPH_STROKE, opacity = 1 }: GlyphProps) {
    const hatch = (strokeWidth * HATCH_STROKE) / GLYPH_STROKE;
    return (
      <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
        {GLYPHS[name].map((g, i) => (
          <Path key={i} d={g.d} strokeWidth={g.hatch ? hatch : strokeWidth} />
        ))}
      </G>
    );
  }
  Glyph.displayName = `Symbol(${name})`;
  return Glyph;
}

/** Jedna komponenta na symbol (navrh-v2 § 6.1). */
export const Hradiste = glyph("hradiste");
export const Zamek = glyph("zamek");
export const Most = glyph("most");
export const Lavka = glyph("lavka");
export const Ostrov = glyph("ostrov");
export const Zdymadlo = glyph("zdymadlo");
export const Pristav = glyph("pristav");
export const Privoz = glyph("privoz");
export const Vor = glyph("vor");
export const Skala = glyph("skala");
export const Obec = glyph("obec");
export const Nota = glyph("nota");
export const Mlyn = glyph("mlyn");
export const Vyhled = glyph("vyhled");
export const Rakos = glyph("rakos");
export const Soutok = glyph("soutok");

/** Mapa symbol → komponenta. */
export const STAMP_SYMBOLS: Record<PlaceSymbol, ComponentType<GlyphProps>> = {
  hradiste: Hradiste,
  zamek: Zamek,
  most: Most,
  lavka: Lavka,
  ostrov: Ostrov,
  zdymadlo: Zdymadlo,
  pristav: Pristav,
  privoz: Privoz,
  vor: Vor,
  skala: Skala,
  obec: Obec,
  nota: Nota,
  mlyn: Mlyn,
  vyhled: Vyhled,
  rakos: Rakos,
  soutok: Soutok,
};

/** Popisky symbolů pro čtečku obrazovky a vývojový náhled. */
export const SYMBOL_LABELS: Record<PlaceSymbol, string> = {
  hradiste: "hradiště",
  zamek: "zámek",
  most: "most",
  lavka: "lávka",
  ostrov: "ostrov",
  zdymadlo: "zdymadlo",
  pristav: "přístav",
  privoz: "přívoz",
  vor: "vor",
  skala: "skála",
  obec: "obec",
  nota: "hudba",
  mlyn: "mlýn",
  vyhled: "výhled",
  rakos: "rákosí",
  soutok: "soutok",
};

/**
 * Symbol vložený do rodičovského SVG: čtverec o straně `size` s levým horním rohem v (`x`, `y`) v souřadnicích rodiče.
 * `strokeWidth` je ve viewBoxu 24 (výchozí 1,6); u malých razítek ji lze zesílit, aby linka nezmizela.
 */
export function SymbolAt({ symbol, x, y, size, ...rest }: { symbol: PlaceSymbol; x: number; y: number; size: number } & GlyphProps) {
  const Glyph = STAMP_SYMBOLS[symbol];
  return (
    <G transform={`translate(${x} ${y}) scale(${size / GLYPH_VIEWBOX})`}>
      <Glyph {...rest} />
    </G>
  );
}

/** Samostatný symbol (náhled, seznamy). */
export function StampSymbol({ symbol, size = 28, ...rest }: { symbol: PlaceSymbol; size?: number } & GlyphProps) {
  const Glyph = STAMP_SYMBOLS[symbol];
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${GLYPH_VIEWBOX} ${GLYPH_VIEWBOX}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Glyph {...rest} />
    </Svg>
  );
}
