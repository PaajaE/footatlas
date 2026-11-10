import Svg, { Circle, Line, Path } from "react-native-svg";

/** Velikost kresby pera a bod hrotu v ní (levý dolní roh): podle něj se pero přikládá na konec čáry. */
export const PEN_SIZE = 34;
export const PEN_NIB = { x: 3, y: 31 };

/**
 * Hrot pera na konci kreslené čáry (rozhodnutí 0033): kovové pero s průřezem a násadkou, šikmo zprava nahoře,
 * a kapka inkoustu na hrotu. Barvy dodá volající (inkoust = barva ušlé trasy, kov = okr motivu).
 */
export function PenTip({ ink, metal, paper }: { ink: string; metal: string; paper: string }) {
  return (
    <Svg width={PEN_SIZE} height={PEN_SIZE} viewBox="0 0 34 34">
      {/* Násadka. */}
      <Path d="M13 15 L25 3 Q28 1 31 4 Q33 7 30 9 L19 21 Z" fill={ink} stroke={paper} strokeWidth={1} strokeLinejoin="round" />
      {/* Kovový hrot. */}
      <Path d="M3 31 L11 14 L20 23 Z" fill={metal} stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
      <Line x1={3.6} y1={30.4} x2={13} y2={21} stroke={ink} strokeWidth={1} strokeLinecap="round" />
      <Circle cx={13.4} cy={20.6} r={1.3} fill={ink} />
      {/* Kapka inkoustu na hrotu. */}
      <Circle cx={PEN_NIB.x} cy={PEN_NIB.y} r={2.2} fill={ink} />
    </Svg>
  );
}
