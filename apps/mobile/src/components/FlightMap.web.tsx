import { RouteSketch } from "./RouteSketch";
import type { FlightMapProps } from "./flightMapProps";

/** Na webu není MapLibre Native; let zastupuje náhled trasy, na kterém se úsek postupně kreslí. */
export function FlightMap({ route, cumulative, places, walkedM, height }: FlightMapProps) {
  return <RouteSketch route={route} cumulative={cumulative} places={places} walkedM={walkedM} height={height} />;
}
export type { FlightMapProps };
