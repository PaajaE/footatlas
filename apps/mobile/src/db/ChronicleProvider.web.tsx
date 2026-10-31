import { createContext, useContext, type ReactNode } from "react";
import { chronicleStats } from "@footatlas/core";
import type { ChronicleValue } from "./types";

/** Na webu databáze není (expo-sqlite tu vyžaduje WASM a hlavičky COOP/COEP); jen prázdná kronika pro náhled obrazovek. */
const EMPTY: ChronicleValue = {
  ready: true,
  days: [],
  stats: chronicleStats([]),
  lastReadAt: null,
  sync: { kind: "unavailable", reason: "unsupported" },
  syncNow: async () => {},
};
const Ctx = createContext(EMPTY);

export function ChronicleProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={EMPTY}>{children}</Ctx.Provider>;
}

export function useChronicle(): ChronicleValue {
  return useContext(Ctx);
}
