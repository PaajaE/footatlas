import type { RoutePoint } from "@footatlas/core";
import type { AppPlace } from "../data/vltavska";
import type { ReturnPlan } from "../navrat";

/**
 * Mapa přehrání cesty (rozhodnutí 0033): úvodní záběr, ponoření, kreslení perem, závěrečný záběr. Všechno se řídí
 * plánem `plan` a časem hodin `elapsedMs`.
 */
export interface FlightMapProps {
  route: readonly RoutePoint[];
  cumulative: readonly number[];
  places: readonly AppPlace[];
  plan: ReturnPlan;
  /** Čas přehrávání (hodiny `useClock`). */
  elapsedMs: number;
  /** Mění se při každém novém přehrání (Přehrát znovu); spouští let od začátku. */
  runKey: number;
  /** Úvodní i závěrečný záběr zahrne místo na obzoru (další zastávku), když je blízko. */
  horizonM?: number;
  /** Při „Omezit pohyb“ kamera neletí: stojí nad celým úsekem, čára a razítka se jen objevují. */
  reduceMotion: boolean;
  height: number;
  /** Kolik bodů dole zakryje souhrn; závěrečný záběr ukáže úsek nad ním. */
  bottomInset: number;
  /** Titulek rámečku („Etapa III · …“). */
  frame: string;
}
