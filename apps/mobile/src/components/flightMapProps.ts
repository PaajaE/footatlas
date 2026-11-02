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
  /** Při „Omezit pohyb“ kamera neletí, jen se objeví celý úsek. */
  reduceMotion: boolean;
  height: number;
  /** Titulek rámečku listu („List I · …“). */
  frame: string;
}
