import type { ImageSourcePropType } from "react-native";
import type { AppPlace } from "../data/vltavska";
import { vltavska } from "../data/vltavska";
import { toRoman } from "../seal";
import { Seal } from "./Seal";

/**
 * Pečeť konce etapy (navrh-v2.md § 6.3, rozhodnutí 0033): vosková pečeť etapy (`Seal` druhu `stage`)
 * s římským číslem a symbolem cíle etapy, žádný plný červený kruh. Symbol se doplní podle `stageIndex`.
 * `photo` a `dateLabel` pečeť etapy nekreslí; zůstávají kvůli volajícím.
 */
export function StageWax({
  stageIndex,
  place,
  size,
  animate = false,
}: {
  stageIndex: number;
  /** Místo, u kterého etapa končí (jeho symbol); chybí, když etapa končí mimo místo. */
  place?: AppPlace;
  photo?: ImageSourcePropType;
  dateLabel: string;
  size: number;
  animate?: boolean;
}) {
  const roman = toRoman(stageIndex + 1);
  return (
    <Seal
      kind="stage"
      size={size}
      animate={animate}
      roman={roman}
      ringText={`ETAPA ${roman} · ${vltavska.name.toUpperCase()}`}
      symbol={place?.symbol}
      stageIndex={stageIndex}
    />
  );
}
