import { RouteSketch } from "./RouteSketch";
import type { ExpeditionMapProps } from "./expeditionMapProps";

/** Na webu mapa z přibalených dlaždic není (MapLibre Native), zůstává náhled trasy. */
export function ExpeditionMap(props: ExpeditionMapProps) {
  return <RouteSketch {...props} />;
}
export type { ExpeditionMapProps };
