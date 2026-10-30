import { Platform } from "react-native";
import type { HealthSource } from "@footatlas/core";
import { androidHealthSource } from "./android";
import { iosHealthSource } from "./ios";

export const healthSource: HealthSource = Platform.OS === "ios" ? iosHealthSource : androidHealthSource;
