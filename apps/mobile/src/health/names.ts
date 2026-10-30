import { Platform } from "react-native";

/** Název zdroje zdravotních dat podle platformy (na Androidu to není Apple Health). */
export function healthSourceName(): string {
  if (Platform.OS === "ios") return "Apple Health";
  if (Platform.OS === "android") return "Health Connect";
  return "zdravotní aplikace";
}

/** Se správným předložením: „z Health Connect“, „ze zdravotní aplikace“. */
export function fromHealthSource(): string {
  return Platform.OS === "ios" || Platform.OS === "android" ? `z ${healthSourceName()}` : `ze ${healthSourceName()}`;
}
