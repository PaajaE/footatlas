import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, View } from "react-native";
import { Button, Card, Screen, T } from "../components/ui";
import { formatKm } from "../format";
import { useExpedition } from "../state/ExpeditionProvider";
import { useSchemeChoice } from "../theme/ThemeProvider";

/** Vývojářský panel: ukázkový postup, motiv, prototyp importu. V produkčním buildu se nezobrazuje odkaz. */
export default function Dev() {
  const router = useRouter();
  const ex = useExpedition();
  const { choice, setChoice } = useSchemeChoice();
  const { demo, setDemo } = ex;
  const [diag, setDiag] = useState<string | null>(null);
  const runDiag = async () => {
    setDiag("Běží…");
    try {
      // Načítá se až při použití, aby web a iOS knihovnu Health Connect netahaly.
      const { diagnoseHealth } = require("../health/diagnostics") as typeof import("../health/diagnostics");
      setDiag(await diagnoseHealth());
    } catch (e) {
      setDiag(`Chyba: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const step = (m: number) => setDemo({ walkedM: Math.max(0, Math.min(62_000, demo.walkedM + m)) });

  return (
    <Screen>
      <T variant="title">Vývojářský panel</T>

      <Card style={{ gap: 10 }}>
        <T variant="strong">Ukázkový postup</T>
        <T variant="muted">
          Nahradí data ze zdravotní aplikace pevnou vzdáleností, aby šly obrazovky vyzkoušet bez zařízení. Nic se nepočítá do kroniky.
        </T>
        <Button
          label={demo.enabled ? "Vypnout ukázkový postup" : "Zapnout ukázkový postup"}
          kind={demo.enabled ? "secondary" : "primary"}
          onPress={() => setDemo({ enabled: !demo.enabled })}
        />
        {demo.enabled && (
          <>
            <T variant="body">
              Ušlo se {formatKm(demo.walkedM)}, naposledy viděno {formatKm(demo.seenM)}
            </T>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button kind="secondary" label="−5 km" onPress={() => step(-5000)} />
              <Button kind="secondary" label="+1 km" onPress={() => step(1000)} />
              <Button kind="secondary" label="+5 km" onPress={() => step(5000)} />
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button kind="secondary" label="Start" onPress={() => setDemo({ walkedM: 0, seenM: 0 })} />
              <Button kind="secondary" label="36 km" onPress={() => setDemo({ walkedM: 36_000, seenM: 24_600 })} />
              <Button kind="secondary" label="Cíl" onPress={() => setDemo({ walkedM: 62_022, seenM: 50_000 })} />
            </View>
            <Button kind="secondary" label="Zapomenout, co bylo viděno" onPress={() => setDemo({ seenM: 0 })} />
          </>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <T variant="strong">Motiv</T>
        {/* Tlačítka se zalamují celá a roztahují podle textu, aby se „Podle telefonu“ nelámalo. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["auto", "light", "dark"] as const).map((c) => (
            <View key={c} style={{ flexGrow: 1 }}>
              <Button
                kind={choice === c ? "primary" : "secondary"}
                label={c === "auto" ? "Podle telefonu" : c === "light" ? "Světlý" : "Tmavý"}
                onPress={() => setChoice(c)}
              />
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <T variant="strong">Stav</T>
        <T variant="muted">
          Skutečná výprava: {ex.session ? (ex.paused ? "pozastavena" : "běží") : "nespuštěna"} · data: {ex.status.kind}
        </T>
        {ex.session && !ex.demo.enabled && (
          <Button kind="secondary" label={ex.paused ? "Pokračovat" : "Pozastavit"} onPress={ex.paused ? ex.resume : ex.pause} />
        )}
        <Button kind="secondary" label="Znovu načíst data" onPress={ex.refresh} />
        <Button kind="secondary" label="Smazat uložený stav" onPress={ex.resetAll} />
      </Card>

      {Platform.OS === "android" && (
        <Card style={{ gap: 10 }}>
          <T variant="strong">Diagnostika Health Connect</T>
          <T variant="muted">Porovná vzdálenost, kroky a relace cvičení za 60 dní. Výstup je v logu (FA_DIAG).</T>
          <Button kind="secondary" label="Spustit diagnostiku" onPress={runDiag} />
          {diag && <T variant="small">{diag}</T>}
        </Card>
      )}

      <Button kind="secondary" label="Prototyp importu historie" onPress={() => router.push("/import-prototype")} />
      <Button label="Hotovo" onPress={() => router.back()} />
    </Screen>
  );
}
