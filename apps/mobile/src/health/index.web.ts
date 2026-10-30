import type { HealthSource } from "@footatlas/core";

/** Na webu zdravotní data nejsou; slouží jen pro náhled obrazovek s ukázkovým postupem. */
export const healthSource: HealthSource = {
  platform: "android",
  async availability() {
    return "unsupported";
  },
  async requestAccess() {
    return { read: false, history: false };
  },
  async readDaily() {
    return [];
  },
};
