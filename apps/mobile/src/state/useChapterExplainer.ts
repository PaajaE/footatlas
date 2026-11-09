import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { loadChapterOpened } from "./storage";

/**
 * Má se ukázat vysvětlující věta o kapitolách? Jen dokud chodec neotevřel žádnou kapitolu.
 * Do načtení se nezobrazí (aby věta neproblikla tomu, kdo už kapitolu otevřel); při návratu
 * na obrazovku se stav načte znovu, takže po první otevřené kapitole věta zmizí.
 */
export function useChapterExplainer(): boolean {
  const [show, setShow] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadChapterOpened().then((opened) => {
        if (alive) setShow(!opened);
      });
      return () => {
        alive = false;
      };
    }, []),
  );
  return show;
}
