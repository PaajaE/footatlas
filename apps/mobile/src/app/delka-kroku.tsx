import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import {
  calibrateStepLength,
  HEIGHT_RANGE_CM,
  isValidHeight,
  isValidStepLength,
  MIN_CALIBRATION_STEPS,
  STEP_LENGTH_RANGE_M,
  stepLengthFromHeight,
  type Sex,
  type StepLengthSource,
} from "@footatlas/core";
import { Button, Card, Screen, T } from "../components/ui";
import { healthSource } from "../health";
import { loadCalibrationStart, saveCalibrationStart } from "../state/storage";
import { useExpedition } from "../state/ExpeditionProvider";
import { useTheme } from "../theme/ThemeProvider";

const SOURCE_LABEL: Record<StepLengthSource, string> = {
  calibrated: "naměřeno kalibrací",
  manual: "zadáno ručně",
  height: "odhad z výšky",
  default: "obecný průměr, zatím neupřesněno",
};
const SEX_LABEL: Record<Sex, string> = { female: "Žena", male: "Muž", other: "Neuvádět" };

const num = (s: string) => Number(s.replace(",", ".").trim());
const cm = (m: number) => `${Math.round(m * 100)} cm`;

function Field({ value, onChangeText, placeholder, label }: { value: string; onChangeText: (s: string) => void; placeholder: string; label: string }) {
  const { colors, fonts, radius } = useTheme();
  return (
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      keyboardType="decimal-pad"
      style={{
        minHeight: 48,
        borderWidth: 1.5,
        borderColor: colors.line,
        borderRadius: radius.button,
        paddingHorizontal: 14,
        color: colors.fg,
        fontFamily: fonts.body,
        fontSize: 16,
      }}
    />
  );
}

