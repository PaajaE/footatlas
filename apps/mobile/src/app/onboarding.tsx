import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Easing, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { IntroMap } from "../components/onboarding/IntroMap";
import { Rise } from "../components/onboarding/Rise";
import { RouteGlyph } from "../components/onboarding/RouteGlyph";
import { Seal } from "../components/Seal";
import { Button, T } from "../components/ui";
import { useReduceMotion } from "../components/useReduceMotion";
import { useChronicle } from "../db/ChronicleProvider";
import { vltavska } from "../data/vltavska";
import { formatKm, pluralPlaces } from "../format";
import { fromHealthSource, healthSourceName } from "../health/names";
import { distanceSentence, formatKmBig } from "../kronika/earth";
import { importOutcome, type ImportOutcome } from "../onboarding";
import { useExpedition } from "../state/ExpeditionProvider";
import { useOnboarding } from "../state/OnboardingProvider";
import { saveLifeCardSeen } from "../state/storage";
import { useTheme } from "../theme/ThemeProvider";

const LAST_STEP = 3;
type Choice = "import" | "zero";
/** `choose` = výběr, `reading` = čte se, `settling` = čtení doběhlo, čeká se na stav kroniky, `result` = výsledek. */
type Phase = "choose" | "reading" | "settling" | "result";

/**
 * Úvod (docs/specifikace.md § 9.1, rozhodnutí 0035): čtyři obrazovky, jediné oprávnění je ve třetí.
 * 1 Úvod (kresba trasy), 2 Tři věci, 3 Vaše kroky, 4 První výprava. Všechny kroky kromě třetího a čtvrtého jdou přeskočit.
 */
export default function Onboarding() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const onb = useOnboarding();
  const ex = useExpedition();
  const [step, setStep] = useState(0);
  const [imported, setImported] = useState(false);
  const [started, setStarted] = useState(false);

  const finish = useCallback(
    (to: "/vyprava" | "/atlas") => {
      onb.complete();
      router.replace(to);
    },
    [onb, router],
  );

  // Zpět na Androidu vrací o krok; na prvním kroku se aplikace zavře jako dřív.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (started) return true;
      if (step === 0) return false;
      setStep((s) => s - 1);
      return true;
    });
    return () => sub.remove();
  }, [step, started]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ height: 44, paddingHorizontal: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: 7, alignItems: "center" }} accessibilityLabel={`Krok ${step + 1} ze ${LAST_STEP + 1}`} accessible>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ height: 7, width: i === step ? 22 : 7, borderRadius: 4, backgroundColor: i === step ? colors.accent : colors.line }} />
          ))}
        </View>
        {step < 2 && (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => setStep(2)}>
            <T variant="muted">Přeskočit</T>
          </Pressable>
        )}
      </View>

      {step === 0 && <Intro onNext={() => setStep(1)} />}
      {step === 1 && <ThreeThings onNext={() => setStep(2)} />}
      {step === 2 && (
        <YourSteps
          onDone={(didImport) => {
            setImported(didImport);
            setStep(3);
          }}
        />
      )}
      {step === 3 && (
        <FirstExpedition
          imported={imported}
          active={ex.active}
          onStart={async () => {
            await ex.start();
            setStarted(true);
          }}
          onLook={() => finish("/atlas")}
          onBack={() => finish("/vyprava")}
        />
      )}
      {started && <Finale onOpen={() => finish("/vyprava")} />}
    </View>
  );
}

/** Rozvržení kroku: obsah se posouvá, tlačítka zůstávají dole. */
function StepFrame({ children, actions }: { children: React.ReactNode; actions: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 4 }}>{actions}</View>
    </View>
  );
}

function Intro({ onNext }: { onNext: () => void }) {
  return (
    <StepFrame
      actions={
        <>
          <Rise delay={650}>
            <Button label="Začít" onPress={onNext} />
          </Rise>
          <Rise delay={750}>
            <T variant="muted" style={{ textAlign: "center", paddingTop: 8 }}>
              Bez registrace.
            </T>
          </Rise>
        </>
      }
    >
      <Rise delay={100}>
        <T variant="label" style={{ fontSize: 16, letterSpacing: 1 }}>
          FootAtlas
        </T>
      </Rise>
      <View style={{ marginHorizontal: -24 }}>
        <IntroMap />
      </View>
      <Rise delay={250}>
        <T variant="display" style={{ fontSize: 40, lineHeight: 42 }}>
          Atlas, který kreslíte nohama
        </T>
      </Rise>
      <Rise delay={450}>
        <T variant="body">
          Každý krok, který uděláte, nakreslí kus cesty. My z toho uděláme výpravu.
        </T>
      </Rise>
    </StepFrame>
  );
}

