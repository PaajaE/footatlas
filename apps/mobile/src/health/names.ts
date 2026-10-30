import { Platform } from "react-native";

/** Název zdroje zdravotních dat podle platformy (na Androidu to není Apple Health). */
export function healthSourceName(): string {
  if (Platform.OS === "ios") return "Apple Health";
  if (Platform.OS === "android") return "Health Connect";
  return "zdravotních dat";
}