/** Délka kroku (rozhodnutí 0006): odhad z výšky, ruční hodnota nebo kalibrace na změřené trase. */
export default function StepLengthScreen() {
  const router = useRouter();
  const ex = useExpedition();
  const { stepProfile, stepLength, setStepProfile } = ex;

  const [height, setHeight] = useState(stepProfile.heightCm ? String(stepProfile.heightCm) : "");
  const [sex, setSex] = useState<Sex | undefined>(stepProfile.sex);
  const [manual, setManual] = useState("");
  const [startIso, setStartIso] = useState<string | null>(null);
  const [distance, setDistance] = useState("");
  const [result, setResult] = useState<{ meters: number; steps: number; distanceM: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void loadCalibrationStart().then(setStartIso);
  }, []);

  const heightCm = num(height);
  const fromHeight = isValidHeight(heightCm) ? stepLengthFromHeight(heightCm, sex) : null;

  const saveHeight = async () => {
    if (!isValidHeight(heightCm)) return;
    // Nová výška ruší dřívější ruční hodnotu i kalibraci: uživatel chce odhad z výšky.
    await setStepProfile({ heightCm, sex });
    setNote("Uloženo. Vzdálenost se přepočítala.");
  };

  const saveManual = async () => {
    const m = num(manual) / 100;
    if (!isValidStepLength(m)) return;
    await setStepProfile({ ...stepProfile, override: { meters: m, source: "manual", at: new Date().toISOString() } });
    setManual("");
    setNote("Uloženo. Vzdálenost se přepočítala.");
  };

  const startMeasure = async () => {
    const iso = new Date().toISOString();
    await saveCalibrationStart(iso);
    setStartIso(iso);
    setResult(null);
    setNote(null);
  };

  const cancelMeasure = async () => {
    await saveCalibrationStart(null);
    setStartIso(null);
    setResult(null);
    setDistance("");
  };

  const finishMeasure = async () => {
    setNote(null);
    const d = num(distance);
    if (!startIso || !(d > 0)) return;
    if (!healthSource.readSteps) {
      setNote("Tato platforma zatím čtení kroků pro kalibraci neumí.");
      return;
    }
    try {
      const steps = Math.round(await healthSource.readSteps(new Date(startIso), new Date()));
      const m = calibrateStepLength(d, steps);
      if (m === null) {
        setNote(
          steps < MIN_CALIBRATION_STEPS
            ? `Naměřeno jen ${steps} kroků, je potřeba aspoň ${MIN_CALIBRATION_STEPS}. Telefon zapisuje kroky se zpožděním; zkuste to znovu za minutu, nebo jděte delší úsek.`
            : `Z ${d} m a ${steps} kroků vychází nevěrohodná délka kroku. Zkontrolujte zadanou vzdálenost.`,
        );
        return;
      }
      setResult({ meters: m, steps, distanceM: d });
    } catch (e) {
      setNote(`Čtení kroků selhalo: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const saveCalibration = async () => {
    if (!result) return;
    await setStepProfile({ ...stepProfile, override: { meters: result.meters, source: "calibrated", at: new Date().toISOString() } });
    await cancelMeasure();
    setNote("Kalibrace uložena. Vzdálenost se přepočítala.");
  };

  const clearOverride = async () => {
    const { override: _drop, ...rest } = stepProfile;
    await setStepProfile(rest);
    setNote("Vráceno na odhad z výšky nebo průměr.");
  };

  return (
    <Screen>
      <T variant="title">Délka kroku</T>
      <T variant="muted">
        Vzdálenost se počítá z kroků, takže je jen tak přesná jako délka kroku. Aplikace ji nemůže zjistit sama, proto ji upřesněte
        některým z postupů níž. Údaje zůstávají jen v telefonu.
      </T>

      <Card style={{ gap: 6 }}>
        <T variant="label">Právě se používá</T>
        <T variant="display">{cm(stepLength.meters)}</T>
        <T variant="muted">{SOURCE_LABEL[stepLength.source]}</T>
        {stepProfile.override && <Button kind="secondary" label="Zahodit zadanou hodnotu" onPress={clearOverride} />}
        {note && <T variant="small">{note}</T>}
      </Card>

      <Card style={{ gap: 10 }}>
        <T variant="strong">1. Podle výšky</T>
        <T variant="muted">Běžný vzorec: délka kroku je zhruba 0,41 výšky. Je to průměr lidí, vás se může minout o desítky procent.</T>
        <Field label="Výška v centimetrech" value={height} onChangeText={setHeight} placeholder={`Výška v cm (${HEIGHT_RANGE_CM.min}–${HEIGHT_RANGE_CM.max})`} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(Object.keys(SEX_LABEL) as Sex[]).map((s) => (
            <View key={s} style={{ flexGrow: 1 }}>
              <Button kind={sex === s ? "primary" : "secondary"} label={SEX_LABEL[s]} onPress={() => setSex(s)} />
            </View>
          ))}
        </View>
        <Button label={fromHeight ? `Použít ${cm(fromHeight)}` : "Použít"} disabled={fromHeight === null} onPress={saveHeight} />
      </Card>

      <Card style={{ gap: 10 }}>
        <T variant="strong">2. Kalibrace na změřené trase (nejpřesnější)</T>
        <T variant="muted">
          Zvolte úsek se známou délkou, třeba trasu změřenou v mapě, aspoň 400 metrů. Stiskněte Začít, jděte svým obvyklým tempem,
          pak zadejte ušlou vzdálenost. Kroky aplikace přečte ze zdravotních dat.
        </T>
        {startIso === null ? (
          <Button label="Začít měření" onPress={startMeasure} />
        ) : (
          <>
            <T variant="small">Měření běží od {new Date(startIso).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}.</T>
            <Field label="Ušlá vzdálenost v metrech" value={distance} onChangeText={setDistance} placeholder="Ušlá vzdálenost v metrech" />
            <Button label="Skončit a vypočítat" disabled={!(num(distance) > 0)} onPress={finishMeasure} />
            <Button kind="secondary" label="Zrušit měření" onPress={cancelMeasure} />
          </>
        )}
        {result && (
          <View style={{ gap: 8 }}>
            <T variant="body">
              {result.distanceM} m na {result.steps} kroků: délka kroku {cm(result.meters)}.
            </T>
            <Button label={`Uložit ${cm(result.meters)}`} onPress={saveCalibration} />
          </View>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <T variant="strong">3. Zadat ručně</T>
        <T variant="muted">Pokud svou délku kroku znáte (např. z hodinek). Rozmezí {Math.round(STEP_LENGTH_RANGE_M.min * 100)}–{Math.round(STEP_LENGTH_RANGE_M.max * 100)} cm.</T>
        <Field label="Délka kroku v centimetrech" value={manual} onChangeText={setManual} placeholder="Délka kroku v cm" />
        <Button label="Uložit" disabled={!isValidStepLength(num(manual) / 100)} onPress={saveManual} />
      </Card>

      <Button label="Hotovo" onPress={() => router.back()} />
    </Screen>
  );
}