const ICON = { width: 30, height: 30, viewBox: "0 0 32 32", fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function ThreeThings({ onNext }: { onNext: () => void }) {
  const { colors, fonts } = useTheme();
  const rows = [
    {
      title: "Chodíte, mapa se odkrývá.",
      text: "Ušlá trasa se vybarví inkoustem. Krajina před vámi zůstává jen skicou tužkou.",
      icon: (
        <Svg {...ICON} stroke={colors.fg}>
          <Path d="M5 26c6 0 4-10 10-10s5-9 12-11" />
          <Circle cx={5} cy={26} r={2} />
          <Circle cx={27} cy={5} r={2} strokeDasharray="2 2" />
        </Svg>
      ),
    },
    {
      title: "Místa si musíte došlapat.",
      text: "Každé má háček, hádanku a vlastní razítko. Odemkne se, až k němu dojdete.",
      icon: (
        <Svg {...ICON} stroke={colors.fg}>
          <Circle cx={16} cy={16} r={10} strokeDasharray="3 3" />
          <Path d="M16 11v6M13 20h6" />
        </Svg>
      ),
    },
    {
      title: "Kdo se nevrací, nic neztrácí.",
      text: "Po pauze vám Mezitím převypráví, co jste prošli. Žádné série, žádné výčitky.",
      icon: (
        <Svg {...ICON} stroke={colors.fg}>
          <Path d="M16 9c-3-2-7-2-10-1v16c3-1 7-1 10 1 3-2 7-2 10-1V8c-3-1-7-1-10 1zM16 9v16" />
        </Svg>
      ),
    },
  ];
  return (
    <StepFrame actions={<Button label="Rozumím" onPress={onNext} />}>
      <Rise>
        <T variant="label">Jak to funguje</T>
      </Rise>
      <Rise delay={80}>
        <T variant="display" style={{ fontSize: 32, lineHeight: 35 }}>
          Tři věci, které stačí vědět
        </T>
      </Rise>
      <View style={{ gap: 26, marginTop: 20 }}>
        {rows.map((r, i) => (
          <Rise key={r.title} delay={300 + i * 250}>
            <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
                {r.icon}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <T variant="title" style={{ fontSize: 21, lineHeight: 25, fontFamily: fonts.display }}>
                  {r.title}
                </T>
                <T variant="muted" style={{ color: colors.fgSoft, fontSize: 14.5, lineHeight: 21 }}>
                  {r.text}
                </T>
              </View>
            </View>
          </Rise>
        ))}
      </View>
    </StepFrame>
  );
}

function Option({ title, text, tag, selected, onPress }: { title: string; text: string; tag?: string; selected: boolean; onPress: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={{
        flexDirection: "row",
        gap: 14,
        padding: 16,
        borderRadius: radius.card,
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.line,
        backgroundColor: selected ? colors.surfaceAlt : colors.surface,
      }}
    >
      <View style={{ width: 20, height: 20, marginTop: 2, borderRadius: 10, borderWidth: 1.5, borderColor: selected ? colors.accent : colors.muted, alignItems: "center", justifyContent: "center" }}>
        {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <T variant="strong">{title}</T>
          {tag && (
            <View style={{ borderWidth: 1, borderColor: colors.accent, borderRadius: 99, paddingHorizontal: 8 }}>
              <T variant="label" style={{ fontSize: 12, color: colors.accent }}>
                {tag}
              </T>
            </View>
          )}
        </View>
        <T variant="muted" style={{ color: colors.fgSoft, fontSize: 13.5, lineHeight: 19 }}>
          {text}
        </T>
      </View>
    </Pressable>
  );
}

function YourSteps({ onDone }: { onDone: (imported: boolean) => void }) {
  const chronicle = useChronicle();
  const [choice, setChoice] = useState<Choice>("import");
  const [phase, setPhase] = useState<Phase>("choose");
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  // Čtení doběhlo: výsledek se vyhodnotí, až kronika přestane „syncing“ a má nové dny.
  useEffect(() => {
    if (phase !== "settling" || chronicle.sync.kind === "syncing") return;
    const o = importOutcome(chronicle.sync, chronicle.stats.totalM);
    setOutcome(o);
    setPhase("result");
    // Karta života se ukazuje jen jednou; tady ji úvod nahrazuje, ať Kronika nevyskočí podruhé.
    if (o.kind === "ok") void saveLifeCardSeen();
  }, [phase, chronicle.sync, chronicle.stats.totalM]);

  const read = async () => {
    setPhase("reading");
    await chronicle.syncNow(true);
    setPhase("settling");
  };

  const failed = outcome && (outcome.kind === "denied" || outcome.kind === "unavailable" || outcome.kind === "error");

  let actions: React.ReactNode;
  if (phase === "choose") {
    actions = <Button label={choice === "import" ? "Povolit čtení kroků" : "Začít od nuly"} onPress={() => (choice === "import" ? void read() : onDone(false))} />;
  } else if (phase === "result" && failed) {
    actions = (
      <>
        <Button label="Pokračovat bez historie" onPress={() => onDone(false)} />
        <Button kind="secondary" label="Zkusit znovu" onPress={() => { setOutcome(null); setPhase("choose"); }} />
      </>
    );
  } else if (phase === "result") {
    actions = <Button label="Dál" onPress={() => onDone(outcome?.kind === "ok")} />;
  } else {
    actions = <Button label="Čtu…" disabled onPress={() => undefined} />;
  }

  return (
    <StepFrame actions={actions}>
      <Rise>
        <T variant="label">Vaše kroky</T>
      </Rise>
      <Rise delay={80}>
        <T variant="display" style={{ fontSize: 32, lineHeight: 35 }}>
          Odkud vezmeme vaše kroky?
        </T>
      </Rise>
      {phase === "choose" ? (
        <Rise delay={250} style={{ gap: 10, marginTop: 8 }}>
          <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
            <Option
              selected={choice === "import"}
              onPress={() => setChoice("import")}
              tag="doporučeno"
              title="Načíst historii ze zdravotních dat"
              text={`Karta života spočítá, kolik jste za život ušli. Čte se jen počet kroků a vzdálenost ${fromHealthSource()} a zůstává to v telefonu.`}
            />
            <Option selected={choice === "zero"} onPress={() => setChoice("zero")} title="Začít od nuly" text="Počítat se bude od prvního kroku výpravy." />
          </View>
          <T variant="small" style={{ marginTop: 6 }}>
            Žádné notifikace, žádná registrace. Zdroj dat: {healthSourceName()}.
          </T>
        </Rise>
      ) : (
        <ImportCard phase={phase} outcome={outcome} />
      )}
    </StepFrame>
  );
}

function ImportCard({ phase, outcome }: { phase: Phase; outcome: ImportOutcome | null }) {
  const { colors, radius } = useTheme();
  const reduce = useReduceMotion();
  const total = outcome?.kind === "ok" ? outcome.totalM : 0;
  const [shown, setShown] = useState(0);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!(total > 0)) return;
    if (reduce) {
      setShown(total);
      return;
    }
    const id = v.addListener(({ value }) => setShown(value));
    v.setValue(0);
    const a = Animated.timing(v, { toValue: total, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => {
      a.stop();
      v.removeListener(id);
    };
  }, [total, reduce, v]);

  const waiting = phase !== "result" || !outcome;
  const sentence = total > 0 ? distanceSentence(total) : null;
  // Tmavá karta je pro Kartu života; zpráva o selhání nebo prázdných datech je klidná, na povrchu karty.
  const calm = !waiting && total <= 0;
  const bg = calm ? colors.surface : colors.inkCard;
  const fg = calm ? colors.fg : colors.inkCardFg;

  const message =
    outcome?.kind === "denied"
      ? `Čtení ${fromHealthSource()} nebylo povoleno. Nevadí, výpravu můžete začít i tak, jen se do kroniky nenačte historie.`
      : outcome?.kind === "unavailable"
        ? "Zdravotní data nejsou na tomto zařízení dostupná. Výpravu můžete začít i tak."
        : outcome?.kind === "error"
          ? `Čtení dat selhalo: ${outcome.message}`
          : outcome?.kind === "empty"
            ? "Zdravotní data zatím žádné kroky neobsahují. Nevadí, kronika se plní od chvíle, kdy začnete chodit."
            : null;

  return (
    <Rise style={{ marginTop: 8 }}>
      <View style={{ backgroundColor: bg, borderColor: colors.line, borderWidth: calm ? 1 : 0, borderRadius: radius.card + 2, padding: 24, gap: 10 }} accessibilityLiveRegion="polite">
        <T variant="label" style={{ color: fg, opacity: 0.8 }}>
          {waiting ? "Čtu historii…" : total > 0 ? "Karta života" : "Historie"}
        </T>
        {total > 0 || waiting ? (
          <>
            <T variant="display" style={{ color: fg, fontSize: 48, lineHeight: 52 }}>
              {waiting ? "…" : formatKmBig(shown)}
            </T>
            <View style={{ height: 3, borderRadius: 2, backgroundColor: fg, opacity: 0.2 }} />
            {sentence && (
              <T variant="body" style={{ color: fg }}>
                Za život jste ušli {formatKmBig(total)}. {sentence}
              </T>
            )}
          </>
        ) : (
          <T variant="body" style={{ color: fg }}>
            {message}
          </T>
        )}
      </View>
    </Rise>
  );
}

function FirstExpedition({
  imported,
  active,
  onStart,
  onLook,
  onBack,
}: {
  imported: boolean;
  active: boolean;
  onStart: () => Promise<void>;
  onLook: () => void;
  onBack: () => void;
}) {
  const { colors, radius } = useTheme();
  const [busy, setBusy] = useState(false);
  return (
    <StepFrame
      actions={
        active ? (
          <Button label="Zpět do Výpravy" onPress={onBack} />
        ) : (
          <>
            <Button
              label={busy ? "Vyrážíme…" : "Vyrazit"}
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await onStart();
                } finally {
                  setBusy(false);
                }
              }}
            />
            <Pressable accessibilityRole="button" onPress={onLook} style={{ alignItems: "center", paddingVertical: 12 }}>
              <T variant="muted" style={{ textDecorationLine: "underline" }}>
                Nejdřív se rozhlédnout
              </T>
            </Pressable>
          </>
        )
      }
    >
      <Rise>
        <T variant="label">První výprava</T>
      </Rise>
      <Rise delay={80}>
        <T variant="display" style={{ fontSize: 32, lineHeight: 35 }}>
          Kam se vydáme?
        </T>
      </Rise>
      <Rise delay={250}>
        <View style={{ marginTop: 8, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.card + 2, overflow: "hidden" }}>
          <RouteGlyph />
          <View style={{ padding: 16, gap: 6 }}>
            <T variant="title" style={{ fontSize: 28, lineHeight: 31 }}>
              {vltavska.name}
            </T>
            <T variant="muted">{vltavska.summary}</T>
            <View style={{ flexDirection: "row", marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
              {[
                [formatKm(vltavska.totalM, 0), "pěšky"],
                [String(vltavska.plan.stages.length), "etapy"],
                [String(vltavska.places.length), pluralPlaces(vltavska.places.length).replace(/^\d+ /, "")],
              ].map(([big, small], i) => (
                <View key={small} style={{ flex: 1, paddingLeft: i ? 14 : 0, borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.line }}>
                  <T variant="title" style={{ fontSize: 22, lineHeight: 25 }}>
                    {big}
                  </T>
                  <T variant="small">{small}</T>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Rise>
      <Rise delay={400}>
        <T variant="muted" style={{ fontSize: 13 }}>
          Počítá se jen pohyb od chvíle, kdy vyrazíte. Vaše historie zůstává v kronice.
          {imported ? "" : ` Při startu vás aplikace požádá o čtení kroků a vzdálenosti ${fromHealthSource()}.`}
        </T>
      </Rise>
    </StepFrame>
  );
}

/** Po startu: razítko Vyšehradu dopadne přes celou obrazovku. */
function Finale({ onOpen }: { onOpen: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const d = new Date();
  return (
    <View
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 14, paddingBottom: insets.bottom }}
      accessibilityViewIsModal
    >
      <Seal kind="wax" name="Vyšehrad" kmLabel="km 0" dateLabel={`${d.getDate()}. ${d.getMonth() + 1}.`} size={160} animate delayMs={250} />
      <Rise delay={900}>
        <T variant="display" style={{ textAlign: "center" }}>
          Výprava začala
        </T>
      </Rise>
      <Rise delay={1100}>
        <T variant="body" style={{ textAlign: "center" }}>
          Vyšehrad, kilometr nula. První razítko je vaše. Zbytek si musíte došlapat.
        </T>
      </Rise>
      <Rise delay={1400} style={{ alignSelf: "stretch", marginTop: 12 }}>
        <Button label="Otevřít Výpravu" onPress={onOpen} />
      </Rise>
    </View>
  );
}
