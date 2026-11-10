import type { ImageSourcePropType } from "react-native";
import type { AppPlace } from "../data/vltavska";
import { sealKm, toRoman } from "../seal";
import { Seal } from "./Seal";

/**
 * Pečeť konce etapy (navrh-v2.md § 6.3, rozhodnutí 0033): vosk (`Seal` druhu `wax`) s římským číslem etapy
 * a symbolem cíle etapy, žádný plný červený kruh. Kresbu čísla a symbolu dodává `Seal` z balíku M; tady se jen
 * předají props (`roman`, `symbol`). Spread obchází kontrolu přebytečných props, dokud je `Seal` nezná.
 */
export function StageWax({
  stageIndex,
  place,
  photo,
  dateLabel,
  size,
  animate = false,
}: {
  stageIndex: number;
  /** Místo, u kterého etapa končí (jeho symbol a fotka); chybí, když etapa končí mimo místo. */
  place?: AppPlace;
  photo?: ImageSourcePropType;
  dateLabel: string;
  size: number;
  animate?: boolean;
}) {
  const roman = toRoman(stageIndex + 1);
  const props = {
    kind: "wax" as const,
    name: `Etapa ${roman}`,
    kmLabel: place ? sealKm(place.atM) : "",
    dateLabel,
    photo,
    roman,
    symbol: (place as (AppPlace & { symbol?: string }) | undefined)?.symbol,
    size,
    animate,
  };
  return <Seal {...props} />;
}
