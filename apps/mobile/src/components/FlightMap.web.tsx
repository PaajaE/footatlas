import { useEffect } from "react";
import { tipAt } from "../navrat";
import { RouteSketch } from "./RouteSketch";
import type { FlightMapProps } from "./flightMapProps";

/** Na webu není MapLibre Native; let zastupuje náhled trasy, na kterém se úsek postupně kreslí. */
export function FlightMap({ route, cumulative, places, plan, elapsedMs, height, onReady }: FlightMapProps) {
  // Náčrt je hned hotový: hodiny se mohou pustit.
  useEffect(() => {
    onReady?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <RouteSketch route={route} cumulative={cumulative} places={places} walkedM={tipAt(plan, elapsedMs)} height={height} />;
}
export type { FlightMapProps };
