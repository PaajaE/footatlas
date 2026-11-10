import { Redirect } from "expo-router";

/**
 * Bývalé Domů (`/`, také `footatlas://`): Domů zaniklo (rozhodnutí 0034), adresa vede na Výpravu,
 * aby nerozbila staré odkazy a deep linky.
 */
export default function Root() {
  return <Redirect href="/vyprava" />;
}
