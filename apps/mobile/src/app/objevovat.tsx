import { Redirect } from "expo-router";

/** Bývalá záložka Objevovat (`/objevovat`) je teď sekce Atlasu (rozhodnutí 0034); starý odkaz vede do Atlasu. */
export default function OldDiscover() {
  return <Redirect href="/atlas" />;
}
