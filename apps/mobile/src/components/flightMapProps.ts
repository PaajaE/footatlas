import type { RoutePoint } from "@footatlas/core";
import type { AppPlace } from "../data/vltavska";

/** Mapa návratu: kamera letí po úseku `fromM` → `toM` a po skončení ukáže celý úsek. */
export interface FlightMapProps {
  route: readonly RoutePoint[];
  cumulative: readonly number[];
  places: readonly AppPlace[];
  fromM: number;
  toM: number;
  /** Aktuální poloha letu v metrech (podle ease-in-out); podle ní se vybarvuje a odemykají se pečeti. */
  walkedM: number;
  durationMs: number;
  /** Mění se při každém novém přehrání (Přehrát znovu); spouští let. */
  runKey: number;
  /** Let skončil nebo byl přeskočen: kamera se zastaví a ukáže celý úsek. */
  finished: boolean;
  /** U zastavení: kamera se přiblíží o `holdZoom` × 0,5 (0 až 1, viz `holdZoomAt`). */
  holdZoom?: number;
  /** Čas přehrávání (stejné hodiny jako `walkedM`); kamera podle něj plánuje dlouhé plynulé úseky. */
  elapsedMs?: number;
  /** Kde má být kamera v čase `ms` (metry trasy a přiblížení u zastavení 0 až 1); bez něj sleduje `walkedM`. */
  cameraAt?: (ms: number) => { m: number; holdZoom: number };
  /** Po skončení letu záběr zahrne i místo na obzoru (další zastávku), když je blízko. */
  horizonM?: number;
  /** Při „Omezit pohyb“ kamera neletí, jen se objeví celý úsek. */
  reduceMotion: boolean;
  height: number;
  /** Titulek rámečku listu („List I · …“). */
  frame: string;
}
