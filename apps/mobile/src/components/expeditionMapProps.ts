import type { RoutePoint } from "@footatlas/core";
import type { AppPlace } from "../data/vltavska";

/** Rozhraní mapové vrstvy výpravy (rozhodnutí 0001). Obrazovky znají jen tento typ. */
export interface ExpeditionMapProps {
  route: readonly RoutePoint[];
  cumulative: readonly number[];
  places: readonly AppPlace[];
  walkedM: number;
  height: number;
  onPlacePress?: (id: string) => void;
}
