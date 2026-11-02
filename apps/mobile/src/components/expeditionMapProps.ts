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
  /**
   * Plochy, které přes mapu překrývají jiné prvky obrazovky (karta nahoře, panel dole). Kamera na ně bere ohled
   * při „Celá trasa“ a tlačítka s atribucí se posunou nad panel.
   */
  insets?: { top: number; bottom: number };
  /** Rámeček listu atlasu s titulkem (např. „List I · Praha“) a měřítkem; bez hodnoty se nekreslí. */
  frame?: string;
  /** Tlačítka „Moje poloha“ a „Celá trasa“ na mapě (výchozí ano); obrazovka je může mít vlastní. */
  controls?: boolean;
}
